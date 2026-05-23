# Regra Crítica — Isolamento do Stream SSE no Express

**Escopo:** ativada sempre que `src/index.ts` for modificado.

---

## A Regra

**É ESTRITAMENTE PROIBIDO registrar `app.use(express.json())`, `app.use(bodyParser.json())`, `app.use(bodyParser.urlencoded())` ou qualquer outro middleware de parsing de body ANTES das rotas `/sse` e `/messages`.**

## Por que esta regra existe

O endpoint `POST /messages` recebe o stream binário bruto de mensagens JSON-RPC do MCP SDK. O método `transport.handlePostMessage(req, res)` precisa ler esse stream diretamente.

Quando um body-parser do Express é registrado globalmente (antes da rota), ele:
1. Intercepta a requisição
2. Lê e consome todo o stream da requisição
3. Armazena o resultado parseado em `req.body`

Quando o MCP SDK tenta ler o stream original, ele já foi **totalmente consumido** e está em estado de finalizado (`readable = false`). O resultado é:

```
InternalServerError: stream is not readable
```

Essa falha é silenciosa do lado do cliente — a conexão SSE continua ativa, mas nenhum tool call funciona.

## Ordem Obrigatória no Express

```typescript
// ✅ CORRETO
const app = express();

app.get('/sse', sseHandler);          // 1º — sem body parser
app.post('/messages', msgHandler);    // 2º — stream intacto
app.use(express.json());              // 3º — body parser (rotas abaixo podem usá-lo)
app.get('/health', healthHandler);    // 4º — usa req.body normalmente
```

```typescript
// ❌ ERRADO — quebra silenciosamente
const app = express();

app.use(express.json());              // intercepta /messages
app.get('/sse', sseHandler);
app.post('/messages', msgHandler);    // stream consumido → erro 500
```

## Verificação Rápida

Ao revisar `src/index.ts`, confirme que a linha contendo `express.json()` aparece **depois** das definições de `/sse` e `/messages` no arquivo. Qualquer inversão dessa ordem deve ser corrigida antes do commit.
