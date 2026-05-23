# Regras de Infraestrutura — GCP / Cloud Run

**Escopo:** ativada ao modificar `Dockerfile`, `cloudbuild.yaml`, ou ao executar comandos `gcloud`.

---

## Região Obrigatória: `us-east1`

Sempre use `us-east1` (Carolina do Sul) para qualquer recurso GCP deste projeto:
- Cloud Run service
- Artifact Registry repository
- Secret Manager (regional)

**Justificativa:** A infraestrutura do Claude Web/Mobile (Anthropic) está nos EUA (East Coast). Conexões SSE de longa duração com latência > 100 ms causam timeouts no handshake MCP. `us-east1` mantém RTT < 20 ms.

Nunca use `southamerica-east1` para este serviço, mesmo que o usuário final seja brasileiro.

---

## Flags Obrigatórias no `gcloud run deploy`

```bash
--no-cpu-throttling   # OBRIGATÓRIO — sem isso, CPU é congelada em idle e mata conexões SSE
--timeout=3600        # OBRIGATÓRIO — SSE é uma requisição de longa duração; padrão 300s não basta
--min-instances=1     # RECOMENDADO — evita cold start no handshake SSE
```

**Por que `--no-cpu-throttling`:** O Cloud Run, por padrão, congela a CPU de instâncias que não têm requisições HTTP ativas. Uma conexão SSE mantida pelo Claude é tecnicamente uma requisição ativa, mas em períodos sem mensagens o Cloud Run pode throttlar a CPU e eventualmente encerrar o processo. Com `--no-cpu-throttling`, a CPU permanece alocada enquanto houver ao menos uma instância ativa.

---

## Segredos — Secret Manager

Nunca injete valores sensíveis via variáveis de ambiente em texto limpo:

```bash
# ✅ CORRETO — referência ao Secret Manager
gcloud run deploy ... --set-secrets="SPREADSHEET_ID=SPREADSHEET_ID:latest"

# ❌ ERRADO — valor exposto nos logs e na configuração do serviço
gcloud run deploy ... --set-env-vars="SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
```

---

## Imagem Docker

- **Base:** `node:22-alpine` (prod) — mínima e segura
- **Build:** multi-stage — stage `builder` compila TypeScript, stage final copia apenas `dist/` e `node_modules` de produção
- **Tag:** sempre use `latest` para o deploy mais recente; use tags semânticas para rollback

```
IMAGE=us-east1-docker.pkg.dev/<PROJECT_ID>/mcp-servers/google-sheets-mcp
```

---

## Checklist de Deploy

Antes de executar `gcloud run deploy`, confirme:

- [ ] `npm run build` passou sem erros
- [ ] A imagem foi buildada e pushed com sucesso
- [ ] Os secrets necessários existem no Secret Manager
- [ ] A Service Account do Cloud Run tem `roles/secretmanager.secretAccessor`
- [ ] A Service Account tem `roles/sheets.viewer` ou `roles/editor` na planilha
- [ ] Flag `--no-cpu-throttling` está presente
- [ ] Flag `--timeout=3600` está presente
- [ ] Região é `us-east1`
