# STEP 4 — Phase 3: Quick Reference

## What Is Phase 3?

**Gateway is the SOLE authorization authority. Backend has NO authorization logic.**

---

## Configuration

### Required
```bash
AUTHZ_SOURCE=gateway  # Backend fails to start if not set
```

### Optional
```bash
JWT_VALIDATION_MODE=enforce  # Reject invalid JWTs (default)
JWT_VALIDATION_MODE=audit    # Log JWT validation, don't block
```

---

## Startup

```bash
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=enforce npm start
```

**Expected output:**
```
========================================
PHASE 3: Gateway as Sole Authority
AUTHZ_SOURCE: gateway
JWT_VALIDATION_MODE: enforce
========================================
```

**If misconfigured:**
```
FATAL: AUTHZ_SOURCE must be 'gateway'. Current value: 'jwt'
[Process exits]
```

---

## Request Flow

```
Client → Gateway → Backend
         ↓         ↓
         Authorizes  Trusts
```

1. Gateway verifies JWT
2. Gateway enforces authorization
3. Gateway injects identity headers
4. Backend validates gateway secret
5. Backend requires gateway identity
6. Backend executes business logic (NO authorization)

---

## What Changed from Phase 2

| Aspect | Phase 2 | Phase 3 |
|--------|---------|---------|
| Authorization | Configurable | Gateway ONLY |
| Backend logic | Has role checks | NO role checks |
| AUTHZ_SOURCE | `jwt` or `gateway` | `gateway` only |
| Startup | No validation | Fails if wrong |
| Rollback | Env var | Code revert |

---

## Logging

### Normal Request
```
IDENTITY gateway={user=alice, role=admin}
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

### JWT Audit Mode
```
JWT_AUDIT valid=true user=alice role=admin
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
```

### Missing Gateway Identity
```
MISSING_GATEWAY_IDENTITY method=GET path=/orders
```

---

## Testing

### Normal Flow
```bash
# Start backend
AUTHZ_SOURCE=gateway npm start

# Login via gateway
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Access via gateway
curl http://localhost:8081/orders -H "Authorization: Bearer $TOKEN"
```

### Direct Backend Access (Should Fail)
```bash
# Bypass gateway
curl http://localhost:5001/orders -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized
```

### Audit Mode
```bash
# Start with audit mode
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=audit npm start

# Invalid JWT won't block (gateway still enforces)
curl http://localhost:8081/orders -H "Authorization: Bearer invalid"
```

---

## Key Files Changed

**Modified:**
- `src/config/authz.config.js` — Enforces gateway-only
- `src/middleware/authz.middleware.js` — Renamed to `gatewayAuthorityMiddleware`
- `src/middleware/jwt.middleware.js` — Adds audit mode
- `src/controllers/*.js` — Removed authorization logic
- `src/routes/*.js` — Uses `gatewayAuthorityMiddleware`
- `src/app.js` — Phase 3 startup validation

---

## What Was Removed

❌ Authorization logic in controllers  
❌ JWT-based authorization decisions  
❌ AUTHZ_SOURCE=jwt support  
❌ Authorization middleware complexity  

---

## Security Model

**Gateway:**
- ✅ Verifies JWT
- ✅ Enforces authorization
- ✅ Injects identity headers

**Backend:**
- ✅ Validates gateway secret
- ⚠️ Validates JWT (optional)
- ✅ Requires gateway identity
- ❌ NO authorization decisions

---

## Rollback

**NOT reversible via configuration.**

To rollback:
1. Revert code to Phase 2
2. Restore authorization logic
3. Restore `authzMiddleware`

---

## Success Criteria

✅ Backend has NO authorization logic  
✅ Gateway is sole authority  
✅ Backend requires gateway identity  
✅ Startup validation works  
✅ JWT audit mode available  
✅ Logs show gateway as authority  

---

**Phase 3 Status: ✅ COMPLETE**

**Backend is now a Zero Trust execution service.**
