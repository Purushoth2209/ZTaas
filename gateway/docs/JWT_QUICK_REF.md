# JWT Verification Quick Reference

## Start Services

```bash
# Terminal 1: Backend (Port 5001)
cd backend-service && npm start

# Terminal 2: Gateway (Port 8081)
cd gateway && npm start
```

## Get JWT Token

```bash
TOKEN=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.accessToken')
```

## Test Gateway with JWT

```bash
# With JWT (identity logged)
curl http://localhost:8081/users -H "Authorization: Bearer $TOKEN"

# Without JWT (anonymous logged)
curl http://localhost:8081/users
```

## Admin APIs

```bash
# Get JWT config
curl http://localhost:8081/admin/config/jwt

# Update JWT config
curl -X POST http://localhost:8081/admin/config/jwt \
  -H "Content-Type: application/json" \
  -d '{
    "issuer": "http://localhost:5001",
    "jwksUri": "http://localhost:5001/.well-known/jwks.json",
    "audience": "api-gateway",
    "algorithms": ["RS256"]
  }'
```

## Run Full Test

```bash
./test-jwt-verification.sh
```

## Expected Log Output

### With Valid JWT
```
method=GET path=/users user=admin role=admin issuer=http://localhost:5001 status=200 latency=16ms
```

### Without JWT
```
method=GET path=/users anonymous status=200 latency=12ms
```

## Key Points

- ✅ Gateway NEVER blocks requests
- ✅ JWT verification is read-only (observability)
- ✅ Backend still validates JWTs
- ✅ Configuration updates take effect immediately
- ✅ JWKS keys are cached (10 min)

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/config/jwt` | GET | Get JWT config |
| `/admin/config/jwt` | POST | Update JWT config |
| `/*` | ALL | Proxy with JWT verification |

## Configuration Fields

| Field | Default | Description |
|-------|---------|-------------|
| `issuer` | `http://localhost:5001` | JWT issuer to trust |
| `jwksUri` | `http://localhost:5001/.well-known/jwks.json` | JWKS endpoint |
| `audience` | `api-gateway` | Expected audience claim |
| `algorithms` | `["RS256"]` | Allowed signing algorithms |
