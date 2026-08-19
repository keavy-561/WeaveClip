#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
echo "=== Health smoke tests against $BASE ==="

echo "-> GET /api/health"
HEALTH=$(curl -s "$BASE/api/health")
echo "$HEALTH"
STATUS=$(echo "$HEALTH" | jq -r '.status')
if [ "$STATUS" != "ok" ]; then
  echo "FAIL: health status != ok"
  exit 1
fi
echo "health ok"

echo "-> GET /api/health?deep=true"
DEEP=$(curl -s "$BASE/api/health?deep=true")
echo "$DEEP"
STATUS=$(echo "$DEEP" | jq -r '.status')
if [ "$STATUS" != "ok" ]; then
  echo "FAIL: deep health status != ok"
  exit 1
fi
echo "deep health ok"

echo "=== health smoke tests passed ==="
