---
name: orgni-app global CSS namespace
description: orgni-app uses one global styles.css with generic class names reused across surfaces; new styles must use unique names.
---

orgni-app (`artifacts/orgni-app/src/styles.css`) is a single global stylesheet (no CSS modules / scoping). Generic, surface-agnostic class names like `.ios-group`, `.ios-cell`, `.pill`, `.doc-row` are reused across the sidebar, pages, and components.

**Rule:** When adding new component styles, pick a unique, surface-prefixed class name (e.g. `.ios-list-group` for a page grouped-card, not `.ios-group` which the sidebar nav already owns). Always grep the class name in both `App.jsx` and `styles.css` before reusing it.

**Why:** A redesign of the Sources page reused `.ios-group`, which silently restyled the sidebar's Plugins nav (it was already a flex-column group). The collision wasn't caught by typecheck — only by review.

**How to apply:** Before defining any `.ios-*` / generic class, run `rg -n "\.<classname>\b"` across the orgni-app src; if it exists elsewhere, scope it (`.parent .child`) or rename.
