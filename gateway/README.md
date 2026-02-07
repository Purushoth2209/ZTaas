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
