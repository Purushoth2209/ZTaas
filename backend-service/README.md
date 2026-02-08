# Backend Service

Sample backend service with JWT authentication for testing the API gateway.

## Installation

```bash
cd backend-service
npm install
```

## Run

```bash
npm start
```

Service starts on port **5001**.

## Test Users

| Username | Password     | Role  |
|----------|--------------|-------|
| alice    | password123  | admin |
| bob      | password123  | user  |
| charlie  | password123  | user  |

## API Endpoints

### Public Endpoints

#### Health Check
```bash
curl http://localhost:5001/hello
```

#### Login
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints

Require `Authorization: Bearer <token>` header.

#### Get All Users
```bash
curl http://localhost:5001/users \
  -H "Authorization: Bearer <token>"
```

#### Get User by ID
```bash
curl http://localhost:5001/users/1 \
  -H "Authorization: Bearer <token>"
```

#### Get Orders
```bash
curl http://localhost:5001/orders \
  -H "Authorization: Bearer <token>"
```

Note: Admin users see all orders, regular users see only their own.

## Testing via Gateway

Start both services:
```bash
# Terminal 1: Backend
cd backend-service
npm start

# Terminal 2: Gateway
cd gateway
npm start
```

### Login via Gateway
```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```

### Access Protected Endpoints via Gateway
```bash
# Save token from login response
TOKEN="<your-token-here>"

# Get users
curl http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN"

# Get orders
curl http://localhost:8081/orders \
  -H "Authorization: Bearer $TOKEN"
```

## Features

- ✅ JWT-based authentication (RS256)
- ✅ Protected endpoints with middleware
- ✅ Role-based access (admin vs user)
- ✅ Realistic latency (50-100ms)
- ✅ Request logging
- ✅ In-memory data store
- ✅ JWKS endpoint for public key distribution
- ✅ **STEP 4 — Phase 1: Gateway Trust (Observe Only)**
- ✅ **STEP 4 — Phase 2: Gateway-Driven Authorization**
- ✅ **STEP 4 — Phase 3: Gateway as Sole Authority**

## STEP 4 — Phase 3: Gateway as Sole Authorization Authority

### Overview

**The backend is now a Zero Trust execution service.**

The API Gateway is the **SINGLE AUTHORIZATION AUTHORITY**. The backend has NO authorization logic and trusts that any request reaching it has been authorized by the gateway.

### Key Changes from Phase 2

| Aspect | Phase 2 | Phase 3 |
|--------|---------|----------|
| Authorization authority | Configurable (JWT or Gateway) | Gateway ONLY |
| Backend authorization logic | Exists (role checks) | REMOVED |
| AUTHZ_SOURCE support | `jwt` or `gateway` | `gateway` only (enforced) |
| Startup validation | None | Fails if not `gateway` |
| JWT validation | Required | Optional (audit mode) |
| Rollback | Change env var | Revert code |

### Configuration

**Required:**
```bash
AUTHZ_SOURCE=gateway  # Backend fails to start if not set
```

