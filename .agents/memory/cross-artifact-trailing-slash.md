---
name: Cross-artifact links need trailing slash
description: Path-based artifact routing 404s on links missing the trailing slash that matches previewPath.
---

Cross-artifact navigation links must include the trailing slash that matches the target artifact's `previewPath`.

**Why:** Artifacts are served under a path prefix (e.g. orgni-app at `/app/`). A link to `/app` (no trailing slash) returns 404 from the proxy/dev server; only `/app/` resolves. This caused the landing page "Try it" button to crash when navigating to the product dashboard.

**How to apply:** When writing a plain `<a href>` that points from one artifact to another, use the full `previewPath` including the trailing slash (`href="/app/"`, not `href="/app"`). Same rule for any hardcoded cross-artifact URL.
