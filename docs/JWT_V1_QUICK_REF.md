# INTERNAL JWT v1 Contract - Quick Reference

## Version: 1.0.0 | Status: FROZEN

---

## JWT Structure

```json
{
  "iss": "https://gateway.internal",  // Gateway issuer
  "aud": "backend-service",            // Target service
  "sub": "alice",                      // User/subject
  "ten": "default",                    // Tenant ID
  "iat": 1770545119,                   // Issued at
  "exp": 1770545179,                   // Expires (60s)
  "ctx": {                             // Authorization context
    "schema_ver": "1.0.0",
    "decision_id": "policy-001",
    "policy_version": "v1",
    "enforced_at": 1770545119
  }
}
```

---

## Platform Claims (MANDATORY)

| Claim | Purpose | Example |
|-------|---------|---------|
| `iss` | Gateway issuer | `https://gateway.internal` |
| `aud` | Target service | `backend-service` |
| `sub` | User identity | `alice` |
| `ten` | Tenant ID | `default` |
| `iat` | Issued at | `1770545119` |
| `exp` | Expiration | `1770545179` |

---

## Authorization Context (NAMESPACED)

All under `ctx` object:

| Field | Required | Purpose |
|-------|----------|---------|
| `schema_ver` | ✅ | Contract version |
| `decision_id` | ❌ | Policy matched |
| `policy_version` | ❌ | Policy version |
| `enforced_at` | ❌ | Auth timestamp |

---

## Backend Rules

### ✅ MUST DO:
- Verify JWT signature (JWKS)
- Validate `iss`, `aud`, `exp`
- Treat valid JWT as authorized
- Ignore unknown fields

### ❌ MUST NOT DO:
- Perform authorization logic
- Validate `ctx` fields
- Check roles or permissions
- Reject unknown claims

---

## Minimal Verification

```javascript
jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://gateway.internal',
  audience: 'your-service-name'
});
// Valid JWT = Authorized request
```

---

## Allowed Uses

✅ Logging: `console.log(verified.sub)`
✅ Tenant filtering: `db.find({ tenant: verified.ten })`
✅ Debugging: `console.log(verified.ctx.decision_id)`

---

## Forbidden Uses

❌ Authorization: `if (verified.ctx.decision_id === 'admin')`
❌ Role checks: `if (verified.role === 'admin')`
❌ Schema validation: `if (verified.ctx.schema_ver !== '1.0.0')`

---

## Versioning

| Change | Version | Compatible |
|--------|---------|------------|
| Add optional `ctx` field | PATCH | ✅ |
| Add `app` namespace | PATCH | ✅ |
| Remove platform claim | MAJOR | ❌ |

---

## Security Properties

- **TTL**: 60 seconds
- **Algorithm**: RS256
- **Audience**: Service-specific
- **Tenant**: Isolated by `ten`
- **Proof**: Valid JWT = Authorized

---

## Key Principle

**Valid JWT = Proof of Authorization**

No additional checks needed.