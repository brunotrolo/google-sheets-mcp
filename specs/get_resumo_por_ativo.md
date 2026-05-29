# Spec — `get_resumo_por_ativo`

## Objetivo

Resumo histórico consolidado de um ticker da aba `COCKPIT`. Devolve agregados
financeiros + estatísticas operacionais + a lista de posições ativas, num
único objeto JSON.

## Input

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticker` | string | sim | Código do ativo. Ex: `"EMBJ3"`. |

`ticker` vazio ou ausente → erro `Parâmetro "ticker" é obrigatório.`

## Origem dos dados

- Aba: `COCKPIT`, range `A10:Z500`
- Filtro inicial: `TICKER == ticker` (case-insensitive, trimmed)

## Output

```json
{
  "ticker": "EMBJ3",
  "resumo_historico": {
    "total_operacoes": 10,
    "encerradas": 4,
    "ativas": 6,
    "exercidas": 0,
    "premio_bruto_vendas": 4500.00,
    "custo_protecoes": -800.00,
    "premio_liquido_total": 3700.00,
    "pl_realizado": 1200.00,
    "pl_ativo_mtm": 510.00,
    "win_rate_pct": 75.0,
    "maior_ganho": 700.00,
    "maior_perda": -150.00
  },
  "posicoes_ativas": [ /* mesmo shape das linhas brutas do COCKPIT */ ]
}
```

## Cálculos

### Prêmios — **TODAS** as operações do ticker (ativas + encerradas + exercidas)

| Campo | Fórmula |
|---|---|
| `premio_bruto_vendas` | Σ `MAX_GAIN` onde `SIDE = VENDA` |
| `custo_protecoes` | Σ `MAX_GAIN` onde `SIDE = COMPRA` (geralmente negativo) |
| `premio_liquido_total` | `premio_bruto_vendas + custo_protecoes` |

> Semântica = "exposição contratada". Refere-se ao prêmio máximo que o ativo
> pode entregar/custar se nada mais for feito até o vencimento.

### P&L — só **realizadas** (encerradas + exercidas)

| Campo | Fórmula |
|---|---|
| `pl_realizado` | Σ `PL_VALUE` onde `STATUS ∈ {ENCERRADO, EXERCIDA}` |

### MTM — só **ativas**

| Campo | Fórmula |
|---|---|
| `pl_ativo_mtm` | Σ `PL_VALUE` onde `STATUS = ATIVO` (marked-to-market atual) |

### Estatísticas — só **encerradas**

| Campo | Fórmula |
|---|---|
| `win_rate_pct` | `(count encerradas com PL_VALUE > 0) / total encerradas × 100` |
| `maior_ganho` | `max(PL_VALUE)` entre encerradas |
| `maior_perda` | `min(PL_VALUE)` entre encerradas |

### `posicoes_ativas[]`

Mesma lógica de filtro do `get_cockpit_ativas`, restrita ao ticker:
`STATUS / STATUS_OP / VENDA/COMPRA contém "ATIVO" ou QTDE não vazia`.
Cada item carrega **todas** as colunas da aba.

## Erros

- `ticker` ausente → mensagem clara
- Coluna `STATUS` não encontrada → contagens ficam zeradas (não dispara erro)

Padrão: `{ isError: true, content: [{ type: 'text', text: 'Erro: ...' }] }`.
