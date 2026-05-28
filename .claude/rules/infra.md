# Regras de Infraestrutura — GCP / Cloud Run

**Escopo:** ativada ao modificar `Dockerfile`, `cloudbuild.yaml`, ou ao executar comandos `gcloud`.

---

## Região Obrigatória: `us-east1`

Sempre use `us-east1` (Carolina do Sul) para qualquer recurso GCP deste projeto:
- Cloud Run service (`oplab-sheets-mcp`)
- Artifact Registry repository (`cloud-run-source-deploy`)
- Secret Manager (regional)

**Justificativa:** A infraestrutura do Claude Web/Mobile (Anthropic) está nos EUA (East Coast). Conexões SSE de longa duração com latência > 100 ms causam timeouts no handshake MCP. `us-east1` mantém RTT < 20 ms.

Nunca use `southamerica-east1` para este serviço, mesmo que o usuário final seja brasileiro.

---

## Flags Obrigatórias no `gcloud run deploy`

```bash
--no-cpu-throttling   # OBRIGATÓRIO — sem isso, CPU é congelada em idle e mata conexões SSE
--timeout=3600        # OBRIGATÓRIO — SSE é uma requisição de longa duração; padrão 300s não basta
--min-instances=1     # RECOMENDADO — evita cold start no handshake SSE
--clear-base-image    # OBRIGATÓRIO ao usar --source . (serviço foi originalmente buildpacks)
```

**Por que `--no-cpu-throttling`:** O Cloud Run, por padrão, congela a CPU de instâncias que não têm requisições HTTP ativas. Uma conexão SSE mantida pelo Claude é tecnicamente uma requisição ativa, mas em períodos sem mensagens o Cloud Run pode throttlar a CPU e eventualmente encerrar o processo. Com `--no-cpu-throttling`, a CPU permanece alocada enquanto houver ao menos uma instância ativa.

**Por que `--clear-base-image`:** A primeira versão do serviço foi deployada via buildpacks (sem Dockerfile). Como agora usamos `--source .` com Dockerfile próprio, o Cloud Run exige essa flag para abandonar a configuração de base image anterior.

---

## Deploy Seguro — `--no-traffic` + tag preview

**Procedimento obrigatório para qualquer deploy.** Não atalhe.

```bash
cd ~/google-sheets-mcp-deploy && git pull origin main
COMMIT=$(git rev-parse --short HEAD)

# 1) Deploya nova revisão SEM migrar tráfego
gcloud run deploy oplab-sheets-mcp \
  --source . --region=us-east1 \
  --no-cpu-throttling --timeout=3600 --min-instances=1 \
  --update-env-vars=BUILD_ID="$COMMIT" \
  --clear-base-image \
  --no-traffic

# Saída: "revision [oplab-sheets-mcp-000XX-???] has been deployed and is
#         serving 0 percent of traffic."

# 2) Aponta tag "preview" para a nova revisão
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --update-tags=preview=oplab-sheets-mcp-000XX-???

# URL gerada: https://preview---oplab-sheets-mcp-<HASH>.run.app

# 3) Testa com curl + Claude Web (conector separado apontando para o URL preview).
#    Só prossiga se as 10 ferramentas listarem corretamente.

# 4) Migra 100% do tráfego para a revisão nova
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 --to-latest

# 5) Remove a tag preview (limpa)
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --remove-tags=preview

# 6) (Opcional) Tag de baseline no Artifact Registry para rollback rápido
IMG=$(gcloud run revisions describe oplab-sheets-mcp-000XX-??? --region=us-east1 \
       --format='value(spec.containers[0].image)')
gcloud artifacts docker tags add "$IMG" \
  us-east1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/oplab-sheets-mcp:working-baseline-vN
```

**Por que isso é obrigatório:** já quebramos o conector do Claude Web várias vezes (PRs #6-#11) deployando direto em produção sem testar antes. A tag preview existe pra detectar incompatibilidade ANTES do tráfego real ser impactado.

---

## Rollback Rápido

A imagem `working-baseline-v2` no Artifact Registry aponta para a revisão
00015 (PR #12) — última versão validada com o Claude Web.

Se uma revisão nova quebrar, **não tente fixar com novo deploy**. Migre
tráfego para a revisão antiga:

```bash
# Migra para a revisão anterior conhecida-boa
gcloud run services update-traffic oplab-sheets-mcp --region=us-east1 \
  --to-revisions=oplab-sheets-mcp-00015-glk=100

# OU deploya direto a imagem do working-baseline
gcloud run deploy oplab-sheets-mcp --region=us-east1 \
  --image=us-east1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/oplab-sheets-mcp:working-baseline-v2 \
  --no-cpu-throttling --timeout=3600 --min-instances=1
```

---

## Recuperando código de uma imagem antiga

Quando o repo está dessincronizado da produção (caso histórico que motivou
o PR #12), dá pra extrair o código fonte da imagem ativa:

```bash
gcloud auth configure-docker us-east1-docker.pkg.dev --quiet

# Pega o SHA da imagem que queremos resgatar
IMG=$(gcloud run revisions describe <REVISAO> --region=us-east1 \
       --format='value(spec.containers[0].image)')

docker pull "$IMG"

# Extrai /app do container
CID=$(docker create "$IMG")
mkdir -p /tmp/recovered
docker cp "$CID:/app" /tmp/recovered/
docker rm "$CID"

# src/index.ts está em /tmp/recovered/app/src/index.ts
ls /tmp/recovered/app/
```

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

- **Base:** `node:20-slim` (alinhada com a imagem de produção)
- **Build:** single-stage — `COPY . .` + `npm install` + `npm run build`
- **Saída:** `build/index.js` (não `dist/`)
- **EXPOSE:** `8080` (porta padrão injetada pelo Cloud Run)

```
IMAGE=us-east1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/oplab-sheets-mcp
```

---

## Checklist de Deploy

Antes de executar `gcloud run deploy`, confirme:

- [ ] `npm run build` passou sem erros
- [ ] Os secrets necessários existem no Secret Manager
- [ ] A Service Account do Cloud Run tem `roles/secretmanager.secretAccessor`
- [ ] A Service Account tem `roles/sheets.viewer` na planilha
- [ ] Flag `--no-cpu-throttling` está presente
- [ ] Flag `--timeout=3600` está presente
- [ ] Flag `--clear-base-image` está presente (quando usar `--source .`)
- [ ] Flag `--no-traffic` está presente
- [ ] Tag `preview` será criada e testada antes de migrar tráfego
- [ ] Região é `us-east1`
