# Orgni — Deployment Guide (Azure)

This document is for the deployment / DevOps team. It describes how to build and
deploy the Orgni project to **Microsoft Azure**.

The project is a **pnpm monorepo** with three deployable components plus one
dev-only tool. Each is built and deployed independently.

| Component | Package | Type | Azure target |
|-----------|---------|------|--------------|
| Marketing + docs site | `@workspace/orgni` | Static SPA (Vite) | Azure Static Web Apps |
| Product web app | `@workspace/orgni-app` | Static SPA (Vite) | Azure Static Web Apps |
| API + Orgni engine | `@workspace/api-server` | Node/Express service | Azure App Service (Linux) or Container Apps |
| Component sandbox | `@workspace/mockup-sandbox` | Dev tool | **Not deployed** |

---

## 1. Prerequisites

- **Node.js 24 LTS** (the repo pins `engines.node` to `>=24 <25`; match this in Azure). This is a deliberate production pin to the current LTS line for stability — it is intentionally not the newest Node major (26.x).
- **pnpm 10** (`corepack enable` then `corepack prepare pnpm@10.26.1 --activate`)
- An Azure subscription with permission to create Static Web Apps, App Service / Container Apps, and (optionally) Azure Database for PostgreSQL.

> The repo enforces a 1-day npm `minimumReleaseAge` for supply-chain safety. CI build agents only consume already-published versions, so this does not affect deployment, but do not disable it.

---

## 2. Build (all components)

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm run build          # typecheck + build every package
```

Build outputs:

- `artifacts/orgni/dist/public` — static files for the marketing site
- `artifacts/orgni-app/dist/public` — static files for the product app
- `artifacts/api-server/dist/index.mjs` — bundled Node server (ESM)

To build a single component:

```bash
pnpm --filter @workspace/orgni run build
pnpm --filter @workspace/orgni-app run build
pnpm --filter @workspace/api-server run build
```

---

## 3. Environment variables

Set these in the relevant Azure resource (App Service **Configuration**, Container
Apps secrets, or Static Web Apps settings). Never commit secrets to the repo.

### API server (`@workspace/api-server`)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | yes | The server **requires** it and exits at boot if missing. **App Service (Linux Node)** provides it automatically. **Container Apps** does *not* reliably inject it — set `PORT` explicitly and align it with the ingress `targetPort` (see §4.2). |
| `NODE_ENV` | yes | Set to `production`. |
| `DATABASE_URL` | yes (for persistence) | Postgres connection string. **Without it the engine falls back to ephemeral storage and loses data between restarts.** Use Azure Database for PostgreSQL. |
| `AI_PROVIDER` | yes | `grok` (current) or `anthropic`. |
| `AI_BASE_URL` | provider-dependent | e.g. `https://api.x.ai` for Grok, `https://api.anthropic.com` for Anthropic. |
| `AI_MODEL` | yes | e.g. `grok-3`. Avoid retired model ids. |
| `GROK_API_KEY` / `XAI_API_KEY` | for Grok | API key for xAI. (`ANTHROPIC_API_KEY` if using Anthropic.) |
| `ORGNI_USE_LLM_EXTRACTION` | optional | `true` to enable LLM-based knowledge extraction. |

> The Grok key must have **billing credits** on the xAI side or AI calls fail. A failed AI call can silently produce an empty knowledge map rather than a hard error (see Gotchas).

### Static apps (`orgni`, `orgni-app`)

- `BASE_PATH` — only needed at **build time** if the app is served under a sub-path
  (e.g. `/app`). If each app is hosted at the root of its own domain/site, leave it
  unset (defaults to `/`).
- The product app calls the API at `/api/*` (same-origin). Route `/api/*` to the
  API server (see §4.2) or host the app behind the same domain as the API.

---

## 4. Deploying each component

### 4.1 Static sites — Azure Static Web Apps

For **orgni** and **orgni-app** (repeat per app):

1. Create an Azure Static Web App.
2. Build the app (`pnpm --filter @workspace/<app> run build`).
3. Deploy the contents of `artifacts/<app>/dist/public` as the app artifact.
4. Add SPA fallback so client-side routes resolve to `index.html`. Create
   `staticwebapp.config.json` in the deployed root:

   ```json
   {
     "navigationFallback": {
       "rewrite": "/index.html",
       "exclude": ["/assets/*", "*.{png,jpg,svg,css,js,mp4,ico}"]
     }
   }
   ```

> Both apps are pure static bundles — no server runtime is required for them.

### 4.2 API server — Azure App Service (Linux, Node 24)

1. Provision an App Service plan (Linux) with the **Node 24 LTS** runtime.
2. Deploy the repo (or just `artifacts/api-server` with its `dist/` and
   `node_modules`). Recommended: build in CI, deploy `dist/` + production deps.
3. Configure the **startup command**:

   ```bash
   node --enable-source-maps dist/index.mjs
   ```

   (equivalent to `pnpm --filter @workspace/api-server run start`)
4. Set all API environment variables from §3. Azure provides `PORT`; the server
   binds `0.0.0.0:$PORT` (Express default host), which App Service requires.
5. Route the front-end's `/api/*` traffic to this service (Static Web Apps linked
   backend, Front Door, or App Gateway).

**Container Apps alternative:** build a container that runs the same startup
command on Node 24. Unlike App Service, Container Apps does **not** inject `PORT`
automatically — you must set it explicitly and point ingress at the same port,
otherwise the server crashes at boot (it requires `PORT`). Example:

```bash
az containerapp create \
  --name orgni-api --resource-group <rg> --environment <env> \
  --image <registry>/orgni-api:latest \
  --ingress external --target-port 8080 \
  --env-vars PORT=8080 NODE_ENV=production AI_PROVIDER=grok \
             AI_BASE_URL=https://api.x.ai AI_MODEL=grok-3 \
  --secrets grok-key=<value> database-url=<value> \
  --env-vars GROK_API_KEY=secretref:grok-key DATABASE_URL=secretref:database-url
```

Set `--target-port` and `PORT` to the same value, and supply the remaining
secrets/env from §3.

---

## 5. CI/CD sketch (GitHub Actions → Azure)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: corepack enable && corepack prepare pnpm@10.26.1 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      # then: deploy artifacts/orgni/dist/public        -> Static Web App (site)
      #       deploy artifacts/orgni-app/dist/public     -> Static Web App (app)
      #       deploy artifacts/api-server (dist + deps)   -> App Service / Container Apps
```

---

## 6. Health check & verification

- **API:** after deploy, the service logs `Server listening` with the port. Hit a
  known route under `/api/` to confirm responses.
- **Static apps:** load the root URL; confirm client-side navigation works
  (SPA fallback) and that the product app can reach `/api/*`.
- **Persistence:** create data, restart the API, confirm data survives — this
  verifies `DATABASE_URL` is wired (not the ephemeral fallback).

---

## 7. Gotchas

- **Restart after AI/env changes.** The engine reads AI config from the
  environment; the running process caches it. Restart the API service after
  changing any AI variable.
- **Silent empty extraction.** The engine's extraction path swallows non-auth
  errors, so an AI failure (e.g. no provider credits) yields an empty knowledge
  map instead of a visible error. Confirm AI credentials and credits before go-live.
- **Ephemeral DB fallback.** No `DATABASE_URL` ⇒ data is not persisted. Always set
  it in production.
- **Document upload** uses the multipart field name `files` (array), not `file`.
- **`vercel.json`** at the repo root is Vercel-specific and is **not used by
  Azure**. It can be ignored or removed for the Azure pipeline.
- **pnpm only.** A `preinstall` guard blocks npm/yarn. Build agents must use pnpm.
