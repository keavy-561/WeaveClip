#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"

echo "-> POST /api/auth/register (assets smoke user)"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"assets+smoke@test.com","password":"test123456","name":"Assets Smoke"}')
echo "$register_resp" | jq .

USER_ID=$(echo "$register_resp" | jq -r '.user.id')
if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "FATAL: register failed"
  exit 1
fi

echo "-> POST /api/auth/login"
login_resp=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"assets+smoke@test.com","password":"test123456"}')
echo "$login_resp" | jq .

TOKEN=$(echo "$login_resp" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "FATAL: login failed"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

echo "-> POST /api/projects (create project for assets)"
project_resp=$(curl -s -X POST "$BASE/api/projects" \
  -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Assets Smoke Project","duration":30,"aspectRatio":"16:9","style":"cinematic"}')
echo "$project_resp" | jq .

PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "FATAL: create project failed"
  exit 1
fi

echo "-> POST /api/projects/$PROJECT_ID/assets (create asset)"
asset_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets" \
  -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"type":"video","storagePath":"/mock/a.mp4","fileName":"a.mp4","fileSize":1024,"duration":10.5}')
echo "$asset_resp" | jq .

ASSET_ID=$(echo "$asset_resp" | jq -r '.asset.id')
if [ -z "$ASSET_ID" ] || [ "$ASSET_ID" = "null" ]; then
  echo "FATAL: create asset failed"
  exit 1
fi

echo "-> GET /api/projects/$PROJECT_ID/assets (list assets)"
list_resp=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/assets" \
  -H "$AUTH")
echo "$list_resp" | jq .
if [ "$(echo "$list_resp" | jq '.assets | length')" != "1" ]; then
  echo "FATAL: expected 1 asset"
  exit 1
fi

echo "-> GET /api/assets/$ASSET_ID (get asset)"
get_resp=$(curl -s -X GET "$BASE/api/assets/$ASSET_ID" \
  -H "$AUTH")
echo "$get_resp" | jq .
if [ "$(echo "$get_resp" | jq -r '.asset.id')" != "$ASSET_ID" ]; then
  echo "FATAL: get asset mismatch"
  exit 1
fi

echo "-> DELETE /api/assets/$ASSET_ID (delete asset)"
status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/assets/$ASSET_ID" \
  -H "$AUTH")
if [ "$status" != "204" ]; then
  echo "FATAL: expected 204, got $status"
  exit 1
fi

echo "-> DELETE /api/projects/$PROJECT_ID (cleanup)"
status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/projects/$PROJECT_ID" \
  -H "$AUTH")
if [ "$status" != "204" ]; then
  echo "FATAL: cleanup project failed, got $status"
  exit 1
fi

echo "OK: assets smoke passed"
