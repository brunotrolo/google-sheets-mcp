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
| `parseNumberBR(raw)` | Converte string em número. Detecta BR (`1.234,56`) vs US (`1,234.56`) pela posição do separador mais à direita (decimal). Tolera `R$`, `%`, espaços e `(x)` negativo |
| `ListToolsRequestSchema` handler | Array inline com as **14 ferramentas** (13 de leitura de Sheets + `acionar_automacao_planilha`), todas com `inputSchema` explícito |
| `CallToolRequestSchema` handler | `if/else` por nome. `acionar_automacao_planilha` é tratada antes do bloco de Sheets — faz `fetch` POST para `APPS_SCRIPT_WEB_APP_URL`. As demais resolvem `range`, fetch da aba, montam `data` e aplicam transformação/filtro |
| `app.get('/sse', ...)` | Fecha `mcpServer` se já houver transport ativo, cria `SSEServerTransport` novo, `mcpServer.connect(transport)` |
| `app.post('/messages', ...)` | Roteia stream bruto para `transport.handlePostMessage(req, res)` |

## Convenções semânticas (cuidado ao mexer)

| Convenção | Aplicada em | Por quê |
|---|---|---|
| `inputSchema` sempre presente | Todas as 14 tools | Conector Claude Web rejeita lista se alguma tool sem inputSchema (Bug 3) |
| `acionar_automacao_planilha` NÃO usa Sheets API | Única write-tool | Dispara automação via Apps Script Web App; lida com `APPS_SCRIPT_WEB_APP_URL` + `APPS_SCRIPT_TOKEN` (Secret Manager) |
| Prêmio = TODAS as operações (ativas + encerradas + exercidas) | `get_resumo_mensal`, `get_dashboard_mensal`, `get_resumo_por_ativo` | Semântica unificada — exposição contratada no escopo |
| `pl_realizado` só de encerradas/exercidas | mesmas três | P&L que já entrou em caixa, separado da exposição |
| Match flexível de `TRADE_MONTH` | `get_dashboard_mensal` | Aceita `"5"`, `"05"`, `"05/2026"`, `"2026-05"` etc. |
| Regras de alerta só pra SIDE=VENDA | `get_alertas_posicoes` | Risco de short de opções; COMPRAs entram em `saudaveis` |

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
