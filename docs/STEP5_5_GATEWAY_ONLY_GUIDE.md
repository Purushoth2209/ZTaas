# STEP 5.5: Enforce Gateway-Only Access

## Goal
Make the API Gateway the ONLY valid entry point to backend services by eliminating all trust in client-issued JWTs.

---

## Current State (Dual-Issuer Mode)

Backend currently accepts TWO issuers:

1. **Gateway-issued JWTs** (Phase 4 - target)
   - `iss = https://gateway.internal`
   - Signed by gateway
   - Short-lived (60s)

2. **Backend-issued JWTs** (Legacy - to be removed)
   - `iss = http://localhost:5001`
   - Signed by backend
   - Long-lived (1h)

**Problem**: Clients can bypass gateway by using backend-issued JWTs directly.

---

## Target State (Gateway-Only Mode)

Backend accepts ONLY gateway-issued JWTs:

✅ **ACCEPT**: `iss = https://gateway.internal`
❌ **REJECT**: Any other issuer

---

## Changes Required

### 1. Remove Dual-Issuer Logic

**File**: `backend-service/src/services/auth.service.js`

**Before** (Dual-Issuer):
```javascript
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;

    const issuer = decoded.payload.iss;

    // Gateway-issued token
    if (issuer === GATEWAY_ISSUER) {
      const publicKey = await getGatewaySigningKey(decoded.header.kid);
      return jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: GATEWAY_ISSUER,
        audience: 'backend-service'
      });
    }

    // Backend-issued token (legacy) ← REMOVE THIS
    return jwt.verify(token, JWT_CONFIG.publicKey, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch {
    return null;
  }
};
```

**After** (Gateway-Only):
```javascript
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;

    // ONLY accept gateway-issued tokens
    if (decoded.payload.iss !== GATEWAY_ISSUER) {
      throw new Error(`Invalid issuer: ${decoded.payload.iss}`);
    }

    const publicKey = await getGatewaySigningKey(decoded.header.kid);
    
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: GATEWAY_ISSUER,
      audience: 'backend-service'
    });
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};
```

---

### 2. Remove Backend JWT Issuance (Optional)

**File**: `backend-service/src/services/auth.service.js`

The `authenticateUser` function still issues backend JWTs for the `/auth/login` endpoint.

**Options**:

**Option A**: Keep for testing (mark as deprecated)
```javascript
// DEPRECATED: Only for testing
// Production clients should use gateway
export const authenticateUser = (username, password) => {
  console.warn('DEPRECATED: Direct backend login. Use gateway instead.');
  // ... existing code
};
```

**Option B**: Remove entirely (strict enforcement)
```javascript
// Remove authenticateUser function
// Remove /auth/login endpoint
// All authentication goes through gateway
```

**Recommendation**: Keep Option A for testing, document as deprecated.

---

### 3. Update JWT Configuration

**File**: `backend-service/src/config/jwt.config.js`

**Before**:
```javascript
export const JWT_CONFIG = {
  privateKey: fs.readFileSync(path.join(__dirname, '../keys/private.key'), 'utf8'),
  publicKey: fs.readFileSync(path.join(__dirname, '../keys/public.key'), 'utf8'),
  algorithm: 'RS256',
  kid: 'backend-key-1',
  issuer: 'http://localhost:5001',  // ← Backend issuer
  audience: 'api-gateway',
  expiresIn: '1h'
};
```

**After** (Mark as deprecated):
```javascript
// DEPRECATED: Backend no longer issues JWTs for production
// This config is kept only for testing purposes
export const JWT_CONFIG = {
  privateKey: fs.readFileSync(path.join(__dirname, '../keys/private.key'), 'utf8'),
  publicKey: fs.readFileSync(path.join(__dirname, '../keys/public.key'), 'utf8'),
  algorithm: 'RS256',
  kid: 'backend-key-1',
  issuer: 'http://localhost:5001',
  audience: 'api-gateway',
  expiresIn: '1h'
};

// Gateway-only configuration (production)
export const GATEWAY_CONFIG = {
  issuer: 'https://gateway.internal',
  jwksUri: 'http://localhost:8081/gateway/.well-known/jwks.json',
  audience: 'backend-service',
  algorithms: ['RS256']
};
```

---

## Implementation Steps

