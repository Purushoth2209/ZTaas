# RS256 JWT with JWKS Setup

## Overview
The backend service now issues JWTs signed with RS256 (RSA asymmetric keys) and exposes a JWKS endpoint for public key distribution.

## Changes Made

### 1. Key Generation
RSA key pair (2048-bit) generated and stored in:
- `src/keys/private.key` - Used to sign JWTs
- `src/keys/public.key` - Exposed via JWKS endpoint

### 2. New Files Created
- `src/config/jwt.config.js` - Centralized JWT configuration
- `src/utils/jwk.util.js` - Converts public key to JWK format
- `src/routes/jwks.routes.js` - JWKS endpoint route

### 3. Modified Files
- `src/services/auth.service.js` - Updated to sign/verify with RS256
- `src/app.js` - Registered JWKS route

## JWT Token Structure

Tokens now include:
- `sub` - User ID (subject)
- `username` - Username
- `role` - User role
- `iss` - Issuer: "http://localhost:5001"
- `aud` - Audience: "api-gateway"
- `exp` - Expiration (1 hour)
- `iat` - Issued at timestamp

Header includes:
- `alg`: "RS256"
- `kid`: "backend-key-1"

## Setup Instructions

### If Keys Don't Exist (Regenerate)
```bash
# Generate private key
openssl genrsa -out src/keys/private.key 2048

# Extract public key
openssl rsa -in src/keys/private.key -pubout -out src/keys/public.key
```

### Start the Backend
```bash
npm start
# or for development with auto-reload
npm run dev
```

Server runs on: http://localhost:5001

## Testing

### 1. Login and Get JWT
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJhY2tlbmQta2V5LTEifQ..."
}
```

### 2. Fetch JWKS
```bash
curl http://localhost:5001/.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "backend-key-1",
      "n": "xGOr...",
      "e": "AQAB"
    }
  ]
}
```

### 3. Use JWT with Protected Endpoint
```bash
# Save token from login
TOKEN="<your-access-token>"

# Access protected endpoint
curl http://localhost:5001/users \
  -H "Authorization: Bearer $TOKEN"
```

## JWKS Endpoint Details

**URL**: `GET /.well-known/jwks.json`

**Public Access**: No authentication required

**Response Format**: Standard JWKS (RFC 7517)

**Fields**:
- `kty` - Key type (RSA)
- `use` - Public key use (sig = signature)
- `alg` - Algorithm (RS256)
- `kid` - Key ID (backend-key-1)
- `n` - RSA modulus (base64url encoded)
- `e` - RSA exponent (typically AQAB)

## API Gateway Integration

Your API gateway can now:
1. Fetch public keys from `http://localhost:5001/.well-known/jwks.json`
2. Verify JWT signatures using the public key
3. Trust tokens issued by this backend without sharing secrets

## Security Notes

- Private key must be kept secure and never exposed
- JWKS endpoint is public (by design)
- Keys are static for development (no rotation yet)
- In production, use proper key management (AWS KMS, HashiCorp Vault, etc.)

## Existing Functionality Preserved

- `/auth/login` - Issues JWTs (now RS256)
- `/users` - Protected endpoint (still works)
- `/orders` - Protected endpoint (still works)
- JWT middleware - Still validates tokens (now with public key)

No breaking changes to existing API contracts.
