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
- Landing (`artifacts/orgni`) is token-driven via `index.css`; ring/chart/sidebar-primary and the
  `text-primary` accent are graphite (`0 0% 12%`) — do NOT shift the `--primary` token to light grey
  or all the `text-primary` icons/headings/links go invisible. Radius is rounded (not 0). Buttons
  have an iOS press: `active:scale`. The landing hero/pricing sections are intentionally **dark** by
  design — only the app is the white surface; do not "fix" the dark hero to white unless asked.
- Filled/primary BUTTONS are a light grey (NOT black): `bg-[hsl(0_0%_92%)] text-[hsl(0_0%_12%)]`
  with an `hsl(0 0% 85%)` border (button.tsx default variant + explicit CTA overrides). App
  `button.primary` is `#ebebf0` fill + `var(--ink)` text. Match the sidebar active light-grey pill.
  Secondary CTAs stay `variant=outline` (transparent + white border on the dark hero) for hierarchy.
- App (`artifacts/orgni-app/styles.css`) brand tokens are graphite: `--accent`/`--brand` = `#1d1d1f`
  (used for chips/badges/avatars, not buttons).
- The category taxonomy keeps distinct colors (department teal / role blue / rule purple / risk red);
  only the former orange **workflow** category was moved to neutral grey (`#636366`).
- The brand logo is a raster **orange** PNG and is kept in its ORIGINAL color (no grayscale) — the
  user explicitly wants the logo colored. `grayscale` filters belong only to disabled states like
  `.integration-card.unavailable`, not the logo.
