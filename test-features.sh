#!/bin/bash

# Test Feature Extraction Service
GATEWAY_URL="http://localhost:8081"
BACKEND_URL="http://localhost:5001"

echo "=========================================="
echo "Feature Extraction Test"
echo "=========================================="
echo ""

# Step 1: Get admin token
echo "1. Logging in as admin..."
ADMIN_TOKEN=$(curl -s -X POST ${GATEWAY_URL}/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r .token)

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "✗ Failed to get admin token"
  exit 1
fi
echo "✓ Admin token obtained"
echo ""

# Step 2: Login as alice and bob via backend
echo "2. Logging in users..."
ALICE_TOKEN=$(curl -s -X POST ${BACKEND_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .accessToken)
echo "✓ Alice logged in"

BOB_TOKEN=$(curl -s -X POST ${BACKEND_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}' | jq -r .accessToken)
echo "✓ Bob logged in"
echo ""

# Step 3: Generate telemetry for alice (mix of success, failure, different endpoints & methods)
echo "3. Generating telemetry for alice (10 requests)..."
for i in {1..3}; do
  curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/orders > /dev/null
done
echo "   ✓ 3x GET /orders"

curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/users > /dev/null
echo "   ✓ 1x GET /users"

curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/hello > /dev/null
echo "   ✓ 1x GET /hello"

for i in {1..3}; do
  curl -s -X POST -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
    ${GATEWAY_URL}/orders -d '{"item":"test"}' > /dev/null
done
echo "   ✓ 3x POST /orders"

curl -s -X DELETE -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/orders/999 > /dev/null
echo "   ✓ 1x DELETE /orders/999 (likely 404)"

curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/nonexistent > /dev/null
echo "   ✓ 1x GET /nonexistent (likely 404)"
echo ""

# Step 4: Generate telemetry for bob (some denied requests)
echo "4. Generating telemetry for bob (6 requests)..."
curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/orders > /dev/null
echo "   ✓ 1x GET /orders"

curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/users > /dev/null
echo "   ✓ 1x GET /users (should be denied)"

curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/users > /dev/null
echo "   ✓ 1x GET /users (should be denied again)"

curl -s -X POST -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" \
  ${GATEWAY_URL}/orders -d '{"item":"test"}' > /dev/null
echo "   ✓ 1x POST /orders"

curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/hello > /dev/null
echo "   ✓ 1x GET /hello"

curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/nonexistent > /dev/null
echo "   ✓ 1x GET /nonexistent"
echo ""

# Step 5: Fetch features (use large window to capture all recent data)
echo "5. Fetching features..."
echo ""

echo "--- Alice's Features (last 5 min) ---"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${GATEWAY_URL}/admin/telemetry/features/alice?window=300000" | jq .
echo ""

echo "--- Bob's Features (last 5 min) ---"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${GATEWAY_URL}/admin/telemetry/features/bob?window=300000" | jq .
echo ""

echo "--- Unknown User Features (should be all zeros) ---"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${GATEWAY_URL}/admin/telemetry/features/nobody?window=300000" | jq .
echo ""

echo "=========================================="
echo "Feature Extraction Test Complete!"
echo "=========================================="
