# Telemetry Module - Quick Reference

## Files Created

```
gateway/src/
├── services/
│   └── telemetry.service.js          # Core telemetry logic
├── middleware/
│   └── telemetry.middleware.js       # Request/response capture
├── controllers/
│   └── telemetry.controller.js       # Admin API handlers
└── routes/
    └── admin.telemetry.routes.js     # Telemetry endpoints
```

## Modified Files

```
gateway/src/routes/
├── proxy.routes.js                    # Added telemetry middleware
└── admin.routes.js                    # Added telemetry routes
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/telemetry` | Get all telemetry records |
| GET | `/admin/telemetry/user/:userId` | Get user-specific telemetry |

## Telemetry Record Fields

```javascript
{
  requestId: "uuid",              // Unique request identifier
  userId: "alice",                // From JWT (null if anonymous)
  role: "admin",                  // From JWT (null if anonymous)
  ipAddress: "::1",               // Client IP
  xForwardedFor: null,            // Proxy header
  userAgent: "Mozilla/5.0...",    // Browser/client info
  endpoint: "/orders",            // Request path
  method: "GET",                  // HTTP method
  timestamp: 1710000000000,       // Unix timestamp (ms)
  authorizationResult: "allowed", // "allowed" or "denied"
  responseStatus: 200             // HTTP status code
}
```

## Service Functions

```javascript
// Collect telemetry from request
collectRequestTelemetry(req)

// Store telemetry record
storeTelemetry(record)

// Get user's telemetry
getUserTelemetry(userId)

// Get all telemetry
getAllTelemetry()

// Limit store to 10,000 records
limitTelemetryStore()
```

## Middleware Pipeline Order

```javascript
router.all('*', 
  identityMiddleware,      // 1. Validate JWT
  telemetryMiddleware,     // 2. Collect telemetry
  authorizationMiddleware, // 3. Check permissions
  jwtTranslationMiddleware,// 4. Translate token
  handleProxyRequest       // 5. Proxy to backend
);
```

## Testing

```bash
# Run test script
./test-telemetry.sh

# Manual testing
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .token)

# 2. Make requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/orders

# 3. View telemetry
curl http://localhost:4000/admin/telemetry | jq
curl http://localhost:4000/admin/telemetry/user/alice | jq
```

## Console Output

```
[Telemetry] User alice accessed GET /orders status=200
[Telemetry] User bob accessed POST /users status=403
[Telemetry] User anonymous accessed GET /hello status=200
```

## Key Features

✓ Non-blocking collection (uses res.on('finish'))
✓ Automatic memory management (10,000 record limit)
✓ Captures both authenticated and anonymous requests
✓ Records authorization decisions
✓ Lightweight in-memory storage
✓ UUID-based request tracking

## Next Steps (Future Phases)

- Behavioral analysis engine
- Anomaly detection
- Risk scoring
- Persistent storage (database)
- Real-time alerting
- Trust score calculation
