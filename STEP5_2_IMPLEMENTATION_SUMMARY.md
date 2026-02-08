# Step 5.2 Implementation Summary: JWT Translation

## Overview
Successfully implemented JWT translation where the gateway acts as a token broker, converting external client JWTs into internal short-lived JWTs before forwarding to backend services.

## Implementation Components

### 1. JWT Translation Middleware
**File**: `src/middleware/jwtTranslation.middleware.js`

**Purpose**: Mints internal JWTs after successful authorization

**Key Features**:
- Drops client JWT completely
- Mints fresh internal JWT with 60s TTL
- Includes policy context (decision_id, policy_version)
- Replaces Authorization header

### 2. Updated Request Flow
**File**: `src/routes/proxy.routes.js`

**Middleware Chain**:
```
identityMiddleware 
  → authorizationMiddleware 
  → jwtTranslationMiddleware (NEW)
  → handleProxyRequest
```

### 3. Updated HTTP Proxy
**File**: `src/proxy/http.proxy.js`

**Changes**:
- Removed custom header injection (X-User-Id, X-Username, etc.)
- Authorization header now contains internal JWT
- Simplified forwarding logic

### 4. Enhanced JWT Verification
**File**: `src/services/jwtVerification.service.js`

**Changes**:
- Extracts tenant information from client JWT
- Supports both `tenant` and `ten` claims

## Internal JWT Structure

### Example Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "gateway-key-1703123456789"
}
```

### Example Payload
```json
{
  "sub": "alice",
  "aud": "backend-service",
  "iss": "https://gateway.internal",
  "ten": "default",
  "role": "admin",
  "decision_id": "policy-001",
  "policy_version": "v1",
  "iat": 1703123456,
  "exp": 1703123516
}
```

## Security Properties

### ✅ Requirements Met

1. **Client JWT Dropped**: Never forwarded to backend
2. **Internal JWT Minted**: Fresh token per request
3. **Short-lived**: 60-second TTL (configurable 30-120s)
4. **Gateway Signed**: RS256 with gateway's private key
5. **Proper Claims**:
   - `iss`: https://gateway.internal
   - `aud`: backend-service
   - `sub`: User identity
   - `ten`: Tenant identifier
   - Policy context included
6. **Header Replacement**: Authorization header contains only internal JWT

### 🔒 Security Benefits

1. **Token Isolation**: Backend never sees client credentials
2. **Minimal Exposure**: 60s window vs hours for client JWT
3. **Replay Protection**: Short TTL limits replay attacks
4. **Audience Scoping**: Token valid only for specific backend
5. **Policy Context**: Full audit trail in token
6. **Zero Trust**: Backend trusts only gateway-issued tokens

## Backend Requirements

The backend only needs to verify standard JWT attributes:

```javascript
{
  issuer: 'https://gateway.internal',
  jwksUri: 'http://localhost:3000/gateway/.well-known/jwks.json',
  audience: 'backend-service',
  algorithms: ['RS256']
}
```

Custom claims (`ten`, `role`, `decision_id`, `policy_version`) are informational only.

## Testing

### Test Script
```bash
./test-jwt-translation.sh
```

### Manual Test
```bash
# 1. Get client JWT
CLIENT_JWT=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' | jq -r '.token')

# 2. Send request through gateway
curl -H "Authorization: Bearer $CLIENT_JWT" \
  http://localhost:3000/api/users
```

### Expected Logs
```
JWT_TRANSLATION sub=alice ten=default ttl=60s
```

## Configuration

### Adjust TTL
Edit `src/middleware/jwtTranslation.middleware.js`:
```javascript
expiresIn: '60s'  // Change to 30s, 60s, or 120s
```

### Change Audience
Edit `src/middleware/jwtTranslation.middleware.js`:
```javascript
aud: 'backend-service'  // Change to target service name
```

## Best Practices

1. **Minimize TTL**: Use shortest acceptable lifetime (30-60s)
2. **Include Context**: Add policy decision metadata for audit
3. **Validate Audience**: Backend must check `aud` claim
4. **Monitor Expiration**: Log expired token attempts
5. **Rotate Keys**: Regular gateway key rotation
6. **Never Cache**: Mint fresh token per request

## Anti-Replay Measures

1. **Short TTL**: 60-second window
2. **Fresh Minting**: New token per request
3. **No Reuse**: Tokens not cached
4. **Audience Scoping**: Service-specific tokens
5. **Nonce Support**: Can add `jti` claim for uniqueness

## Documentation

- **Full Guide**: `docs/JWT_TRANSLATION.md`
- **Flow Diagram**: `docs/JWT_TRANSLATION_FLOW.md`
- **Quick Reference**: `docs/JWT_TRANSLATION_QUICK_REF.md`

## Constraints Met

✅ No backend code changes required
✅ No backend authorization logic needed
✅ Backend verifies only standard JWT attributes
✅ Custom claims are informational only
✅ Client JWT never forwarded
✅ Internal JWT short-lived and gateway-signed