# Orgni

A premium single-page marketing landing page for Orgni — the business-context layer for AI-enabled execution (by Olyxee).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- **Design system (brand):** site-wide DARK theme. Global dark mode is enabled by `class="dark"` on `<html>` in `index.html`; the `.dark` token palette in `src/index.css` is tuned to pure black (`--background` 0 0% 0%, `--card` 0 0% 6%, `--border`/`--card-border` 0 0% 16%, `--muted`/`--secondary`/`--accent` 0 0% 12%). Restrained ORANGE accent (`--primary` HSL 20 90% 45%), sharp corners (`--radius: 0`). No blue/purple/green or "AI gradient" palettes; no chatbot/AI imagery; no long paragraphs; no emojis. Build new pages with semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) so they inherit the dark theme automatically. Inverted highlights (e.g. the featured pricing card) use `bg-foreground text-background`, which under dark tokens renders a white surface with dark text (a bright callout on the dark page). NOTE: `home.tsx` is hand-built with literal dark utilities (`bg-black`, `text-white`, `bg-white/5`); its map diagram chips are literal `bg-white/90` with `text-neutral-900`/`text-neutral-500` so they stay light regardless of tokens.
- **Typography:** Geist (sans) + Geist Mono (mono), loaded once via `<link>` in `index.html` (do NOT also `@import` in CSS — duplicate load). Driven by CSS variables `--app-font-sans`/`--app-font-mono` → Tailwind `--font-sans`/`--font-mono` in `@theme inline`, so changing the font in `src/index.css` propagates site-wide. Headings get global `-0.02em` tracking.
- **Docs & API pages** share one documentation layout: 3-column grid (sticky grouped sidebar / max-w-3xl content / `xl`-only "On this page" TOC) with IntersectionObserver scrollspy and smooth-scroll anchors. Keep them visually consistent.
- **/api page is the planned/preview product API**, not the live backend (which only serves waitlist + healthz). It is explicitly labeled "Preview — not yet live"; do not present its endpoints as callable.
- **SEO:** static defaults + JSON-LD live in `index.html`; per-route titles/descriptions/canonical/OG/Twitter are set via the `useSeo` hook (`src/hooks/use-seo.ts`) — call it at the top of every new page. Canonical base is `https://orgni.com`, overridable with `VITE_SITE_URL`. Keep `public/sitemap.xml` and `public/robots.txt` in sync when adding routes. 404 sets `noindex,nofollow`.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
