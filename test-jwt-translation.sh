#!/bin/bash

echo "=== JWT Translation Test ==="

GATEWAY_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5001"

echo -e "\n1. Login to get CLIENT JWT..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}')

CLIENT_JWT=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
echo "Client JWT obtained"

echo -e "\n2. Decode CLIENT JWT (issued by backend)..."
echo "Header:"
echo "$CLIENT_JWT" | cut -d'.' -f1 | base64 -d 2>/dev/null | jq '.'
echo "Payload:"
echo "$CLIENT_JWT" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.'

echo -e "\n3. Send request through gateway with CLIENT JWT..."
echo "The gateway will:"
echo "  - Verify the client JWT"
echo "  - Authorize the request"
echo "  - DROP the client JWT"
echo "  - MINT a new internal JWT"
echo "  - Forward with internal JWT"

curl -s -X GET "$GATEWAY_URL/api/users" \
  -H "Authorization: Bearer $CLIENT_JWT" | jq '.'

echo -e "\n4. Check gateway logs for JWT_TRANSLATION event"
echo "Look for: JWT_TRANSLATION sub=alice ten=default ttl=60s"

echo -e "\n=== Test Complete ==="
echo "Note: The backend receives an INTERNAL JWT signed by the gateway,"
echo "      NOT the original client JWT."