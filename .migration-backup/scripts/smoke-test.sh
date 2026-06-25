#!/usr/bin/env bash
#
# scripts/smoke-test.sh
#
# Walks the full Orgni Engine flow against a running server:
#   create org → upload document → run intake → fetch context
#
# Uses NODE_ENV=test stub data if no real AI_API_KEY is configured,
# so this works immediately with zero setup. With a real key configured,
# it exercises real AI extraction instead.
#
# Usage:
#   npm start &        # start the server first (separate terminal)
#   bash scripts/smoke-test.sh

set -e

BASE="http://localhost:3000/api"
SAMPLE_DOC="$(dirname "$0")/../src/tests/fixtures/sample-sop.txt"

if [ ! -f "$SAMPLE_DOC" ]; then
  echo "Sample document not found at $SAMPLE_DOC"
  exit 1
fi

echo "── 1. Create organisation ─────────────────────────────"
ORG_JSON=$(curl -s -X POST "$BASE/orgs" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test Co","businessType":"Logistics"}')
echo "$ORG_JSON"
ORG_ID=$(echo "$ORG_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['organization']['id'])")
echo "Org ID: $ORG_ID"
echo

echo "── 2. Upload sample document ──────────────────────────"
curl -s -X POST "$BASE/orgs/$ORG_ID/documents" -F "files=@$SAMPLE_DOC"
echo
echo

echo "── 3. Confirm document parsed ─────────────────────────"
sleep 1
curl -s "$BASE/orgs/$ORG_ID/documents"
echo
echo

echo "── 4. Run intelligence intake ─────────────────────────"
INTAKE_RES=$(curl -s -X POST "$BASE/orgs/$ORG_ID/engine/intake")
echo "$INTAKE_RES"
echo

if echo "$INTAKE_RES" | grep -q "MISSING_API_KEY"; then
  echo "NOTE: No AI_API_KEY configured. Set NODE_ENV=test before starting"
  echo "the server to use stub data, or add a real key to .env to see"
  echo "actual AI extraction."
  exit 0
fi

echo "── 5. Fetch full context ──────────────────────────────"
curl -s "$BASE/orgs/$ORG_ID/engine/context" | python3 -m json.tool
echo

echo "── 6. Fetch workflow-scoped context ───────────────────"
curl -s "$BASE/orgs/$ORG_ID/engine/context/workflow" | python3 -m json.tool
echo

echo "── 7. Fetch finance-scoped context ────────────────────"
curl -s "$BASE/orgs/$ORG_ID/engine/context/finance" | python3 -m json.tool
echo

echo "Done. Organisation ID for further testing: $ORG_ID"
