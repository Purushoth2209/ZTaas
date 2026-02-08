# ZTaaS Gateway - Reverse Proxy Foundation

Enterprise-grade API gateway implementing a clean reverse proxy with runtime configuration support.

## Architecture

Clean layered architecture:
- **Routes**: HTTP endpoint definitions
- **Controllers**: Request orchestration
- **Services**: Business logic
- **Proxy**: External HTTP calls
- **Utils**: Logging and timing
- **Config**: Runtime configuration store

## Installation

```bash
cd gateway
npm install
```

## Run

**Production mode:**
```bash
npm start
```

**Development mode (auto-reload on file changes):**
```bash
npm run dev
```

Gateway starts on port **8081** and forwards requests to **http://localhost:5001** by default.

## Test

### Basic Proxy Test

```bash
curl http://localhost:8081/hello
```

### Runtime Configuration

Update backend target at runtime:

```bash
curl -X POST http://localhost:8081/admin/config/backend \
  -H "Content-Type: application/json" \
  -d '{"backendUrl": "http://localhost:5001"}'
```

Response:
```json
{
  "success": true,
  "backendUrl": "http://localhost:5001"
}
```

## Features

- ✅ Reverse proxy for all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Forwards method, path, query params, headers, and body
- ✅ Request logging with timing
- ✅ Runtime backend configuration via admin API
- ✅ Clean separation of admin and proxy routes
- ✅ In-memory configuration (no database)
- ✅ JWT verification with JWKS support (RS256)
- ✅ Identity extraction and logging
- ✅ Runtime JWT trust configuration
- ✅ Authentication enforcement mode
- ✅ **STEP 4 — Phase 1: Gateway Trust Headers**

## STEP 4 — Phase 1: Gateway Trust Headers

### Overview
The gateway now injects **trusted identity headers** when forwarding requests to the backend.

### Injected Headers

When a valid JWT is verified, the gateway adds:
- `X-User-Id` → from JWT `sub` claim
- `X-Username` → from JWT `username` claim
- `X-User-Role` → from JWT `role` claim
- `X-Issuer` → from JWT `iss` claim
- `X-Gateway-Secret` → shared secret for backend verification

### Security Measures

1. **Client header stripping**: Any client-provided `X-User-*`, `X-Issuer`, or `X-Gateway-Secret` headers are removed before forwarding
2. **JWT verification required**: Headers are only injected if JWT verification succeeds
3. **Shared secret**: Backend validates `X-Gateway-Secret` before trusting identity headers

### Configuration

- Gateway secret: `gw-secret-2024-phase1-trust`
- Location: `src/config/gateway.secret.js`
- Must match backend secret

### Important Notes

- This is Phase 1 — **observation only**
- Gateway authorization behavior unchanged
- Backend still validates JWTs independently
- No trust decisions made yet

## Configuration

Default backend: `http://localhost:5001`

Configuration is stored in-memory and resets on restart.

## Logs

Each request logs:
- HTTP method
- Request path
- Response status code
- Processing time (ms)

Example:
```
[2024-01-15T10:30:45.123Z] GET /hello - 200 - 45ms
```

## Extension Points

Architecture designed for future additions:
- Identity parsing layer
- Policy enforcement service
- ML integration service
- Persistent configuration store

## Authentication Enforcement

The gateway supports two enforcement modes for JWT authentication:

### Enforcement Modes

**observe** (default):
- Missing JWT → log and forward to backend
- Invalid JWT → log and forward to backend
- Valid JWT → extract identity and forward

**enforce**:
- Missing JWT → block with 401 Unauthorized
- Invalid JWT → block with 401 Unauthorized
- Valid JWT → extract identity and forward

### Admin API - Enforcement Configuration

**Get current enforcement mode:**
```bash
curl http://localhost:8081/admin/config/enforcement
```

Response:
```json
{
  "enforcementMode": "observe"
}
```

**Set enforcement mode:**
```bash
curl -X POST http://localhost:8081/admin/config/enforcement \
  -H "Content-Type: application/json" \
  -d '{"enforcementMode": "enforce"}'
```

Response:
```json
{
  "message": "Enforcement mode updated",
  "enforcementMode": "enforce"
}
```

**Switch back to observe mode:**
```bash
curl -X POST http://localhost:8081/admin/config/enforcement \
  -H "Content-Type: application/json" \
  -d '{"enforcementMode": "observe"}'
```

### Behavior

