# Telemetry & Behavior Collection Module

## Overview
The Telemetry module collects behavioral metadata from every request passing through the Zero Trust API Gateway for trust evaluation and behavioral analysis.

## Architecture

### Components

1. **telemetry.service.js** - Core telemetry collection and storage
2. **telemetry.middleware.js** - Request/response data capture
3. **telemetry.controller.js** - Admin endpoints for telemetry access
4. **admin.telemetry.routes.js** - Routes for telemetry API

## Middleware Pipeline

```
Request Flow:
  ↓
identityMiddleware (JWT validation)
  ↓
telemetryMiddleware (collect metadata)
  ↓
authorizationMiddleware (policy enforcement)
  ↓
jwtTranslationMiddleware (token translation)
  ↓
handleProxyRequest (proxy to backend)
```

## Telemetry Record Structure

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "alice",
  "role": "admin",
  "ipAddress": "::1",
  "xForwardedFor": null,
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/orders",
  "method": "GET",
  "timestamp": 1710000000000,
  "authorizationResult": "allowed",
  "responseStatus": 200
}
```

## API Endpoints

### Get All Telemetry
```bash
GET /admin/telemetry
```

Response:
```json
{
  "count": 150,
  "records": [...]
}
```

### Get User-Specific Telemetry
```bash
GET /admin/telemetry/user/:userId
```

Example:
```bash
curl http://localhost:4000/admin/telemetry/user/alice
```

Response:
```json
{
  "userId": "alice",
  "count": 25,
  "records": [...]
}
```

## Features

### Automatic Collection
- Captures metadata from every request automatically
- Non-blocking operation (uses res.on('finish'))
- Lightweight in-memory storage

### Memory Management
- Automatically limits storage to 10,000 most recent records
- Prevents memory overflow in long-running processes

### Metadata Captured

**Identity:**
- userId (from JWT)
- role (from JWT)

**Network:**
- ipAddress
- xForwardedFor header

**Device:**
- userAgent

**Request:**
- endpoint (originalUrl)
- httpMethod

**Behavioral:**
- timestamp
- requestId (UUID)

**Security:**
- responseStatus
- authorizationResult (allowed/denied)

## Console Logging

Every request logs telemetry:
```
[Telemetry] User alice accessed GET /orders status=200
[Telemetry] User bob accessed POST /users status=403
[Telemetry] User anonymous accessed GET /hello status=200
```

## Usage Examples

### Test Telemetry Collection

1. Make some requests:
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .token)

# Make requests through gateway
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/orders
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/users
```

2. View telemetry:
```bash
# All telemetry
curl http://localhost:4000/admin/telemetry | jq

# User-specific
curl http://localhost:4000/admin/telemetry/user/alice | jq
```

## Future Enhancements

This module is Phase 1 of the Trust Evaluation Layer. Future phases will add:

- Behavioral analysis (anomaly detection)
- Risk scoring based on patterns
- Persistent storage (database)
- Real-time alerting
- Trust score calculation
- Adaptive policy enforcement

## Implementation Notes

- Telemetry collection is synchronous but lightweight
- Storage happens after response is sent (non-blocking)
- No external dependencies required
- Uses Node.js crypto.randomUUID() for request IDs
- Compatible with existing middleware pipeline
