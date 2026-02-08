# STEP 5.5 Quick Reference: Gateway-Only Access

## What Changed

❌ **REMOVED**: Dual-issuer support
❌ **REMOVED**: Backend JWT acceptance
✅ **ADDED**: Strict issuer validation

## Backend Accepts

✅ `iss = https://gateway.internal`
✅ `aud = backend-service`
✅ Valid signature (gateway JWKS)
✅ Not expired

## Backend Rejects

❌ `iss != https://gateway.internal`
❌ Invalid signature
❌ Expired token
❌ Missing JWT

## Request Matrix

| Request | Issuer | Result |
|---------|--------|--------|
| Through gateway | Gateway | ✅ 200 |
| Direct (backend JWT) | Backend | ❌ 401 |
| Direct (client JWT) | Client | ❌ 401 |
| No JWT | N/A | ❌ 401 |

## Code Change

```javascript
// Before: Dual-issuer
if (issuer === GATEWAY_ISSUER) { ... }
return jwt.verify(token, backendKey, ...); // ❌

// After: Gateway-only
if (issuer !== GATEWAY_ISSUER) {
  throw new Error('Rejected');
}
return jwt.verify(token, gatewayKey, ...); // ✅
```

## Testing

```bash
./test-step5-5-gateway-only.sh
```

## Expected Logs

**✅ Accepted**:
```
JWT_AUDIT valid=true issuer=https://gateway.internal
```

**❌ Rejected**:
```
JWT verification failed: Rejected: issuer=http://localhost:5001
JWT_AUDIT valid=false reason=invalid_token
```

## Key Principle

**Gateway is the ONLY entry point.**

Backend trusts ONLY gateway-signed JWTs.