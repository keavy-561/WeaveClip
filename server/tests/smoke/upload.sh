#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "=== Upload presign/confirm smoke tests against $BASE ==="

EMAIL="upload+smoke-$(date +%s)@test.com"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"Upload Smoke\"}")
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

echo "-> POST /api/projects"
project_resp=$(curl -s -X POST "$BASE/api/projects" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Upload Smoke Project"}')
PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "FATAL: create project failed"
  exit 1
fi

echo "-> POST /api/projects/$PROJECT_ID/assets/presign"
presign_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets/presign" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"type":"video","fileName":"sample.mp4","fileSize":65536}')
echo "$presign_resp" | jq .
UPLOAD_URL=$(echo "$presign_resp" | jq -r '.uploadUrl')
ASSET_ID=$(echo "$presign_resp" | jq -r '.assetId')
if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" = "null" ]; then
  echo "FATAL: presign failed"
  exit 1
fi

echo "-> PUT object to presigned URL"
head -c 65536 /dev/urandom > "$TMP/sample.mp4"
put_status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
  -H 'Content-Type: video/mp4' --data-binary @"$TMP/sample.mp4")
if [ "$put_status" != "200" ]; then
  echo "FATAL: PUT to presigned URL failed with $put_status"
  exit 1
fi

echo "-> POST /api/projects/$PROJECT_ID/assets/confirm"
confirm_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets/confirm" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"assetId\":$ASSET_ID}")
echo "$confirm_resp" | jq .
STATUS=$(echo "$confirm_resp" | jq -r '.asset.status')
if [ "$STATUS" != "ready" ]; then
  echo "FATAL: confirm status != ready, got $STATUS"
  exit 1
fi

echo "-> GET /api/projects/$PROJECT_ID/assets"
list_resp=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/assets" -H "$AUTH")
COUNT=$(echo "$list_resp" | jq '.assets | length')
if [ "$COUNT" != "1" ]; then
  echo "FATAL: expected 1 asset, got $COUNT"
  exit 1
fi

echo "-> cleanup"
curl -s -o /dev/null -X DELETE "$BASE/api/assets/$ASSET_ID" -H "$AUTH"
curl -s -o /dev/null -X DELETE "$BASE/api/projects/$PROJECT_ID" -H "$AUTH"

echo "=== upload smoke tests passed ==="
