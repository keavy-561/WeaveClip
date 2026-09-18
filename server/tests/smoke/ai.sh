#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
echo "=== Generate/Chat smoke tests against $BASE ==="

EMAIL="ai+smoke-$(date +%s)@test.com"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"AI Smoke\"}")
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
  -d '{"name":"AI Smoke Project"}')
PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')

echo "-> register two assets"
curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"type":"video","storagePath":"/mock/a.mp4","fileName":"a.mp4","duration":8}' > /dev/null
curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"type":"video","storagePath":"/mock/b.mp4","fileName":"b.mp4","duration":8}' > /dev/null

echo "-> POST /api/projects/$PROJECT_ID/generate"
gen_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/generate" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"prompt":"剪一个10秒的旅行vlog"}')
echo "$gen_resp" | jq .
GEN_ID=$(echo "$gen_resp" | jq -r '.generationId')
if [ -z "$GEN_ID" ] || [ "$GEN_ID" = "null" ]; then
  echo "FATAL: generate failed"
  exit 1
fi

echo "-> poll GET /api/generations/$GEN_ID"
STATUS="processing"
for i in $(seq 1 60); do
  STATUS=$(curl -s -X GET "$BASE/api/generations/$GEN_ID" -H "$AUTH" | jq -r '.status')
  if [ "$STATUS" != "processing" ] && [ "$STATUS" != "pending" ]; then
    break
  fi
  sleep 0.5
done
if [ "$STATUS" != "completed" ]; then
  echo "FATAL: generation status = $STATUS (expected completed)"
  exit 1
fi

echo "-> PUT generated-style timeline via chat (seed a timeline first)"
curl -s -X PUT "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"version":"1.0","fps":30,"duration":8,"canvas":{"width":1080,"height":1920},"tracks":[{"id":"v1","type":"video","clips":[{"id":"c1","assetId":"1","type":"video","start":0,"end":8}]}]}' > /dev/null

echo "-> POST /api/projects/$PROJECT_ID/chat (delete op)"
chat_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/chat" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"message":"把片段删掉","selectedClipId":"c1"}')
echo "$chat_resp" | jq .
OPS_LEN=$(echo "$chat_resp" | jq '.operations | length')
if [ "$OPS_LEN" = "0" ]; then
  echo "FATAL: expected at least 1 operation"
  exit 1
fi

echo "-> cleanup"
curl -s -o /dev/null -X DELETE "$BASE/api/projects/$PROJECT_ID" -H "$AUTH"

echo "=== generate/chat smoke tests passed ==="
