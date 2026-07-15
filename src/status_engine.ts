// ─────────────────────────────────────────────────────────────────────────────
// status_engine.ts — núcleo PURO de get_status_operacoes (sem I/O, sem imports
// pesados: testável isoladamente e determinístico).
//
// Classifica cada grupo (TICKER, vencimento) pela MECÂNICA DE PAYOFF real —
// casando venda×proteção do MESMO tipo de opção por QUANTIDADE — e calcula o
// risco de verdade (travado vs descoberto), não um notional bruto enganoso.
//
// Convenção do custo de zerar (ponto de alta atenção — já causou erro de sinal
// invertido nesta conta; NÃO alterar sem atualizar os testes):
//   +  (positivo) = crédito líquido RECEBIDO ao zerar a estrutura hoje
//   −  (negativo) = débito líquido PAGO para zerar a estrutura hoje
// Regra por perna (§5 da spec): fechar VENDA = RECOMPRAR ⇒ paga ⇒ −(last×qtd);
// fechar COMPRA = VENDER ⇒ recebe ⇒ +(last×qtd).
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTO_ZERAR_CONVENCAO =
  'positivo = credito liquido recebido ao zerar a estrutura hoje; negativo = debito liquido pago para zerar';

// Parser tolerante a formatos BR (1.234,56), US (1,234.56), R$, % e (x) negativo.
export function parseNumberBR(raw: any): number {
  if (raw === undefined || raw === null) return 0;
  let s = String(raw).trim();
  if (s === '') return 0;
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/R\$/gi, '').replace(/%/g, '').replace(/\s/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.'); // BR
    else s = s.replace(/,/g, '');                                        // US
  } else if (lastComma >= 0) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

// QUANTITY vem como "1,000" / "3,200" (vírgula = MILHAR, formato US), NÃO decimal.
export function parseQtd(raw: any): number {
  const s = String(raw ?? '').split('.')[0].replace(/[^0-9]/g, '');
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

// DTE a partir de EXPIRY "DD/MM/YYYY" (ou "YYYY-MM-DD"). `hoje` injetável p/ testes.
export function dteFromExpiry(raw: any, hoje: Date = new Date()): number | null {
  const s = String(raw ?? '').trim();
  let d: Date | null = null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  else { m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); }
  if (!d || isNaN(d.getTime())) return null;
  const hojeUTC = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.round((d.getTime() - hojeUTC) / 86400000);
}

export interface StatusLeg {
  ticker: string; option_ticker: string; side: string; type: string;
  quantity: number; strike: number; spot: number; last: number; entry: number;
  pl_value: number; expiry: string;
}

interface Perna { strike: number; quantity: number; entry: number; }

// Resultado do casamento venda×proteção do MESMO tipo de opção.
export interface Casamento {
  qtd_vendida: number;
  qtd_comprada: number;
  qtd_casada: number;
  qtd_descoberta: number;         // vendido sem proteção → risco de verdade
  qtd_compra_excedente: number;   // proteção "solta", sem venda para casar (não é risco)
  largura_risco_bruto: number;    // Σ (largura_por_par × qtd_casada), largura piso 0
  strike_vendido_ref: number;     // pior strike vendido (dirige o desembolso do descoberto)
}

