# Orgni UI

React interface for Orgni. The UI is intentionally minimal: upload documents, build knowledge, and open Workflow or Finance plugins.

## Run Locally

From the project root:

```bash
npm install
npm start
```

The Express server serves the built UI from `public/`.

For UI development:

```bash
npm run dev:api
npm run dev:ui
```

The Vite dev server proxies API requests to `http://127.0.0.1:3000`.

## Build

```bash
npm run build:ui
```

This builds the React app into `public/`, which is what `npm start` serves.

## Main Screens

- Documents: upload `.txt`, `.md`, `.csv`, `.json`, `.pdf`, or `.docx` files and build the Knowledge Map.
- Knowledge: inspect the generated knowledge map as a connected network, with supporting workflow lists and version history.
- Workflow plugin: workflow-scoped context from `/api/orgs/:orgId/engine/context/workflow`.
- Finance plugin: finance-scoped context from `/api/orgs/:orgId/engine/context/finance`.

## Branding

The main logo lives at:

```text
client/src/assets/orgni-logo.png
```

The favicon lives at:

```text
client/public/favicon.png
```

Both are copied from the original Orgni logo asset.

## Knowledge Map

Orgni builds the Knowledge Map locally by default. It parses the business profile and uploaded documents into workflows, roles, rules, approvals, risks, and plugin context without requiring an LLM or API key.

Optional LLM extraction can be enabled later with `ORGNI_USE_LLM_EXTRACTION=true`, but it is not needed for the core UI.
