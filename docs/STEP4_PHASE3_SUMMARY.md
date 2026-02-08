# STEP 4 — Phase 3: Gateway as Sole Authorization Authority

## Implementation Summary

Phase 3 makes the API Gateway the **SINGLE AUTHORIZATION AUTHORITY** by removing all authorization logic from the backend. The backend is now a **trusted execution service** that assumes all requests reaching it are authorized.

---

## What Changed

### 1. Authorization Logic Removed

**Before (Phase 2):**
```javascript
// Backend had authorization checks
if (req.authzIdentity.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**After (Phase 3):**
```javascript
// No authorization checks - gateway already enforced
// If request reaches here, it is authorized
res.json({ users: getAllUsers() });
```

### 2. Startup Validation Enforced

Backend now **fails fast** at startup if misconfigured:

```javascript
if (AUTHZ_SOURCE !== 'gateway') {
  console.error('FATAL: AUTHZ_SOURCE must be "gateway"');
  process.exit(1);
}
```

### 3. Gateway Identity Required

Every request MUST have `req.gatewayIdentity`:

```javascript
if (!req.gatewayIdentity) {
  log('MISSING_GATEWAY_IDENTITY');
  return 401 Unauthorized;
}
```

### 4. JWT Audit Mode Added

Optional JWT validation mode for defense in depth:

```bash
JWT_VALIDATION_MODE=enforce  # Reject invalid JWTs (default)
JWT_VALIDATION_MODE=audit    # Log JWT validation, don't block
```

---

## Files Changed

### Modified Files

**Configuration:**
- `src/config/authz.config.js` — Enforces gateway-only, adds JWT audit mode

**Middleware:**
- `src/middleware/authz.middleware.js` — Renamed to `gatewayAuthorityMiddleware`, removes JWT fallback
- `src/middleware/jwt.middleware.js` — Adds audit mode support

**Routes:**
- `src/routes/order.routes.js` — Uses `gatewayAuthorityMiddleware`
- `src/routes/user.routes.js` — Uses `gatewayAuthorityMiddleware`

**Controllers:**
- `src/controllers/order.controller.js` — Removed authorization logic (comments added)
- `src/controllers/user.controller.js` — Removed authorization logic (comments added)

**Application:**
- `src/app.js` — Phase 3 startup validation and logging
- `.env.example` — Updated for Phase 3 config

---

## Configuration

### Required Environment Variables

```bash
# REQUIRED: Backend will fail to start if not set to 'gateway'
AUTHZ_SOURCE=gateway

# OPTIONAL: JWT validation mode (default: enforce)
JWT_VALIDATION_MODE=enforce  # or 'audit'
```

### Startup Validation

Backend validates configuration at startup:

```
========================================
PHASE 3: Gateway as Sole Authority
AUTHZ_SOURCE: gateway
JWT_VALIDATION_MODE: enforce
========================================
```

If misconfigured:
```
FATAL: AUTHZ_SOURCE must be 'gateway'. Current value: 'jwt'
Phase 3 requires gateway as the sole authorization authority.
[Process exits with code 1]
```

---

## Request Flow

```
Client
  ↓ JWT
Gateway
  ↓ Verifies JWT
  ↓ Enforces authorization policies
  ↓ Injects trusted identity headers
  ↓
Backend
  ↓ gatewayTrustMiddleware → validates gateway secret
  ↓ authenticateJWT → validates JWT (optional audit mode)
  ↓ gatewayAuthorityMiddleware → requires gateway identity
  ↓ Controller → executes business logic (NO authorization)
  ↓
Response
```

---

## Middleware Chain

### Phase 2 (Old)
```
authenticateJWT → authzMiddleware → controller
                  ↓
                  Selects JWT or gateway identity
                  Makes authorization decisions
```

### Phase 3 (New)
```
authenticateJWT → gatewayAuthorityMiddleware → controller
↓                 ↓                             ↓
Audit only        Requires gateway identity     Business logic only
(optional)        NO authorization decisions    NO authorization checks
```

---

## Security Model

### Defense in Depth Layers

| Layer | Responsibility | Can Block? |
|-------|---------------|------------|
| Gateway | Authentication + Authorization | ✅ Yes |
| Backend Gateway Trust | Verify gateway origin | ✅ Yes |
| Backend JWT Validation | Audit JWT validity | ⚠️ Optional |
| Backend Controllers | Business logic only | ❌ No |

### Trust Model

**Phase 2:**
- Backend: "I will verify identity and make authorization decisions"

**Phase 3:**
- Backend: "If this request reached me, gateway already authorized it"

---

## Logging

### Startup Logs
```
========================================
PHASE 3: Gateway as Sole Authority
AUTHZ_SOURCE: gateway
JWT_VALIDATION_MODE: enforce
========================================
```

### Per-Request Logs (Enforce Mode)
```
[BACKEND RECEIVED] X-Gateway-Secret: gw-secret-2024-phase1-trust
[BACKEND RECEIVED] X-User-Id: 1
[BACKEND RECEIVED] X-Username: alice
[BACKEND RECEIVED] X-User-Role: admin
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

