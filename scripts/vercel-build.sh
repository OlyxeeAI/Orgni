#!/usr/bin/env bash
# Builds both the Orgni landing site and the Orgni product app into a single
# static output that Vercel serves:
#   /      -> landing site (artifacts/orgni)
#   /app/  -> product app   (artifacts/orgni-app)
set -euo pipefail

# 1. Landing site at the root ("/").
pnpm --filter @workspace/orgni run build

# 2. Product app served under "/app/" (BASE_PATH rewrites its asset URLs).
BASE_PATH=/app/ pnpm --filter @workspace/orgni-app run build

# 3. Nest the app build inside the landing output at /app.
APP_OUT="artifacts/orgni/dist/public/app"
rm -rf "$APP_OUT"
mkdir -p "$APP_OUT"
cp -r artifacts/orgni-app/dist/public/. "$APP_OUT/"

echo "Combined build ready: artifacts/orgni/dist/public (landing + /app)"
