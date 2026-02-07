# Quick Reference Card

## 🚀 Start Backend
```bash
npm start
# Server runs on http://localhost:5001
```

## 🔑 Key Commands

### Regenerate RSA Keys
```bash
openssl genrsa -out src/keys/private.key 2048
openssl rsa -in src/keys/private.key -pubout -out src/keys/public.key
```

### Fetch JWKS
```bash
curl http://localhost:5001/.well-known/jwks.json
```

### Login (Get JWT)
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Access Protected Endpoint
```bash
TOKEN="<your-jwt-token>"
curl http://localhost:5001/users \
  -H "Authorization: Bearer $TOKEN"
```

### Decode JWT (Header + Payload)
```bash
TOKEN="<your-jwt-token>"
echo $TOKEN | cut -d'.' -f1 | base64 -d | jq '.'  # Header
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.'  # Payload
```

### Run Full Test
```bash
./test-jwks.sh
```

## 📍 Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/.well-known/jwks.json` | GET | ❌ No | Public keys (JWKS) |
| `/auth/login` | POST | ❌ No | Get JWT token |
| `/users` | GET | ✅ Yes | Protected resource |
| `/orders` | GET | ✅ Yes | Protected resource |

## 🔐 JWT Configuration

| Setting | Value |
|---------|-------|
| Algorithm | RS256 |
| Key ID | backend-key-1 |
| Issuer | http://localhost:5001 |
| Audience | api-gateway |
| Expiration | 1 hour |

## 📂 Key Files

| File | Purpose |
|------|---------|
| `src/keys/private.key` | Signs JWTs (keep secret!) |
| `src/keys/public.key` | Verifies JWTs (public) |
| `src/config/jwt.config.js` | JWT settings |
| `src/utils/jwk.util.js` | JWK conversion |
| `src/routes/jwks.routes.js` | JWKS endpoint |

## 🧪 Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| user | user123 | user |

## 🎯 For API Gateway

1. Configure gateway to fetch JWKS from:
   ```
   http://localhost:5001/.well-known/jwks.json
   ```

2. Validate JWT with:
   - Algorithm: RS256
   - Issuer: http://localhost:5001
   - Audience: api-gateway
   - Key ID: backend-key-1

3. Gateway can now verify tokens without backend communication!
