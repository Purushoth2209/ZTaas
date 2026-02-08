# STEP 4 — Phase 2: Gateway-Driven Authorization

## Implementation Summary

Phase 2 switches backend authorization decisions to use **gateway-provided identity** instead of JWT claims, while maintaining JWT validation for defense in depth.

---

## Changes Made

### 1. New Files

#### Configuration
- `src/config/authz.config.js` — Authorization source configuration
- `.env.example` — Environment variable documentation

#### Middleware
- `src/middleware/authz.middleware.js` — Authorization source selection logic

### 2. Modified Files

#### Routes
- `src/routes/order.routes.js` — Added `authzMiddleware`
- `src/routes/user.routes.js` — Added `authzMiddleware`

#### Controllers
- `src/controllers/order.controller.js` — Uses `req.authzIdentity` instead of `req.user`
- `src/controllers/user.controller.js` — Uses `req.authzIdentity` instead of `req.user`

#### Application
- `src/app.js` — Added AUTHZ_SOURCE logging and authorization source tracking

---

## Authorization Source Control

### Environment Variable

```bash
AUTHZ_SOURCE=gateway  # Use gateway identity (default)
AUTHZ_SOURCE=jwt      # Use JWT claims (fallback)
```

### Configuration Module

```javascript
// src/config/authz.config.js
export const AUTHZ_SOURCE = process.env.AUTHZ_SOURCE || 'gateway';
export const isGatewayAuthz = () => AUTHZ_SOURCE === 'gateway';
export const isJwtAuthz = () => AUTHZ_SOURCE === 'jwt';
```

---

## Authorization Middleware Logic

### Selection Algorithm

```javascript
// src/middleware/authz.middleware.js

if (AUTHZ_SOURCE === 'gateway' && req.gatewayIdentity) {
  // Use gateway identity
  req.authzIdentity = req.gatewayIdentity;
  req.authzSource = 'gateway';
} else if (req.user) {
  // Fallback to JWT
  req.authzIdentity = req.user;
  req.authzSource = 'jwt';
  
  if (AUTHZ_SOURCE === 'gateway') {
    log('AUTHZ_FALLBACK source=jwt reason=missing_gateway_identity');
  }
} else {
  // No valid identity
  return 401 Unauthorized;
}
```

### Middleware Chain

```
Request
  ↓
authenticateJWT (validates JWT → req.user)
  ↓
authzMiddleware (selects identity → req.authzIdentity)
  ↓
Controller (uses req.authzIdentity)
```

---

## Controller Refactoring

### Before (Phase 1)

```javascript
export const getOrders = async (req, res) => {
  const orders = req.user.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(req.user.userId);
  
  res.json({ orders, requestedBy: req.user.username });
};
```

### After (Phase 2)

```javascript
export const getOrders = async (req, res) => {
  const identity = req.authzIdentity;  // ← Unified identity
  const orders = identity.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(identity.userId);
  
  res.json({ orders, requestedBy: identity.username });
};
```

**Key Change**: Controllers are now **source-agnostic** — they don't care if identity came from JWT or gateway.

---

## Security Model

### Defense in Depth

| Layer | Validation | Purpose |
|-------|-----------|---------|
| Gateway | JWT verification via JWKS | Primary security boundary |
| Backend | JWT validation | Defense in depth |
| Backend | Gateway secret validation | Trust verification |
| Backend | Authorization source selection | Flexible authorization |

### Fallback Behavior

```
AUTHZ_SOURCE=gateway
  ↓
Gateway identity available? → Use gateway identity
  ↓ NO
JWT identity available? → Use JWT identity (log fallback)
  ↓ NO
Return 401 Unauthorized
```

### No Identity Scenario

If both `req.gatewayIdentity` and `req.user` are missing:
- Response: `401 Unauthorized`
- No request is authorized without valid identity

---

## Logging

### Startup Log

```
AUTHZ_SOURCE configured as: gateway
```

### Per-Request Logs

**Gateway Authorization:**
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
AUTHZ source=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

**JWT Authorization (AUTHZ_SOURCE=jwt):**
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
AUTHZ source=jwt user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

**Fallback Scenario:**
```
IDENTITY jwt={user=alice, role=admin}
AUTHZ_FALLBACK source=jwt reason=missing_gateway_identity path=/orders
AUTHZ source=jwt user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

---

## Configuration Examples

### Production (Gateway-Driven)

```bash
# .env
AUTHZ_SOURCE=gateway
```

```bash
npm start
```

### Rollback to JWT

```bash
# .env
AUTHZ_SOURCE=jwt
```

```bash
npm start
```

### Testing Both Modes

```bash
# Terminal 1: Gateway mode
AUTHZ_SOURCE=gateway npm start

