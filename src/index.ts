import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Config & Auth
// ---------------------------------------------------------------------------

const SPREADSHEET_ID = process.env.SPREADSHEET_ID ?? '';

if (!SPREADSHEET_ID) {
  console.warn('[WARN] SPREADSHEET_ID not set – tool calls will fail until it is configured.');
}

const auth = new google.auth.GoogleAuth({
  keyFile: './config/credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// ---------------------------------------------------------------------------
// Sheets helper
// ---------------------------------------------------------------------------

async function readSheet(range: string): Promise<string[][]> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return (response.data.values as string[][] | null | undefined) ?? [];
}

function rowsToObjects(
  headers: string[],
  rows: string[][],
): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? '';
    });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Static Tool Registry
// ---------------------------------------------------------------------------

const TOOL_REGISTRY: Tool[] = [
  {
    name: 'get_cockpit_ativas',
    description:
      'Lê a aba COCKPIT do Google Sheets. Ignora as primeiras 9 linhas e usa a linha 10 como cabeçalho. Retorna apenas as posições onde a coluna STATUS é exatamente "ATIVO".',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_screener_quantitativo',
    description:
      'Lê a aba SCREENER_QUANTITATIVO a partir da linha 1 e retorna o mapeamento JSON das oportunidades estruturadas.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_scanner_opcoes',
    description:
      'Lê a aba SCANNER_OPCOES a partir da linha 1 e retorna dados agregados de liquidez e parâmetros de gregas.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_maiores_lucros',
    description:
      'Lê a aba SELECAO_OPCOES_MAIORES_LUCROS a partir da linha 1 e retorna o ranking das estruturas com maior taxa de prêmio teórica.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_maiores_volumes',
    description:
      'Lê a aba SELECAO_MAIORES_VOLUMES a partir da linha 1 e retorna o fluxo de volume de CALLs e PUTs.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_tendencia_m9m21',
    description:
      'Lê a aba RANKING_TENDENCIA_M9M21 a partir da linha 1. Aceita argumento opcional "ticker" para filtrar a tendência (M9M21_TREND) de um papel específico.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description:
            'Código do ativo (ex: PETR4) para filtrar resultados. Se omitido, retorna todos os ativos.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_correl_ibov',
    description:
      'Lê a aba RANKING_CORREL_IBOV a partir da linha 1 e retorna o coeficiente de correlação dos ativos frente ao índice.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID não configurado. Defina a variável de ambiente antes de iniciar o servidor.');
  }

  switch (name) {
    case 'get_cockpit_ativas': {
      // Fetch the full COCKPIT sheet; line 10 (index 9) is the header row.
      const allRows = await readSheet('COCKPIT');
      if (allRows.length < 10) {
        return JSON.stringify({ data: [], message: 'A aba COCKPIT possui menos de 10 linhas.' });
      }

      const headers = allRows[9] as string[];
      const dataRows = allRows.slice(10) as string[][];

      if (!headers || headers.length === 0) return JSON.stringify([]);

      const objects = rowsToObjects(headers, dataRows);

      // Find the status column by name (case-insensitive).
      const statusKey = headers.find(
        (h) =>
          h.toUpperCase() === 'STATUS' ||
          h.toUpperCase().includes('STATUS') ||
          h.toUpperCase().includes('SITUACAO') ||
          h.toUpperCase().includes('SITUAÇÃO'),
      );

      if (!statusKey) {
        // No recognisable status column – return all rows with a warning.
        return JSON.stringify({
          warning: 'Coluna de status não encontrada. Retornando todas as linhas.',
          data: objects,
        });
      }

      const filtered = objects.filter((obj) => obj[statusKey] === 'ATIVO');
      return JSON.stringify(filtered, null, 2);
    }

    case 'get_screener_quantitativo': {
      const rows = await readSheet('SCREENER_QUANTITATIVO');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      return JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
    }

    case 'get_scanner_opcoes': {
      const rows = await readSheet('SCANNER_OPCOES');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      return JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
    }

    case 'get_maiores_lucros': {
      const rows = await readSheet('SELECAO_OPCOES_MAIORES_LUCROS');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      return JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
    }

    case 'get_maiores_volumes': {
      const rows = await readSheet('SELECAO_MAIORES_VOLUMES');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      return JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
    }

    case 'get_tendencia_m9m21': {
      const rows = await readSheet('RANKING_TENDENCIA_M9M21');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      let objects = rowsToObjects(headers, dataRows);

      const ticker = args['ticker'] as string | undefined;
      if (ticker && ticker.trim() !== '') {
        // Find the ticker/ativo column.
        const tickerKey = headers.find(
          (h) =>
            h.toUpperCase() === 'TICKER' ||
            h.toUpperCase() === 'ATIVO' ||
            h.toUpperCase().includes('TICKER') ||
            h.toUpperCase().includes('ATIVO'),
        );
        if (tickerKey) {
          objects = objects.filter(
            (obj) => obj[tickerKey]?.toUpperCase() === ticker.toUpperCase(),
          );
        }
      }

      return JSON.stringify(objects, null, 2);
    }

    case 'get_correl_ibov': {
      const rows = await readSheet('RANKING_CORREL_IBOV');
      if (rows.length < 2) return JSON.stringify([]);
      const [headers, ...dataRows] = rows as [string[], ...string[][]];
      return JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// MCP Server factory (one instance per SSE connection)
// ---------------------------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: 'google-sheets-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_REGISTRY,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      const result = await handleToolCall(name, args as Record<string, unknown>);
      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Erro ao executar "${name}": ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Express + SSE Transport
// 🚨 CRITICAL: /sse and /messages routes MUST be registered BEFORE any
//    global JSON parser middleware. Express body-parsers intercept the raw
//    request stream, which breaks transport.handlePostMessage().
// ---------------------------------------------------------------------------

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Active SSE transports keyed by sessionId.
const transports = new Map<string, SSEServerTransport>();

// GET /sse – establish Server-Sent Events connection.
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    transports.delete(transport.sessionId);
    console.log(`[SSE] Client disconnected – session ${transport.sessionId} removed.`);
  });

  console.log(`[SSE] New client connected – session ${transport.sessionId}`);
  await server.connect(transport);
});

// POST /messages – raw MCP message stream (NO body parser applied before this).
app.post('/messages', async (req, res) => {
  const sessionId = req.query['sessionId'] as string | undefined;

  if (!sessionId) {
    res.status(400).send('Missing sessionId query parameter.');
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).send(`Session "${sessionId}" not found.`);
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Health-check (JSON parser is safe AFTER the critical routes above).
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    spreadsheetId: SPREADSHEET_ID || '(not set)',
    activeSessions: transports.size,
    tools: TOOL_REGISTRY.map((t) => t.name),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🚀 Google Sheets MCP Server iniciado`);
  console.log(`   SSE endpoint : http://localhost:${PORT}/sse`);
  console.log(`   Messages     : http://localhost:${PORT}/messages`);
  console.log(`   Health check : http://localhost:${PORT}/health`);
  console.log(`   Planilha     : ${SPREADSHEET_ID || '(SPREADSHEET_ID não configurado)'}`);
  console.log(`   Ferramentas  : ${TOOL_REGISTRY.map((t) => t.name).join(', ')}\n`);
});
