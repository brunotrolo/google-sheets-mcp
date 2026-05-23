# CLAUDE.md — Guia de Contexto para IAs

Este arquivo orienta assistentes de IA em manutenções neste repositório.
Leia antes de qualquer modificação em `src/`, `Dockerfile` ou configs de deploy.

---

## Comandos de Build e Teste

```bash
# Compilar TypeScript (valida tipagem + gera dist/)
npm run build

# Iniciar servidor localmente (requer .env e config/credentials.json)
npm start

# Desenvolvimento com hot-reload
npm run dev

# Verificar saúde do servidor em execução
curl http://localhost:3000/health

# Testar descoberta de ferramentas via SSE (requer wscat ou similar)
# 1. Abrir SSE: curl -N http://localhost:3000/sse
# 2. Anotar sessionId retornado no evento "endpoint"
# 3. Enviar tools/list: curl -X POST "http://localhost:3000/messages?sessionId=<id>" \
#      -H "Content-Type: application/json" \
#      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Estrutura do Projeto

```
google-sheets-mcp/
├── src/
│   └── index.ts              # Único entry point — Express + MCP + Sheets
├── config/
│   └── .gitkeep              # credentials.json vai aqui (gitignored)
├── dist/                     # Saída do tsc (gitignored)
├── specs/                    # Especificações spec-first de novas ferramentas
├── .claude/
│   ├── settings.json         # Comandos pré-aprovados para Claude Code
│   └── rules/
│       ├── express-stream.md # Regra crítica: isolamento do stream SSE
│       └── infra.md          # Regras de deploy no GCP
├── CLAUDE.md                 # Este arquivo
├── INDEX.md                  # Mapa de calor do codebase
├── README.md                 # Documentação técnica completa
├── Dockerfile                # Build multi-stage para Cloud Run
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Regra Absoluta — Stream SSE

**NUNCA registre `app.use(express.json())` ou qualquer body-parser antes das rotas `/sse` e `/messages`.**

A ordem no `src/index.ts` deve ser sempre:

```
1. app.get('/sse', ...)       ← SSE
2. app.post('/messages', ...) ← stream bruto do MCP
3. app.use(express.json())    ← body parser (só aqui)
4. app.get('/health', ...)    ← rotas JSON comuns
```

Detalhes em `.claude/rules/express-stream.md`.

---

## Como Adicionar uma Nova Ferramenta

Siga estas 3 etapas em ordem. Não pule nenhuma.

### Etapa 1 — Criar a spec (opcional mas recomendado)

Crie `specs/nome-da-ferramenta.md` descrevendo input, output e o range da aba antes de codar.

### Etapa 2 — Declarar no `ListToolsRequestSchema`

No handler `ListToolsRequestSchema` dentro de `createMcpServer()`, adicione o objeto ao array `tools`:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... ferramentas existentes ...
    {
      name: 'get_minha_nova_ferramenta',
      description: 'Descrição clara do que retorna e qual aba lê.',
      // inputSchema é opcional; inclua apenas se houver argumentos
      inputSchema: {
        type: 'object',
        properties: {
          meu_arg: { type: 'string', description: '...' },
        },
      },
    },
  ],
}));
```

**Regra:** O array `tools` deve ser **estático e inline**. Não chame funções assíncronas ou APIs externas aqui. O Claude cacheia esse retorno no handshake — falhas ou latência resultam em "conector sem ferramentas".

### Etapa 3 — Implementar no `CallToolRequestSchema`

Adicione um `case` no `switch` dentro do handler `CallToolRequestSchema`:

```typescript
case 'get_minha_nova_ferramenta': {
  const rows = await readSheet('NOME_DA_ABA!A1:Z500');
  if (rows.length < 2) { result = JSON.stringify([]); break; }
  const [headers, ...dataRows] = rows as [string[], ...string[][]];
  result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
  break;
}
```

Após as duas etapas, rode `npm run build` e confirme zero erros antes de commitar.

---

## Padrões de Código TypeScript

| Item | Padrão |
|---|---|
| `module` | `NodeNext` (ESM) |
| `moduleResolution` | `NodeNext` |
| `strict` | `true` — sem `any` implícito |
| `skipLibCheck` | `true` — evita erros de tipos em libs externas |
| Imports de subpath do SDK | Com extensão `.js` (ex: `@modelcontextprotocol/sdk/server/sse.js`) |
| Retorno de handler | `{ content: [{ type: 'text', text: string }] }` |
| Erro de handler | Igual acima, com `isError: true` |

---

## Referências Rápidas

- Documentação técnica completa: `README.md`
- Mapa de arquivos: `INDEX.md`
- Regra do stream Express: `.claude/rules/express-stream.md`
- Regras de infra GCP: `.claude/rules/infra.md`
- Bugs críticos resolvidos: seção "Bugs Críticos Resolvidos" do `README.md`