// Casa vendas com proteções unidade-a-unidade (por chunks), pareando o PIOR strike
// vendido com a MELHOR proteção disponível. Premissa (documentada): a porção casada é
// avaliada como spreads verticais empilhados; a porção descoberta sobra explícita.
// isPut=true: PUT protege PUT, proteção válida tem strike MENOR que o vendido.
// isPut=false: CALL protege CALL, proteção válida tem strike MAIOR que o vendido.
export function casarProtecao(vendas: Perna[], compras: Perna[], isPut: boolean): Casamento {
  const qtd_vendida = vendas.reduce((s, p) => s + p.quantity, 0);
  const qtd_comprada = compras.reduce((s, p) => s + p.quantity, 0);
  const sold = vendas.map((p) => ({ ...p })).sort((a, b) => (isPut ? b.strike - a.strike : a.strike - b.strike));
  const prot = compras.map((p) => ({ ...p })).sort((a, b) => (isPut ? b.strike - a.strike : a.strike - b.strike));
  const strike_vendido_ref = sold.length ? sold[0].strike : 0;

  let largura_risco_bruto = 0, qtd_casada = 0;
  let i = 0, j = 0;
  while (i < sold.length && j < prot.length) {
    const chunk = Math.min(sold[i].quantity, prot[j].quantity);
    const largura = isPut ? (sold[i].strike - prot[j].strike) : (prot[j].strike - sold[i].strike);
    largura_risco_bruto += Math.max(0, largura) * chunk;
    qtd_casada += chunk;
    sold[i].quantity -= chunk; prot[j].quantity -= chunk;
    if (sold[i].quantity === 0) i++;
    if (prot[j].quantity === 0) j++;
  }
  const qtd_descoberta = Math.max(0, qtd_vendida - qtd_casada);
  const qtd_compra_excedente = Math.max(0, qtd_comprada - qtd_casada);
  return { qtd_vendida, qtd_comprada, qtd_casada, qtd_descoberta, qtd_compra_excedente, largura_risco_bruto, strike_vendido_ref };
}

// Crédito líquido (entry) atribuído à porção casada, rateado por quantidade vendida.
export function creditoCasado(vendas: Perna[], compras: Perna[], qtd_casada: number, qtd_vendida: number): number {
  const creditoVenda = vendas.reduce((s, p) => s + p.entry * p.quantity, 0);
  const custoCompra = compras.reduce((s, p) => s + p.entry * p.quantity, 0);
  const creditoTotal = creditoVenda - custoCompra;
  if (qtd_vendida <= 0) return 0;
  return creditoTotal * (qtd_casada / qtd_vendida);
}

export interface StatusArgs {
  incluir_encerradas?: boolean;
  patrimonio?: number;
  limite_concentracao_pct?: number;
  limite_concentracao_descoberta_pct?: number;
}

// Mapeia uma linha crua da planilha para uma perna tipada.
export function rowToLeg(it: any): StatusLeg {
  return {
    ticker: String(it['TICKER'] ?? '').trim().toUpperCase(),
    option_ticker: String(it['OPTION_TICKER'] ?? '').trim().toUpperCase(),
    side: String(it['SIDE'] ?? '').trim().toUpperCase(),
    // Fonte de verdade do PUT/CALL: coluna OPTION_TYPE. Vazia/ inválida ⇒ revisão
    // manual (§9: nenhuma suposição silenciosa — NÃO adivinhamos pelo código).
    type: String(it['OPTION_TYPE'] ?? '').trim().toUpperCase(),
    quantity: parseQtd(it['QUANTITY']),
    strike: parseNumberBR(it['STRIKE']),
    spot: parseNumberBR(it['SPOT']),
    last: parseNumberBR(it['LAST_PREMIUM']),
    entry: parseNumberBR(it['ENTRY_PRICE']),
    pl_value: parseNumberBR(it['PL_VALUE']),
    expiry: String(it['EXPIRY'] ?? '').trim(),
  };
}

