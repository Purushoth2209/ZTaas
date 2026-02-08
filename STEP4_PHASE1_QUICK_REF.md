# STEP 4 — Phase 1: Quick Reference

## What Was Implemented

✅ Gateway injects trusted identity headers  
✅ Backend validates gateway secret  
✅ Dual identity logging (JWT + Gateway)  
✅ Mismatch detection and warnings  
✅ Zero authorization behavior changes  
✅ Fully reversible implementation  

---

## Gateway Headers Injected

When JWT is valid, gateway adds:

```
X-Gateway-Secret: gw-secret-2024-phase1-trust
X-User-Id: <JWT sub>
X-Username: <JWT username>
X-User-Role: <JWT role>
X-Issuer: <JWT iss>
```

---

## Backend Behavior

1. Validates `X-Gateway-Secret`
2. Extracts identity → `req.gatewayIdentity`
3. Validates JWT → `req.user` (unchanged)
4. Logs both identities
5. Detects mismatches
6. **Authorizes using JWT only** (unchanged)

---

## Log Examples

### Normal Request
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
method=GET path=/users user=alice role=admin status=200 latency=45ms
```

### Mismatch Detected
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=user}
IDENTITY_MISMATCH jwtRole=admin gatewayRole=user
method=GET path=/users user=alice role=admin status=200 latency=45ms
```

### Invalid Gateway Secret
```
GATEWAY_TRUST_WARNING: Invalid gateway secret for GET /users
method=GET path=/users user=alice role=admin status=200 latency=45ms
```

---

## Testing

```bash
# Run test script
./test-gateway-trust-phase1.sh

# Or manually:
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. Make request
curl http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN"

# 3. Check backend logs for dual identity logging
```

---

## Rollback

### Backend
Remove from `src/app.js`:
```javascript
import { gatewayTrustMiddleware } from './middleware/gatewayTrust.middleware.js';
app.use(gatewayTrustMiddleware);
// + revert logging changes
```

### Gateway
Remove from `src/proxy/http.proxy.js`:
```javascript
// Remove identity parameter and header injection logic
```

---

## Key Files

### Gateway
- `src/config/gateway.secret.js` — Shared secret
- `src/proxy/http.proxy.js` — Header injection
- `src/services/proxy.service.js` — Identity passing
- `src/controllers/proxy.controller.js` — Identity passing

### Backend
- `src/config/gateway.secret.js` — Shared secret
- `src/middleware/gatewayTrust.middleware.js` — Identity extraction
- `src/app.js` — Middleware wiring + logging

---

## Success Criteria

- [ ] Gateway injects headers on every authenticated request
- [ ] Backend logs both identities
- [ ] No IDENTITY_MISMATCH warnings in production
- [ ] No GATEWAY_TRUST_WARNING logs
- [ ] Request behavior unchanged
- [ ] No new 401/403 errors

---

## Monitoring

Watch for:
- `IDENTITY_MISMATCH` → Should be 0%
- `GATEWAY_TRUST_WARNING` → Should be 0
- Request success rate → Should be unchanged
- Latency → Should be unchanged

---

## Next Phase

**Phase 2** (future): Backend begins trusting gateway headers for authorization.

**Do not proceed to Phase 2 until Phase 1 runs successfully for at least 1 week.**
