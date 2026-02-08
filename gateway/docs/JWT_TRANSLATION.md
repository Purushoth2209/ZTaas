# JWT Translation Implementation (Step 5.2)

## Overview
The gateway now performs JWT translation: it accepts external client JWTs, validates them, and mints new internal short-lived JWTs signed by the gateway before forwarding requests to backend services.

## Request Flow

```
Client Request (External JWT)
    ↓
[1] identityMiddleware
    - Verifies external JWT from client
    - Extracts identity (username, role, tenant)
    - Stores in req.identity
    ↓
[2] authorizationMiddleware
    - Checks policy against identity
    - Allows/denies based on role
    ↓
[3] jwtTranslationMiddleware ← NEW
    - DROPS client JWT
    - MINTS internal JWT (60s TTL)
    - REPLACES Authorization header
    ↓
[4] proxyRequest
    - Forwards request with internal JWT
    - Backend receives ONLY internal JWT
```

## Internal JWT Structure

### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "gateway-key-1703123456789"
}
```

### Payload
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

### Key Claims

| Claim | Description | Example |
|-------|-------------|---------|
| `iss` | Gateway issuer | `https://gateway.internal` |
| `sub` | User identity | `alice` |
| `aud` | Target service | `backend-service` |
| `ten` | Tenant ID | `default` |
| `role` | User role | `admin` |
| `decision_id` | Policy matched | `policy-001` |
| `policy_version` | Policy version | `v1` |
| `exp` | Expiration | 60 seconds from issue |

## Security Properties

### Token Isolation
- **Client JWT**: Verified but NEVER forwarded
- **Internal JWT**: Minted fresh for each request
- **No leakage**: Backend never sees client credentials

### Short-Lived Tokens
- **TTL**: 60 seconds (configurable 30-120s)
- **Purpose**: Minimize replay window
- **Scope**: Single backend request

### Cryptographic Trust
- **Algorithm**: RS256 (RSA + SHA-256)
- **Issuer**: Gateway is sole trusted issuer
- **Verification**: Backend validates using gateway's JWKS

## Backend Verification

The backend only needs to verify:
```javascript
{
  issuer: 'https://gateway.internal',
  jwksUri: 'http://localhost:3000/gateway/.well-known/jwks.json',
  audience: 'backend-service',
  algorithms: ['RS256']
}
```

Custom claims (`ten`, `role`, `decision_id`, `policy_version`) are informational only.

## Anti-Replay Protection

1. **Short TTL**: 60-second window limits replay opportunity
2. **Fresh minting**: New token per request
3. **No caching**: Tokens not reused across requests
4. **Audience scoping**: Token valid only for specific backend

## Configuration

Edit `src/middleware/jwtTranslation.middleware.js`:
```javascript
const internalJwt = JWTService.signToken(internalPayload, {
  expiresIn: '60s' // Adjust TTL: 30s, 60s, 120s
});
```

## Testing

### 1. Send request with client JWT
```bash
curl -H "Authorization: Bearer <CLIENT_JWT>" \
  http://localhost:3000/api/users
```

### 2. Gateway logs show translation
```
JWT_TRANSLATION sub=alice ten=default ttl=60s
```

### 3. Backend receives internal JWT
The backend will receive a fresh JWT signed by the gateway, not the client's original JWT.

## Best Practices

1. **Never forward client JWT**: Always drop and replace
2. **Minimize TTL**: Use shortest acceptable lifetime (30-60s)
3. **Include context**: Add policy decision metadata
4. **Validate audience**: Backend must check `aud` claim
5. **Monitor expiration**: Log expired token attempts
6. **Rotate gateway keys**: Regular key rotation via STS