### Per-Request Logs (Audit Mode)
```
JWT_AUDIT valid=true user=alice role=admin
IDENTITY gateway={user=alice, role=admin}
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

### Missing Gateway Identity
```
MISSING_GATEWAY_IDENTITY method=GET path=/orders
```

---

## What Was Removed

❌ **Authorization logic in controllers**
- No role checks
- No admin/user branching
- No endpoint-specific authorization

❌ **JWT-based authorization decisions**
- JWT validation remains (optional)
- JWT is NOT used for authorization

❌ **AUTHZ_SOURCE=jwt support**
- Only `gateway` is allowed
- Backend fails to start if set to `jwt`

❌ **Authorization middleware complexity**
- No identity source selection
- No fallback logic
- Simple: require gateway identity or reject

---

## Testing

### Test Normal Flow

```bash
# Start backend (Phase 3)
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=enforce npm start

# Login via gateway
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Access protected endpoint
curl http://localhost:8081/orders -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Gateway enforces authorization
- Backend trusts gateway identity
- Request succeeds

### Test JWT Audit Mode

```bash
# Start with audit mode
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=audit npm start

# Make request with invalid JWT
curl http://localhost:8081/orders -H "Authorization: Bearer invalid-token"
```

**Expected:**
- Backend logs: `JWT_AUDIT valid=false reason=invalid_token`
- Request continues (not blocked by backend)
- Gateway may block if enforcement enabled

### Test Missing Gateway Identity

```bash
# Direct request to backend (bypassing gateway)
curl http://localhost:5001/orders -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Backend logs: `MISSING_GATEWAY_IDENTITY`
- Response: `401 Unauthorized`

### Test Startup Validation

```bash
# Try to start with wrong config
AUTHZ_SOURCE=jwt npm start
```

**Expected:**
```
FATAL: AUTHZ_SOURCE must be 'gateway'. Current value: 'jwt'
Phase 3 requires gateway as the sole authorization authority.
[Process exits]
```

---

## Rollback Strategy

### Rollback to Phase 2

Phase 3 is **NOT reversible via configuration**. To rollback:

1. Revert code changes to Phase 2
2. Restore authorization logic in controllers
3. Restore `authzMiddleware` with JWT fallback
4. Remove startup validation

**This is intentional** - Phase 3 is the final state for backend authorization.

---

## Migration Path

### Phase 1 → Phase 2 → Phase 3

| Phase | Authorization Authority | Backend Role | Rollback |
|-------|------------------------|--------------|----------|
| Phase 1 | Backend (JWT) | Makes decisions | Remove middleware |
| Phase 2 | Configurable | Makes decisions | Change env var |
| Phase 3 | Gateway only | Trusted execution | Revert code |

---

## Success Criteria

✅ Backend has NO authorization logic  
✅ Gateway is the sole authorization authority  
✅ Backend requires gateway identity  
✅ Startup validation enforces gateway-only  
✅ JWT audit mode available  
✅ Unauthorized requests never reach backend  
✅ Logs show gateway as authority  

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
└────────────────────────┬────────────────────────────────────┘
                         │ JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gateway (Port 8081)                      │
│                                                             │
│  ✅ Verifies JWT                                            │
│  ✅ Enforces authorization policies                         │
│  ✅ Injects trusted identity headers                        │
│                                                             │
│  SOLE AUTHORIZATION AUTHORITY                               │
└────────────────────────┬────────────────────────────────────┘
                         │ JWT + Gateway Headers
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Port 5001)                       │
│                                                             │
│  ✅ Validates gateway secret                                │
│  ⚠️  Validates JWT (audit mode optional)                    │
│  ✅ Requires gateway identity                               │
│  ❌ NO authorization decisions                              │
│                                                             │
│  TRUSTED EXECUTION SERVICE                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Principles

1. **Single Source of Truth**: Gateway is the only authorization authority
2. **Trust but Verify**: Backend validates gateway origin (shared secret)
3. **Defense in Depth**: JWT validation remains optional
4. **Fail Fast**: Backend rejects misconfiguration at startup
5. **Zero Authorization Logic**: Controllers execute business logic only

---

**Phase 3 Status: ✅ COMPLETE**

**Backend is now a Zero Trust execution service.**