### Step 1: Update verifyToken (Enforce Gateway-Only)

```javascript
// backend-service/src/services/auth.service.js
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { users } from '../data/users.js';
import { JWT_CONFIG } from '../config/jwt.config.js';

const GATEWAY_ISSUER = 'https://gateway.internal';
const GATEWAY_JWKS_URI = 'http://localhost:8081/gateway/.well-known/jwks.json';
const GATEWAY_AUDIENCE = 'backend-service';

let gatewayJwksClient = null;

const getGatewayJwksClient = () => {
  if (!gatewayJwksClient) {
    gatewayJwksClient = jwksClient({
      jwksUri: GATEWAY_JWKS_URI,
      cache: true,
      cacheMaxAge: 600000
    });
  }
  return gatewayJwksClient;
};

const getGatewaySigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    getGatewayJwksClient().getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
};

// DEPRECATED: Only for testing - production uses gateway
export const authenticateUser = (username, password) => {
  console.warn('DEPRECATED: Direct backend login. Use gateway for production.');
  
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return null;

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role
    },
    JWT_CONFIG.privateKey,
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      keyid: JWT_CONFIG.kid
    }
  );

  return { accessToken: token };
};

// GATEWAY-ONLY: Strict issuer enforcement
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token structure');
    }

    // STRICT: Only accept gateway-issued tokens
    if (decoded.payload.iss !== GATEWAY_ISSUER) {
      throw new Error(`Rejected: issuer=${decoded.payload.iss}, expected=${GATEWAY_ISSUER}`);
    }

    // Verify signature using gateway JWKS
    const publicKey = await getGatewaySigningKey(decoded.header.kid);
    
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: GATEWAY_ISSUER,
      audience: GATEWAY_AUDIENCE
    });

    return verified;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};
```

---

### Step 2: Update JWT Middleware (Add Logging)

```javascript
// backend-service/src/middleware/jwt.middleware.js
import { verifyToken } from '../services/auth.service.js';
import { isJwtAuditMode } from '../config/authz.config.js';
import { log } from '../utils/logger.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=missing_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const decoded = await verifyToken(token);

  if (!decoded) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=invalid_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Only gateway-issued tokens are accepted'
    });
  }

  req.user = decoded;
  
  if (isJwtAuditMode()) {
    log(`JWT_AUDIT valid=true user=${decoded.sub} issuer=${decoded.iss} audience=${decoded.aud}`);
  }
  
  next();
};
```

---

## Backend Security Model (Final)

### ✅ Backend MUST Accept:
- JWT with `iss = https://gateway.internal`
- JWT with `aud = backend-service`
- JWT with valid signature (verified via gateway JWKS)
- JWT not expired (`exp` valid)

### ❌ Backend MUST Reject:
- JWT with `iss != https://gateway.internal`
- JWT with wrong `aud`
- JWT with invalid signature
- JWT expired
- JWT missing required claims
- No JWT provided

---

## Request Handling Matrix

| Scenario | Issuer | Backend Action |
|----------|--------|----------------|
| Gateway JWT (valid) | `https://gateway.internal` | ✅ Accept → 200 |
| Gateway JWT (expired) | `https://gateway.internal` | ❌ Reject → 401 |
| Backend JWT | `http://localhost:5001` | ❌ Reject → 401 |
| Client IdP JWT | `https://auth0.com` | ❌ Reject → 401 |
| Invalid signature | Any | ❌ Reject → 401 |
| No JWT | N/A | ❌ Reject → 401 |

---

## Validation Tests

### Test 1: Gateway JWT (Should Accept)
```bash
# Get client JWT
CLIENT_JWT=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' | jq -r '.accessToken')

# Use through gateway (gateway translates to internal JWT)
curl http://localhost:8081/users \
  -H "Authorization: Bearer $CLIENT_JWT"
```

**Expected**: 200 OK

---

### Test 2: Backend JWT Direct (Should Reject)
```bash
# Get backend JWT
BACKEND_JWT=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' | jq -r '.accessToken')

# Try to use directly on backend (bypass gateway)
curl http://localhost:5001/users \
  -H "Authorization: Bearer $BACKEND_JWT"
```

**Expected**: 401 Unauthorized
**Message**: "Only gateway-issued tokens are accepted"

---

