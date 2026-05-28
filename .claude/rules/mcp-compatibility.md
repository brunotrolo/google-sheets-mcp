# Regras de Compatibilidade — Conector MCP Claude Web/Mobile

**Escopo:** ativada ao modificar `src/index.ts`, `package.json`, ou ao decidir sobre versão do SDK / padrão de transporte.

Estas regras foram destiladas da longa série PR #4 ao #12, onde várias mudanças
"defensivas" derrubaram o conector. Releia antes de tomar iniciativa em transporte
ou shape de tools.

---

## 1. `inputSchema` é obrigatório em TODAS as ferramentas

**Regra:** Toda entrada de `ListToolsRequestSchema` precisa ter `inputSchema`,
mesmo que a ferramenta não receba argumentos.

```typescript
// ✅ CORRETO — ferramenta sem args
{
  name: 'get_correl_ibov',
  description: 'Retorna dados da aba RANKING_CORREL_IBOV.',
  inputSchema: { type: 'object', properties: {} }
}

// ❌ ERRADO — conector ignora a ferramenta (ou ignora a lista inteira)
{
  name: 'get_correl_ibov',
  description: 'Retorna dados da aba RANKING_CORREL_IBOV.'
}
```

Para ferramentas com argumento obrigatório, use `required`:

```typescript
{
  name: 'get_cockpit_por_ativo',
  description: '...',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: { type: 'string', description: 'Código do ativo. Ex: "EMBJ3".' }
    },
    required: ['ticker']
  }
}
```

**Sintoma típico de violação:** Claude Web exibe "Este conector não possui
ferramentas disponíveis" ou "Não foi possível recarregar as ferramentas
do servidor".

---

## 2. Versão do SDK fixada em `^1.0.1`

**Regra:** Não atualizar `@modelcontextprotocol/sdk` sem validar com o conector
do Claude Web em URL preview primeiro.

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1"
  }
}
```

Isso resolve em `npm install` para a `1.29.0` (última `1.x`). Versões `^1.12+`
fixadas explicitamente mudaram defaults de transporte e quebraram o conector.

**Não tentar:**

- `@modelcontextprotocol/sdk: "^1.12.0"` — quebrou em PR #11
- `@modelcontextprotocol/sdk: "^2.0.0"` (quando sair) — sem validação prévia
- `@modelcontextprotocol/sdk: "latest"` — instabilidade

Se for absolutamente necessário atualizar, siga `infra.md` → "Deploy Seguro" e
teste o URL preview no Claude Web antes de migrar tráfego.

---

## 3. Padrão de Transporte: Server global + Transport reciclado

**Regra:** O servidor usa **legacy SSE** (rotas `GET /sse` + `POST /messages`)
com `Server` e `SSEServerTransport` em escopo de módulo, e `mcpServer.close()`
antes de aceitar nova conexão.

```typescript
// ✅ Padrão atual em src/index.ts
const mcpServer = new Server({ name: '...', version: '...' }, { capabilities: { tools: {} } });
let transport: SSEServerTransport | null = null;

app.get('/sse', async (req, res) => {
  if (transport) {
    try { await mcpServer.close(); }
    catch (e) { console.error('Ignorando erro ao fechar transport antigo:', e); }
  }
  transport = new SSEServerTransport('/messages', res);
  await mcpServer.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('SSE transport não inicializado');
  }
});
```

**Tradeoff:** Só uma conexão por vez (a nova fecha a anterior). Suficiente
para o caso de uso (um usuário Claude Web por servidor). Se múltiplos
clientes simultâneos forem requisito futuro, a mudança precisa ser
validada com o conector antes de mergear.

**Não tentar (já quebrou o conector antes):**

- **`createMcpServer()` por requisição** (factory) — adiciona complexidade
  sem ganho, e a versão atual do SDK não exige isso.
- **`closeSession()` idempotente, contadores de instância, lifecycle hooks
  extras** — overhead que não resolve nenhum bug reproduzível e introduziu
  incompatibilidades nos PRs #6-#8.
- **Streamable HTTP transport** (`POST /sse` com `mcp-session-id`) — o Claude
  Web não exige esse transporte; tentamos adicionar em PR #9-#10 e o conector
  ficou em loop de erro.

---

## 4. `tools` é estático e inline

**Regra:** O array passado para `ListToolsRequestSchema` é **literal**,
sem `await`, `fetch`, ou qualquer I/O.

```typescript
// ✅
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'get_cockpit_ativas', description: '...', inputSchema: { type: 'object', properties: {} } },
    // ... todas as 10 ferramentas literais ...
  ]
}));

// ❌
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: await loadToolsFromDatabase()  // se falhar no handshake, cache fica vazio
}));
```

O cliente pode cachear a resposta. Falhas no handshake travam o estado em
"sem ferramentas" e exigem remover/reconectar manualmente.

---

## 5. Nome do servidor no MCP

`new Server({ name: 'oplab-sheets-portfolio', version: '1.0.0' }, ...)`.

**Regra:** Mudar o nome pode invalidar associações cacheadas no conector do
Claude Web. Manter `oplab-sheets-portfolio` salvo necessidade clara.

---

## 6. Antes de qualquer mudança não-trivial

```bash
# 1) Verifique a imagem ativa
URL=$(gcloud run services describe oplab-sheets-mcp --region=us-east1 \
       --format='value(status.url)')

# 2) O banner de log bate com o `console.log` do `src/index.ts` atual?
gcloud run services logs read oplab-sheets-mcp --region=us-east1 --limit=10 \
  --format='value(textPayload)' | grep -E "Sheets-MCP|Ativado"

# 3) O retorno do tools/list tem 10 ferramentas?
rm -f /tmp/sse.log
curl -sN "$URL/sse" > /tmp/sse.log & sleep 3
SID=$(grep -oE "sessionId=[a-f0-9-]+" /tmp/sse.log | head -1 | cut -d= -f2)
curl -s -X POST "$URL/messages?sessionId=$SID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' > /dev/null
sleep 2
grep -oE '"name":"[^"]+"' /tmp/sse.log | wc -l   # esperado: 10
```

Se algum desses sinais não bater, o repo e a produção estão dessincronizados
de novo — pare e investigue antes de mexer.
