# Spec — `get_resumo_mensal`

## Objetivo

Resumo agregado por `TRADE_MONTH` das operações da aba `COCKPIT`. Substitui
a antiga `get_cockpit_resumo_mensal` (renomeada). Dashboard rápido de
performance mensal, incluindo contagem separada de operações encerradas
e ativas.

## Input

Nenhum argumento.

## Origem dos dados

- Aba: `COCKPIT`, range `A10:Z500`
- Linhas com `TRADE_MONTH` vazio são descartadas.
- Demais linhas são particionadas pelo `STATUS`.

## Agrupamento

Chave: valor do campo `TRADE_MONTH` (string).

| Campo retornado    | Cálculo                                                             |
|--------------------|---------------------------------------------------------------------|
| `trade_month`      | chave do grupo                                                      |
| `max_gain_venda`   | soma de `MAX_GAIN` para linhas com `STATUS ∈ {ENCERRADO, EXERCIDA}` e `SIDE = VENDA` — prêmio bruto coletado |
| `max_gain_compra`  | soma de `MAX_GAIN` para linhas encerradas com `SIDE = COMPRA` — custo de proteções |
| `premio_liquido`   | `max_gain_venda + max_gain_compra`                                  |
| `pl_realizado`     | soma de `PL_VALUE` das linhas encerradas                            |
| `qtde_encerradas`  | contagem de linhas com `STATUS ∈ {ENCERRADO, EXERCIDA}`             |
| `qtde_ativas`      | contagem de linhas com `STATUS = ATIVO`                             |

Os sums financeiros consideram **apenas** linhas encerradas/exercidas
(realizadas). `qtde_ativas` permite ver a exposição em aberto do mês.

## Parsing numérico

Idêntico à versão anterior: `parseNumberBR` tolera formato BR/US, `R$`, `%`
e negativos `(x)`. Vazio/`NaN` → `0`.

## Output

```json
[
  {
    "trade_month": "2024-11",
    "max_gain_venda": 1234.56,
    "max_gain_compra": -200.00,
    "premio_liquido": 1034.56,
    "pl_realizado": 980.10,
    "qtde_encerradas": 4,
    "qtde_ativas": 2
  }
]
```

Ordenado por `trade_month` ascendente. Valores monetários arredondados em 2 casas.

Se não houver dados, retornar `[]`.

## Erros

Padrão: `{ isError: true, content: [...] }`.
