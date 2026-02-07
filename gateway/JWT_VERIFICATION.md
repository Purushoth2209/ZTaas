# JWT Verification - Identity-Aware Gateway

## Overview

The gateway now supports JWT verification in **READ-ONLY mode** using JWKS (JSON Web Key Set) from the backend service. This enables identity-aware logging and observability without blocking requests.

## Key Features

✅ **Read-Only Mode**: JWT verification never blocks requests
✅ **Runtime Configuration**: Update JWT trust settings via admin APIs
✅ **JWKS Support**: Fetches public keys from backend JWKS endpoint
✅ **Identity Context**: Extracts user identity from valid JWTs
✅ **Enhanced Logging**: Logs include user, role, and issuer information

## Architecture

```
Client → Gateway (JWT Verify) → Backend (JWT Validate)
         ↓ (read-only)
         Logs identity context
```

## JWT Trust Configuration

### Default Configuration

```json
{
  "issuer": "http://localhost:5001",
  "jwksUri": "http://localhost:5001/.well-known/jwks.json",
  "audience": "api-gateway",
  "algorithms": ["RS256"]
}
```

### Runtime Configuration (In-Memory)

Configuration is stored in memory and takes effect immediately without restart.

## Admin APIs

### 1. Get JWT Configuration

```bash
GET http://localhost:8081/admin/config/jwt
```

**Response:**
```json
{
  "issuer": "http://localhost:5001",
  "jwksUri": "http://localhost:5001/.well-known/jwks.json",
  "audience": "api-gateway",
  "algorithms": ["RS256"]
}
```

### 2. Update JWT Configuration

```bash
POST http://localhost:8081/admin/config/jwt
Content-Type: application/json

{
  "issuer": "http://localhost:5001",
  "jwksUri": "http://localhost:5001/.well-known/jwks.json",
  "audience": "api-gateway",
  "algorithms": ["RS256"]
}
```

**Response:**
```json
{
  "message": "JWT configuration updated",
  "config": {
    "issuer": "http://localhost:5001",
    "jwksUri": "http://localhost:5001/.well-known/jwks.json",
    "audience": "api-gateway",
    "algorithms": ["RS256"]
  }
}
```

## JWT Verification Flow

1. **Extract JWT** from `Authorization: Bearer <token>` header
2. **Decode** JWT to get `kid` from header
3. **Fetch Public Key** from JWKS using `kid` (cached)
4. **Verify Signature** using public key
5. **Validate Claims**: issuer, audience, expiration
6. **Extract Identity**: userId, username, role, issuer
7. **Attach to Request**: `req.identity = { userId, username, role, issuer }`
8. **Continue** (never blocks, even on failure)

## Logging

### With Valid JWT
```
method=GET path=/users user=admin role=admin issuer=http://localhost:5001 status=200 latency=16ms
```

### Without JWT
```
method=GET path=/users anonymous status=200 latency=12ms
```

### JWT Verification Failed
```
GET /users - JWT verification failed: invalid signature
method=GET path=/users anonymous status=200 latency=14ms
```

## Testing

### 1. Start Backend (Port 5001)
```bash
cd backend-service
npm start
```

### 2. Start Gateway (Port 8081)
```bash
cd gateway
npm start
```

### 3. Get JWT from Backend
```bash
TOKEN=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.accessToken')
```

### 4. Test Gateway with JWT
```bash
# Request via gateway with JWT
curl http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test Gateway without JWT
```bash
# Request via gateway without JWT (still works)
curl http://localhost:8081/users
```

### 6. Check Gateway Logs
Gateway logs will show identity context when JWT is valid.

## Admin Configuration Testing

### Get Current JWT Config
```bash
curl http://localhost:8081/admin/config/jwt
```

### Update JWT Config
```bash
curl -X POST http://localhost:8081/admin/config/jwt \
  -H "Content-Type: application/json" \
  -d '{
    "issuer": "http://localhost:5001",
    "jwksUri": "http://localhost:5001/.well-known/jwks.json",
    "audience": "api-gateway",
    "algorithms": ["RS256"]
  }'
```

## Read-Only Mode Behavior

| Scenario | Gateway Behavior |
|----------|------------------|
| No JWT token | ✅ Continue, log "anonymous" |
| Valid JWT | ✅ Continue, log identity |
| Invalid JWT | ✅ Continue, log error |
| Expired JWT | ✅ Continue, log error |
| Wrong issuer | ✅ Continue, log error |
| Wrong audience | ✅ Continue, log error |
| JWKS fetch fails | ✅ Continue, log error |

**IMPORTANT**: Gateway NEVER blocks requests in this phase.

## Identity Object Structure

When JWT is successfully verified, `req.identity` contains:

```javascript
{
  userId: "1",           // from 'sub' claim
  username: "admin",     // from 'username' claim
  role: "admin",         // from 'role' claim
  issuer: "http://localhost:5001"  // from 'iss' claim
}
```

## JWKS Caching

- Public keys are cached for 10 minutes
- Rate limited to 10 JWKS requests per minute
- Cache automatically refreshes on key rotation

## Dependencies

```json
{
  "jsonwebtoken": "^9.0.2",
  "jwks-rsa": "^3.1.0"
}
```

## File Structure

```
gateway/
├── src/
│   ├── config/
│   │   └── default.jwt.config.js      # Default JWT trust config
│   ├── middleware/
│   │   └── identity.middleware.js     # JWT verification middleware
│   ├── services/
│   │   ├── config.service.js          # Runtime config store
│   │   └── jwtVerification.service.js # JWKS + JWT verification
│   └── routes/
│       └── admin.jwt.routes.js        # JWT config admin APIs
```

## Security Notes

- Gateway only verifies JWTs (read-only)
- Backend still validates JWTs (defense in depth)
- No authentication on admin APIs (add in production)
- Configuration is in-memory (not persisted)
- JWKS endpoint must be accessible from gateway

## Future Enhancements

- Policy enforcement based on identity
- Admin API authentication
- Configuration persistence
- Key rotation support
- Multiple trusted issuers
- Custom claim validation

## Troubleshooting

### JWT Verification Fails

Check gateway logs for specific error:
- "Invalid token structure" - Malformed JWT
- "invalid signature" - Wrong public key or tampered token
- "jwt issuer invalid" - Issuer mismatch
- "jwt audience invalid" - Audience mismatch
- "jwt expired" - Token expired

### JWKS Fetch Fails

Ensure:
- Backend is running on configured port
- JWKS endpoint is accessible: `curl http://localhost:5001/.well-known/jwks.json`
- Network connectivity between gateway and backend

### Identity Not Logged

Verify:
- JWT is in `Authorization: Bearer <token>` header
- JWT is valid (test directly against backend)
- Gateway logs show JWT verification attempt
