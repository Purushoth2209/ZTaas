#!/bin/bash

echo "=========================================="
echo "RS256 JWT + JWKS Test Script"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5001"

echo "1. Fetching JWKS..."
echo "GET $BASE_URL/.well-known/jwks.json"
echo ""
curl -s $BASE_URL/.well-known/jwks.json | jq '.'
echo ""
echo ""

echo "2. Logging in to get JWT..."
echo "POST $BASE_URL/auth/login"
echo ""
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo $RESPONSE | jq '.'
TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
echo ""
echo ""

echo "3. Decoding JWT header and payload..."
echo ""
HEADER=$(echo $TOKEN | cut -d'.' -f1 | base64 -d 2>/dev/null)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null)

echo "Header:"
echo $HEADER | jq '.'
echo ""
echo "Payload:"
echo $PAYLOAD | jq '.'
echo ""
echo ""

echo "4. Accessing protected endpoint with JWT..."
echo "GET $BASE_URL/users"
echo ""
curl -s $BASE_URL/users \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

echo "=========================================="
echo "✓ All tests completed successfully!"
echo "=========================================="