- Mode changes take effect immediately (no restart required)
- In enforce mode, blocked requests return HTTP 401 with:
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid JWT"
  }
  ```
- Blocked requests are logged with reason:
  - `BLOCKED reason=missing_jwt method=GET path=/orders`
  - `BLOCKED reason=invalid_jwt method=POST path=/users`

### Important Notes

- Enforcement mode only validates authentication (JWT presence and validity)
- No role-based authorization is performed at the gateway level
- Backend services continue to validate JWTs and enforce authorization
- This is a defense-in-depth approach, not a replacement for backend security

## Authorization Enforcement (STEP 2)

The gateway now enforces role-based authorization for specific endpoints.

### Authorization Rules

Hardcoded rules enforced by the gateway:

**`/orders`**
- `GET` → allowed roles: `admin`, `user`
- `POST` → allowed roles: `admin` only

**`/users`**
- `GET` → allowed roles: `admin` only

**All other paths**
- Allowed by default (no authorization check)

### Enforcement Behavior

Authorization is enforced based on the `enforcementMode`:

**observe mode**:
- Authorization failures are logged but requests are forwarded to backend
- Log format: `BLOCKED reason=forbidden role=user method=POST path=/orders`

**enforce mode**:
- Authorization failures return HTTP 403 Forbidden
- Response body:
  ```json
  {
    "error": "Forbidden",
    "message": "Access denied for this role"
  }
  ```

### Middleware Order

Request processing flow:
1. Identity middleware (JWT verification)
2. Authorization middleware (role-based access control)
3. Proxy to backend

### Important Notes

- Authorization only applies when JWT is present and valid
- Backend authorization remains unchanged (double enforcement)
- Rules are hardcoded in `authorization.middleware.js`
- No configuration UI or database required

## Authorization Policies (STEP 3)

The gateway now supports runtime-configurable authorization policies via admin APIs.

### Policy Model

Policies are defined as JSON data:

```json
{
  "policies": [
    {
      "id": "orders-get",
      "path": "/orders",
      "methods": ["GET"],
      "roles": ["admin", "user"]
    },
    {
      "id": "orders-post",
      "path": "/orders",
      "methods": ["POST"],
      "roles": ["admin"]
    },
    {
      "id": "users-get",
      "path": "/users",
      "methods": ["GET"],
      "roles": ["admin"]
    }
  ]
}
```

### Policy Evaluation Rules

- Path matching is exact (no regex)
- Method matching is explicit
- If no policy matches → allow by default
- If policy matches but role not allowed → deny (403)

### Admin API - Policy Management

**Get all policies:**
```bash
curl http://localhost:8081/admin/policies
```

Response:
```json
{
  "policies": [
    {
      "id": "orders-get",
      "path": "/orders",
      "methods": ["GET"],
      "roles": ["admin", "user"]
    }
  ]
}
```

**Set policies (replaces all existing):**
```bash
curl -X POST http://localhost:8081/admin/policies \
  -H "Content-Type: application/json" \
  -d '{
    "policies": [
      {
        "id": "orders-get",
        "path": "/orders",
        "methods": ["GET"],
        "roles": ["admin", "user"]
      },
      {
        "id": "orders-post",
        "path": "/orders",
        "methods": ["POST"],
        "roles": ["admin"]
      },
      {
        "id": "users-get",
        "path": "/users",
        "methods": ["GET"],
        "roles": ["admin"]
      }
    ]
  }'
```

Response:
```json
{
  "message": "Policies updated",
  "count": 3
}
```

**Clear all policies:**
```bash
curl -X DELETE http://localhost:8081/admin/policies
```

Response:
```json
{
  "message": "All policies cleared"
}
```

### Authorization Logging

Every authorization decision is logged:

```
AUTHZ decision=allow policy=orders-get role=admin method=GET path=/orders
AUTHZ decision=deny policy=orders-post role=user method=POST path=/orders
AUTHZ decision=allow policy=none role=user method=GET path=/products
```

Log format:
- `decision`: allow | deny
- `policy`: policy ID or "none" if no match
- `role`: user role or "none"
- `method`: HTTP method
- `path`: request path

### Enforcement Behavior

**observe mode**:
- Authorization failures are logged but requests forwarded to backend

**enforce mode**:
- Authorization failures return HTTP 403 Forbidden
- Response body:
  ```json
  {
    "error": "Forbidden",
    "message": "Access denied for this role"
  }
  ```

### Important Notes

- Policies are stored in-memory (reset on restart)
- Changes take effect immediately (no restart required)
- No authentication required for admin APIs (for now)
- Backend authorization remains unchanged (double enforcement)
