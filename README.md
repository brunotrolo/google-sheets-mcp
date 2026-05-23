# google-sheets-mcp

Servidor MCP (Model Context Protocol) em Node.js/TypeScript que expõe abas de um Google Sheets como ferramentas nativas para o Claude Web, Claude Mobile e qualquer cliente MCP compatível.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Ferramentas Disponíveis](#ferramentas-disponíveis)
3. [Arquitetura Local](#arquitetura-local)
4. [Arquitetura GCP — Cloud Run](#arquitetura-gcp--cloud-run)
5. [Bugs Críticos Resolvidos](#bugs-críticos-resolvidos)
6. [Guia de Deploy no GCP](#guia-de-deploy-no-gcp)
7. [Configuração Local](#configuração-local)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Visão Geral

```
Claude Web / Claude Mobile
        │  SSE (GET /sse)
        │  JSON-RPC (POST /messages)
        ▼
┌─────────────────────────────────────┐
│  Express Server (TypeScript)        │
│  ├── GET  /sse      → SSE channel   │
│  ├── POST /messages → MCP stream    │
│  └── GET  /health   → status        │
│                                     │
│  MCP SDK (@modelcontextprotocol)    │
│  └── 7 ferramentas do Google Sheets │
└─────────────────────────────────────┘
        │  googleapis v4
        ▼
┌──────────────────────┐
│  Google Sheets API   │
│  (Service Account)   │
└──────────────────────┘
```

**Stack:** Node.js 22 · TypeScript 5 · Express 4 · `@modelcontextprotocol/sdk` · `googleapis`

---

## Ferramentas Disponíveis

| Ferramenta | Aba lida | Range | Lógica de filtro |
|---|---|---|---|
| `get_cockpit_ativas` | `COCKPIT` | `A10:Z500` | STATUS/STATUS_OP/VENDA/COMPRA contém "ATIVO" ou QTDE não-vazia |
| `get_screener_quantitativo` | `SCREENER_QUANTITATIVO` | `A1:Z500` | Todos os dados |
| `get_scanner_opcoes` | `SCANNER_OPCOES` | `A1:Z500` | Todos os dados |
| `get_maiores_lucros` | `SELECAO_OPCOES_MAIORES_LUCROS` | `A1:Z500` | Todos os dados |
| `get_maiores_volumes` | `SELECAO_MAIORES_VOLUMES` | `A1:Z500` | Todos os dados |
| `get_tendencia_m9m21` | `RANKING_TENDENCIA_M9M21` | `A1:Z500` | Filtro opcional por `ticker` |
| `get_correl_ibov` | `RANKING_CORREL_IBOV` | `A1:Z500` | Todos os dados |

---

## Arquitetura Local

```
src/index.ts
│
├── GoogleAuth           ← credenciais via ./config/credentials.json
├── readSheet()          ← wrapper da googleapis Sheets v4
├── rowsToObjects()      ← string[][] → Record<string,string>[]
│
├── createMcpServer()
│   ├── ListToolsRequestSchema  → retorna TOOL_REGISTRY estático (array inline)
│   └── CallToolRequestSchema   → roteia para handler de cada ferramenta
│
└── Express app
    ├── GET  /sse       ← abre SSE, cria Server + SSEServerTransport por conexão
    ├── POST /messages  ← stream bruto → transport.handlePostMessage()
    ├── [express.json() instalado AQUI, após as rotas críticas]
    └── GET  /health
```

---

## Arquitetura GCP — Cloud Run

### Por que Cloud Run?

O protocolo SSE (Server-Sent Events) exige uma **conexão HTTP de longa duração** — o servidor empurra eventos ao cliente sem que ele precise fazer polling. O Cloud Run gerencia isso nativamente sem configuração de VMs.

### Por que `us-east1` (Carolina do Sul)?

O Claude Web e o Claude Mobile da Anthropic têm infraestrutura primária nos **EUA (East Coast)**. Rodar o container em `us-east1` elimina a latência transcontinental no handshake SSE inicial.

Com o servidor em `southamerica-east1` (São Paulo), o handshake TCP+TLS+SSE atravessa o Atlântico e o handshake do protocolo MCP frequentemente ultrapassa o timeout do cliente (~5 s), causando falhas de conexão silenciosas. Em `us-east1`, o RTT cai para < 20 ms.

### Artifact Registry

O Docker image é armazenado no **Artifact Registry** (substituto do Container Registry) na mesma região do serviço:

```
us-east1-docker.pkg.dev/<PROJECT_ID>/<REPO>/google-sheets-mcp
```

Isso evita egress de rede entre regiões no momento do `gcloud run deploy`.

### Parâmetros de Produção do Cloud Run

| Parâmetro | Valor | Motivo |
|---|---|---|
| `--no-cpu-throttling` | ativo | Sem esse flag, o Cloud Run congela a CPU quando não há requisições HTTP em andamento. Conexões SSE ficam abertas mas silenciosas — o throttling encerra o processo, derrubando todas as sessões ativas. |
| `--timeout=3600` | 3600 s | Tempo máximo de uma requisição. SSE é uma requisição que dura enquanto o cliente estiver conectado. O padrão (300 s) mata a conexão em 5 minutos. |
| `--min-instances=1` | 1 | Evita cold start que causa falha no handshake SSE inicial. |
| `--concurrency=80` | padrão | Cada instância suporta até 80 conexões SSE simultâneas. |

### Segurança — Secret Manager

A variável `SPREADSHEET_ID` (e qualquer token de API) nunca deve ser hardcoded ou injetada via `.env` em produção. Use o Secret Manager do GCP e injete como variável de ambiente no deploy:

```bash
# Criar o secret
echo -n "SEU_SPREADSHEET_ID" | \
  gcloud secrets create SPREADSHEET_ID --data-file=-

# Referenciar no deploy
--set-secrets="SPREADSHEET_ID=SPREADSHEET_ID:latest"
```

---

## Bugs Críticos Resolvidos

### Bug 1 — `InternalServerError: stream is not readable`

**Sintoma:** O servidor inicializa, o cliente SSE conecta, mas ao enviar a primeira mensagem o servidor responde com `500 Internal Server Error` e o log mostra `stream is not readable`.

**Causa:** `app.use(express.json())` registrado **antes** da rota `POST /messages`. O middleware de body-parsing do Express **consome o stream** da requisição HTTP (lendo e parseando o body). Quando o handler do MCP tenta ler o mesmo stream, ele já foi esgotado.

**Solução:** Registrar `/sse` e `/messages` **antes** de qualquer middleware de body-parsing:

```typescript
// CORRETO — ordem importa no Express
app.get('/sse', handler);          // 1º
app.post('/messages', handler);    // 2º  ← stream intacto
app.use(express.json());           // 3º  ← só afeta rotas registradas DEPOIS
app.get('/health', handler);       // 4º  ← pode usar JSON parseado
```

```typescript
// ERRADO — quebra o stream
app.use(express.json());           // intercepta /messages também
app.get('/sse', handler);
app.post('/messages', handler);    // stream já consumido → erro
```

---

### Bug 2 — "Este conector não possui ferramentas disponíveis" (Claude Web/Mobile)

**Sintoma:** O servidor sobe, a conexão SSE é estabelecida, mas o Claude Web exibe "Este conector não possui ferramentas disponíveis" mesmo com ferramentas implementadas.

**Causa raiz — Cache da Anthropic:** O Claude Web/Mobile realiza uma chamada `tools/list` durante o handshake e **cacheia o resultado**. Se o servidor responder com uma lista dinâmica (buscando ferramentas de uma API externa, banco de dados ou arquivo), e essa chamada falhar ou retornar vazio no momento do handshake, o cache fica com lista vazia. Reconexões não forçam re-fetch.

**Solução — TOOL_REGISTRY estático:** Definir o array de ferramentas diretamente no handler `ListToolsRequestSchema`, sem dependências externas:

```typescript
// CORRETO — array inline, zero dependências, resposta instantânea
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'get_cockpit_ativas',        description: '...' },
    { name: 'get_screener_quantitativo', description: '...' },
    // ... todas as ferramentas declaradas explicitamente
  ],
}));
```

```typescript
// ARRISCADO — se fetchTools() falhar no handshake, o cache fica vazio
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: await fetchToolsFromExternalSource(), // latência + ponto de falha
}));
```

**Regra:** O retorno de `ListToolsRequestSchema` deve ser **síncrono ou quasi-síncrono** e **nunca depender de I/O externo**.

---

## Guia de Deploy no GCP

### Pré-requisitos

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud config set run/region us-east1

# Habilitar APIs necessárias
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sheets.googleapis.com
```

### 1. Criar o Artifact Registry

```bash
gcloud artifacts repositories create mcp-servers \
  --repository-format=docker \
  --location=us-east1 \
  --description="MCP server images"

# Autenticar o Docker
gcloud auth configure-docker us-east1-docker.pkg.dev
```

### 2. Build e Push da Imagem

```bash
IMAGE="us-east1-docker.pkg.dev/<PROJECT_ID>/mcp-servers/google-sheets-mcp"

# Build local + push
docker build -t "$IMAGE:latest" .
docker push "$IMAGE:latest"

# Ou via Cloud Build (sem Docker local)
gcloud builds submit --tag "$IMAGE:latest"
```

### 3. Criar Secrets

```bash
# SPREADSHEET_ID
echo -n "<SEU_SPREADSHEET_ID>" | \
  gcloud secrets create SPREADSHEET_ID --data-file=-

# Conceder acesso à Service Account do Cloud Run
gcloud secrets add-iam-policy-binding SPREADSHEET_ID \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Deploy no Cloud Run

```bash
gcloud run deploy google-sheets-mcp \
  --image "$IMAGE:latest" \
  --region us-east1 \
  --platform managed \
  --no-cpu-throttling \
  --timeout=3600 \
  --min-instances=1 \
  --memory=512Mi \
  --set-secrets="SPREADSHEET_ID=SPREADSHEET_ID:latest" \
  --allow-unauthenticated
```

### 5. Verificar

```bash
SERVICE_URL=$(gcloud run services describe google-sheets-mcp \
  --region us-east1 --format='value(status.url)')

curl "$SERVICE_URL/health"
# {"status":"ok","spreadsheetId":"...","activeSessions":0}
```

### Dockerfile de Referência

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY config/ ./config/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Configuração Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar credenciais da Service Account
cp /caminho/para/sua-service-account.json config/credentials.json

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env: SPREADSHEET_ID=<id_da_planilha>

# 4. Build e start
npm run build
npm start

# Verificar
curl http://localhost:3000/health
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SPREADSHEET_ID` | Sim | ID da planilha (URL: `/spreadsheets/d/<ID>/edit`) |
| `PORT` | Não (padrão: 3000) | Porta do servidor HTTP |
