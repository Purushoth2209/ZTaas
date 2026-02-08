# STS Quick Reference

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/jwks.json` | GET | Get public keys (JWKS) |
| `/sts/token` | POST | Issue JWT token |
| `/sts/verify` | POST | Verify JWT token |

## Example Usage

### 1. Get JWKS
```bash
curl http://localhost:3000/.well-known/jwks.json
```

### 2. Issue Token
```bash
curl -X POST http://localhost:3000/sts/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "user123", "scope": "read"}'
```

### 3. Verify Token
```bash
curl -X POST http://localhost:3000/sts/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_JWT_TOKEN"}'
```

## JWT Claims

| Claim | Description | Example |
|-------|-------------|---------|
| `iss` | Issuer | `https://gateway.internal` |
| `sub` | Subject | `user123` |
| `aud` | Audience | `api-clients` |
| `kid` | Key ID | `gateway-key-1703123456789` |
| `exp` | Expiration | Unix timestamp |
| `iat` | Issued At | Unix timestamp |

## Key Management

```javascript
import { keyManager } from './utils/keyManager.js';

// Get current key
const currentKey = keyManager.getCurrentKey();

// Rotate key
const newKey = keyManager.rotateKey();

// Get JWKS
const jwks = keyManager.getJWKS();
```