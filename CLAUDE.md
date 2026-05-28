# CLAUDE.md — Guia de Contexto para IAs

Este arquivo orienta assistentes de IA em manutenções neste repositório.
Leia antes de qualquer modificação em `src/`, `Dockerfile` ou configs de deploy.

---

## ⚠️ Leia ANTES de mexer

A imagem que está em produção no Cloud Run é a **mesma** que este repo
compila. Mas isso só passou a ser verdade depois de PR #12 (28/05) —
antes disso o repo e a produção eram codebases diferentes, o que gerou
muito retrabalho. Antes de qualquer alteração não-trivial, **confirme
que o estado deployado realmente vem deste repo** (ver seção "Lições —
Não Repetir" no final).

---

## Comandos de Build e Teste

```bash
# Compilar TypeScript (gera build/index.js)
npm run build

# Iniciar servidor localmente (requer .env e config/credentials.json)
npm start

# Testar via curl (legacy SSE — não há rota POST /sse)
# 1. Abrir SSE: curl -N http://localhost:8080/sse
# 2. Anotar sessionId retornado no evento "endpoint"
# 3. Enviar tools/list: curl -X POST "http://localhost:8080/messages?sessionId=<id>" \
#      -H "Content-Type: application/json" \
#      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

> Não há rota `/health` na versão deployada. Saúde do serviço é
> inferida pelo retorno do `tools/list`.

---

## Estrutura do Projeto

```
google-sheets-mcp/
├── src/
│   └── index.ts              # Único entry point — Express + MCP + Sheets
├── config/
│   └── .gitkeep              # credentials.json vai aqui (gitignored)
├── build/                    # Saída do tsc (gitignored)
├── specs/                    # Especificações spec-first de novas ferramentas
├── .claude/
│   ├── settings.json         # Comandos pré-aprovados para Claude Code
│   └── rules/
│       ├── express-stream.md   # Regra crítica: isolamento do stream SSE
│       ├── infra.md            # Regras de deploy no GCP
│       └── mcp-compatibility.md # Padrões para o conector do Claude Web
├── CLAUDE.md                 # Este arquivo
├── INDEX.md                  # Mapa de calor do codebase
├── README.md                 # Documentação técnica completa
├── Dockerfile                # node:20-slim, single-stage
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Regra Absoluta — Stream SSE

**NUNCA registre `app.use(express.json())` ou qualquer body-parser antes da rota `/messages`.**

A ordem no `src/index.ts` deve ser sempre:

```
1. app.get('/sse', ...)       ← SSE
2. app.post('/messages', ...) ← stream bruto do MCP
3. (sem express.json() global — não há outras rotas que precisem)
```

Detalhes em `.claude/rules/express-stream.md`.

---

## Como Adicionar uma Nova Ferramenta

Siga estas 3 etapas em ordem. Não pule nenhuma.

### Etapa 1 — Criar a spec (opcional mas recomendado)

Crie `specs/nome-da-ferramenta.md` descrevendo input, output e o range da aba antes de codar.

### Etapa 2 — Declarar no `ListToolsRequestSchema`

No handler `ListToolsRequestSchema`, adicione o objeto ao array `tools`:

```typescript
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... ferramentas existentes ...
    {
      name: 'get_minha_nova_ferramenta',
      description: 'Descrição clara do que retorna e qual aba lê.',
      // ⚠️ OBRIGATÓRIO mesmo sem argumentos — ver mcp-compatibility.md
      inputSchema: {
        type: 'object',
        properties: {
          meu_arg: { type: 'string', description: '...' },
        },
        // adicione "required": ['meu_arg'] se aplicável
      },
    },
  ],
}));
```

**Regras críticas:**
- O array `tools` é **estático e inline** — sem chamadas async ou I/O externo.
- **`inputSchema` é obrigatório em TODAS as ferramentas**, mesmo nas que não recebem argumentos. Use `{ type: 'object', properties: {} }` quando vazio. O conector do Claude Web não lista ferramentas sem `inputSchema`. Ver `.claude/rules/mcp-compatibility.md`.

### Etapa 3 — Implementar no `CallToolRequestSchema`

No handler `CallToolRequestSchema`, adicione o `range` na cadeia de `if/else if` e (se precisar de filtro extra) trate dentro do bloco pós-fetch:

```typescript
// 1) Range:
else if (name === 'get_minha_nova_ferramenta') range = 'NOME_DA_ABA!A1:Z200';

// 2) Lógica pós-fetch (se houver filtro/transformação):
else if (name === 'get_minha_nova_ferramenta') {
  const a = args as any;
  const ticker = typeof a.ticker === 'string' ? a.ticker.trim().toUpperCase() : '';
  if (ticker === '') throw new Error('Parâmetro "ticker" é obrigatório.');
  data = data.filter(item => String(item['TICKER'] || '').trim().toUpperCase() === ticker);
}
```

Após as duas etapas, rode `npm run build` e confirme zero erros antes de commitar.

---

## Padrões de Código TypeScript

| Item | Padrão |
|---|---|
| `target` / `module` | `Esnext` / `NodeNext` |
| `outDir` | `./build` (não `dist/`) |
| `strict` | `true` |
| `skipLibCheck` | `true` |
| Imports de subpath do SDK | Com extensão `.js` (ex: `@modelcontextprotocol/sdk/server/sse.js`) |
| Retorno de handler | `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }` |
| Erro de handler | Mesmo shape, com `isError: true` |

---

## Lições — Não Repetir

A história do PR #4 ao #12 deixou marcas. Antes de tomar a iniciativa de
"melhorar" algo no transporte ou no lifecycle, releia esta seção.

### 1. Confirme o que está deployado ANTES de modificar

A imagem no Cloud Run pode ter vindo de um source diferente do repo
(buildpacks, outro branch, deploy manual antigo). Sinais de divergência:

```bash
URL=$(gcloud run services describe oplab-sheets-mcp --region=us-east1 \
       --format='value(status.url)')

curl -s "$URL/health"      # Existe na versão deployada? Retorna JSON?
gcloud run services logs read oplab-sheets-mcp --region=us-east1 --limit=5 \
  --format='value(textPayload)' | grep -E "🚀|Servidor|Build →"
```

Se o banner, endpoints ou logs não baterem com o que o `src/index.ts`
deveria produzir, **o repo e a produção estão dessincronizados** — pare
e investigue antes de qualquer mudança.

### 2. Não troque transporte sem evidência forte

A versão atual usa **legacy SSE** (`GET /sse` + `POST /messages`) com
Server e Transport globais e `await mcpServer.close()` antes de aceitar
nova conexão. Funciona com Claude Web. Streamable HTTP (`POST /sse` com
`mcp-session-id`) **não** é necessário e adicioná-lo já quebrou o
conector uma vez (PRs #9-#10 reverted em #11).

### 3. Não refatore lifecycle "preventivamente"

Erros como `Already connected to a transport` nos logs antigos eram da
imagem velha — não do código atual. Mudanças preventivas em lifecycle
(`closeSession`, factory por requisição, instance counters) adicionam
complexidade sem necessidade e podem introduzir incompatibilidades com
o conector. **Só refatore se houver bug reproduzível neste código.**

### 4. Deploy SEMPRE com `--no-traffic` + tag preview

Qualquer mudança em `src/`, `package.json`, `Dockerfile` ou `tsconfig`
deve ser deployada como revisão nova **sem** migrar tráfego, testada
com curl + Claude Web no URL específico da preview, e só então migrada.
Ver `.claude/rules/infra.md` — seção "Deploy seguro".

### 5. Rollback é uma flag, não um PR

Se uma revisão nova quebrar, **não tente fixar com novo deploy**.
Migra tráfego de volta:

```bash
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --to-revisions=oplab-sheets-mcp-00015-glk=100
```

A imagem `working-baseline-v2` no Artifact Registry é a referência
estável (PR #12 / revisão 00015).

---

## Referências Rápidas

- Documentação técnica completa: `README.md`
- Mapa de arquivos: `INDEX.md`
- Regra do stream Express: `.claude/rules/express-stream.md`
- Regras de infra GCP: `.claude/rules/infra.md`
- Compatibilidade com o conector Claude Web: `.claude/rules/mcp-compatibility.md`
- Bugs críticos resolvidos: seção "Bugs Críticos Resolvidos" do `README.md`
