#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "=== Analyze smoke tests against $BASE ==="

EMAIL="analyze+smoke-$(date +%s)@test.com"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"Analyze Smoke\"}")
TOKEN=$(echo "$register_resp" | jq -r '.token // empty')
if [ -z "$TOKEN" ]; then
  login_resp=$(curl -s -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\"}")
  TOKEN=$(echo "$login_resp" | jq -r '.token // empty')
fi
if [ -z "$TOKEN" ]; then
  echo "FATAL: cannot obtain token"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

project_resp=$(curl -s -X POST "$BASE/api/projects" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Analyze Smoke Project"}')
PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')

echo "-> upload one video asset via presign"
presign_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets/presign" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"type":"video","fileName":"sample.mp4","fileSize":65536}')
UPLOAD_URL=$(echo "$presign_resp" | jq -r '.uploadUrl')
ASSET_ID=$(echo "$presign_resp" | jq -r '.assetId')
head -c 65536 /dev/urandom > "$TMP/sample.mp4"
curl -s -o /dev/null -X PUT "$UPLOAD_URL" -H 'Content-Type: video/mp4' --data-binary @"$TMP/sample.mp4"
curl -s -o /dev/null -X POST "$BASE/api/projects/$PROJECT_ID/assets/confirm" -H "$AUTH" \
  -H 'Content-Type: application/json' -d "{\"assetId\":$ASSET_ID}"

echo "-> POST /api/projects/$PROJECT_ID/analyze"
analyze_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/analyze" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{}')
echo "$analyze_resp" | jq .
ANALYSIS_ID=$(echo "$analyze_resp" | jq -r '.analysisId')
if [ -z "$ANALYSIS_ID" ] || [ "$ANALYSIS_ID" = "null" ]; then
  echo "FATAL: analyze start failed"
  exit 1
fi

echo "-> poll GET /api/projects/$PROJECT_ID/analysis?analysisId=$ANALYSIS_ID"
STATUS="pending"
for i in $(seq 1 60); do
  poll=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/analysis?analysisId=$ANALYSIS_ID" -H "$AUTH")
  STATUS=$(echo "$poll" | jq -r '.status')
  if [ "$STATUS" != "pending" ] && [ "$STATUS" != "running" ]; then
    echo "$poll" | jq .
    break
  fi
  sleep 0.5
done
if [ "$STATUS" != "completed" ]; then
  echo "FATAL: analysis status = $STATUS (expected completed)"
  exit 1
fi

echo "-> cleanup"
curl -s -o /dev/null -X DELETE "$BASE/api/assets/$ASSET_ID" -H "$AUTH"
curl -s -o /dev/null -X DELETE "$BASE/api/projects/$PROJECT_ID" -H "$AUTH"

echo "=== analyze smoke tests passed ==="
