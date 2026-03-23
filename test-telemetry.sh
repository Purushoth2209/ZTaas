#!/bin/bash

# Test Telemetry & Behavior Collection Module
# This script tests the telemetry collection functionality

GATEWAY_URL="http://localhost:8081"
BACKEND_URL="http://localhost:5001"

echo "=========================================="
echo "Telemetry Module Test"
echo "=========================================="
echo ""

# Step 1: Login as alice (admin)
echo "1. Logging in as alice..."
ALICE_TOKEN=$(curl -s -X POST ${BACKEND_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .accessToken)

if [ "$ALICE_TOKEN" != "null" ] && [ -n "$ALICE_TOKEN" ]; then
  echo "✓ Alice logged in successfully"
else
  echo "✗ Failed to login as alice"
  exit 1
fi

echo ""

# Step 2: Login as bob (user)
echo "2. Logging in as bob..."
BOB_TOKEN=$(curl -s -X POST ${BACKEND_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}' | jq -r .accessToken)

if [ "$BOB_TOKEN" != "null" ] && [ -n "$BOB_TOKEN" ]; then
  echo "✓ Bob logged in successfully"
else
  echo "✗ Failed to login as bob"
  exit 1
fi

echo ""

# Step 3: Make various requests to generate telemetry
echo "3. Generating telemetry data (11 requests)..."
echo ""

echo "   1. Alice GET /orders (should succeed)..."
curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/orders > /dev/null
echo "   ✓ Request completed"

echo "   2. Alice GET /users (should succeed)..."
curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/users > /dev/null
echo "   ✓ Request completed"

echo "   3. Alice POST /orders (should succeed)..."
curl -s -X POST -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" ${GATEWAY_URL}/orders -d '{"item":"test"}' > /dev/null
echo "   ✓ Request completed"

echo "   4. Bob GET /orders (should succeed)..."
curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/orders > /dev/null
echo "   ✓ Request completed"

echo "   5. Bob GET /users (should be denied)..."
curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/users > /dev/null
echo "   ✓ Request completed"

echo "   6. Bob POST /orders (should succeed)..."
curl -s -X POST -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" ${GATEWAY_URL}/orders -d '{"item":"test"}' > /dev/null
echo "   ✓ Request completed"

echo "   7. Bob GET /hello (public endpoint)..."
curl -s -H "Authorization: Bearer $BOB_TOKEN" ${GATEWAY_URL}/hello > /dev/null
echo "   ✓ Request completed"

echo "   8. Anonymous GET /hello (public endpoint)..."
curl -s ${GATEWAY_URL}/hello > /dev/null
echo "   ✓ Request completed"

echo "   9. Anonymous GET /orders (should be denied)..."
curl -s ${GATEWAY_URL}/orders > /dev/null
echo "   ✓ Request completed"

echo "   10. Anonymous GET /users (should be denied)..."
curl -s ${GATEWAY_URL}/users > /dev/null
echo "   ✓ Request completed"

echo "   11. Alice GET /hello (public endpoint)..."
curl -s -H "Authorization: Bearer $ALICE_TOKEN" ${GATEWAY_URL}/hello > /dev/null
echo "   ✓ Request completed"

echo ""

# Step 4: Retrieve all telemetry
echo "4. Retrieving all telemetry data..."
echo ""
ALL_TELEMETRY=$(curl -s ${GATEWAY_URL}/admin/telemetry)
TOTAL_COUNT=$(echo $ALL_TELEMETRY | jq -r '.count')
echo "   Total telemetry records: $TOTAL_COUNT"
echo ""
echo "   All records:"
echo $ALL_TELEMETRY | jq '.records | .[] | {userId, method, endpoint, responseStatus, authorizationResult}'
echo ""

# Step 5: Retrieve alice's telemetry
echo "5. Retrieving Alice's telemetry..."
echo ""
ALICE_TELEMETRY=$(curl -s ${GATEWAY_URL}/admin/telemetry/user/alice)
ALICE_COUNT=$(echo $ALICE_TELEMETRY | jq -r '.count')
echo "   Alice's request count: $ALICE_COUNT"
echo ""
echo "   Alice's records:"
echo $ALICE_TELEMETRY | jq '.records | .[] | {method, endpoint, responseStatus, timestamp}'
echo ""

# Step 6: Retrieve bob's telemetry
echo "6. Retrieving Bob's telemetry..."
echo ""
BOB_TELEMETRY=$(curl -s ${GATEWAY_URL}/admin/telemetry/user/bob)
BOB_COUNT=$(echo $BOB_TELEMETRY | jq -r '.count')
echo "   Bob's request count: $BOB_COUNT"
echo ""
echo "   Bob's records:"
echo $BOB_TELEMETRY | jq '.records | .[] | {method, endpoint, responseStatus, authorizationResult}'
echo ""

echo "=========================================="
echo "Telemetry Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Total telemetry records: $TOTAL_COUNT"
echo "  - Alice's requests: $ALICE_COUNT"
echo "  - Bob's requests: $BOB_COUNT"
echo ""
echo "Check gateway logs for telemetry collection messages:"
echo "  [Telemetry] User alice accessed GET /orders status=200"
echo ""
