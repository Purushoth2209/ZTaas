# JWT Translation Flow Diagram

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│  Sends request with JWT issued by backend auth service          │
│  Authorization: Bearer eyJhbGc...  (CLIENT JWT)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GATEWAY (Port 3000)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1] identityMiddleware                                          │
│      ✓ Verify CLIENT JWT signature                              │
│      ✓ Check issuer, expiration                                 │
│      ✓ Extract identity → req.identity                          │
│         { username: "alice", role: "admin", tenant: "default" } │
│                                                                  │
│  [2] authorizationMiddleware                                     │
│      ✓ Match request to policy                                  │
│      ✓ Check role permissions                                   │
│      ✓ Allow/Deny decision                                      │
│                                                                  │
│  [3] jwtTranslationMiddleware ⚡ NEW                             │
│      ✗ DROP client JWT                                          │
│      ✓ MINT internal JWT:                                       │
│        {                                                         │
│          sub: "alice",                                           │
│          aud: "backend-service",                                 │
│          iss: "https://gateway.internal",                        │
│          ten: "default",                                         │
│          role: "admin",                                          │
│          decision_id: "policy-001",                              │
│          exp: now + 60s                                          │
│        }                                                         │
│      ✓ REPLACE Authorization header                             │
│        Authorization: Bearer eyJraWQ...  (INTERNAL JWT)          │
│                                                                  │
│  [4] proxyRequest                                                │
│      ✓ Forward to backend with INTERNAL JWT                     │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND SERVICE (Port 5001)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Receives: Authorization: Bearer eyJraWQ...  (INTERNAL JWT)      │
│                                                                  │
│  Verification:                                                   │
│    ✓ Fetch JWKS from gateway                                    │
│    ✓ Verify signature using gateway's public key               │
│    ✓ Check iss = "https://gateway.internal"                     │
│    ✓ Check aud = "backend-service"                              │
│    ✓ Check exp (60s TTL)                                        │
│                                                                  │
│  Custom claims (informational only):                             │
│    - ten: "default"                                              │
│    - role: "admin"                                               │
│    - decision_id: "policy-001"                                   │
│                                                                  │
│  ✓ Process request                                               │
│  ✓ Return response                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Security Properties

### 1. Token Isolation
- **Client JWT**: Validated but never forwarded
- **Internal JWT**: Fresh token minted per request
- **Zero trust**: Backend trusts only gateway-issued tokens

### 2. Minimal Exposure
- **TTL**: 60 seconds (vs hours for client JWT)
- **Scope**: Single backend service
- **Replay window**: Extremely limited

### 3. Policy Context
- **decision_id**: Which policy was matched
- **policy_version**: Policy version applied
- **Audit trail**: Full context for logging

## Token Comparison

| Property | Client JWT | Internal JWT |
|----------|-----------|--------------|
| Issuer | Backend auth service | Gateway |
| Audience | api-gateway | backend-service |
| TTL | 1 hour | 60 seconds |
| Signature | Backend private key | Gateway private key |
| Forwarded | ❌ NO | ✅ YES |
| Contains policy context | ❌ NO | ✅ YES |