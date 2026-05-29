# Spec — `get_alertas_posicoes`

## Objetivo

Avaliar as **posições ATIVAS de VENDA** da aba `COCKPIT` contra regras de
risco (DTE, MONEYNESS, relação `PL_VALUE` vs `MAX_GAIN`) e retornar alertas
classificados em três níveis: `CRITICO`, `ALERTA`, `AVISO`.

Cada alerta inclui uma ação sugerida.

## Input

Sem parâmetros. (`inputSchema: { type: 'object', properties: {} }`)

## Origem dos dados

- Aba: `COCKPIT`, range `A10:Z500`
- Filtro inicial: mesma lógica de `get_cockpit_ativas` (posições em aberto)
- Filtro adicional para as regras: `SIDE = VENDA`. Posições COMPRA são
  contadas em `saudaveis`.

## DTE — calculado em tempo real

`DTE = ceil((EXPIRY − hoje) / 1 dia)`

Aceita `EXPIRY` em dois formatos:
- `YYYY-MM-DD`
- `DD/MM/YYYY`

Se `EXPIRY` ausente ou inválido, `DTE = -1` (não dispara nenhuma regra).

## Regras de classificação

Aplicadas **na ordem**. A primeira que casar define o nível e curto-circuita.

### CRITICO

| Regra | Motivo | Ação sugerida |
|---|---|---|
| `0 < DTE < 10` | `DTE_CRITICO` | "Encerrar urgente" |
| `MONEYNESS = ITM` E `0 < DTE < 20` | `ITM_DTE_CRITICO` | "Avaliar encerramento" |
| `PL_VALUE < 0` E `MAX_GAIN > 0` E `|PL_VALUE| > MAX_GAIN` | `STOP_ATINGIDO` | "Stop atingido — encerrar" |

### ALERTA

| Regra | Motivo | Ação sugerida |
|---|---|---|
| `MONEYNESS = ITM` (qualquer DTE) | `ITM` | "Monitorar diariamente" |
| `10 <= DTE <= 21` | `DTE_MEDIO` | "Planejar manejo" |
| `PL_VALUE < 0` E `MAX_GAIN × 0.5 < |PL_VALUE| <= MAX_GAIN` | `PL_NEGATIVO_50_100` | "Planejar manejo" |

### AVISO

| Regra | Motivo | Ação sugerida |
|---|---|---|
| `22 <= DTE <= 30` | `DTE_MODERADO` | "Acompanhar" |
| `MONEYNESS = ATM` | `ATM` | "Acompanhar" |

### Saudável

Não dispara nenhuma regra E `SIDE = VENDA` ativa → contado em `saudaveis`.
COMPRAs ativas também caem aqui.

## Output

```json
{
  "total_alertas": 5,
  "criticos": [
    {
      "nivel": "CRITICO",
      "motivo": "DTE_CRITICO",
      "descricao": "BBDCR184W1 vence em 8 dias",
      "opcao": "BBDCR184W1",
      "ticker": "BBDC4",
      "side": "VENDA",
      "dte": 8,
      "strike": 18.41,
      "spot": 17.91,
      "moneyness": "ITM",
      "pl_value": 9.00,
      "acao_sugerida": "Encerrar urgente"
    }
  ],
  "alertas": [ /* nivel ALERTA */ ],
  "avisos":   [ /* nivel AVISO */ ],
  "saudaveis": 9
}
```

`total_alertas = criticos.length + alertas.length + avisos.length`.

## Erros

Sem entradas → erro improvável. Linhas com `EXPIRY` malformado simplesmente
não disparam regras dependentes de DTE.

Padrão: `{ isError: true, content: [...] }`.
