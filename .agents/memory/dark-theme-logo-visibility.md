---
name: Dark-theme third-party logo visibility
description: Why brand/integration logos vanished under the site-wide dark theme and the durable fix
---

# Third-party logos on the dark theme

The pricing page integration grid uses third-party brand SVGs in `artifacts/orgni/public/integrations/`.

**Problem:** Simple Icons SVGs are monochrome single-path glyphs with no `fill` (default black). On the pure-black dark theme they render black-on-black and disappear.

**Fix (durable decision):** Render every integration logo inside a small white rounded tile (`bg-white` chip) and use full-color brand SVGs (gilbarbara/logos via jsDelivr; fall back to `cdn.simpleicons.org/<slug>/<brandhex>` for ones gilbarbara lacks, e.g. quickbooks, googlesheets, zapier, hubspot, stripe, sap).

**Why:** The user wanted logos to keep their *original colors*. A white tile guarantees contrast for any logo regardless of its own color — including inherently-black marks (Notion, GitHub) that would still be invisible even after re-coloring. It also preserves true multicolor brand logos.

**How to apply:** When placing any third-party/brand logo on this dark site, put it on a light tile rather than tinting it white. Prefer icon-only variants (gilbarbara `<name>-icon.svg`) over wordmarks so square tiles stay consistent; wide wordmark SVGs look tiny/inconsistent in square cells.
