#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
echo "=== Auth smoke tests against $BASE ==="

# 1. Register
echo "-> POST /api/auth/register"
REG=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"SmokePass123","name":"Smoke"}')
echo "$REG"
USER_ID=$(echo "$REG" | jq -r '.user.id')
if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "FAIL: register did not return user id"
  exit 1
fi
echo "registered user_id=$USER_ID"

# 2. Login to obtain token
echo "-> POST /api/auth/login"
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"SmokePass123"}')
echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "FAIL: login did not return token"
  exit 1
fi
echo "login ok"

# 3. Me without token -> 401
echo "-> GET /api/auth/me (no token)"
ME=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me")
if [ "$ME" != "401" ]; then
  echo "FAIL: expected 401, got $ME"
  exit 1
fi
echo "401 ok"

# 4. Me with invalid token -> 401
echo "-> GET /api/auth/me (invalid token)"
ME=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me" \
  -H "Authorization: Bearer invalidtoken")
if [ "$ME" != "401" ]; then
  echo "FAIL: expected 401, got $ME"
  exit 1
fi
echo "401 ok"

echo "=== auth smoke tests passed ==="
