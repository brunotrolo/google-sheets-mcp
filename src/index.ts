import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Config & Auth
// ---------------------------------------------------------------------------

const SPREADSHEET_ID = process.env.SPREADSHEET_ID ?? '';

if (!SPREADSHEET_ID) {
  console.warn('[WARN] SPREADSHEET_ID não configurado – as chamadas às ferramentas falharão.');
}

const auth = new google.auth.GoogleAuth({
  keyFile: './config/credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// ---------------------------------------------------------------------------
// Sheets helpers
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

// Parser tolerante a formatos BR (1.234,56), US (1234.56), R$, % e (x) negativo.
function parseNumberBR(raw: string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  let s = String(raw).trim();
  if (s === '') return 0;

  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/R\$/gi, '').replace(/%/g, '').replace(/\s/g, '');

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

// ---------------------------------------------------------------------------
// MCP Server factory – one instance per SSE connection
// ---------------------------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: 'google-sheets-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // ── Tool discovery ────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_cockpit_ativas',
        description:
          'Lê a aba COCKPIT (range A10:Z500, cabeçalhos na linha 10). ' +
          'Retorna apenas posições onde STATUS, STATUS_OP, VENDA ou COMPRA ' +
          'contêm "ATIVO", ou onde QTDE é diferente de vazio.',
      },
      {
        name: 'get_cockpit_historico',
        description:
          'Lê a aba COCKPIT (range A10:Z500, cabeçalhos na linha 10). ' +
          'Retorna todas as linhas cujo STATUS é ENCERRADO ou EXERCIDA, ' +
          'com todos os campos (incluindo TRADE_MONTH, MAX_GAIN, PL_VALUE, SIDE).',
      },
      {
        name: 'get_cockpit_resumo_mensal',
        description:
          'Resumo mensal das operações encerradas/exercidas da aba COCKPIT, ' +
          'agrupado por TRADE_MONTH. Para cada mês retorna a soma de MAX_GAIN ' +
          'por SIDE (VENDA/COMPRA), prêmio líquido, P&L realizado e quantidade ' +
          'de operações.',
      },
      {
        name: 'get_screener_quantitativo',
        description:
          'Lê a aba SCREENER_QUANTITATIVO (A1:Z500). ' +
          'Retorna o mapeamento JSON das oportunidades estruturadas.',
      },
      {
        name: 'get_scanner_opcoes',
        description:
          'Lê a aba SCANNER_OPCOES (A1:Z500). ' +
          'Retorna dados agregados de liquidez e parâmetros de gregas.',
      },
      {
        name: 'get_maiores_lucros',
        description:
          'Lê a aba SELECAO_OPCOES_MAIORES_LUCROS (A1:Z500). ' +
          'Retorna o ranking das estruturas com maior taxa de prêmio teórica.',
      },
      {
        name: 'get_maiores_volumes',
        description:
          'Lê a aba SELECAO_MAIORES_VOLUMES (A1:Z500). ' +
          'Retorna o fluxo de volume de CALLs e PUTs.',
      },
      {
        name: 'get_tendencia_m9m21',
        description:
          'Lê a aba RANKING_TENDENCIA_M9M21 (A1:Z500). ' +
          'Aceita argumento opcional "ticker" (ex: PETR4) para filtrar ' +
          'a tendência M9M21 de um papel específico.',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: 'Código do ativo para filtrar (opcional).',
            },
          },
        },
      },
      {
        name: 'get_correl_ibov',
        description:
          'Lê a aba RANKING_CORREL_IBOV (A1:Z500). ' +
          'Retorna o coeficiente de correlação dos ativos frente ao índice.',
      },
    ],
  }));

  // ── Tool execution ─────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      if (!SPREADSHEET_ID) {
        throw new Error(
          'SPREADSHEET_ID não configurado. Defina a variável de ambiente antes de iniciar o servidor.',
        );
      }

      let result: string;

      switch (name) {
        // ── COCKPIT ──────────────────────────────────────────────────────────
        case 'get_cockpit_ativas': {
          // Range starts at row 10 → rows[0] is the header row (row 10),
          // rows[1..] are data rows (rows 11–500).
          const rows = await readSheet('COCKPIT!A10:Z500');

          if (rows.length < 2) {
            result = JSON.stringify({ data: [], message: 'Nenhum dado encontrado no range COCKPIT!A10:Z500.' });
            break;
          }

          const headers = rows[0] as string[];
          const dataRows = rows.slice(1) as string[][];
          const objects = rowsToObjects(headers, dataRows);

          // Resolve column keys (case-insensitive partial match).
          const findKey = (candidates: string[]): string | undefined =>
            candidates.reduce<string | undefined>((found, candidate) => {
              if (found) return found;
              return headers.find((h) => h.toUpperCase().includes(candidate));
            }, undefined);

          const statusKey    = findKey(['STATUS_OP', 'STATUS']);
          const vendaKey     = findKey(['VENDA']);
          const compraKey    = findKey(['COMPRA']);
          const qtdeKey      = findKey(['QTDE']);

          const filtered = objects.filter((obj) => {
            const containsAtivo = (key: string | undefined): boolean =>
              key !== undefined && obj[key]?.toUpperCase().includes('ATIVO') === true;

            const qtdeNaoVazia = qtdeKey !== undefined && obj[qtdeKey]?.trim() !== '';

            return (
              containsAtivo(statusKey) ||
              containsAtivo(vendaKey)  ||
              containsAtivo(compraKey) ||
              qtdeNaoVazia
            );
          });

          result = JSON.stringify(filtered, null, 2);
          break;
        }

        // ── COCKPIT HISTÓRICO ────────────────────────────────────────────────
        case 'get_cockpit_historico': {
          const rows = await readSheet('COCKPIT!A10:Z500');

          if (rows.length < 2) {
            result = JSON.stringify([]);
            break;
          }

          const headers = rows[0] as string[];
          const dataRows = rows.slice(1) as string[][];
          const objects = rowsToObjects(headers, dataRows);

          // STATUS column = primeiro header contendo "STATUS" mas NÃO "STATUS_OP".
          const statusKey = headers.find(
            (h) => h.toUpperCase().includes('STATUS') && !h.toUpperCase().includes('STATUS_OP'),
          );

          const filtered = statusKey
            ? objects.filter((obj) => {
                const v = (obj[statusKey] ?? '').trim().toUpperCase();
                return v === 'ENCERRADO' || v === 'EXERCIDA';
              })
            : [];

          result = JSON.stringify(filtered, null, 2);
          break;
        }

        // ── COCKPIT RESUMO MENSAL ────────────────────────────────────────────
        case 'get_cockpit_resumo_mensal': {
          const rows = await readSheet('COCKPIT!A10:Z500');

          if (rows.length < 2) {
            result = JSON.stringify([]);
            break;
          }

          const headers = rows[0] as string[];
          const dataRows = rows.slice(1) as string[][];
          const objects = rowsToObjects(headers, dataRows);

          const statusKey = headers.find(
            (h) => h.toUpperCase().includes('STATUS') && !h.toUpperCase().includes('STATUS_OP'),
          );
          const tradeMonthKey = headers.find((h) => h.toUpperCase().includes('TRADE_MONTH'));
          const maxGainKey    = headers.find((h) => h.toUpperCase() === 'MAX_GAIN');
          const plValueKey    = headers.find((h) => h.toUpperCase() === 'PL_VALUE');
          const sideKey       = headers.find((h) => h.toUpperCase() === 'SIDE');

          if (!statusKey || !tradeMonthKey || !maxGainKey || !plValueKey || !sideKey) {
            throw new Error(
              `Colunas obrigatórias ausentes na aba COCKPIT. Encontradas: ` +
              `STATUS=${statusKey}, TRADE_MONTH=${tradeMonthKey}, ` +
              `MAX_GAIN=${maxGainKey}, PL_VALUE=${plValueKey}, SIDE=${sideKey}.`,
            );
          }

          interface Bucket {
            trade_month: string;
            max_gain_venda: number;
            max_gain_compra: number;
            pl_realizado: number;
            qtde_operacoes: number;
          }
          const buckets = new Map<string, Bucket>();

          for (const obj of objects) {
            const status = (obj[statusKey] ?? '').trim().toUpperCase();
            if (status !== 'ENCERRADO' && status !== 'EXERCIDA') continue;

            const month = (obj[tradeMonthKey] ?? '').trim();
            if (month === '') continue;

            const side    = (obj[sideKey] ?? '').trim().toUpperCase();
            const maxGain = parseNumberBR(obj[maxGainKey]);
            const plValue = parseNumberBR(obj[plValueKey]);

            let bucket = buckets.get(month);
            if (!bucket) {
              bucket = {
                trade_month: month,
                max_gain_venda: 0,
                max_gain_compra: 0,
                pl_realizado: 0,
                qtde_operacoes: 0,
              };
              buckets.set(month, bucket);
            }

            if (side === 'VENDA')  bucket.max_gain_venda  += maxGain;
            if (side === 'COMPRA') bucket.max_gain_compra += maxGain;
            bucket.pl_realizado += plValue;
            bucket.qtde_operacoes += 1;
          }

          const round2 = (n: number) => Math.round(n * 100) / 100;
          const resumo = Array.from(buckets.values())
            .sort((a, b) => a.trade_month.localeCompare(b.trade_month))
            .map((b) => ({
              trade_month: b.trade_month,
              max_gain_venda:  round2(b.max_gain_venda),
              max_gain_compra: round2(b.max_gain_compra),
              premio_liquido:  round2(b.max_gain_venda + b.max_gain_compra),
              pl_realizado:    round2(b.pl_realizado),
              qtde_operacoes:  b.qtde_operacoes,
            }));

          result = JSON.stringify(resumo, null, 2);
          break;
        }

        // ── SCREENER_QUANTITATIVO ─────────────────────────────────────────
        case 'get_screener_quantitativo': {
          const rows = await readSheet('SCREENER_QUANTITATIVO!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
          break;
        }

        // ── SCANNER_OPCOES ────────────────────────────────────────────────
        case 'get_scanner_opcoes': {
          const rows = await readSheet('SCANNER_OPCOES!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
          break;
        }

        // ── MAIORES LUCROS ────────────────────────────────────────────────
        case 'get_maiores_lucros': {
          const rows = await readSheet('SELECAO_OPCOES_MAIORES_LUCROS!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
          break;
        }

        // ── MAIORES VOLUMES ───────────────────────────────────────────────
        case 'get_maiores_volumes': {
          const rows = await readSheet('SELECAO_MAIORES_VOLUMES!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
          break;
        }

        // ── TENDÊNCIA M9M21 ───────────────────────────────────────────────
        case 'get_tendencia_m9m21': {
          const rows = await readSheet('RANKING_TENDENCIA_M9M21!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          let objects = rowsToObjects(headers, dataRows);

          const ticker = (args as Record<string, unknown>)['ticker'] as string | undefined;
          if (ticker && ticker.trim() !== '') {
            const tickerKey = headers.find(
              (h) =>
                h.toUpperCase() === 'TICKER' ||
                h.toUpperCase() === 'ATIVO'  ||
                h.toUpperCase().includes('TICKER'),
            );
            if (tickerKey) {
              objects = objects.filter(
                (obj) => obj[tickerKey]?.toUpperCase() === ticker.trim().toUpperCase(),
              );
            }
          }

          result = JSON.stringify(objects, null, 2);
          break;
        }

        // ── CORRELAÇÃO IBOV ───────────────────────────────────────────────
        case 'get_correl_ibov': {
          const rows = await readSheet('RANKING_CORREL_IBOV!A1:Z500');
          if (rows.length < 2) { result = JSON.stringify([]); break; }
          const [headers, ...dataRows] = rows as [string[], ...string[][]];
          result = JSON.stringify(rowsToObjects(headers, dataRows), null, 2);
          break;
        }

        default:
          throw new Error(`Ferramenta desconhecida: "${name}"`);
      }

      return { content: [{ type: 'text', text: result }] };
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
// Express server
//
// CRITICAL: /sse and /messages MUST be registered BEFORE any body-parser
// middleware. express.json() intercepts the raw request stream, which breaks
// transport.handlePostMessage() with "stream is not readable".
// ---------------------------------------------------------------------------

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const transports = new Map<string, SSEServerTransport>();

// GET /sse – open SSE channel
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  transports.set(transport.sessionId, transport);
  res.on('close', () => {
    transports.delete(transport.sessionId);
    console.log(`[SSE] session ${transport.sessionId} disconnected`);
  });

  console.log(`[SSE] session ${transport.sessionId} connected`);
  await server.connect(transport);
});

// POST /messages – raw MCP stream (NO body parser before this route)
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

// JSON parser is safe only AFTER the critical routes above
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    spreadsheetId: SPREADSHEET_ID || '(not set)',
    activeSessions: transports.size,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🚀 Google Sheets MCP Server running on port ${PORT}`);
  console.log(`   SSE      → http://localhost:${PORT}/sse`);
  console.log(`   Messages → http://localhost:${PORT}/messages`);
  console.log(`   Health   → http://localhost:${PORT}/health`);
  console.log(`   Sheet    → ${SPREADSHEET_ID || '(SPREADSHEET_ID not set)'}\n`);
});
