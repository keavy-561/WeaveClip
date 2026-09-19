#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
echo "=== Timeline persistence smoke tests against $BASE ==="

EMAIL="timeline+smoke-$(date +%s)@test.com"
register_resp=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"Timeline Smoke\"}")
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
  -d '{"name":"Timeline Smoke Project"}')
PROJECT_ID=$(echo "$project_resp" | jq -r '.project.id')
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "FATAL: create project failed"
  exit 1
fi

echo "-> PUT /api/projects/$PROJECT_ID/timeline (v1)"
put1=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH" \
  -H 'Content-Type: application/json' -H 'X-Timeline-Label: first' \
  -d '{"version":"1.0","fps":30,"duration":10,"tracks":[]}')
if [ "$put1" != "201" ]; then
  echo "FATAL: PUT v1 failed with $put1"
  exit 1
fi

echo "-> PUT /api/projects/$PROJECT_ID/timeline (v2)"
put2=$(curl -s -X PUT "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH" \
  -H 'Content-Type: application/json' -H 'X-Timeline-Label: second' \
  -d '{"version":"1.0","fps":30,"duration":12,"tracks":[]}')
V2=$(echo "$put2" | jq -r '.timeline.version')
if [ "$V2" != "2" ]; then
  echo "FATAL: expected version 2, got $V2"
  exit 1
fi

echo "-> GET latest timeline"
get1=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH")
LATEST=$(echo "$get1" | jq -r '.timeline.version')
if [ "$LATEST" != "2" ]; then
  echo "FATAL: expected latest version 2, got $LATEST"
  exit 1
fi

echo "-> GET timeline version=1"
get2=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/timeline?version=1" -H "$AUTH")
V1=$(echo "$get2" | jq -r '.timeline.version')
if [ "$V1" != "1" ]; then
  echo "FATAL: expected version 1, got $V1"
  exit 1
fi

echo "-> GET versions list"
get3=$(curl -s -X GET "$BASE/api/projects/$PROJECT_ID/timeline/versions" -H "$AUTH")
COUNT=$(echo "$get3" | jq '.versions | length')
if [ "$COUNT" != "2" ]; then
  echo "FATAL: expected 2 versions, got $COUNT"
  exit 1
fi

echo "-> invalid timeline JSON should 400"
bad=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/projects/$PROJECT_ID/timeline" -H "$AUTH" \
  -H 'Content-Type: application/json' -d 'not-json')
if [ "$bad" != "400" ]; then
  echo "FATAL: expected 400 for invalid json, got $bad"
  exit 1
fi

echo "-> cleanup"
curl -s -o /dev/null -X DELETE "$BASE/api/projects/$PROJECT_ID" -H "$AUTH"

echo "=== timeline smoke tests passed ==="
