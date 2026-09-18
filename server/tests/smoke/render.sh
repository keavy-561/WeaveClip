#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "=== Render smoke tests against $BASE ==="

EMAIL="render+smoke-$(date +%s)@test.com"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"Render Smoke\"}")
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
  -d '{"name":"Render Smoke Project"}')
PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')

echo "-> generate real sample video via ffmpeg and upload"
ffmpeg -hide_banner -loglevel error -f lavfi -i "testsrc=duration=2:size=320x240:rate=15" "$TMP/sample.mp4"
FILE_SIZE=$(stat -c%s "$TMP/sample.mp4")
presign_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/assets/presign" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"video\",\"fileName\":\"sample.mp4\",\"fileSize\":$FILE_SIZE}")
UPLOAD_URL=$(echo "$presign_resp" | jq -r '.uploadUrl')
ASSET_ID=$(echo "$presign_resp" | jq -r '.assetId')
curl -s -o /dev/null -X PUT "$UPLOAD_URL" -H 'Content-Type: video/mp4' --data-binary @"$TMP/sample.mp4"
curl -s -o /dev/null -X POST "$BASE/api/projects/$PROJECT_ID/assets/confirm" -H "$AUTH" \
  -H 'Content-Type: application/json' -d "{\"assetId\":$ASSET_ID}"

echo "-> PUT timeline referencing the asset"
curl -s -o /dev/null -X PUT "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"version\":\"1.0\",\"fps\":15,\"duration\":2,\"canvas\":{\"width\":320,\"height\":240},\"tracks\":[{\"id\":\"v1\",\"type\":\"video\",\"clips\":[{\"id\":\"c1\",\"assetId\":\"$ASSET_ID\",\"type\":\"video\",\"start\":0,\"end\":2}]}]}"

echo "-> POST /api/projects/$PROJECT_ID/render"
render_resp=$(curl -s -X POST "$BASE/api/projects/$PROJECT_ID/render" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"format":"mp4","resolution":"320x240","fps":15}')
echo "$render_resp" | jq .
RENDER_ID=$(echo "$render_resp" | jq -r '.renderId')
if [ -z "$RENDER_ID" ] || [ "$RENDER_ID" = "null" ]; then
  echo "FATAL: render start failed"
  exit 1
fi

echo "-> poll GET /api/renders/$RENDER_ID"
STATUS="queued"
for i in $(seq 1 150); do
  poll=$(curl -s -X GET "$BASE/api/renders/$RENDER_ID" -H "$AUTH")
  STATUS=$(echo "$poll" | jq -r '.status')
  if [ "$STATUS" != "queued" ] && [ "$STATUS" != "pending" ] && [ "$STATUS" != "rendering" ]; then
    echo "$poll" | jq .
    break
  fi
  sleep 1
done
if [ "$STATUS" != "completed" ]; then
  echo "FATAL: render status = $STATUS (expected completed)"
  exit 1
fi
DL=$(curl -s -X GET "$BASE/api/renders/$RENDER_ID" -H "$AUTH" | jq -r '.downloadUrl')
if [ -z "$DL" ] || [ "$DL" = "null" ]; then
  echo "FATAL: no downloadUrl"
  exit 1
fi

echo "-> download rendered MP4 and verify with ffprobe"
curl -s -o "$TMP/out.mp4" "$DL"
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$TMP/out.mp4" | grep -q h264

echo "-> cleanup"
curl -s -o /dev/null -X DELETE "$BASE/api/assets/$ASSET_ID" -H "$AUTH"
curl -s -o /dev/null -X DELETE "$BASE/api/projects/$PROJECT_ID" -H "$AUTH"

echo "=== render smoke tests passed ==="
