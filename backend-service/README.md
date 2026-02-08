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
