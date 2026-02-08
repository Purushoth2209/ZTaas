#!/bin/bash

# STEP 4 - Phase 1: Gateway Trust Headers Test
# This script verifies that gateway identity headers are being injected and logged

echo "========================================="
echo "STEP 4 - Phase 1: Gateway Trust Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Prerequisites:${NC}"
echo "1. Backend service running on port 5001"
echo "2. Gateway running on port 8081"
echo ""

# Step 1: Login
echo -e "${GREEN}Step 1: Login as alice${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Make authenticated request
echo -e "${GREEN}Step 2: Access /users endpoint${NC}"
curl -s http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "✅ Request sent"
echo ""

# Step 3: Check logs
echo -e "${BLUE}Expected in backend logs:${NC}"
echo "  IDENTITY jwt={user=alice, role=admin}"
echo "  IDENTITY gateway={user=alice, role=admin}"
echo ""

echo -e "${BLUE}What to verify:${NC}"
echo "  1. Both JWT and gateway identities are logged"
echo "  2. No IDENTITY_MISMATCH warnings"
echo "  3. Request succeeds with same behavior as before"
echo ""

echo "========================================="
echo "Phase 1 Test Complete"
echo "========================================="
