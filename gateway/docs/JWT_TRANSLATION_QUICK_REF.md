# JWT Translation Quick Reference

## Middleware Chain
```
identityMiddleware → authorizationMiddleware → jwtTranslationMiddleware → proxyRequest
```

## What Happens

1. **Client JWT IN** → Verified, identity extracted
2. **Authorization** → Policy check, allow/deny
3. **Translation** → Client JWT dropped, internal JWT minted
4. **Internal JWT OUT** → Forwarded to backend

## Internal JWT Claims

```javascript
{
  sub: "alice",              // User identity
  aud: "backend-service",    // Target service
  iss: "https://gateway.internal",  // Gateway issuer
  ten: "default",            // Tenant
  role: "admin",             // User role
  decision_id: "policy-001", // Policy matched
  policy_version: "v1",      // Policy version
  exp: <60s from now>        // Short-lived
}
```

## Configuration

**TTL**: Edit `jwtTranslation.middleware.js`
```javascript
expiresIn: '60s'  // Options: 30s, 60s, 120s
```

**Audience**: Edit `jwtTranslation.middleware.js`
```javascript
aud: 'backend-service'  // Target service name
```

## Testing

```bash
./test-jwt-translation.sh
```

## Logs

Look for:
```
JWT_TRANSLATION sub=alice ten=default ttl=60s
```

## Security Checklist

- ✅ Client JWT never forwarded
- ✅ Internal JWT short-lived (60s)
- ✅ Gateway is sole issuer
- ✅ Backend validates via JWKS
- ✅ Policy context included
- ✅ Fresh token per request