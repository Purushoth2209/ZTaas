# STEP 4 — Phase 1: Request Flow

## Complete Request Flow with Gateway Trust Headers

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT                                   │
│                                                                     │
│  Sends request with:                                                │
│  Authorization: Bearer eyJhbGc...                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GATEWAY (Port 8081)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Identity Middleware (identity.middleware.js)              │  │
│  │    - Extract JWT from Authorization header                   │  │
│  │    - Verify JWT using JWKS                                   │  │
│  │    - Store identity in req.identity                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2. Authorization Middleware (authorization.middleware.js)    │  │
│  │    - Check role-based policies                               │  │
│  │    - Log authorization decision                              │  │
│  │    - Block if enforce mode + denied                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3. Proxy Controller (proxy.controller.js)                    │  │
│  │    - Pass req.identity to proxy service                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. Proxy Service (proxy.service.js)                          │  │
│  │    - Pass identity to forwardRequest                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 5. HTTP Proxy (http.proxy.js) — PHASE 1 CHANGES             │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ a) Strip client-provided gateway headers          │    │  │
│  │    │    - Remove X-User-Id                             │    │  │
│  │    │    - Remove X-Username                            │    │  │
│  │    │    - Remove X-User-Role                           │    │  │
│  │    │    - Remove X-Issuer                              │    │  │
│  │    │    - Remove X-Gateway-Secret                      │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ b) Inject trusted identity headers (if JWT valid) │    │  │
│  │    │    X-Gateway-Secret: gw-secret-2024-phase1-trust  │    │  │
│  │    │    X-User-Id: <identity.sub>                      │    │  │
│  │    │    X-Username: <identity.username>                │    │  │
│  │    │    X-User-Role: <identity.role>                   │    │  │
│  │    │    X-Issuer: <identity.issuer>                    │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    - Forward request to backend                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Request with:
                             │ - Authorization: Bearer eyJhbGc...
                             │ - X-Gateway-Secret: gw-secret-2024-phase1-trust
                             │ - X-User-Id: 1
                             │ - X-Username: alice
                             │ - X-User-Role: admin
                             │ - X-Issuer: backend-service
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Port 5001)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Gateway Trust Middleware — PHASE 1 NEW                    │  │
│  │    (gatewayTrust.middleware.js)                              │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ a) Validate X-Gateway-Secret                       │    │  │
│  │    │    - If missing/invalid → ignore headers, continue │    │  │
│  │    │    - If valid → proceed to extract                 │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ b) Extract gateway identity                        │    │  │
│  │    │    - Read X-User-Id                                │    │  │
│  │    │    - Read X-Username                               │    │  │
│  │    │    - Read X-User-Role                              │    │  │
│  │    │    - Read X-Issuer                                 │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ c) Store in req.gatewayIdentity                    │    │  │
│  │    │    {                                               │    │  │
│  │    │      userId: "1",                                  │    │  │
│  │    │      username: "alice",                            │    │  │
│  │    │      role: "admin",                                │    │  │
│  │    │      issuer: "backend-service"                     │    │  │
│  │    │    }                                               │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2. JWT Middleware (jwt.middleware.js) — UNCHANGED            │  │
│  │    - Validate JWT from Authorization header                  │  │
│  │    - Store in req.user                                       │  │
│  │    {                                                         │  │
│  │      userId: 1,                                              │  │
│  │      username: "alice",                                      │  │
│  │      role: "admin"                                           │  │
│  │    }                                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3. Route Handler (e.g., user.controller.js) — UNCHANGED     │  │
│  │    - Uses req.user for authorization (NOT req.gatewayIdentity)│ │
│  │    - Performs business logic                                 │  │
│  │    - Returns response                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. Logging Middleware — PHASE 1 ENHANCED                     │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ a) Log JWT identity                                │    │  │
│  │    │    IDENTITY jwt={user=alice, role=admin}           │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ b) Log gateway identity                            │    │  │
│  │    │    IDENTITY gateway={user=alice, role=admin}       │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ c) Detect mismatch (if any)                        │    │  │
│  │    │    if (req.user.role !== req.gatewayIdentity.role) │    │  │
│  │    │      IDENTITY_MISMATCH jwtRole=X gatewayRole=Y     │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  │    ┌────────────────────────────────────────────────────┐    │  │
│  │    │ d) Log request summary                             │    │  │
│  │    │    method=GET path=/users user=alice role=admin    │    │  │
│  │    │    status=200 latency=45ms                         │    │  │
│  │    └────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                      Response to Gateway
                             │
                             ▼
                      Response to Client
```

---

## Key Observations

### 1. Dual Identity Sources
- **req.user** — From JWT validation (existing)
- **req.gatewayIdentity** — From gateway headers (new)

### 2. Authorization Decision
- **Phase 1**: Uses `req.user` only (unchanged)
- **Future Phase 2**: Will use `req.gatewayIdentity`

### 3. Security Layers
1. Gateway strips client-provided headers
2. Gateway injects trusted headers only if JWT valid
3. Backend validates gateway secret
4. Backend still validates JWT independently

### 4. Logging
- Both identities logged on every request
- Mismatches detected and logged
- No blocking on mismatch (observe only)

---

## Example Log Output

### Successful Request
```
[2024-01-15T10:30:45.123Z] IDENTITY jwt={user=alice, role=admin}
[2024-01-15T10:30:45.124Z] IDENTITY gateway={user=alice, role=admin}
[2024-01-15T10:30:45.125Z] method=GET path=/users user=alice role=admin status=200 latency=45ms
```

### Request with Mismatch (should not happen in production)
```
[2024-01-15T10:30:45.123Z] IDENTITY jwt={user=alice, role=admin}
[2024-01-15T10:30:45.124Z] IDENTITY gateway={user=alice, role=user}
[2024-01-15T10:30:45.125Z] IDENTITY_MISMATCH jwtRole=admin gatewayRole=user
[2024-01-15T10:30:45.126Z] method=GET path=/users user=alice role=admin status=200 latency=45ms
```

### Request without Gateway Headers (direct to backend)
```
[2024-01-15T10:30:45.123Z] IDENTITY jwt={user=alice, role=admin}
[2024-01-15T10:30:45.124Z] method=GET path=/users user=alice role=admin status=200 latency=45ms
```

---

## Phase 1 Guarantees

✅ No authorization behavior changes  
✅ No response changes  
✅ No new errors introduced  
✅ Fully reversible  
✅ Safe to deploy to production  
✅ Provides visibility for validation  

---

## What's Next

**Phase 2** (future):
- Backend begins trusting `req.gatewayIdentity` for authorization
- JWT validation becomes optional
- Gateway becomes the primary security boundary

**Do not proceed until Phase 1 runs successfully for at least 1 week.**