export function buildStatusOperacoes(rows: any[], args: StatusArgs, hoje: Date = new Date()) {
  const incluirEnc = args?.incluir_encerradas === true;
  const patrimonio = Number.isFinite(Number(args?.patrimonio)) && Number(args?.patrimonio) > 0 ? Number(args.patrimonio) : 120000;
  const limitePct = Number.isFinite(Number(args?.limite_concentracao_pct)) ? Number(args.limite_concentracao_pct) : 25;
  const limiteDescPct = Number.isFinite(Number(args?.limite_concentracao_descoberta_pct)) ? Number(args.limite_concentracao_descoberta_pct) : 15;
  const r2 = (n: number) => Math.round(n * 100) / 100;

  // 1) filtra por status e mapeia pernas
  const legs: StatusLeg[] = rows.filter((it) => {
    const status = String(it['STATUS'] ?? it['STATUS_OP'] ?? '').toUpperCase();
    if (incluirEnc) return true;
    return status.includes('ATIVO');
  }).map(rowToLeg).filter((l) => l.ticker && l.option_ticker && l.quantity > 0);

  // 2) agrupa por (TICKER, EXPIRY) — NÃO por data de entrada. Duas vendas do mesmo
  //    tipo/vencimento em datas diferentes caem no MESMO grupo e são agregadas.
  const grupos = new Map<string, StatusLeg[]>();
  for (const l of legs) { const k = `${l.ticker}|${l.expiry}`; const a = grupos.get(k) ?? []; a.push(l); grupos.set(k, a); }

  const estruturas: any[] = [];
  for (const [, gl] of grupos) {
    // 3) 4 buckets por lógica de payoff (tipo × lado)
    const toP = (l: StatusLeg): Perna => ({ strike: l.strike, quantity: l.quantity, entry: l.entry });
    const vp = gl.filter((l) => l.side === 'VENDA' && l.type === 'PUT');
    const cp = gl.filter((l) => l.side === 'COMPRA' && l.type === 'PUT');
    const vc = gl.filter((l) => l.side === 'VENDA' && l.type === 'CALL');
    const cc = gl.filter((l) => l.side === 'COMPRA' && l.type === 'CALL');

    const tipoIndeterminado = gl.some((l) => l.type !== 'PUT' && l.type !== 'CALL');
    const hasVP = vp.length > 0, hasCP = cp.length > 0, hasVC = vc.length > 0, hasCC = cc.length > 0;
    const hasPut = hasVP || hasCP, hasCall = hasVC || hasCC;

    const mPut = casarProtecao(vp.map(toP), cp.map(toP), true);
    const mCall = casarProtecao(vc.map(toP), cc.map(toP), false);

    // 3b) Classificação (primeira condição que bater define o tipo).
    let tipo: string;
    let revisao_manual = false;
    if (tipoIndeterminado) { tipo = 'ESTRUTURA_COMPLEXA'; revisao_manual = true; }
    else if (hasVP && !hasCP && !hasCall) tipo = 'PUT_SECA';
    else if (hasVC && !hasCC && !hasPut) tipo = 'CALL_SECA';
    else if (hasVP && hasCP && mPut.qtd_casada > 0 && !hasCall) tipo = 'TRAVA_ALTA';
    else if (hasVC && hasCC && mCall.qtd_casada > 0 && !hasPut) tipo = 'TRAVA_BAIXA';
    else if (hasVP && hasCP && mPut.qtd_casada > 0 && hasVC && hasCC && mCall.qtd_casada > 0) tipo = 'IRON_CONDOR';
    else if (hasVP && hasCC && !hasCP) tipo = 'DESCOBERTA_MISTA';   // PUT vendida + CALL comprada (não protege)
    else if (hasVC && hasCP && !hasCC) tipo = 'DESCOBERTA_MISTA';   // CALL vendida + PUT comprada (não protege)
    else { tipo = 'ESTRUTURA_COMPLEXA'; revisao_manual = true; }

    // 4) Risco por tipo
    let risco_maximo_travado = 0;
    let risco_adicional_descoberto = 0;
    let risco_ilimitado_parcial = false;
    let risco_ilimitado = false;

    const riscoTravaPut = () => {
      const credito = creditoCasado(vp.map(toP), cp.map(toP), mPut.qtd_casada, mPut.qtd_vendida);
      risco_maximo_travado += Math.max(0, mPut.largura_risco_bruto - credito);
      if (mPut.qtd_descoberta > 0) { risco_adicional_descoberto += mPut.strike_vendido_ref * mPut.qtd_descoberta; risco_ilimitado_parcial = true; }
    };
    const riscoTravaCall = () => {
      const credito = creditoCasado(vc.map(toP), cc.map(toP), mCall.qtd_casada, mCall.qtd_vendida);
      risco_maximo_travado += Math.max(0, mCall.largura_risco_bruto - credito);
      if (mCall.qtd_descoberta > 0) { risco_adicional_descoberto += mCall.strike_vendido_ref * mCall.qtd_descoberta; risco_ilimitado_parcial = true; }
    };

    if (tipo === 'PUT_SECA' || tipo === 'CALL_SECA' || tipo === 'DESCOBERTA_MISTA') risco_ilimitado = true;
    else if (tipo === 'TRAVA_ALTA') riscoTravaPut();
    else if (tipo === 'TRAVA_BAIXA') riscoTravaCall();
    else if (tipo === 'IRON_CONDOR') { riscoTravaPut(); riscoTravaCall(); }
    // ESTRUTURA_COMPLEXA: não força número; fica em revisão manual.

    const desembolso_put = vp.reduce((s, l) => s + l.strike * l.quantity, 0);
    const desembolso_call = vc.reduce((s, l) => s + l.strike * l.quantity, 0);
    const desembolso_se_exercido_total = r2(desembolso_put + desembolso_call);

    // 5) custo de zerar (convenção documentada no topo)
    const custo_zerar = r2(gl.reduce((s, l) => s + (l.side === 'COMPRA' ? 1 : -1) * l.last * l.quantity, 0));

    const vendidaPrincipal = hasVP
      ? vp.slice().sort((a, b) => b.strike - a.strike)[0]
      : (hasVC ? vc.slice().sort((a, b) => a.strike - b.strike)[0] : null);
    let moneyness = 'n/d';
    if (vendidaPrincipal && vendidaPrincipal.spot > 0 && vendidaPrincipal.strike > 0) {
      const { spot, strike, type } = vendidaPrincipal;
      const band = Math.abs(spot - strike) / strike <= 0.01;
      if (band) moneyness = 'ATM';
      else if (type === 'PUT') moneyness = spot < strike ? 'ITM' : 'OTM';
      else moneyness = spot > strike ? 'ITM' : 'OTM';
    }
    const dte = vendidaPrincipal ? dteFromExpiry(vendidaPrincipal.expiry, hoje) : dteFromExpiry(gl[0].expiry, hoje);
    const pl_mtm = r2(gl.reduce((s, l) => s + l.pl_value, 0));

    let semaforo = '🟢';
    if (revisao_manual) semaforo = '🟡';
    else if (risco_ilimitado || risco_ilimitado_parcial || moneyness === 'ITM') semaforo = '🔴';
    else if (moneyness === 'ATM' || (dte !== null && dte < 10)) semaforo = '🟡';

    estruturas.push({
      ticker: gl[0].ticker,
      due_date: gl[0].expiry,
      tipo,
      dte,
      qtd_vendida_put: mPut.qtd_vendida,
      qtd_comprada_put: mPut.qtd_comprada,
      qtd_casada_put: mPut.qtd_casada,
      qtd_descoberta_put: mPut.qtd_descoberta,
      qtd_compra_excedente_put: mPut.qtd_compra_excedente,
      qtd_vendida_call: mCall.qtd_vendida,
      qtd_comprada_call: mCall.qtd_comprada,
      qtd_casada_call: mCall.qtd_casada,
      qtd_descoberta_call: mCall.qtd_descoberta,
      qtd_compra_excedente_call: mCall.qtd_compra_excedente,
      risco_maximo_travado: r2(risco_maximo_travado),
      risco_adicional_descoberto: r2(risco_adicional_descoberto),
      risco_ilimitado_parcial,
      risco_ilimitado,
      desembolso_se_exercido_total,
      custo_zerar,
      custo_zerar_convencao: CUSTO_ZERAR_CONVENCAO,
      moneyness_vendida: moneyness,
      pl_mtm,
      semaforo,
      revisao_manual,
      pernas: gl.map((l) => ({ option_ticker: l.option_ticker, side: l.side, category: l.type, strike: l.strike, quantity: l.quantity, last: l.last, pl_value: l.pl_value })),
    });
  }

  const ordem: any = { '🔴': 0, '🟡': 1, '🟢': 2 };
  const riscoReal = (e: any) => (e.risco_ilimitado ? e.desembolso_se_exercido_total : e.risco_maximo_travado) + e.risco_adicional_descoberto;
  estruturas.sort((a, b) => (ordem[a.semaforo] - ordem[b.semaforo]) || (riscoReal(b) - riscoReal(a)));

  // 6) consolidação por ticker (concentração por RISCO REAL, não por notional bruto)
  const porTicker = new Map<string, any>();
  for (const e of estruturas) {
    let t = porTicker.get(e.ticker);
    if (!t) { t = { ticker: e.ticker, risco_travado_total: 0, risco_descoberto_total: 0, notional_vendido_bruto: 0, n_estruturas_trava: 0, n_estruturas_descoberta: 0, n_estruturas_complexas: 0 }; porTicker.set(e.ticker, t); }
    if (e.revisao_manual) { t.n_estruturas_complexas += 1; continue; }
    t.notional_vendido_bruto += e.desembolso_se_exercido_total;
    if (e.tipo === 'TRAVA_ALTA' || e.tipo === 'TRAVA_BAIXA' || e.tipo === 'IRON_CONDOR') {
      t.risco_travado_total += e.risco_maximo_travado;
      t.risco_descoberto_total += e.risco_adicional_descoberto; // porção descoberta de trava incompleta
      t.n_estruturas_trava += 1;
    } else if (e.tipo === 'PUT_SECA' || e.tipo === 'CALL_SECA' || e.tipo === 'DESCOBERTA_MISTA') {
      t.risco_descoberto_total += e.desembolso_se_exercido_total;
      t.n_estruturas_descoberta += 1;
    }
  }
  const concentracao_por_ativo = [...porTicker.values()].map((t) => {
    const cRisco = (t.risco_travado_total / patrimonio) * 100;
    const cDesc = (t.risco_descoberto_total / patrimonio) * 100;
    return {
      ticker: t.ticker,
      risco_travado_total: r2(t.risco_travado_total),
      risco_descoberto_total: r2(t.risco_descoberto_total),
      notional_vendido_bruto: r2(t.notional_vendido_bruto),
      concentracao_risco_pct: r2(cRisco),
      concentracao_descoberta_pct: r2(cDesc),
      acima_limite_risco: cRisco > limitePct,
      acima_limite_descoberta: cDesc > limiteDescPct,
      n_estruturas_trava: t.n_estruturas_trava,
      n_estruturas_descoberta: t.n_estruturas_descoberta,
      n_estruturas_complexas: t.n_estruturas_complexas,
    };
  }).sort((a, b) => (b.risco_descoberto_total + b.risco_travado_total) - (a.risco_descoberto_total + a.risco_travado_total));

  const pl_mtm_total = r2(legs.reduce((s, l) => s + l.pl_value, 0));
  const custo_zerar_carteira_total = r2(estruturas.reduce((s, e) => s + e.custo_zerar, 0));
  const estruturas_criticas = estruturas.filter((e) => e.semaforo === '🔴').length;
  const risco_travado_carteira = r2(concentracao_por_ativo.reduce((s, t) => s + t.risco_travado_total, 0));
  const risco_descoberto_carteira = r2(concentracao_por_ativo.reduce((s, t) => s + t.risco_descoberto_total, 0));

  const alerta_descobertas = estruturas
    .filter((e) => e.risco_ilimitado || e.risco_ilimitado_parcial)
    .map((e) => ({ ticker: e.ticker, tipo: e.tipo, due_date: e.due_date, qtd_descoberta_put: e.qtd_descoberta_put, qtd_descoberta_call: e.qtd_descoberta_call, risco_descoberto: r2(e.risco_ilimitado ? e.desembolso_se_exercido_total : e.risco_adicional_descoberto), option_tickers: e.pernas.map((p: any) => p.option_ticker) }));
  const alerta_revisao_manual = estruturas.filter((e) => e.revisao_manual).map((e) => ({ ticker: e.ticker, due_date: e.due_date, option_tickers: e.pernas.map((p: any) => p.option_ticker) }));

  return {
    resumo: {
      pl_mtm_total,
      custo_zerar_carteira_total,
      custo_zerar_convencao: CUSTO_ZERAR_CONVENCAO,
      risco_travado_carteira,
      risco_descoberto_carteira,
      total_estruturas: estruturas.length,
      estruturas_criticas,
      patrimonio_considerado: patrimonio,
      limite_concentracao_pct: limitePct,
      limite_concentracao_descoberta_pct: limiteDescPct,
      concentracao_por_ativo,
      alerta_descobertas,
      alerta_revisao_manual,
    },
    estruturas,
    snapshot_timestamp: hoje.toISOString(),
    base_calculo: 'Agrupamento por (TICKER, vencimento). Classificação por lógica de payoff (casamento venda×proteção por quantidade, mesmo tipo de opção). Risco travado = largura×qtd_casada − crédito; porção descoberta (venda sem proteção) reportada à parte com flag de risco ilimitado. Concentração por RISCO REAL, não por notional bruto. Só reporta estado — não decide rolar/encerrar. Não chama OpLab. Determinístico.',
  };
}
