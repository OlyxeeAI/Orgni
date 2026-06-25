---
name: Brand logos for plugins page
description: Why certain brand logos are local SVG assets instead of simple-icons
---

Several major brands are NOT in the installed `simple-icons` package (removed at the trademark holders' request): OpenAI/ChatGPT, Slack, Salesforce, and all Microsoft brands (Microsoft, Microsoft Teams, Microsoft Copilot, Microsoft 365). GitHub Copilot, Google Gemini, Claude, Anthropic ARE present.

**Why:** The user strongly requires REAL official logos on the Plugins page — never letter-mark / customized substitutes. Since simple-icons lacks these brands, their official SVGs were downloaded from svgl (svgl.app/library) into `client/src/assets/logos/` and rendered via `BrandGlyph`'s image mode (`image=` prop → `<img>`), bundled locally for production.

**How to apply:** When adding/changing a plugin logo, first check `require('simple-icons').si<Name>`; if missing, fetch the official SVG (svgl.app API at api.svgl.app lists routes) and bundle it locally rather than faking a `mark`/`color` letter glyph.

**Multicolor brands look wrong via simple-icons:** simple-icons render through `BrandGlyph` as a white silhouette on a solid brand-color tile (`brand-glyph-solid`), so inherently multicolor logos (Google Drive/Gmail/Google Calendar, Airtable, Asana, ClickUp) become unrecognizable flat tiles. Fix = download the real full-color SVG and switch the entry to `image:` (renders `brand-glyph-image` = full-color logo on white tile, like ChatGPT/Slack). Monochrome-identity brands (Notion, HubSpot, Xero, Zapier, Jira, Trello, QuickBooks, Make) are fine left on simple-icons.

**Sourcing full-color SVGs:** svgl filenames differ from brand names — Google Drive is `drive.svg`, Asana is `asana-logo.svg`, Gmail `gmail.svg`, Google Calendar `google-calendar.svg`, ClickUp `clickup.svg`; query `https://api.svgl.app` and grep for the real `https://svgl.app/library/<file>.svg` URL. Brands missing from svgl (e.g. Airtable) come from `gilbarbara/logos` raw: `https://raw.githubusercontent.com/gilbarbara/logos/master/logos/<name>.svg`. **Note:** `connectSources`' BrandGlyph call must pass `image={src.image}` (it historically only passed `iconData`).
