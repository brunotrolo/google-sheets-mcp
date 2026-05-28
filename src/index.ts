import express from 'express';
import { google } from 'googleapis';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'config', 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

const mcpServer = new Server(
  { name: 'oplab-sheets-portfolio', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

let transport: SSEServerTransport | null = null;

app.get('/sse', async (req, res) => {
  if (transport) {
    try {
      await mcpServer.close();
    } catch (e) {
      console.error('Ignorando erro ao fechar transport antigo:', e);
    }
  }

  transport = new SSEServerTransport('/messages', res);
  await mcpServer.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('SSE transport não inicializado');
  }
});

// Parser tolerante a formatos BR (1.234,56), US (1234.56), R$, % e (x) negativo.
function parseNumberBR(raw: any): number {
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

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_cockpit_ativas',
        description: 'Retorna posições ATIVAS da aba COCKPIT cortando as 9 primeiras linhas. Cada linha inclui todos os campos da aba — entre eles STATUS e TRADE_MONTH.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_cockpit_historico',
        description: 'Retorna posições com STATUS = ENCERRADO ou EXERCIDA da aba COCKPIT. Aceita filtros opcionais "trade_month" (substring, ex: "5" casa "2024-05") e "ticker" (match exato, ex: "EMBJ3").',
        inputSchema: {
          type: 'object',
          properties: {
            trade_month: { type: 'string', description: 'Filtro opcional sobre TRADE_MONTH (substring).' },
            ticker: { type: 'string', description: 'Filtro opcional sobre TICKER (match exato).' }
          }
        }
      },
      {
        name: 'get_resumo_mensal',
        description: 'Resumo agregado por TRADE_MONTH da aba COCKPIT. Para cada mês: soma de MAX_GAIN das vendas (prêmio bruto), soma de MAX_GAIN das compras (custo de proteções), prêmio líquido, P&L realizado (soma de PL_VALUE), quantidade de encerradas/exercidas e quantidade de ativas. Ordenado cronologicamente.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_cockpit_por_ativo',
        description: 'Retorna todas as posições da aba COCKPIT (ativas + encerradas + exercidas) com TICKER igual ao parâmetro fornecido. Útil para ver histórico completo de um ativo.',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Código do ativo (obrigatório). Ex: "EMBJ3".' }
          },
          required: ['ticker']
        }
      },
      {
        name: 'get_screener_quantitativo',
        description: 'Retorna as oportunidades da aba SCREENER_QUANTITATIVO.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_scanner_opcoes',
        description: 'Retorna a liquidez e gregas da aba SCANNER_OPCOES.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_maiores_lucros',
        description: 'Retorna dados da aba SELECAO_OPCOES_MAIORES_LUCROS.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_maiores_volumes',
        description: 'Retorna dados da aba SELECAO_MAIORES_VOLUMES.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_tendencia_m9m21',
        description: 'Retorna a tendência da aba RANKING_TENDENCIA_M9M21.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_correl_ibov',
        description: 'Retorna dados da aba RANKING_CORREL_IBOV.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  if (!SPREADSHEET_ID) throw new Error('Variável SPREADSHEET_ID não configurada.');

  try {
    let range = '';
    if (name === 'get_cockpit_ativas') range = 'COCKPIT!A10:Z500';
    else if (name === 'get_cockpit_historico') range = 'COCKPIT!A10:Z500';
    else if (name === 'get_resumo_mensal') range = 'COCKPIT!A10:Z500';
    else if (name === 'get_cockpit_por_ativo') range = 'COCKPIT!A10:Z500';
    else if (name === 'get_screener_quantitativo') range = 'SCREENER_QUANTITATIVO!A1:Z200';
    else if (name === 'get_scanner_opcoes') range = 'SCANNER_OPCOES!A1:Z500';
    else if (name === 'get_maiores_lucros') range = 'SELECAO_OPCOES_MAIORES_LUCROS!A1:Z200';
    else if (name === 'get_maiores_volumes') range = 'SELECAO_MAIORES_VOLUMES!A1:Z200';
    else if (name === 'get_tendencia_m9m21') range = 'RANKING_TENDENCIA_M9M21!A1:Z300';
    else if (name === 'get_correl_ibov') range = 'RANKING_CORREL_IBOV!A1:Z300';
    else throw new Error(`Ferramenta desconhecida: ${name}`);

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
    const rows = response.data.values || [];
    if (rows.length === 0) return { content: [{ type: 'text', text: 'Nenhum dado encontrado.' }] };

    const headers = rows[0];
    let data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header: string, i: number) => { obj[header] = row[i] || ''; });
      return obj;
    });

    // STATUS header da aba COCKPIT (contém "STATUS" mas não "STATUS_OP").
    const statusHeader = headers.find((h: string) => {
      const u = String(h).toUpperCase();
      return u.includes('STATUS') && !u.includes('STATUS_OP');
    });

    if (name === 'get_cockpit_ativas') {
      data = data.filter(item => {
        const status = String(item['STATUS'] || item['STATUS_OP'] || item['VENDA/COMPRA'] || '').toUpperCase();
        return status.includes('ATIVO') || (item['QTDE'] && item['QTDE'] !== '' && !status.includes('ENCERRADO'));
      });
    } else if (name === 'get_cockpit_historico') {
      data = data.filter(item => {
        const status = String(statusHeader ? item[statusHeader] : '').trim().toUpperCase();
        return status === 'ENCERRADO' || status === 'EXERCIDA';
      });
      const a = args as any;
      const argMonth = typeof a.trade_month === 'string' ? String(a.trade_month).trim() : '';
      const argTicker = typeof a.ticker === 'string' ? String(a.ticker).trim().toUpperCase() : '';
      if (argMonth !== '') data = data.filter(item => String(item['TRADE_MONTH'] || '').includes(argMonth));
      if (argTicker !== '') data = data.filter(item => String(item['TICKER'] || '').trim().toUpperCase() === argTicker);
    } else if (name === 'get_cockpit_por_ativo') {
      const a = args as any;
      const argTicker = typeof a.ticker === 'string' ? String(a.ticker).trim().toUpperCase() : '';
      if (argTicker === '') throw new Error('Parâmetro "ticker" é obrigatório.');
      data = data.filter(item => String(item['TICKER'] || '').trim().toUpperCase() === argTicker);
    } else if (name === 'get_resumo_mensal') {
      type Bucket = {
        trade_month: string;
        max_gain_venda: number;
        max_gain_compra: number;
        pl_realizado: number;
        qtde_encerradas: number;
        qtde_ativas: number;
      };
      const buckets = new Map<string, Bucket>();
      const getBucket = (m: string): Bucket => {
        let b = buckets.get(m);
        if (!b) {
          b = { trade_month: m, max_gain_venda: 0, max_gain_compra: 0, pl_realizado: 0, qtde_encerradas: 0, qtde_ativas: 0 };
          buckets.set(m, b);
        }
        return b;
      };
      for (const item of data) {
        const month = String(item['TRADE_MONTH'] || '').trim();
        if (month === '') continue;
        const status = String(statusHeader ? item[statusHeader] : '').trim().toUpperCase();
        if (status === 'ENCERRADO' || status === 'EXERCIDA') {
          const side = String(item['SIDE'] || '').trim().toUpperCase();
          const mg = parseNumberBR(item['MAX_GAIN']);
          const pl = parseNumberBR(item['PL_VALUE']);
          const b = getBucket(month);
          if (side === 'VENDA') b.max_gain_venda += mg;
          if (side === 'COMPRA') b.max_gain_compra += mg;
          b.pl_realizado += pl;
          b.qtde_encerradas += 1;
        } else if (status === 'ATIVO') {
          getBucket(month).qtde_ativas += 1;
        }
      }
      const round2 = (n: number) => Math.round(n * 100) / 100;
      data = Array.from(buckets.values())
        .sort((a, b) => a.trade_month.localeCompare(b.trade_month))
        .map((b) => ({
          trade_month: b.trade_month,
          max_gain_venda: round2(b.max_gain_venda),
          max_gain_compra: round2(b.max_gain_compra),
          premio_liquido: round2(b.max_gain_venda + b.max_gain_compra),
          pl_realizado: round2(b.pl_realizado),
          qtde_encerradas: b.qtde_encerradas,
          qtde_ativas: b.qtde_ativas,
        }));
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Erro: ${error.message}` }], isError: true };
  }
});

app.listen(PORT, () => console.log(`[Sheets-MCP] Ativado na porta ${PORT}`));
