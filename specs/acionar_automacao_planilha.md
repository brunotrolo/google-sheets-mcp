# Spec — `acionar_automacao_planilha`

## Objetivo

Disparar uma automação (função do Google Apps Script ligado à planilha
OPLab) a partir do MCP. Permite ao Claude pedir "atualizar gregas",
"rodar scanner", "executar fluxo sequencial" etc. sem que o usuário
precise abrir a planilha e clicar no menu.

## Input

```json
{
  "nome_da_funcao": "executarFluxoSequencial"
}
```

`nome_da_funcao` é obrigatório. Valores aceitos (`enum` no schema):

- `executarFluxoSequencial`
- `executarSequenciaScanner`
- `AtualizarNecton_Menu`
- `AtualizarDadosAtivos_Menu`
- `AtualizarDetalhes_Menu`
- `AtualizarGregasAPI_Menu`
- `CalcularGregasNativo_Menu`
- `AtualizarScannerOpcoes_Menu`
- `SyncBestCoveredOptionsRates_Menu`
- `SyncHighestOptionsVolume_Menu`
- `SyncM9M21Ranking_Menu`
- `SyncCorrelIbovRanking_Menu`
- `ScreenerQuantitativo_Menu`

Adicionar uma função nova ao roteador exige editar tanto o `enum` desta
tool quanto o `switch` em `codigo.gs` na planilha.

## Fluxo

```
Claude → MCP (CallTool) → fetch POST APPS_SCRIPT_WEB_APP_URL
                                  body = { token, funcao }
                          ← JSON { status, message }
       ← resposta crua do Apps Script
```

O servidor MCP não toca na planilha diretamente — só faz HTTP POST
outbound. A regra do SSE (`.claude/rules/express-stream.md`) permanece
intacta: nenhum `express.json()` é introduzido.

## Configuração

Duas variáveis obrigatórias:

- `APPS_SCRIPT_WEB_APP_URL` — URL do Web App (`.../exec`), deploy com
  acesso "Anyone, even anonymous".
- `APPS_SCRIPT_TOKEN` — string secreta compartilhada com o `doPost()`
  do Apps Script (`payload.token === <esse valor>`).

Em Cloud Run ambas devem vir do Secret Manager (ver
`.claude/rules/infra.md`):

```bash
gcloud secrets create apps-script-url   --data-file=- <<< 'https://script.google.com/macros/s/XXXX/exec'
gcloud secrets create apps-script-token --data-file=- <<< 'TOKEN_SECRETO_OPLAB_2026'

PROJECT_NUMBER=$(gcloud projects describe oplab-sheets-mcp-project --format='value(projectNumber)')
for s in apps-script-url apps-script-token; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

gcloud run services update oplab-sheets-mcp --region=us-east1 \
  --update-secrets=APPS_SCRIPT_WEB_APP_URL=apps-script-url:latest,APPS_SCRIPT_TOKEN=apps-script-token:latest
```

## Output

### Sucesso

```json
{
  "status": "Sucesso",
  "message": "A função executarFluxoSequencial foi executada na planilha OPLab."
}
```

### Erros

`isError: true` com mensagem descritiva em três situações:

| Caso | Texto |
|---|---|
| Variável faltando | `Variável APPS_SCRIPT_WEB_APP_URL não configurada.` |
| HTTP não-2xx | `Apps Script retornou HTTP <status>: <body>` |
| `status: "Erro"` no body | `Apps Script reportou erro: <message>` |

## Apps Script — contraparte (`codigo.gs`)

```javascript
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== "TOKEN_SECRETO_OPLAB_2026") {
      return ContentService.createTextOutput(JSON.stringify({ status: "Erro", message: "Acesso Negado. Token inválido." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    switch (payload.funcao) {
      case "executarFluxoSequencial": executarFluxoSequencial(); break;
      // ... demais cases ...
      default: throw new Error(`A função '${payload.funcao}' não está mapeada no roteador.`);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "Sucesso",
      message: `A função ${payload.funcao} foi executada na planilha OPLab.`
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "Erro", message: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Observações

- O `fetch` é global no Node 20+ — sem dependência nova.
- A regra absoluta do projeto (`.claude/rules/express-stream.md`) proíbe
  `app.use(express.json())` antes das rotas SSE. Esta tool não precisa
  disso porque os argumentos vêm já parseados pelo MCP SDK via
  `request.params.arguments`.
- Tempo de execução de algumas funções no Apps Script pode passar de
  30s. Como o transport SSE é mantido por requisições de longa duração
  (`--timeout=3600` no Cloud Run), isso não é problema. Mas se uma
  função estourar o limite de 6 min do Apps Script, o `fetch` vai
  retornar erro — considerar quebrar em funções menores no `codigo.gs`.
