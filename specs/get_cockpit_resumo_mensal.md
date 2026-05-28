# Spec — `get_cockpit_resumo_mensal`

## Objetivo

Resumo agregado por `TRADE_MONTH` das operações já encerradas/exercidas da
aba `COCKPIT`. Serve como dashboard rápido de performance mensal.

## Input

Nenhum argumento.

## Origem dos dados

Mesma base de `get_cockpit_historico`:

- Aba: `COCKPIT`, range `A10:Z500`
- Filtro: `STATUS` ∈ {`ENCERRADO`, `EXERCIDA`}

## Agrupamento

Chave de agrupamento: valor do campo `TRADE_MONTH` (string, ex: `2024-11`).
Linhas com `TRADE_MONTH` vazio são descartadas.

Para cada grupo, computar:

| Campo retornado          | Cálculo                                                     |
|--------------------------|-------------------------------------------------------------|
| `trade_month`            | chave do grupo                                              |
| `max_gain_venda`         | soma de `MAX_GAIN` das linhas com `SIDE = VENDA`            |
| `max_gain_compra`        | soma de `MAX_GAIN` das linhas com `SIDE = COMPRA`           |
| `premio_liquido`         | `max_gain_venda + max_gain_compra`                          |
| `pl_realizado`           | soma de `PL_VALUE` de todas as linhas do grupo              |
| `qtde_operacoes`         | contagem de linhas do grupo                                 |

`SIDE` é comparado em caixa alta após `trim`.

## Parsing numérico

Os valores na planilha podem vir como:

- `1234.56` (formato US)
- `1.234,56` (formato BR — ponto como separador de milhar, vírgula como decimal)
- `R$ 1.234,56` (com símbolo)
- `-100,50` ou `(100,50)` (negativos)

A função de parsing precisa:

1. Remover `R$`, espaços e `%`
2. Tratar `(x)` como `-x`
3. Se houver tanto `.` quanto `,`, assumir BR: `.` é milhar → remover; `,` vira `.`
4. Se houver apenas `,`, assumir BR: `,` vira `.`
5. Se houver apenas `.`, manter
6. `parseFloat` no resultado; `NaN` → `0`

Vazio/`null`/`undefined` → `0`.

## Output

```json
[
  {
    "trade_month": "2024-11",
    "max_gain_venda": 1234.56,
    "max_gain_compra": -200.00,
    "premio_liquido": 1034.56,
    "pl_realizado": 980.10,
    "qtde_operacoes": 4
  },
  ...
]
```

Ordenado por `trade_month` ascendente.

Se não houver dados, retornar `[]`.

## Erros

Padrão: `{ isError: true, content: [...] }`.
