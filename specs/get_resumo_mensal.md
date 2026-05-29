# Spec — `get_resumo_mensal`

## Objetivo

Resumo agregado por `TRADE_MONTH` da aba `COCKPIT`. Devolve uma linha por mês
distinto, ordenada cronologicamente.

## Input

Sem parâmetros. (`inputSchema: { type: 'object', properties: {} }`)

## Origem dos dados

- Aba: `COCKPIT`, range `A10:Z500`
- Filtro: ignora linhas com `TRADE_MONTH` vazio ou `STATUS` desconhecido
  (apenas `ATIVO`, `ENCERRADO`, `EXERCIDA` entram nos agregados)

## Output

```json
[
  {
    "trade_month": "5",
    "max_gain_venda": 10762.72,
    "max_gain_compra": -10132.31,
    "premio_liquido": 630.41,
    "pl_realizado": 2349.00,
    "qtde_encerradas": 16,
    "qtde_ativas": 20
  }
]
```

Ordenado por `trade_month.localeCompare`.

## Cálculos

### Prêmios — **TODAS** as operações do mês (semântica unificada)

| Campo | Fórmula |
|---|---|
| `max_gain_venda` | Σ `MAX_GAIN` onde `SIDE = VENDA` (inclui ATIVO + ENCERRADO + EXERCIDA) |
| `max_gain_compra` | Σ `MAX_GAIN` onde `SIDE = COMPRA` (mesmo escopo) |
| `premio_liquido` | `max_gain_venda + max_gain_compra` |

> Reflete a exposição contratada no mês — quanto se pode ganhar/perder se nada
> mudar até o vencimento. Mesma definição usada por `get_dashboard_mensal` e
> `get_resumo_por_ativo` (única em todo o servidor).

### P&L — só **realizadas** (encerradas + exercidas)

| Campo | Fórmula |
|---|---|
| `pl_realizado` | Σ `PL_VALUE` onde `STATUS ∈ {ENCERRADO, EXERCIDA}` |

### Contagens

| Campo | Fórmula |
|---|---|
| `qtde_encerradas` | count de `STATUS ∈ {ENCERRADO, EXERCIDA}` |
| `qtde_ativas` | count de `STATUS = ATIVO` |

## Erros

Padrão: `{ isError: true, content: [...] }`.
