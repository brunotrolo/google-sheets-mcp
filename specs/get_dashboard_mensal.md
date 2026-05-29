# Spec — `get_dashboard_mensal`

## Objetivo

Dashboard de performance para um mês específico da aba `COCKPIT`. Combina
agregados financeiros + estatísticas operacionais + comparativo com mês
anterior + quebra por ticker.

## Input

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `mes` | string | sim | Mês a consultar. Ex: `"5"`. Match flexível com `TRADE_MONTH` (ver abaixo). |
| `ano` | string | não | Ano. Default: ano atual. Ex: `"2026"`. |

## Match flexível de `TRADE_MONTH`

A planilha pode armazenar mês em formatos variados. O filtro casa qualquer
um destes contra o `mes`/`ano` informados:

- `"5"`, `"05"`
- `"5/2026"`, `"05/2026"`
- `"2026-05"`, `"2026-5"`
- `"2026/05"`, `"2026/5"`

Match exato (não substring) por uma das variações acima.

## Output

```json
{
  "periodo": "05/2026",
  "performance": {
    "premio_bruto_vendas": 10762.72,
    "custo_protecoes": -10132.31,
    "premio_liquido": 630.41,
    "pl_realizado": 2349.00,
    "qtde_encerradas": 16,
    "qtde_ativas": 20,
    "win_rate_encerradas_pct": 68.75,
    "maior_ganho_mes": 1470.00,
    "maior_perda_mes": -201.00,
    "melhor_operacao": "BRKMQ105",
    "pior_operacao": "EMBJQ74"
  },
  "comparativo_mes_anterior": {
    "mes_anterior": "04/2026",
    "premio_liquido_anterior": 4972.00,
    "variacao_pct": -87.32
  },
  "por_ativo": [
    {
      "ticker": "EMBJ3",
      "operacoes": 6,
      "premio_liquido": 1303.00,
      "pl_realizado": -225.00
    }
  ]
}
```

## Cálculos

### `performance` — prêmios sobre **TODAS** as operações do mês

(ativas + encerradas + exercidas)

| Campo | Fórmula |
|---|---|
| `premio_bruto_vendas` | Σ `MAX_GAIN` onde `SIDE = VENDA` |
| `custo_protecoes` | Σ `MAX_GAIN` onde `SIDE = COMPRA` |
| `premio_liquido` | `premio_bruto_vendas + custo_protecoes` |

### `performance` — P&L e estatísticas só de **realizadas**

| Campo | Fórmula |
|---|---|
| `pl_realizado` | Σ `PL_VALUE` das encerradas/exercidas |
| `qtde_encerradas` | count de `STATUS ∈ {ENCERRADO, EXERCIDA}` |
| `qtde_ativas` | count de `STATUS = ATIVO` |
| `win_rate_encerradas_pct` | `(wins / total encerradas) × 100` |
| `maior_ganho_mes` | `max(PL_VALUE)` entre encerradas |
| `maior_perda_mes` | `min(PL_VALUE)` entre encerradas |
| `melhor_operacao` | `OPTION_TICKER` da encerrada com maior PL |
| `pior_operacao` | `OPTION_TICKER` da encerrada com menor PL |

### `comparativo_mes_anterior`

| Campo | Fórmula |
|---|---|
| `mes_anterior` | rola pra dezembro do ano anterior se `mes=1` |
| `premio_liquido_anterior` | mesma semântica do `premio_liquido` corrente, no mês anterior |
| `variacao_pct` | `((corrente − anterior) / |anterior|) × 100` |

### `por_ativo[]` — quebra por TICKER dentro do mês

Para cada `TICKER` distinto:

| Campo | Fórmula |
|---|---|
| `operacoes` | count de linhas (qualquer status) |
| `premio_liquido` | `Σ MAX_GAIN VENDA + Σ MAX_GAIN COMPRA` (todas) |
| `pl_realizado` | Σ `PL_VALUE` só de encerradas/exercidas |

## Implementação

Iteração única sobre `data` — agrega mês corrente e mês anterior em paralelo
via duplo bucket. Linhas com `STATUS` desconhecido (não ATIVO/ENCERRADO/EXERCIDA)
são ignoradas dos agregados.

## Erros

- `mes` ausente → `Parâmetro "mes" é obrigatório.`
- `ano` ausente → assume ano atual silenciosamente.

Padrão: `{ isError: true, content: [...] }`.
