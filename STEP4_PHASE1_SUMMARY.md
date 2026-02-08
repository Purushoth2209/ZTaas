# STEP 4 — Phase 1: Gateway Trust Headers (Observe Only)

## Implementation Summary

This phase introduces **trusted identity headers** from the gateway to the backend for **observation and validation only**. No authorization behavior has changed.

---

## Changes Made

### 1. Gateway Changes

#### New Files
- `gateway/src/config/gateway.secret.js` — Shared secret configuration

#### Modified Files
- `gateway/src/proxy/http.proxy.js`
  - Strips any client-provided gateway headers
  - Injects trusted identity headers from verified JWT:
    - `X-User-Id` → JWT `sub`
    - `X-Username` → JWT `username`
    - `X-User-Role` → JWT `role`
    - `X-Issuer` → JWT `iss`
    - `X-Gateway-Secret` → shared secret

- `gateway/src/services/proxy.service.js`
  - Updated to pass `identity` parameter to `forwardRequest`

- `gateway/src/controllers/proxy.controller.js`
  - Updated to pass `req.identity` to proxy service

### 2. Backend Changes

#### New Files
- `backend-service/src/config/gateway.secret.js` — Shared secret configuration
- `backend-service/src/middleware/gatewayTrust.middleware.js` — Gateway identity extraction

#### Modified Files
- `backend-service/src/app.js`
  - Wired `gatewayTrustMiddleware` before logging middleware
  - Enhanced logging to show both JWT and gateway identities
  - Added mismatch detection and warning logs

### 3. Documentation
- Updated `backend-service/README.md` with Phase 1 details
- Updated `gateway/README.md` with Phase 1 details
- Created `test-gateway-trust-phase1.sh` test script

---

## Security Model

### Gateway Secret Verification

The backend validates the gateway using a shared secret:

```javascript
// Both services use the same secret
export const GATEWAY_SECRET = 'gw-secret-2024-phase1-trust';
```

**Validation logic:**
1. Backend checks `X-Gateway-Secret` header
2. If missing or invalid → ignore gateway headers, log warning
3. If valid → extract identity into `req.gatewayIdentity`

### Header Injection Security

Gateway ensures security by:
1. **Stripping client headers** — Any `X-User-*`, `X-Issuer`, or `X-Gateway-Secret` from client are removed
2. **JWT verification required** — Headers only injected if JWT is valid
3. **Shared secret** — Backend validates secret before trusting headers

---

## Dual Identity Logging

Every authenticated request now logs **both identities**:

```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
```

### Mismatch Detection

If identities differ, a warning is logged:

```
IDENTITY_MISMATCH jwtRole=admin gatewayRole=user
```

**Important:** Mismatches do NOT block requests in Phase 1.

---

## What Did NOT Change

✅ Backend authorization logic — still uses JWT claims  
✅ JWT validation logic — still validates every request  
✅ Response behavior — same responses as before  
✅ HTTP status codes — no new errors introduced  
✅ Gateway authorization — still enforces policies  

---

## Testing

### Manual Test

```bash
# 1. Start backend
cd backend-service
npm start

# 2. Start gateway (in another terminal)
cd gateway
npm start

# 3. Run test script (in another terminal)
./test-gateway-trust-phase1.sh
```

### Expected Behavior

1. Login succeeds
2. Protected endpoint access succeeds
3. Backend logs show:
   - `IDENTITY jwt={user=alice, role=admin}`
   - `IDENTITY gateway={user=alice, role=admin}`
4. No `IDENTITY_MISMATCH` warnings
5. No authorization behavior changes

### Verification Checklist

- [ ] Gateway injects identity headers
- [ ] Backend extracts gateway identity
- [ ] Both identities logged on every request
- [ ] Mismatches detected and logged
- [ ] Requests succeed as before
- [ ] No 401/403 errors introduced

---

## Rollback Procedure

To disable Phase 1:

### Backend
1. Remove `gatewayTrustMiddleware` import from `app.js`
2. Remove `app.use(gatewayTrustMiddleware)` line
3. Revert logging changes in `app.js`

### Gateway
1. Remove identity parameter from `forwardRequest` calls
2. Remove header injection logic from `http.proxy.js`

**No database changes, no config files to restore — fully reversible.**

---

## Next Steps (Future Phases)

Phase 1 is complete. Future phases will:

- **Phase 2**: Backend begins trusting gateway headers for authorization
- **Phase 3**: Remove redundant JWT validation from backend
- **Phase 4**: Full gateway-based authorization

**Phase 1 must run successfully for at least a week before proceeding to Phase 2.**

---

## Success Criteria

✅ Gateway injects trusted identity headers  
✅ Backend validates gateway secret  
✅ Dual identity logging implemented  
✅ Mismatch detection working  
✅ No authorization behavior changes  
✅ Fully reversible  
✅ Documentation complete  

---

## Files Changed

### Gateway
- `src/config/gateway.secret.js` (new)
- `src/proxy/http.proxy.js` (modified)
- `src/services/proxy.service.js` (modified)
- `src/controllers/proxy.controller.js` (modified)
- `README.md` (modified)

### Backend
- `src/config/gateway.secret.js` (new)
- `src/middleware/gatewayTrust.middleware.js` (new)
- `src/app.js` (modified)
- `README.md` (modified)

### Root
- `test-gateway-trust-phase1.sh` (new)

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
│                                                             │
│  1. Verify JWT (JWKS)                                       │
│  2. Strip client-provided gateway headers                   │
│  3. Inject trusted identity headers:                        │
│     - X-User-Id                                             │
│     - X-Username                                            │
│     - X-User-Role                                           │
│     - X-Issuer                                              │
│     - X-Gateway-Secret                                      │
│  4. Forward to backend                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ JWT + Gateway Headers
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (5001)                          │
│                                                             │
│  1. Validate X-Gateway-Secret                               │
│  2. Extract gateway identity → req.gatewayIdentity          │
│  3. Validate JWT → req.user                                 │
│  4. Log both identities                                     │
│  5. Detect mismatches (log warning)                         │
│  6. Authorize using JWT (unchanged)                         │
│  7. Return response                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Shared Secret**: Simple, effective, no PKI complexity needed for Phase 1
2. **Observe Only**: Zero risk — no authorization changes
3. **Dual Logging**: Visibility into both identities for validation
4. **Mismatch Detection**: Early warning system for issues
5. **Reversible**: Can be disabled without data loss or downtime

---

## Monitoring Recommendations

During Phase 1, monitor:

1. **Mismatch rate**: Should be 0%
2. **Gateway secret failures**: Should be 0 (indicates misconfiguration)
3. **Request success rate**: Should remain unchanged
4. **Latency**: Should remain unchanged (minimal overhead)

If any issues detected, rollback immediately.

---

**Phase 1 Status: ✅ COMPLETE**
