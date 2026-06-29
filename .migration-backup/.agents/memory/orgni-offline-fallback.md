---
name: Orgni offline / frontend-only fallback
description: How the orgni-app survives a backend-less (Vercel static) deploy, and the contract that keeps it correct
---

# Orgni in-device fallback

The orgni-app frontend can be deployed frontend-only (e.g. Vercel) with no backend.
In that case every `/api/*` call must NOT hard-fail.

**Mechanism:** the single `api(path, options)` helper in `App.jsx` routes to a
browser-localStorage layer (`src/localApi.js`) when the fetch throws (network) OR
the response `content-type` is not `application/json` (a static host / SPA rewrite
returns `index.html`, and a static POST returns a 405 — both non-JSON). On a real
deployment the backend always answers with JSON, so the fallback never triggers.

**Why:** a static SPA-rewrite host turns `POST /api/orgs` into HTML/405; the user
wanted the app usable without the backend ("in-device memory for now").

**Contract to keep correct:** `localApi` must return the *same JSON envelopes* the
backend returns (e.g. `{organizations}`, `{organization}`, `{documents}`,
`{workflows,detected}`, `{exceptions,stats}`, dashboard `{counts,...}`, chat
`{answer,grounded,sources,...}`). If the backend response shape changes, update
`localApi` in lockstep or offline mode silently breaks.

**Operating-model build on Vercel (the one AI step that DOES run):** a Vercel
serverless function at `api/build.js` (repo root) runs the AI extraction with the
key server-side (`AI_API_KEY`/`ANTHROPIC_API_KEY` set as Vercel env vars, never
in the browser). It returns a `context` object matching `getContext()`'s shape.
`localApi`'s `engine/intake` handler calls `/api/build` via a RAW fetch (not
through `api()`, to avoid recursing into the fallback), stores the returned
context + version, and the dashboard then reports `knowledge.status:'ready'`.
`vercel.json` must exclude `/api/` from the SPA rewrite (`/((?!api/).*)`) so the
function is reachable; other `/api/*` paths then 404 (HTML) and fall back to
`localApi` as before.

**Why server-side, not a browser key:** user explicitly chose the secure path —
an embedded AI key would be publicly visible to any site visitor.

**Still offline (accepted):** Lucy's per-question chat and finding/exception
scans still need AI per call and remain offline-stubbed in `localApi`. Only the
model build was wired to the serverless function.

# Where the Orgni backend actually lives

The real engine is NOT in `artifacts/api-server/src` (that's a minimal scaffold).
It lives in plain JS under `artifacts/api-server/engine/` (engine, services, routes,
models). Search there for chat/intake/dashboard/validation logic and JSON shapes.
