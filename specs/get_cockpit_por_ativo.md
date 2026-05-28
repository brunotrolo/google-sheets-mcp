# Spec — `get_cockpit_por_ativo`

## Objetivo

Retornar **todas** as posições da aba `COCKPIT` (ativas, encerradas e
exercidas) filtradas por um ticker específico. Ideal para visualizar
o histórico completo de operações sobre um único ativo.

## Input

| Parâmetro | Tipo   | Obrigatório | Descrição                          |
|-----------|--------|-------------|------------------------------------|
| `ticker`  | string | Sim         | Código do ativo. Ex: `"EMBJ3"`.    |

Se ausente ou vazio após `trim`, retorna erro
(`isError: true`, mensagem clara).

## Origem dos dados

- Aba: `COCKPIT`, range `A10:Z500`
- Cabeçalhos na linha 10. Header esperado: `TICKER`.

## Filtro

Match exato: `obj.TICKER.trim().toUpperCase() === ticker.trim().toUpperCase()`.

Sem filtro de `STATUS` — devolve qualquer estado da posição.

## Output

Array JSON de objetos `{ header: value }`, preservando todas as colunas da
aba (incluindo `STATUS`, `TRADE_MONTH`, `MAX_GAIN`, `PL_VALUE`, `SIDE`).

Sem matches → `[]`.

## Erros

- `ticker` ausente/vazio → `Parâmetro "ticker" é obrigatório.`
- Coluna `TICKER` não encontrada na aba → mensagem específica.
- Padrão `{ isError: true, content: [...] }`.
