# Gateway Security Token Service (STS) Implementation

## Overview
The gateway now functions as a Security Token Service (STS) that can generate, sign, and verify JWT tokens using asymmetric cryptography.

## Architecture

### Key Components

1. **KeyManager** (`src/utils/keyManager.js`)
   - Generates RSA key pairs (2048-bit)
   - Manages multiple keys with stable `kid` values
   - Supports key rotation
   - Stores keys securely in the filesystem

2. **JWTService** (`src/services/jwt.service.js`)
   - Signs JWTs using RSA private keys
   - Verifies JWTs using RSA public keys
   - Manages JWKS generation

3. **STS Controller** (`src/controllers/sts.controller.js`)
   - Issues tokens via `/sts/token`
   - Verifies tokens via `/sts/verify`

4. **JWKS Endpoint** (`/.well-known/jwks.json`)
   - Exposes public keys in JWKS format
   - Supports multiple keys for rotation

## Key Management

### Key Generation
```javascript
// Keys are generated automatically on first use
const keyEntry = {
  kid: "gateway-key-1703123456789",
  algorithm: "RS256",
  use: "sig",
  createdAt: "2023-12-20T10:30:56.789Z",
  privateKeyPath: "/path/to/gateway-key-1703123456789.private.pem",
  publicKeyPath: "/path/to/gateway-key-1703123456789.public.pem",
  active: true
}
```

### Key Storage
- Private keys: `src/keys/{kid}.private.pem`
- Public keys: `src/keys/{kid}.public.pem`
- Key registry: `src/keys/keys.json`

### Key Rotation
```javascript
import { keyManager } from './utils/keyManager.js';

// Rotate to a new key
const newKey = keyManager.rotateKey();
```

## JWT Token Format

### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "gateway-key-1703123456789"
}
```

### Payload
```json
{
  "sub": "user123",
  "aud": "api-clients",
  "iss": "https://gateway.internal",
  "iat": 1703123456,
  "exp": 1703127056,
  "scope": "read write"
}
```

## API Endpoints

### Issue Token
```bash
POST /sts/token
Content-Type: application/json

{
  "sub": "user123",
  "aud": "api-clients",
  "scope": "read write"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdhdGV3YXkta2V5LTE3MDMxMjM0NTY3ODkifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Verify Token
```bash
POST /sts/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdhdGV3YXkta2V5LTE3MDMxMjM0NTY3ODkifQ..."
}
```

### JWKS Endpoint
```bash
GET /.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "gateway-key-1703123456789",
      "n": "71jPF5rQlYiBP06DzdmS7z_EB9zZAPW0hjRzUo3NZwEWv6bNsdhyF2iyCgF97LZvHMDr4da7ymgHZ-hZxrL71Iv2n5mInHN9yYZ8Ga15RhVDvbLuBVIGROSOKyphQIT6N7-ET2qChHTyuQSo7mkVZF03UwG0hH04TME7KZjQEpIsN10jQpvl8pBt1ctLJ_TVAoVM6TkQZQGvUW5NTJPb-cg6mBhk8ZUaFHc85f4pQ3ClQCTPUXNgUKkvykHPCv5ZwK_9NB8vONE4zVZNF_VqOQrfcdtxgRLXVjdW4tnXwBBI_qAIXH32yXBta2jsT-npMqaAu9U3SMtLaB8l4J6qOw",
      "e": "AQAB"
    }
  ]
}
```

## Security Best Practices

### Key Security
- Private keys are stored in PEM format with restricted file permissions
- Keys are generated with 2048-bit RSA for strong security
- Key rotation is supported to limit key exposure time

### JWT Security
- Uses RS256 algorithm (RSA with SHA-256)
- Includes stable `kid` for key identification
- Proper issuer (`https://gateway.internal`) validation
- Configurable token expiration

### Operational Security
- Keys are stored outside the application code
- Multiple keys supported for zero-downtime rotation
- JWKS endpoint exposes only public keys
- Private keys never leave the gateway

## Testing

Run the test script:
```bash
./test-sts.sh
```

This will:
1. Fetch the JWKS
2. Issue a JWT token
3. Verify the token
4. Decode and display the JWT structure

## Configuration

Key settings in `src/config/sts.config.js`:
- `issuer`: JWT issuer claim
- `defaultExpiresIn`: Default token lifetime
- `keyRotationInterval`: How often to rotate keys
- `maxKeys`: Maximum number of keys to maintain