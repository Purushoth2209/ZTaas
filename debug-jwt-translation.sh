#!/bin/bash

echo "=== JWT Translation Debug ==="

GATEWAY_PORT=3000
BACKEND_PORT=5001

# Check if services are running
echo -e "\n1. Checking services..."
echo -n "Gateway (port $GATEWAY_PORT): "
curl -s http://localhost:$GATEWAY_PORT/gateway/.well-known/jwks.json > /dev/null && echo "✓ Running" || echo "✗ Not running"

echo -n "Backend (port $BACKEND_PORT): "
curl -s http://localhost:$BACKEND_PORT/.well-known/jwks.json > /dev/null && echo "✓ Running" || echo "✗ Not running"

# Get client JWT
echo -e "\n2. Getting client JWT from backend..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:$BACKEND_PORT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}')

CLIENT_JWT=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$CLIENT_JWT" = "null" ] || [ -z "$CLIENT_JWT" ]; then
  echo "✗ Failed to get token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Got client JWT"
echo "Issuer: $(echo $CLIENT_JWT | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.iss')"

# Test through gateway
echo -e "\n3. Sending request through gateway..."
echo "URL: http://localhost:$GATEWAY_PORT/api/users"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "http://localhost:$GATEWAY_PORT/api/users" \
  -H "Authorization: Bearer $CLIENT_JWT")

HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status: $HTTP_STATUS"
echo "Response: $HTTP_BODY"

# Check what to look for in logs
echo -e "\n4. Check gateway logs for:"
echo "   - 'JWT verified: user=alice'"
echo "   - 'JWT_TRANSLATION sub=alice ten=default ttl=60s'"
echo ""
echo "5. Check backend logs for:"
echo "   - 'JWT_AUDIT valid=true user=alice issuer=https://gateway.internal'"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ SUCCESS - JWT translation working!"
else
  echo "✗ FAILED - Check logs above"
fi
