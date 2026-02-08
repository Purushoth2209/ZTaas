# JWT Translation Pseudocode

## High-Level Algorithm

```
FUNCTION handleRequest(clientRequest):
    // Step 1: Verify client JWT
    clientJWT = extractJWT(clientRequest.headers.authorization)
    identity = verifyAndExtractIdentity(clientJWT)
    
    // Step 2: Authorize request
    policy = findMatchingPolicy(clientRequest.method, clientRequest.path)
    IF NOT authorized(identity, policy):
        RETURN 403 Forbidden
    
    // Step 3: JWT Translation (NEW)
    internalJWT = mintInternalJWT(identity, policy)
    clientRequest.headers.authorization = "Bearer " + internalJWT
    
    // Step 4: Forward to backend
    response = forwardToBackend(clientRequest)
    RETURN response
```

## Detailed JWT Translation Logic

```javascript
FUNCTION mintInternalJWT(identity, policy):
    // Build internal payload
    payload = {
        sub: identity.username,           // User identity
        aud: "backend-service",           // Target service
        ten: identity.tenant || "default", // Tenant
        role: identity.role,              // User role
        decision_id: policy?.id || "no-policy",
        policy_version: policy?.version || "none"
    }
    
    // Sign with gateway's private key
    options = {
        algorithm: "RS256",
        issuer: "https://gateway.internal",
        expiresIn: "60s",                 // Short-lived
        keyid: getCurrentKeyId()
    }
    
    privateKey = getGatewayPrivateKey()
    internalJWT = sign(payload, privateKey, options)
    
    RETURN internalJWT
```

## Complete Middleware Implementation

```javascript
// 1. Identity Middleware
FUNCTION identityMiddleware(req, res, next):
    IF isPublicPath(req.path):
        RETURN next()
    
    clientJWT = extractBearerToken(req.headers.authorization)
    IF NOT clientJWT:
        IF enforcementMode == "enforce":
            RETURN 401 Unauthorized
        RETURN next()
    
    TRY:
        identity = verifyJWT(clientJWT)  // Verify client JWT
        req.identity = identity
        LOG("JWT verified: user=" + identity.username)
    CATCH error:
        IF enforcementMode == "enforce":
            RETURN 401 Unauthorized
    
    next()

// 2. Authorization Middleware
FUNCTION authorizationMiddleware(req, res, next):
    policy = findMatchingPolicy(req.method, req.path)
    
    IF NOT policy:
        LOG("No policy, allowing")
        RETURN next()
    
    allowed = req.identity?.role IN policy.roles
    
    IF NOT allowed AND enforcementMode == "enforce":
        RETURN 403 Forbidden
    
    next()

// 3. JWT Translation Middleware (NEW)
FUNCTION jwtTranslationMiddleware(req, res, next):
    IF NOT req.identity:
        RETURN next()  // Skip if no identity
    
    policy = findMatchingPolicy(req.method, req.path)
    
    // Mint internal JWT
    internalPayload = {
        sub: req.identity.username,
        aud: "backend-service",
        ten: req.identity.tenant || "default",
        role: req.identity.role,
        decision_id: policy?.id || "no-policy",
        policy_version: policy?.version || "none"
    }
    
    internalJWT = signToken(internalPayload, {
        expiresIn: "60s"
    })
    
    // REPLACE Authorization header (drops client JWT)
    req.headers.authorization = "Bearer " + internalJWT
    
    LOG("JWT_TRANSLATION sub=" + internalPayload.sub + 
        " ten=" + internalPayload.ten + " ttl=60s")
    
    next()

// 4. Proxy Handler
FUNCTION handleProxyRequest(req, res):
    // Authorization header now contains internal JWT
    response = forwardToBackend(
        url: backendUrl + req.path,
        method: req.method,
        headers: req.headers,  // Contains internal JWT
        body: req.body
    )
    
    RETURN response
```

## Token Signing Implementation

```javascript
FUNCTION signToken(payload, options):
    currentKey = keyManager.getCurrentKey()
    privateKey = keyManager.getPrivateKey(currentKey.kid)
    
    defaultOptions = {
        algorithm: "RS256",
        issuer: "https://gateway.internal",
        expiresIn: "1h",
        keyid: currentKey.kid
    }
    
    finalOptions = merge(defaultOptions, options)
    
    token = jwt.sign(payload, privateKey, finalOptions)
    
    RETURN token
```

## Backend Verification (Reference)

```javascript
// Backend only needs to verify standard claims
FUNCTION verifyInternalJWT(token):
    jwks = fetchJWKS("http://gateway:3000/gateway/.well-known/jwks.json")
    
    decoded = jwt.decode(token, { complete: true })
    publicKey = jwks.getKey(decoded.header.kid)
    
    verified = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        issuer: "https://gateway.internal",
        audience: "backend-service"
    })
    
    // Custom claims available but not enforced
    // verified.ten, verified.role, verified.decision_id
    
    RETURN verified
```

## Security Considerations

```javascript
// Anti-Replay Protection
FUNCTION preventReplay():
    // 1. Short TTL
    expiresIn = "60s"  // Minimal window
    
    // 2. Fresh minting
    // Never cache or reuse tokens
    
    // 3. Optional: Add unique identifier
    payload.jti = generateUUID()  // JWT ID for tracking
    
    // 4. Optional: Add timestamp
    payload.iat = currentTimestamp()  // Issued at

// Token Leakage Prevention
FUNCTION preventLeakage():
    // 1. Never log full tokens
    LOG("Token: [REDACTED]")
    
    // 2. Drop client JWT immediately
    DELETE req.originalJWT
    
    // 3. Use HTTPS only
    REQUIRE secure connection
    
    // 4. Validate audience
    REQUIRE aud == "backend-service"
```

## Configuration

```javascript
// Adjustable parameters
CONFIG = {
    internalJWT: {
        ttl: "60s",              // 30s, 60s, or 120s
        issuer: "https://gateway.internal",
        audience: "backend-service",
        algorithm: "RS256"
    },
    
    security: {
        includeJTI: false,       // Add unique ID
        includeNonce: false,     // Add nonce
        maxClockSkew: 5          // seconds
    }
}
```