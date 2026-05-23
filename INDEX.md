# INDEX.md — Mapa de Calor do Codebase

Referência rápida de onde cada responsabilidade vive. Leia antes de explorar arquivos.

## Fluxo de Dados

```
Requisição do Claude
       │
       ├─ GET /sse ──────────────────────────────────────────────────────────┐
       │                                                                      │
       └─ POST /messages?sessionId=<id>                                       │
              │                                                               │
              ▼                                                               │
     SSEServerTransport.handlePostMessage()    ◄──── SSEServerTransport ─────┘
              │                                        (criado por conexão)
              ▼
     Server.setRequestHandler(CallToolRequestSchema)
              │
              ▼
     handleToolCall(name, args)
              │
              ▼
     readSheet(range)  →  google.sheets().spreadsheets.values.get()
              │
              ▼
     rowsToObjects(headers, dataRows)  →  Record<string,string>[]
              │
              ▼
     JSON.stringify()  →  content[0].text
```

## Mapa de Arquivos

| Arquivo / Diretório | Responsabilidade | Mexer quando... |
|---|---|---|
| `src/index.ts` | Tudo — servidor, ferramentas, auth | Adicionar/alterar ferramenta, mudar porta, ajustar lógica de filtro |
| `config/credentials.json` | Credenciais da Service Account Google | Renovar ou trocar a conta de serviço |
| `package.json` | Dependências e scripts | Adicionar lib, atualizar versão do SDK |
| `tsconfig.json` | Configuração do compilador TypeScript | Nunca, salvo mudança de target/module |
| `Dockerfile` | Build multi-stage para produção | Atualizar versão do Node ou adicionar arquivos ao container |
| `.env.example` | Template de variáveis de ambiente | Adicionar nova variável obrigatória |
| `.gitignore` | Arquivos excluídos do controle de versão | Adicionar novo artefato gerado |
| `.claude/settings.json` | Comandos pré-aprovados para Claude Code CLI | Adicionar novo comando de deploy ou build |
| `.claude/rules/express-stream.md` | Regra crítica do stream SSE | Nunca alterar sem consenso explícito |
| `.claude/rules/infra.md` | Padrões de deploy no GCP | Mudar região, projeto ou flags do Cloud Run |
| `specs/` | Especificações de novas ferramentas (spec-first) | Antes de implementar qualquer ferramenta nova |
| `README.md` | Documentação técnica completa | Após qualquer mudança arquitetural significativa |
| `CLAUDE.md` | Guia de contexto para IAs | Após mudança de padrões de código ou workflow |

## Funções Críticas em `src/index.ts`

| Função / Handler | Linha aprox. | O que faz |
|---|---|---|
| `readSheet(range)` | ~35 | Chama a Sheets API, retorna `string[][]` |
| `rowsToObjects(headers, rows)` | ~45 | Converte matriz em array de objetos JSON |
| `createMcpServer()` | ~55 | Cria Server MCP com os dois handlers registrados |
| `ListToolsRequestSchema` handler | dentro de `createMcpServer` | Retorna o array estático de 7 ferramentas |
| `CallToolRequestSchema` handler | dentro de `createMcpServer` | Switch com lógica de cada ferramenta |
| `app.get('/sse', ...)` | ~200 | Abre SSE, instancia Server + Transport por conexão |
| `app.post('/messages', ...)` | ~215 | Roteia stream bruto para o transport correto |

## Dependências Externas

| Pacote | Versão | Usado para |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.12 | Server, SSEServerTransport, schemas |
| `googleapis` | ^144 | Google Sheets API v4 |
| `express` | ^4.21 | Servidor HTTP, roteamento |
| `dotenv` | ^16 | Carrega `.env` em desenvolvimento |
