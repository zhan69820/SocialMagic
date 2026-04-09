#!/usr/bin/env bash
# =============================================================================
# SocialMagic — Ingest API smoke test
#
# Usage:
#   bash test-ingest.sh [BASE_URL]
#
# Defaults to http://localhost:3000
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
ANON_ID="test-anon-$(date +%s)"

echo "=== SocialMagic Ingest API Test ==="
echo "Target: ${BASE_URL}/api/ingest"
echo "Anon ID: ${ANON_ID}"
echo ""

# --- Test 1: Valid URL ---
echo "--- Test 1: Valid URL ---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/ingest" \
  -H "Content-Type: application/json" \
  -H "x-anon-id: ${ANON_ID}" \
  -d '{"url": "https://example.com"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo "Response: ${BODY}" | head -c 500
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Test 1 PASSED — scrape succeeded"
else
  echo "❌ Test 1 FAILED — expected 201, got ${HTTP_CODE}"
fi
echo ""

# --- Test 2: Missing URL ---
echo "--- Test 2: Missing URL ---"
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/ingest" \
  -H "Content-Type: application/json" \
  -H "x-anon-id: ${ANON_ID}" \
  -d '{}')

HTTP_CODE2=$(echo "$RESPONSE2" | tail -1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "HTTP Status: ${HTTP_CODE2}"
echo "Response: ${BODY2}"

if [ "$HTTP_CODE2" = "400" ]; then
  echo "✅ Test 2 PASSED — missing url rejected"
else
  echo "❌ Test 2 FAILED — expected 400, got ${HTTP_CODE2}"
fi
echo ""

# --- Test 3: Invalid URL ---
echo "--- Test 3: Invalid URL ---"
RESPONSE3=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/ingest" \
  -H "Content-Type: application/json" \
  -H "x-anon-id: ${ANON_ID}" \
  -d '{"url": "not-a-valid-url"}')

HTTP_CODE3=$(echo "$RESPONSE3" | tail -1)
BODY3=$(echo "$RESPONSE3" | sed '$d')

echo "HTTP Status: ${HTTP_CODE3}"
echo "Response: ${BODY3}"

if [ "$HTTP_CODE3" = "400" ]; then
  echo "✅ Test 3 PASSED — invalid url rejected"
else
  echo "❌ Test 3 FAILED — expected 400, got ${HTTP_CODE3}"
fi
echo ""

echo "=== All tests completed ==="
