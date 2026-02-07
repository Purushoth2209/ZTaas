#!/bin/bash

echo "=========================================="
echo "Gateway JWT Verification Test"
echo "=========================================="
echo ""

GATEWAY_URL="http://localhost:8081"
BACKEND_URL="http://localhost:5001"

echo "1. Get current JWT configuration..."
echo "GET $GATEWAY_URL/admin/config/jwt"
echo ""
curl -s $GATEWAY_URL/admin/config/jwt | jq '.'
echo ""
echo ""

echo "2. Login to backend and get JWT..."
echo "POST $BACKEND_URL/auth/login"
echo ""
RESPONSE=$(curl -s -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo $RESPONSE | jq '.'
TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
echo ""
echo ""

echo "3. Request via gateway WITH JWT..."
echo "GET $GATEWAY_URL/users"
echo ""
curl -s $GATEWAY_URL/users \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo "Check gateway logs for: user=admin role=admin"
echo ""
echo ""

echo "4. Request via gateway WITHOUT JWT..."
echo "GET $GATEWAY_URL/users"
echo ""
curl -s $GATEWAY_URL/users | jq '.'
echo ""
echo "Check gateway logs for: anonymous"
echo ""
echo ""

echo "5. Update JWT configuration..."
echo "POST $GATEWAY_URL/admin/config/jwt"
echo ""
curl -s -X POST $GATEWAY_URL/admin/config/jwt \
  -H "Content-Type: application/json" \
  -d '{
    "issuer": "http://localhost:5001",
    "jwksUri": "http://localhost:5001/.well-known/jwks.json",
    "audience": "api-gateway",
    "algorithms": ["RS256"]
  }' | jq '.'
echo ""
echo ""

echo "=========================================="
echo "✓ All tests completed!"
echo "Check gateway logs for identity context"
echo "=========================================="
