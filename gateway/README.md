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
