# Spec — `get_cockpit_historico`

## Objetivo

Retornar todas as linhas da aba `COCKPIT` cujo `STATUS` indica que a posição
já foi finalizada — ou seja, `ENCERRADO` ou `EXERCIDA`.

Complementa `get_cockpit_ativas` (que devolve apenas operações em curso),
permitindo análise de performance histórica sem export manual de CSV.

## Input

Nenhum argumento. (Sem `inputSchema`.)

## Origem dos dados

- Aba: `COCKPIT`
- Range: `A10:Z500`
- Linha 10 contém os cabeçalhos; linhas 11 em diante são dados.

## Filtro

Para cada linha, resolver a coluna `STATUS` (case-insensitive, primeiro header
cujo nome em maiúsculo contenha `STATUS` — excluindo `STATUS_OP` que se refere
ao status operacional intra-dia e já é utilizado por `get_cockpit_ativas`).

Manter a linha se `STATUS` (uppercase, trimmed) for **exatamente** uma de:

- `ENCERRADO`
- `EXERCIDA`

Comparação tolerante a acentos não é necessária — os valores na planilha são
sempre em caixa alta sem acento.

## Output

Array JSON de objetos `{ header: value }`, preservando **todas** as colunas
presentes no cabeçalho da aba — incluindo os campos exigidos pelo pedido:
`TRADE_MONTH`, `MAX_GAIN`, `PL_VALUE`, `SIDE`.

Se nenhuma linha histórica for encontrada, retornar `[]`.

## Erros

Os erros seguem o padrão dos demais handlers: `{ isError: true, content: [...] }`.