**Optional:**
```bash
JWT_VALIDATION_MODE=enforce  # Reject invalid JWTs (default)
JWT_VALIDATION_MODE=audit    # Log JWT validation, don't block
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

If `AUTHZ_SOURCE` is not `gateway`, backend **exits immediately**:

```
FATAL: AUTHZ_SOURCE must be 'gateway'. Current value: 'jwt'
Phase 3 requires gateway as the sole authorization authority.
[Process exits with code 1]
```

### Request Flow

```
1. Gateway verifies JWT
2. Gateway enforces authorization policies
3. Gateway injects trusted identity headers
4. Backend validates gateway secret
5. Backend validates JWT (optional audit mode)
6. Backend requires gateway identity
7. Controller executes business logic (NO authorization)
```

### What Was Removed

❌ **All authorization logic in controllers**
```javascript
// REMOVED - No longer exists
if (req.authzIdentity.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

❌ **JWT-based authorization decisions**
- JWT validation remains (optional)
- JWT is NOT used for authorization

❌ **AUTHZ_SOURCE=jwt support**
- Only `gateway` is allowed
- Backend fails to start otherwise

❌ **Authorization middleware complexity**
- No identity source selection
- No fallback logic
- Simple: require gateway identity or reject

### Security Model

**Defense in Depth:**

| Layer | Responsibility | Can Block? |
|-------|---------------|------------|
| Gateway | Authentication + Authorization | ✅ Yes |
| Backend Gateway Trust | Verify gateway origin | ✅ Yes |
| Backend JWT Validation | Audit JWT validity | ⚠️ Optional |
| Backend Controllers | Business logic only | ❌ No |

**Trust Model:**

> "If this request reached the backend, the gateway already authorized it."

### Logging

**Per-Request (Enforce Mode):**
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

**Per-Request (Audit Mode):**
```
JWT_AUDIT valid=true user=alice role=admin
IDENTITY gateway={user=alice, role=admin}
AUTHZ authority=gateway user=alice role=admin method=GET path=/orders
method=GET path=/orders user=alice role=admin status=200 latency=45ms
```

**Missing Gateway Identity:**
```
MISSING_GATEWAY_IDENTITY method=GET path=/orders
```

### JWT Audit Mode

Optional defense-in-depth feature:

**Enforce Mode (default):**
```bash
JWT_VALIDATION_MODE=enforce
```
- Invalid JWT → Request blocked (401)
- Valid JWT → Request continues

**Audit Mode:**
```bash
JWT_VALIDATION_MODE=audit
```
- Invalid JWT → Logged, request continues
- Valid JWT → Logged, request continues
- Useful for monitoring JWT health without blocking

### Testing

**Normal Flow:**
```bash
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=enforce npm start

TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl http://localhost:8081/orders -H "Authorization: Bearer $TOKEN"
```

**Audit Mode:**
```bash
AUTHZ_SOURCE=gateway JWT_VALIDATION_MODE=audit npm start

# Request with invalid JWT still works (gateway enforces auth)
curl http://localhost:8081/orders -H "Authorization: Bearer invalid"
```

**Direct Backend Access (Should Fail):**
```bash
# Bypass gateway - should be rejected
curl http://localhost:5001/orders -H "Authorization: Bearer $TOKEN"
# Response: 401 Unauthorized (MISSING_GATEWAY_IDENTITY)
```

### Rollback

**Phase 3 is NOT reversible via configuration.**

To rollback to Phase 2:
1. Revert code changes
2. Restore authorization logic in controllers
3. Restore `authzMiddleware` with JWT fallback
4. Remove startup validation

**This is intentional** - Phase 3 is the final state.

### Success Criteria

✅ Backend has NO authorization logic  
✅ Gateway is the sole authorization authority  
✅ Backend requires gateway identity  
✅ Startup validation enforces gateway-only  
✅ JWT audit mode available  
✅ Unauthorized requests never reach backend  
✅ Logs show gateway as authority  

### Architecture

```
Gateway (Port 8081)
  ✅ Verifies JWT
  ✅ Enforces authorization policies
  ✅ Injects trusted identity headers
  ↓
Backend (Port 5001)
  ✅ Validates gateway secret
  ⚠️ Validates JWT (audit mode optional)
  ✅ Requires gateway identity
  ❌ NO authorization decisions
  ✅ Executes business logic only
```

**Backend is now a trusted execution service.**

## STEP 4 — Phase 2: Gateway-Driven Authorization

### Overview
Backend authorization decisions now use **gateway-provided identity** instead of JWT claims.

**IMPORTANT**: JWT validation remains enabled for defense in depth.

### Authorization Source Control

Environment variable controls authorization source:

```bash
AUTHZ_SOURCE=gateway  # Use gateway identity (default)
AUTHZ_SOURCE=jwt      # Use JWT claims (fallback)
```

### How It Works

#### Request Flow
1. Gateway verifies JWT and injects identity headers
2. Backend validates JWT (defense in depth)
3. Backend extracts gateway identity (Phase 1)
4. **NEW**: Backend selects authorization source based on `AUTHZ_SOURCE`
5. Authorization decisions use selected identity

#### Authorization Middleware

New middleware: `authz.middleware.js`

```javascript
if (AUTHZ_SOURCE === 'gateway' && req.gatewayIdentity) {
  req.authzIdentity = req.gatewayIdentity;  // Use gateway
} else {
  req.authzIdentity = req.user;             // Fallback to JWT
}
```

#### Controllers Use Unified Identity

All controllers now use `req.authzIdentity`:

```javascript
// Before (Phase 1)
const role = req.user.role;

// After (Phase 2)
const role = req.authzIdentity.role;  // Source depends on AUTHZ_SOURCE
```

### Security Guarantees

1. **JWT still validated** on every request
2. **Gateway secret validated** before trusting headers
3. **Automatic fallback** to JWT if gateway identity missing
4. **No request authorized** without valid identity

### Logging

Every authorized request logs:

```
AUTHZ source=gateway user=alice role=admin method=GET path=/orders
```

If fallback occurs:

```
AUTHZ_FALLBACK source=jwt reason=missing_gateway_identity path=/orders
```

### Configuration

**Default (Gateway-Driven):**
```bash
AUTHZ_SOURCE=gateway npm start
```

**Fallback to JWT:**
```bash
AUTHZ_SOURCE=jwt npm start
```

**No restart required** - just set env var before starting.

### What Changed

✅ Authorization source is configurable  
✅ Controllers use `req.authzIdentity` (unified)  
✅ Automatic fallback to JWT if gateway identity missing  
✅ Enhanced logging shows authorization source  

### What Did NOT Change

❌ JWT validation (still required)  
❌ Authorization rules (admin vs user logic identical)  
❌ Response behavior  
❌ HTTP status codes  
❌ Gateway behavior  

### Rollback

**Instant rollback** via environment variable:

```bash
# Switch back to JWT-based authorization
AUTHZ_SOURCE=jwt npm start
```

No code changes needed.

### Testing

**Test with Gateway Authorization:**
```bash
AUTHZ_SOURCE=gateway npm start
```

**Test with JWT Authorization:**
```bash
AUTHZ_SOURCE=jwt npm start
```

Behavior should be identical - only log messages differ.

## STEP 4 — Phase 1: Gateway Trust Headers (Observation Mode)

### Overview
The backend now receives **trusted identity headers** from the gateway for observation and validation purposes.

**IMPORTANT**: This is Phase 1 — **NO authorization behavior has changed**. The backend still validates JWTs and makes all authorization decisions based on JWT claims.

### What Changed

#### Gateway Changes
- Gateway now injects trusted identity headers when forwarding requests:
  - `X-User-Id` → from JWT `sub`
  - `X-Username` → from JWT `username`
  - `X-User-Role` → from JWT `role`
  - `X-Issuer` → from JWT `iss`
  - `X-Gateway-Secret` → shared secret for verification

#### Backend Changes
- New middleware: `gatewayTrust.middleware.js`
  - Validates `X-Gateway-Secret` header
  - Extracts gateway identity into `req.gatewayIdentity`
  - Does NOT enforce authorization
- Enhanced logging:
  - Logs both JWT identity and gateway identity
  - Detects and logs mismatches (if any)

### Dual Identity Logging

Every authenticated request now logs:
```
IDENTITY jwt={user=alice, role=admin}
IDENTITY gateway={user=alice, role=admin}
```

If identities mismatch:
```
IDENTITY_MISMATCH jwtRole=admin gatewayRole=user
```

### Security Guard

The backend validates the gateway using a shared secret:
- Secret: `gw-secret-2024-phase1-trust`
- Location: `src/config/gateway.secret.js`
- If secret is missing/invalid, gateway headers are ignored

### What Did NOT Change

- ❌ Authorization logic (still uses JWT)
- ❌ Response behavior
- ❌ HTTP status codes
- ❌ Endpoint access control

### Rollback

To disable Phase 1:
1. Remove `gatewayTrustMiddleware` from `app.js`
2. Revert logging changes in `app.js`

No other changes needed — fully reversible.

## JWT Details

- Secret: `dev-secret`
- Expiration: 1 hour
- Payload: `{ userId, username, role }`

## Architecture

```
routes → controllers → services → data
              ↓
         middleware (JWT validation)
```
