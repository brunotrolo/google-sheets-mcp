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
        │  SSE legacy:
        │  GET  /sse     → handshake e canal de respostas
        │  POST /messages → JSON-RPC (initialize, tools/list, tools/call)
        ▼
┌─────────────────────────────────────┐
│  Express Server (TypeScript)        │
│  ├── GET  /sse      → SSE channel   │
│  └── POST /messages → MCP stream    │
│                                     │
│  MCP SDK (@modelcontextprotocol)    │
│  └── 10 ferramentas do Sheets       │
└─────────────────────────────────────┘
        │  googleapis v4
        ▼
┌──────────────────────┐
│  Google Sheets API   │
│  (Service Account)   │
└──────────────────────┘
```

**Stack:** Node.js 20 · TypeScript 5.3 · Express 4 · `@modelcontextprotocol/sdk@^1.0.1` · `googleapis@^134`

> Por que SDK na versão `^1.0.1` (resolve para 1.29.0)? É a versão da imagem que o Claude Web aceita. Versões mais novas mudaram defaults de transporte e quebraram a compatibilidade — ver `.claude/rules/mcp-compatibility.md`.

---

## Ferramentas Disponíveis

| Ferramenta | Aba lida | Range | Lógica / parâmetros |
|---|---|---|---|
| `get_cockpit_ativas` | `COCKPIT` | `A10:Z500` | STATUS / STATUS_OP / VENDA/COMPRA contém "ATIVO" ou QTDE não-vazia |
| `get_cockpit_historico` | `COCKPIT` | `A10:Z500` | STATUS ∈ {ENCERRADO, EXERCIDA}. Filtros opcionais `trade_month` (substring) e `ticker` (match exato) |
| `get_resumo_mensal` | `COCKPIT` | `A10:Z500` | Agrega por TRADE_MONTH: `max_gain_venda` + `max_gain_compra` + `premio_liquido` + `pl_realizado` (só encerradas) + `qtde_encerradas` + `qtde_ativas`. Ordenado por mês |
| `get_cockpit_por_ativo` | `COCKPIT` | `A10:Z500` | Filtro obrigatório `ticker`. Devolve qualquer STATUS |
| `get_screener_quantitativo` | `SCREENER_QUANTITATIVO` | `A1:Z200` | Todos os dados |
| `get_scanner_opcoes` | `SCANNER_OPCOES` | `A1:Z500` | Todos os dados |
| `get_maiores_lucros` | `SELECAO_OPCOES_MAIORES_LUCROS` | `A1:Z200` | Todos os dados |
| `get_maiores_volumes` | `SELECAO_MAIORES_VOLUMES` | `A1:Z200` | Todos os dados |
| `get_tendencia_m9m21` | `RANKING_TENDENCIA_M9M21` | `A1:Z300` | Todos os dados |
| `get_correl_ibov` | `RANKING_CORREL_IBOV` | `A1:Z300` | Todos os dados |

Todas as ferramentas têm `inputSchema` explícito mesmo quando não recebem argumentos
(`{ type: 'object', properties: {} }`). Isso é obrigatório — ver Bug 3 abaixo.

---

## Arquitetura Local

```
src/index.ts
│
├── GoogleAuth           ← credenciais via ./config/credentials.json
├── parseNumberBR()      ← helper para formato BR (1.234,56) / US / R$ / %
│
├── mcpServer (Server global)
│   ├── ListToolsRequestSchema  → array inline de 10 ferramentas (estático)
│   └── CallToolRequestSchema   → if/else por nome, fetch da aba, transformação
│
├── transport (SSEServerTransport global)
│   └── reciclado a cada GET /sse: await mcpServer.close() → novo transport → connect
│
└── Express app
    ├── GET  /sse       ← reseta server + cria transport novo + connect
    └── POST /messages  ← transport.handlePostMessage()
```

Server e Transport são **globais** (não factory por requisição). Em cada nova
conexão `/sse`, o transport anterior é fechado (`mcpServer.close()`) antes de
criar o novo. Isso serializa conexões (uma por vez, suficiente para o caso de
uso típico) mas evita o bug `Already connected to a transport` do SDK.

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
us-east1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/oplab-sheets-mcp
```