### Test 3: No JWT (Should Reject)
```bash
curl http://localhost:5001/users
```

**Expected**: 401 Unauthorized

---

### Test 4: Invalid Issuer (Should Reject)
```bash
# Create fake JWT with wrong issuer
curl http://localhost:5001/users \
  -H "Authorization: Bearer eyJhbGc...fake-token"
```

**Expected**: 401 Unauthorized

---

## Expected Logs

### ✅ CORRECT: Gateway JWT Accepted
```
JWT_AUDIT valid=true user=alice issuer=https://gateway.internal audience=backend-service
method=GET path=/users user=alice tenant=default status=200 latency=5ms
```

### ❌ REJECTED: Backend JWT
```
JWT verification failed: Rejected: issuer=http://localhost:5001, expected=https://gateway.internal
JWT_AUDIT valid=false reason=invalid_token method=GET path=/users
method=GET path=/users anonymous status=401 latency=2ms
```

### ❌ REJECTED: No JWT
```
JWT_AUDIT valid=false reason=missing_token method=GET path=/users
method=GET path=/users anonymous status=401 latency=1ms
```

---

## Network & Deployment Considerations

### Defense-in-Depth (Optional)

While cryptographic enforcement is primary, consider these additional layers:

#### 1. Private Networking
```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
┌──────▼──────────┐
│  API Gateway    │ (Public)
│  Port: 8081     │
└──────┬──────────┘
       │ Private Network
┌──────▼──────────┐
│ Backend Service │ (Private)
│  Port: 5001     │
└─────────────────┘
```

**AWS**: Use VPC with private subnets
**GCP**: Use VPC with internal IPs
**Azure**: Use VNet with private endpoints

#### 2. Firewall Rules
```bash
# Backend service firewall
# Allow: Gateway IP only
# Deny: All other sources
```

#### 3. Security Groups (AWS Example)
```yaml
BackendSecurityGroup:
  Ingress:
    - Source: GatewaySecurityGroup
      Port: 5001
      Protocol: TCP
```

**Important**: Network controls are defense-in-depth, NOT primary security.
Cryptographic enforcement (JWT verification) is the primary control.

---

## Migration Checklist

### Pre-Migration:
- [ ] Verify all clients use gateway
- [ ] Monitor issuer in logs
- [ ] Confirm no direct backend access

### Migration:
- [ ] Update `verifyToken` to enforce gateway-only
- [ ] Deploy backend with new code
- [ ] Test gateway JWT acceptance
- [ ] Test backend JWT rejection

### Post-Migration:
- [ ] Monitor logs for rejected tokens
- [ ] Verify no 401 errors for valid requests
- [ ] Document gateway-only requirement
- [ ] Update client documentation

---

## Rollback Plan

If issues occur:

1. **Immediate**: Revert `verifyToken` to dual-issuer mode
2. **Investigate**: Check logs for rejection reasons
3. **Fix**: Update clients to use gateway
4. **Retry**: Re-deploy gateway-only enforcement

---

## Final Backend Architecture

```
┌─────────────────────────────────────────┐
│         BACKEND SERVICE                  │
│         (Gateway-Only Mode)              │
├─────────────────────────────────────────┤
│                                          │
│  [1] authenticateJWT                     │
│      ✓ Extract JWT from header          │
│      ✓ Decode and check issuer          │
│      ✓ REJECT if iss != gateway         │
│      ✓ Verify signature (gateway JWKS)  │
│      ✓ Validate aud, exp                │
│      ✓ Extract identity → req.user      │
│                                          │
│  [2] Business Logic Controller           │
│      ✓ Execute business logic           │
│      ✓ Use req.user.sub, req.user.ten   │
│                                          │
│  [3] Response                            │
│      ✓ Return data                      │
│                                          │
└─────────────────────────────────────────┘
```

---

## Summary

### What Was Removed:
- ❌ Dual-issuer support
- ❌ Backend JWT acceptance
- ❌ Client IdP JWT acceptance
- ❌ Fallback authentication paths

### What Remains:
- ✅ Gateway JWT verification ONLY
- ✅ Strict issuer enforcement
- ✅ JWKS-based signature verification
- ✅ Audience and expiry validation

### Key Principle:
**Gateway is the ONLY valid entry point.**

Only JWTs signed by the gateway are accepted.