---
name: Brand logos for plugins page
description: Why certain brand logos are local SVG assets instead of simple-icons
---

Several major brands are NOT in the installed `simple-icons` package (removed at the trademark holders' request): OpenAI/ChatGPT, Slack, Salesforce, and all Microsoft brands (Microsoft, Microsoft Teams, Microsoft Copilot, Microsoft 365). GitHub Copilot, Google Gemini, Claude, Anthropic ARE present.

**Why:** The user strongly requires REAL official logos on the Plugins page — never letter-mark / customized substitutes. Since simple-icons lacks these brands, their official SVGs were downloaded from svgl (svgl.app/library) into `client/src/assets/logos/` and rendered via `BrandGlyph`'s image mode (`image=` prop → `<img>`), bundled locally for production.

**How to apply:** When adding/changing a plugin logo, first check `require('simple-icons').si<Name>`; if missing, fetch the official SVG (svgl.app API at api.svgl.app lists routes) and bundle it locally rather than faking a `mark`/`color` letter glyph.
