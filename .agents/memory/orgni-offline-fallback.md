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

**Known limitation (accepted):** AI-only endpoints (operating-model build /
engine intake, Lucy real answers, scans) cannot run client-side — `localApi`
returns a graceful offline message or throws a friendly error.

# Where the Orgni backend actually lives

The real engine is NOT in `artifacts/api-server/src` (that's a minimal scaffold).
It lives in plain JS under `artifacts/api-server/engine/` (engine, services, routes,
models). Search there for chat/intake/dashboard/validation logic and JSON shapes.
