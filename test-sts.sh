#!/bin/bash

# Test STS functionality
echo "=== Testing Gateway STS Functionality ==="

GATEWAY_URL="http://localhost:3000"

echo -e "\n1. Testing JWKS endpoint..."
curl -s "$GATEWAY_URL/gateway/.well-known/jwks.json" | jq '.'

echo -e "\n2. Issuing a JWT token..."
TOKEN_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/sts/token" \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "aud": "api-clients",
    "scope": "read write"
  }')

echo "$TOKEN_RESPONSE" | jq '.'

# Extract token for verification
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

echo -e "\n3. Verifying the issued token..."
curl -s -X POST "$GATEWAY_URL/sts/verify" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" | jq '.'

echo -e "\n4. Decoding JWT header and payload..."
echo "Header:"
echo "$TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null | jq '.'
echo "Payload:"
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.'

echo -e "\n=== STS Test Complete ==="