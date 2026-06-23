# Orgni Engine

The core intelligence layer of Orgni by Olyxee. Takes business documents in, extracts organisational knowledge (workflows, roles, rules, risks, opportunities), and exposes it through an API and a React UI.

## Architecture

- **Backend**: Express (Node.js) API in `index.js` + `src/`. Serves the REST API under `/api`, plus `/health` and `/api-info`. In production it also serves the built UI from `public/`.
- **Frontend**: React app in `client/`, built with Vite. Calls the backend via relative `/api` paths.
- **Database**: `lowdb` (a JSON file at `data/db.json`). Prototype storage; the repository interface lives in `src/db/`.
- **AI**: Provider-agnostic (Anthropic/OpenAI/Grok/etc.) via `AI_*` env vars. Optional — AI features return 503 until `AI_API_KEY` is set. Deterministic extraction works without any key.

## Replit Setup

- **Frontend workflow** ("Start application"): `npm run dev:ui` → Vite dev server on port **5000** (host `0.0.0.0`, all hosts allowed for the Replit proxy). Proxies `/api`, `/health`, `/api-info` to the backend.
- **Backend workflow** ("Backend API"): `node index.js` → Express on port **3000** (localhost).
- **Deployment** (autoscale): builds the UI with `npm run build:ui` (outputs to `public/`), then runs `PORT=5000 node index.js` so Express serves both the UI and the API on a single port.

## Configuration

- Copy `.env.example` to `.env` to configure. Set `AI_API_KEY` (or `ANTHROPIC_API_KEY`) to enable AI features.
- Other notable vars: `PORT`, `DB_PATH`, `UPLOAD_DIR`, `LOG_DIR`, `CONFIDENCE_THRESHOLD`.

## User Preferences

(none recorded yet)
