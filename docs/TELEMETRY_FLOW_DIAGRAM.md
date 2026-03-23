# Telemetry Collection Flow Diagram

## Complete Request Flow with Telemetry

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                          │
│                    GET /orders + JWT Token                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IDENTITY MIDDLEWARE                          │
│  • Validates JWT token                                          │
│  • Sets req.identity = { username, role, ... }                  │
│  • Continues if valid or enforcement=monitor                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TELEMETRY MIDDLEWARE                          │
│                                                                 │
│  1. collectRequestTelemetry(req)                                │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ Extract metadata:                                   │    │
│     │  • userId from req.identity                         │    │
│     │  • role from req.identity                           │    │
│     │  • ipAddress from req.ip                            │    │
│     │  • userAgent from headers                           │    │
│     │  • endpoint from req.originalUrl                    │    │
│     │  • method from req.method                           │    │
│     │  • timestamp = Date.now()                           │    │
│     │  • requestId = randomUUID()                         │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. Attach res.on('finish') listener                            │
│     (will fire after response is sent)                          │
│                                                                 │
│  3. next() - Continue to next middleware                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AUTHORIZATION MIDDLEWARE                        │
│  • Checks policy for endpoint                                   │
│  • Verifies role has permission                                 │
│  • Returns 403 if denied (enforcement=enforce)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                JWT TRANSLATION MIDDLEWARE                       │
│  • Translates external JWT to internal JWT                      │
│  • Adds gateway signature                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROXY TO BACKEND                             │
│  • Forwards request to backend service                          │
│  • Receives response                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE TO CLIENT                           │
│                    Status: 200 OK                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              res.on('finish') EVENT FIRES                       │
│                                                                 │
│  1. Update telemetry record:                                    │
│     • responseStatus = res.statusCode                           │
│     • authorizationResult = (403 ? 'denied' : 'allowed')        │
│                                                                 │
│  2. storeTelemetry(record)                                      │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ • Push to telemetryStore array                      │    │
│     │ • Call limitTelemetryStore()                        │    │
│     │   - Keep only last 10,000 records                   │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. Console log:                                                │
│     "[Telemetry] User alice accessed GET /orders status=200"    │
└─────────────────────────────────────────────────────────────────┘
```

## Telemetry Storage Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    IN-MEMORY TELEMETRY STORE                    │
│                                                                 │
│  telemetryStore = [                                             │
│    {                                                            │
│      requestId: "uuid-1",                                       │
│      userId: "alice",                                           │
│      role: "admin",                                             │
│      ipAddress: "::1",                                          │
│      xForwardedFor: null,                                       │
│      userAgent: "Mozilla/5.0...",                               │
│      endpoint: "/orders",                                       │
│      method: "GET",                                             │
│      timestamp: 1710000000000,                                  │
│      authorizationResult: "allowed",                            │
│      responseStatus: 200                                        │
│    },                                                           │
│    { ... },  // More records                                    │
│    { ... }   // Up to 10,000 records                            │
│  ]                                                              │
│                                                                 │
│  Automatic pruning when > 10,000 records                        │
└─────────────────────────────────────────────────────────────────┘
```

## Admin API Access Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN: GET /admin/telemetry                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TELEMETRY CONTROLLER                          │
│                                                                 │
│  getTelemetry(req, res)                                         │
│    ↓                                                            │
│  getAllTelemetry()                                              │
│    ↓                                                            │
│  Return: { count: 150, records: [...] }                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              ADMIN: GET /admin/telemetry/user/alice             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TELEMETRY CONTROLLER                          │
│                                                                 │
│  getUserTelemetryData(req, res)                                 │
│    ↓                                                            │
│  getUserTelemetry("alice")                                      │
│    ↓                                                            │
│  Filter: records.filter(r => r.userId === "alice")              │
│    ↓                                                            │
│  Return: { userId: "alice", count: 25, records: [...] }         │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Timeline

```
Time    Event                           Data State
────────────────────────────────────────────────────────────────────
T0      Request arrives                 req = { method, url, headers }
        
T1      Identity middleware             req.identity = { username, role }
        
T2      Telemetry middleware            telemetryRecord = {
        (collect)                         requestId, userId, role,
                                          ipAddress, userAgent,
                                          endpoint, method, timestamp,
                                          authorizationResult: null,
                                          responseStatus: null
                                        }
        
T3      Authorization middleware        (may set res.statusCode = 403)
        
T4      JWT translation                 (adds internal JWT)
        
T5      Proxy to backend                (forwards request)
        
T6      Backend responds                (returns data)
        
T7      Response sent to client         res.statusCode = 200
        
T8      res.on('finish') fires          telemetryRecord.responseStatus = 200
                                        telemetryRecord.authorizationResult = "allowed"
                                        
T9      Store telemetry                 telemetryStore.push(telemetryRecord)
                                        limitTelemetryStore()
                                        
T10     Console log                     "[Telemetry] User alice accessed..."
```

## Memory Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEMETRY STORE LIFECYCLE                    │
│                                                                 │
│  Initial State:                                                 │
│    telemetryStore = []                                          │
│                                                                 │
│  After 100 requests:                                            │
│    telemetryStore.length = 100                                  │
│                                                                 │
│  After 10,000 requests:                                         │
│    telemetryStore.length = 10,000                               │
│                                                                 │
│  After 10,001 requests:                                         │
│    limitTelemetryStore() called                                 │
│    ↓                                                            │
│    if (length > 10,000) {                                       │
│      telemetryStore.splice(0, length - 10,000)                  │
│    }                                                            │
│    ↓                                                            │
│    telemetryStore.length = 10,000 (oldest record removed)       │
│                                                                 │
│  Continuous operation:                                          │
│    Always maintains last 10,000 records                         │
│    FIFO (First In, First Out) removal                           │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                         FILE STRUCTURE                          │
│                                                                 │
│  gateway/src/                                                   │
│    │                                                            │
│    ├── services/                                                │
│    │   └── telemetry.service.js ◄─── Core logic                │
│    │                                                            │
│    ├── middleware/                                              │
│    │   └── telemetry.middleware.js ◄─── Request capture        │
│    │                                                            │
│    ├── controllers/                                             │
│    │   └── telemetry.controller.js ◄─── Admin API              │
│    │                                                            │
│    └── routes/                                                  │
│        ├── proxy.routes.js ◄─── Middleware integration          │
│        └── admin.routes.js ◄─── Admin routes                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