A tag `working-baseline-v2` aponta para a imagem da revisão 00015 (PR #12) —
referência estável para rollback.

### Parâmetros de Produção do Cloud Run

| Parâmetro | Valor | Motivo |
|---|---|---|
| `--no-cpu-throttling` | ativo | Sem esse flag, o Cloud Run congela a CPU quando não há requisições HTTP em andamento. Conexões SSE ficam abertas mas silenciosas — o throttling encerra o processo, derrubando todas as sessões ativas. |
| `--timeout=3600` | 3600 s | Tempo máximo de uma requisição. SSE é uma requisição que dura enquanto o cliente estiver conectado. O padrão (300 s) mata a conexão em 5 minutos. |
| `--min-instances=1` | 1 | Evita cold start que causa falha no handshake SSE inicial. |
| `--concurrency=80` | padrão | Cada instância suporta até 80 conexões SSE simultâneas. |

### Deploy Seguro — `--no-traffic` + tag preview

Qualquer mudança deve ser deployada como revisão nova **sem migrar tráfego**, testada num URL próprio, e só então promovida. Procedimento completo em `.claude/rules/infra.md`.

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

**Causa:** `app.use(express.json())` registrado **antes** da rota `POST /messages`. O middleware de body-parsing do Express **consome o stream** da requisição HTTP. Quando o handler do MCP tenta ler o mesmo stream, ele já foi esgotado.

**Solução:** Não registrar `express.json()` global. A versão atual do servidor não usa body parser — `transport.handlePostMessage(req, res)` lê o stream bruto direto. Ver `.claude/rules/express-stream.md`.

---

### Bug 2 — `Error: Already connected to a transport`

**Sintoma:** Após a primeira conexão SSE, qualquer segunda conexão derruba o processo com:

> `Error: Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.`

**Causa:** Em versões antigas do código (não mais neste repo), `await mcpServer.connect(transport)` era chamado a cada `GET /sse` sem fechar a conexão anterior. O Protocol do SDK lança esse erro se a mesma instância de Server receber `.connect()` duas vezes.

**Solução (na versão atual):**

```typescript
app.get('/sse', async (req, res) => {
  if (transport) {
    try { await mcpServer.close(); }
    catch (e) { console.error('Ignorando erro ao fechar transport antigo:', e); }
  }
  transport = new SSEServerTransport('/messages', res);
  await mcpServer.connect(transport);
});
```

Antes de criar o novo transport, fechamos o anterior. Server fica único, transport é renovado por conexão.

---

### Bug 3 — "Este conector não possui ferramentas disponíveis" (Claude Web)

**Sintoma:** Servidor sobe, handshake completa, mas o conector mostra mensagem de "sem ferramentas" ou "Não foi possível recarregar".

**Causas observadas e soluções:**

1. **`inputSchema` ausente em alguma ferramenta**
   O conector exige `inputSchema` em **todas** as ferramentas, mesmo sem argumentos. Solução: incluir `inputSchema: { type: 'object', properties: {} }` em qualquer ferramenta sem argumentos.

2. **Imagem deployada divergente do repo**
   Acontece quando o Cloud Run rodava um source diferente (buildpacks, deploy manual antigo). Sintoma: `/health` retorna 404 ou banner de log não bate. Solução: verifique a imagem ativa com `gcloud run revisions describe`, extraia o código com `docker pull` + `docker cp` se precisar resgatar uma versão funcional, e sincronize com o repo.

3. **SDK em versão muito nova quebra defaults**
   O SDK `^1.12+` mudou comportamentos de transporte e parsing. Versão fixada em `^1.0.1` (resolve para 1.29.0) é a que o Claude Web aceita atualmente.

4. **Cache do conector na Anthropic**
   Depois de uma versão quebrada, o conector pode ficar com o estado "sem ferramentas" cacheado. Solução: remover o conector do Claude Web e adicionar de novo.

Detalhes operacionais em `.claude/rules/mcp-compatibility.md`.

---

## Guia de Deploy no GCP

### Pré-requisitos

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>

# Habilitar APIs necessárias
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  sheets.googleapis.com
```

### 1. Criar Secrets (uma vez)

```bash
echo -n "<SEU_SPREADSHEET_ID>" | \
  gcloud secrets create SPREADSHEET_ID --data-file=-

# Permitir Cloud Run acessar
gcloud secrets add-iam-policy-binding SPREADSHEET_ID \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Deploy (build via Cloud Build, sem `docker` local)

Procedimento padrão usando `--no-traffic` e tag preview para validar antes
de migrar produção:

```bash
COMMIT=$(git rev-parse --short HEAD)

# 1) Cria nova revisão SEM migrar tráfego
gcloud run deploy oplab-sheets-mcp \
  --source . --region=us-east1 \
  --no-cpu-throttling --timeout=3600 --min-instances=1 \
  --memory=512Mi \
  --update-env-vars=BUILD_ID="$COMMIT" \
  --set-secrets="SPREADSHEET_ID=SPREADSHEET_ID:latest" \
  --clear-base-image \
  --no-traffic

# 2) Cria URL próprio para a nova revisão (substitua pelo nome real impresso acima)
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --update-tags=preview=<NOVA-REVISAO>

# 3) Teste o URL preview com curl e/ou Claude Web:
#    https://preview---oplab-sheets-mcp-<HASH>.run.app/sse

# 4) Se OK, migra tráfego:
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 --to-latest

# 5) Limpa a tag preview
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --remove-tags=preview
```

### 3. Verificar (curl manual)

```bash
URL=$(gcloud run services describe oplab-sheets-mcp \
  --region=us-east1 --format='value(status.url)')

# Abre SSE para pegar sessionId
rm -f /tmp/sse.log
curl -sN "$URL/sse" > /tmp/sse.log & sleep 3
SID=$(grep -oE "sessionId=[a-f0-9-]+" /tmp/sse.log | head -1 | cut -d= -f2)

# Lista ferramentas
curl -s -X POST "$URL/messages?sessionId=$SID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' > /dev/null
sleep 2
cat /tmp/sse.log   # Deve mostrar JSON com 10 ferramentas
```

### Dockerfile de Referência

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

Single-stage simples. `node:20-slim` para minimizar tamanho. `EXPOSE 8080`
porque o Cloud Run injeta `PORT=8080` por padrão.

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
```

O servidor não expõe `/health`. Para validar localmente, use o curl
de `tools/list` mostrado acima.

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SPREADSHEET_ID` | Sim | ID da planilha (URL: `/spreadsheets/d/<ID>/edit`) |
| `PORT` | Não (padrão: 8080) | Porta do servidor HTTP |
| `BUILD_ID` | Não | Identificador de build (commit SHA), útil em logs |
