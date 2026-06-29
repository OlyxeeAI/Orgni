---
name: iOS monochrome palette (no orange brand)
description: The brand moved off orange to a neutral iOS-style monochrome palette; keep new UI consistent with this.
---

# iOS monochrome palette

The orange brand (landing hue `20 90% 45%`, app `#f26a1b`) was retired in favor of a neutral
iOS look: white/light-grey surfaces, graphite near-black primary CTAs, neutral focus rings.

**Why:** User explicitly wants to avoid orange and match an iOS aesthetic (light greys + white,
plus smooth motion).

**How to apply (do this for any new UI so it stays consistent):**
- Landing (`artifacts/orgni`) is token-driven via `index.css`; primary/ring/chart/sidebar-primary
  are graphite (`0 0% 12%`). Radius is rounded (not 0). Buttons have an iOS press: `active:scale`.
  The landing hero/pricing sections are intentionally **dark** by design — only the app is the
  white surface; do not "fix" the dark hero to white unless asked.
- App (`artifacts/orgni-app/styles.css`) brand tokens are graphite: `--accent`/`--brand` = `#1d1d1f`.
- The category taxonomy keeps distinct colors (department teal / role blue / rule purple / risk red);
  only the former orange **workflow** category was moved to neutral grey (`#636366`).
- The brand logo is a raster orange PNG; it is desaturated with `grayscale` (CSS filter / class)
  rather than recolored.
