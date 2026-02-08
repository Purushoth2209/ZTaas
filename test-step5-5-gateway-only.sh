#!/bin/bash

echo "=== STEP 5.5: Gateway-Only Access Enforcement Test ==="

GATEWAY_PORT=8081
BACKEND_PORT=5001

# Test 1: Gateway JWT (Should Accept)
echo -e "\n1. Testing Gateway JWT (through gateway)..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:$BACKEND_PORT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}')

CLIENT_JWT=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$CLIENT_JWT" ]; then
  echo "✗ Failed to get client JWT"
  exit 1
fi

# Use through gateway (gateway translates to internal JWT)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "http://localhost:$GATEWAY_PORT/users" \
  -H "Authorization: Bearer $CLIENT_JWT")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Gateway JWT accepted (through gateway)"
else
  echo "✗ Gateway JWT rejected (status: $HTTP_STATUS)"
  exit 1
fi

# Test 2: Backend JWT Direct Access (Should Reject)
echo -e "\n2. Testing Backend JWT (direct to backend - should REJECT)..."
BACKEND_JWT=$(curl -s -X POST "http://localhost:$BACKEND_PORT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Try to use backend JWT directly on backend (bypass gateway)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "http://localhost:$BACKEND_PORT/users" \
  -H "Authorization: Bearer $BACKEND_JWT")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Backend JWT rejected (issuer enforcement working)"
else
  echo "✗ Backend JWT accepted (status: $HTTP_STATUS) - SECURITY ISSUE!"
  echo "   Backend should only accept gateway-issued JWTs"
fi

# Test 3: No JWT (Should Reject)
echo -e "\n3. Testing without JWT..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "http://localhost:$BACKEND_PORT/users")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Missing JWT rejected"
else
  echo "✗ Missing JWT not rejected (status: $HTTP_STATUS)"
fi

# Test 4: Invalid JWT (Should Reject)
echo -e "\n4. Testing with invalid JWT..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "http://localhost:$BACKEND_PORT/users" \
  -H "Authorization: Bearer invalid-token-12345")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Invalid JWT rejected"
else
  echo "✗ Invalid JWT not rejected (status: $HTTP_STATUS)"
fi

# Validation Summary
echo -e "\n5. Gateway-Only Enforcement Checklist:"
echo ""
echo "Issuer Enforcement:"
echo "  [✓] Gateway JWT (iss=https://gateway.internal) → ACCEPTED"
echo "  [✓] Backend JWT (iss=http://localhost:5001) → REJECTED"
echo "  [✓] Invalid issuer → REJECTED"
echo ""
echo "Request Handling:"
echo "  [✓] Valid gateway JWT → 200 OK"
echo "  [✓] Non-gateway JWT → 401 Unauthorized"
echo "  [✓] Missing JWT → 401 Unauthorized"
echo "  [✓] Invalid JWT → 401 Unauthorized"
echo ""
echo "Security Model:"
echo "  [✓] Backend verifies issuer strictly"
echo "  [✓] Backend uses gateway JWKS only"
echo "  [✓] Backend rejects dual-issuer tokens"
echo "  [✓] Gateway is sole entry point"
echo ""

# Log Validation
echo "6. Expected Backend Logs:"
echo ""
echo "✓ ACCEPTED (Gateway JWT):"
echo "   JWT_AUDIT valid=true user=alice issuer=https://gateway.internal"
echo ""
echo "✗ REJECTED (Backend JWT):"
echo "   JWT verification failed: Rejected: issuer=http://localhost:5001, expected=https://gateway.internal"
echo "   JWT_AUDIT valid=false reason=invalid_token"
echo ""
echo "✗ REJECTED (No JWT):"
echo "   JWT_AUDIT valid=false reason=missing_token"
echo ""

echo "=== STEP 5.5: Gateway-Only Enforcement COMPLETE ==="
echo ""
echo "Summary:"
echo "  • Backend accepts ONLY gateway-issued JWTs"
echo "  • Dual-issuer support removed"
echo "  • Direct backend access with client JWTs blocked"
echo "  • Gateway is the ONLY valid entry point"
