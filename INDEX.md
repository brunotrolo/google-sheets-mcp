# INDEX.md — Mapa de Calor do Codebase

Referência rápida de onde cada responsabilidade vive. Leia antes de explorar arquivos.

## Fluxo de Dados

```
Requisição do Claude
       │
       ├─ GET /sse ──────────────────────────────────────────────────────────┐
       │  Cria SSEServerTransport novo, fecha mcpServer antigo, reconnecta   │
       │                                                                      │
       └─ POST /messages?sessionId=<id>                                       │
              │                                                               │
              ▼                                                               │
     transport.handlePostMessage(req, res)        ◄──── transport (global) ──┘
              │
              ▼
     mcpServer.setRequestHandler(CallToolRequestSchema)
              │
              ▼
     if/else por nome da ferramenta → range da aba
              │
              ▼
     sheets.spreadsheets.values.get({ spreadsheetId, range })
              │
              ▼
     rows.slice(1).map(...)  →  Record<string,string>[]
              │
              ▼
     filtro/agregação específica por ferramenta (quando aplica)
              │
              ▼
     { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
```

## Mapa de Arquivos

| Arquivo / Diretório | Responsabilidade | Mexer quando... |
|---|---|---|
| `src/index.ts` | Tudo — servidor, ferramentas, auth | Adicionar/alterar ferramenta, ajustar lógica de filtro |
| `config/credentials.json` | Credenciais da Service Account Google | Renovar ou trocar a conta de serviço |
| `package.json` | Dependências e scripts | **Atenção:** alterar versão do SDK exige validação com o Claude Web — ver `mcp-compatibility.md` |
| `tsconfig.json` | Configuração do compilador TypeScript | Quase nunca; `outDir` é `./build` |
| `Dockerfile` | Build single-stage `node:20-slim` para produção | Atualizar versão do Node ou adicionar arquivos ao container |
| `.env.example` | Template de variáveis de ambiente | Adicionar nova variável obrigatória |
| `.gitignore` | Arquivos excluídos do controle de versão | Adicionar novo artefato gerado (ex: `build/`) |
| `.claude/settings.json` | Comandos pré-aprovados para Claude Code CLI | Adicionar novo comando de deploy ou build |
| `.claude/rules/express-stream.md` | Regra crítica do stream SSE | Nunca alterar sem consenso explícito |
| `.claude/rules/infra.md` | Padrões de deploy no GCP (inclui `--no-traffic` + preview) | Mudar região, projeto ou flags do Cloud Run |
| `.claude/rules/mcp-compatibility.md` | Regras de compatibilidade com o conector Claude Web | Antes de mudar versão do SDK, padrão de transporte ou shape de tools |
| `specs/` | Especificações de novas ferramentas (spec-first) | Antes de implementar qualquer ferramenta nova |
| `README.md` | Documentação técnica completa | Após qualquer mudança arquitetural significativa |
| `CLAUDE.md` | Guia de contexto para IAs | Após mudança de padrões de código ou workflow |

## Funções e Handlers Críticos em `src/index.ts`

| Função / Handler | O que faz |
|---|---|
| `parseNumberBR(raw)` | Converte string em número aceitando formato BR (`1.234,56`), US (`1234.56`), `R$`, `%`, `(x)` negativo |
| `ListToolsRequestSchema` handler | Array inline com as 10 ferramentas, todas com `inputSchema` explícito |
| `CallToolRequestSchema` handler | `if/else` por nome → resolve `range`, fetch da aba, monta `data` (array de objetos), aplica transformação/filtro por ferramenta, retorna como `text/JSON` |
| `app.get('/sse', ...)` | Fecha `mcpServer` se já houver transport ativo, cria `SSEServerTransport` novo, `mcpServer.connect(transport)` |
| `app.post('/messages', ...)` | Roteia stream bruto para `transport.handlePostMessage(req, res)` |

## Dependências Externas

| Pacote | Versão fixada | Resolve para | Usado para |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.0.1` | 1.29.0 | Server, SSEServerTransport, schemas. **Não atualizar sem validar conector Claude Web** |
| `googleapis` | `^134.0.0` | — | Google Sheets API v4 |
| `express` | `^4.19.2` | — | Servidor HTTP, roteamento |
| `dotenv` | `^16.4.5` | — | Carrega `.env` em desenvolvimento |
| `typescript` (dev) | `^5.3.3` | — | Compilação |
| `@types/express` (dev) | `^4.17.21` | — | Tipos |
| `@types/node` (dev) | `^20.11.24` | — | Tipos |

## Endpoints Expostos

| Método | Rota | Função |
|---|---|---|
| `GET` | `/sse` | Abre canal SSE; emite evento `endpoint` com URL para POSTs |
| `POST` | `/messages?sessionId=<id>` | Recebe requisição JSON-RPC e responde via stream SSE aberto |

**Não há rota `/health`.** Saúde é inferida do retorno do `tools/list`.
