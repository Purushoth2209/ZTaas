# Backend Service Compliance Guide
## INTERNAL JWT v1 Contract

## Quick Start

Your service receives INTERNAL JWTs from the gateway. A **valid JWT = authorized request**. No additional authorization logic is needed.

## Minimal Verification Code

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const GATEWAY_ISSUER = 'https://gateway.internal';
const GATEWAY_JWKS_URI = 'http://localhost:8081/gateway/.well-known/jwks.json';
const SERVICE_NAME = 'your-service-name'; // Change this

const client = jwksClient({
  jwksUri: GATEWAY_JWKS_URI,
  cache: true,
  cacheMaxAge: 600000
});

const getSigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
};

export const verifyInternalJWT = async (token) => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('Invalid token');

  const publicKey = await getSigningKey(decoded.header.kid);
  
  // Verify ONLY platform claims
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: GATEWAY_ISSUER,
    audience: SERVICE_NAME
  });
};
```

## What to Verify

✅ **DO verify these:**
- JWT signature (using JWKS)
- `iss = https://gateway.internal`
- `aud = your-service-name`
- `exp` (not expired)

❌ **DO NOT verify these:**
- `ctx.*` fields
- `app.*` fields
- `sub` value
- `ten` value
- Schema version

## Using JWT Claims

### ✅ ALLOWED Uses:

```javascript
// Logging and audit
console.log(`Request from user: ${verified.sub}, tenant: ${verified.ten}`);

// Tenant isolation (data filtering)
const orders = await db.orders.find({ tenant: verified.ten });

// Debugging
console.log(`Policy applied: ${verified.ctx?.decision_id}`);
```

### ❌ FORBIDDEN Uses:

```javascript
// ❌ WRONG: Authorization logic
if (verified.ctx.decision_id === 'admin-policy') {
  // This violates Zero Trust
}

// ❌ WRONG: Role checks
if (verified.role === 'admin') {
  // Gateway already authorized this
}

// ❌ WRONG: Schema validation
if (verified.ctx.schema_ver !== '1.0.0') {
  throw new Error('Invalid schema');
}
```

## Middleware Example

```javascript
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.substring(7);
  
  try {
    const verified = await verifyInternalJWT(token);
    
    // Store for logging/audit only
    req.user = {
      sub: verified.sub,
      tenant: verified.ten
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Expected JWT Structure

```json
{
  "iss": "https://gateway.internal",
  "aud": "your-service-name",
  "sub": "alice",
  "ten": "default",
  "iat": 1770545119,
  "exp": 1770545179,
  "ctx": {
    "schema_ver": "1.0.0",
    "decision_id": "users-get-policy",
    "policy_version": "v1",
    "enforced_at": 1770545119
  }
}
```

## Compliance Checklist

- [ ] Service verifies JWT signature using JWKS
- [ ] Service validates `iss`, `aud`, `exp`
- [ ] Service treats valid JWT as authorization proof
- [ ] Service ignores unknown fields in `ctx`
- [ ] Service has NO authorization logic
- [ ] Service does NOT validate `ctx` fields
- [ ] Service uses `sub` and `ten` for logging only

## Common Mistakes

### ❌ Mistake 1: Checking ctx fields
```javascript
// WRONG
if (!verified.ctx || !verified.ctx.decision_id) {
  return res.status(403).json({ error: 'No policy' });
}
```

### ❌ Mistake 2: Schema version validation
```javascript
// WRONG
if (verified.ctx.schema_ver !== '1.0.0') {
  return res.status(400).json({ error: 'Unsupported version' });
}
```

### ❌ Mistake 3: Authorization logic
```javascript
// WRONG
if (verified.sub !== 'admin') {
  return res.status(403).json({ error: 'Admin only' });
}
```

## Migration from Phase 3 (Gateway Headers)

If your service currently uses `X-Gateway-Secret` headers:

```javascript
// OLD (Phase 3)
if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
req.user = {
  id: req.headers['x-user-id'],
  role: req.headers['x-user-role']
};

// NEW (Phase 4 - JWT)
const verified = await verifyInternalJWT(token);
req.user = {
  sub: verified.sub,
  tenant: verified.ten
};
```

## Support Both During Migration

```javascript
export const authenticateRequest = async (req, res, next) => {
  // Try JWT first (Phase 4)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const verified = await verifyInternalJWT(token);
      req.user = { sub: verified.sub, tenant: verified.ten };
      return next();
    } catch (error) {
      // Fall through to gateway headers
    }
  }
  
  // Fallback to gateway headers (Phase 3)
  const gatewaySecret = req.headers['x-gateway-secret'];
  if (gatewaySecret === GATEWAY_SECRET) {
    req.user = {
      sub: req.headers['x-username'],
      tenant: 'default'
    };
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
};
```

## Questions?

**Q: What if ctx is missing?**
A: Accept the JWT. `ctx` fields are optional.

**Q: Can I use sub for database queries?**
A: Yes, for logging and tenant isolation, but NOT for authorization.

**Q: What if I need custom claims?**
A: Request gateway team to add them under `app.your-service`.

**Q: How do I handle schema version changes?**
A: Ignore them. Accept any v1.x.x version automatically.