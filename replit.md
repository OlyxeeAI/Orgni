# Orgni

Orgni is a live business-context layer by Olyxee: it reads a company's documents, processes, decisions, and systems and maps them into a living operating model that teams and intelligent tools can rely on.

## Run & Operate

- `pnpm --filter @workspace/orgni run dev` — marketing + docs site (landing page)
- `pnpm --filter @workspace/orgni-app run dev` — the product web app (Lucy, Sources, Operating Model)
- `pnpm --filter @workspace/api-server run dev` — API server + Orgni engine
- `pnpm --filter @workspace/mockup-sandbox run dev` — component preview server (canvas mockups)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Each artifact binds to the `PORT` env var assigned by Replit; the preview pane routes to each by its base path.

## Stack

- pnpm workspaces, Node.js 24 LTS (pinned via `engines`), TypeScript 5.9
- Web (orgni, orgni-app): React 19.2 + Vite 7 + Tailwind 4 + framer-motion + wouter
- API: Express on esbuild bundle; the `engine/` directory is plain CommonJS
- AI: configurable provider via env (`AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`); currently Grok (xAI) using `GROK_API_KEY`
- Build: esbuild (API), Vite (web artifacts)

## Where things live

- `artifacts/orgni` — public marketing + docs/API/pricing site. Pages in `src/pages`, shared UI in `src/components` (`site-header.tsx`, `site-footer.tsx`, `waitlist-dialog.tsx`).
- `artifacts/orgni-app` — the product web app. Single-file UI in `src/App.jsx`, styles in `src/styles.css`, API client in `src/localApi.js`.
- `artifacts/api-server` — Express API in `src/`; the Orgni engine (knowledge extraction, AI services) in `engine/` (controllers, routes, services, models). Engine AI config lives in `engine/services/ai.service.js`.
- `artifacts/mockup-sandbox` — Vite preview server for isolated component mockups on the canvas.
- `vercel.json` (root) — Vercel build output dir points at `artifacts/orgni/dist/public`.

## Architecture decisions

- The engine (`api-server/engine`) is CommonJS and separate from the TypeScript API surface; `ai.service.js` reads provider config from env at call time, so the process must be restarted to pick up new AI env vars.
- AI provider is pluggable through env vars rather than hard-coded, so the engine can switch between Grok and other providers without code changes.
- `orgni` (Vite) outputs to `dist/public`, which is why the root `vercel.json` overrides `outputDirectory`.
- Document-first onboarding: the app builds an operating model from an uploaded document instead of long manual forms.

## Product

- Marketing site: positions Orgni as a live operating-context layer; CTAs open the waitlist/access dialog and link to the app.
- App: "Lucy" operations analyst answers grounded questions about the business; Sources manages indexed documents; Operating Model shows the mapped knowledge map.

## User preferences

- CTA buttons are labeled "Try it for free" (not "Request access"); the access/waitlist dialog and in-sentence prose mentions stay as-is.
- App sidebar uses a unified white surface with a BETA badge by the brand and "What's New" + "Send Feedback" entries above Profile.
- Feedback / contact links point to `https://www.olyxee.com/contact`.

## Gotchas

- Restart the `api-server` workflow after changing any AI / engine env var — config is read at call time but the running process caches the environment.
- The engine's `safeExtract` swallows non-auth errors, so an upstream AI failure (e.g. no provider credits) can silently produce an empty knowledge map rather than a visible error.
- Document upload uses the multipart field name `files` (multer array), not `file`.

## Deployment

- See `DEPLOYMENT.md` for the Azure deployment guide (Static Web Apps for the two
  front-ends, App Service / Container Apps for the API server, env vars, CI sketch).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