# Terminal 2: JWT mode
AUTHZ_SOURCE=jwt npm start
```

---

## What Changed vs Phase 1

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| Gateway identity extraction | ✅ | ✅ |
| JWT validation | ✅ | ✅ |
| Authorization source | JWT only | Configurable (JWT or Gateway) |
| Controllers | Use `req.user` | Use `req.authzIdentity` |
| Logging | Identity comparison | + Authorization source |
| Rollback | Remove middleware | Change env var |

---

## What Did NOT Change

✅ JWT validation (still required)  
✅ Gateway behavior (unchanged)  
✅ Authorization rules (admin vs user logic identical)  
✅ Response format (unchanged)  
✅ HTTP status codes (unchanged)  
✅ Request flow (unchanged)  

---

## Testing

### Test Gateway Authorization

```bash
# Start backend with gateway authz
AUTHZ_SOURCE=gateway npm start

# In another terminal, test via gateway
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl http://localhost:8081/orders -H "Authorization: Bearer $TOKEN"
```

**Expected logs:**
```
AUTHZ source=gateway user=alice role=admin method=GET path=/orders
```

### Test JWT Authorization

```bash
# Start backend with JWT authz
AUTHZ_SOURCE=jwt npm start

# Test same request
curl http://localhost:8081/orders -H "Authorization: Bearer $TOKEN"
```

**Expected logs:**
```
AUTHZ source=jwt user=alice role=admin method=GET path=/orders
```

### Verify Behavior Identical

Both modes should return identical responses - only log messages differ.

---

## Rollback Procedure

### Instant Rollback (No Downtime)

**Option 1: Environment Variable**
```bash
# Change env var and restart
AUTHZ_SOURCE=jwt npm start
```

**Option 2: Remove Env Var (Uses Default)**
```bash
# Default is 'gateway', so to rollback:
AUTHZ_SOURCE=jwt npm start
```

### Full Rollback (Revert Code)

If you need to completely revert Phase 2:

1. Remove `authzMiddleware` from routes
2. Change controllers back to use `req.user`
3. Remove `src/middleware/authz.middleware.js`
4. Remove `src/config/authz.config.js`

**Not recommended** - use env var instead.

---

## Success Criteria

✅ `AUTHZ_SOURCE=jwt` → behavior unchanged from Phase 1  
✅ `AUTHZ_SOURCE=gateway` → uses gateway identity  
✅ JWT still validated on every request  
✅ Automatic fallback to JWT if gateway identity missing  
✅ Authorization rules unchanged (admin vs user)  
✅ Rollback via env var (instant)  
✅ Comprehensive logging  

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
└────────────────────────┬────────────────────────────────────┘
                         │ JWT in Authorization header
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Gateway (8081)                        │
│  1. Verify JWT (JWKS)                                       │
│  2. Inject trusted identity headers                         │
│  3. Forward to backend                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ JWT + Gateway Headers
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (5001)                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. gatewayTrustMiddleware                          │    │
│  │    - Validate gateway secret                       │    │
│  │    - Extract → req.gatewayIdentity                 │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 2. authenticateJWT                                 │    │
│  │    - Validate JWT                                  │    │
│  │    - Extract → req.user                            │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 3. authzMiddleware (NEW)                           │    │
│  │    - Select identity based on AUTHZ_SOURCE         │    │
│  │    - Set → req.authzIdentity                       │    │
│  │    - Set → req.authzSource                         │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 4. Controller                                      │    │
│  │    - Use req.authzIdentity for authorization       │    │
│  │    - Return response                               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring Recommendations

Monitor these metrics:

1. **Authorization source distribution**
   - % using gateway identity
   - % using JWT identity (fallback)

2. **Fallback rate**
   - Should be 0% in production
   - Non-zero indicates gateway header issues

3. **Request success rate**
   - Should remain unchanged from Phase 1

4. **Latency**
   - Should remain unchanged (minimal overhead)

---

## Next Steps

**Phase 2 is complete.**

Future phases could include:
- **Phase 3**: Make JWT validation optional (gateway-only trust)
- **Phase 4**: Remove JWT validation entirely (full gateway trust)

**Recommendation**: Run Phase 2 in production for at least 2 weeks before considering Phase 3.

---

**Phase 2 Status: ✅ COMPLETE**
