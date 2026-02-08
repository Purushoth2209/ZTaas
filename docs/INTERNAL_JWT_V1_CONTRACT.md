# INTERNAL JWT v1 CONTRACT

## Version: 1.0.0
## Status: FROZEN
## Effective Date: 2026-02-08

---

## 1. Platform-Level Claims (MANDATORY)

These claims are **FROZEN** and identical for all services. They are used **ONLY** for JWT verification, **NOT** for authorization logic.

| Claim | Type | Required | Purpose | Example |
|-------|------|----------|---------|---------|
| `iss` | string | ✅ | Gateway issuer identifier | `https://gateway.internal` |
| `aud` | string | ✅ | Target backend service | `backend-service` |
| `sub` | string | ✅ | Authenticated subject (user/service ID) | `alice` |
| `ten` | string | ✅ | Tenant identifier | `default` |
| `iat` | number | ✅ | Issued at (Unix timestamp) | `1770545119` |
| `exp` | number | ✅ | Expiration (Unix timestamp) | `1770545179` |

### Rules:
- **MUST** be present in every INTERNAL JWT
- **MUST** be validated by backend services
- **MUST NOT** be used for authorization decisions
- **CANNOT** be changed without major version bump (v2)

---

## 2. Authorization Context (NAMESPACED)

All authorization metadata **MUST** be placed under the `ctx` object. These fields are **informational only** and **MUST NOT** be used for backend authorization.

### Schema:
```json
{
  "ctx": {
    "schema_ver": "1.0.0",
    "decision_id": "policy-001",
    "policy_version": "v1",
    "enforced_at": 1770545119
  }
}
```

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `ctx.schema_ver` | string | ✅ | JWT contract version |
| `ctx.decision_id` | string | ❌ | Policy that authorized request |
| `ctx.policy_version` | string | ❌ | Version of policy applied |
| `ctx.enforced_at` | number | ❌ | Timestamp of authorization |

### Rules:
- **MUST** be nested under `ctx` object
- **MUST NOT** appear at top level
- **MUST NOT** be validated by backend services
- Used for audit, logging, and debugging only
- Backends **MUST** ignore unknown fields in `ctx`

---

## 3. Optional Application Context (EXTENSIBLE)

Application-specific context **MAY** be included under the `app` object. This is **optional** and **service-specific**.

### Schema:
```json
{
  "app": {
    "service_name": {
      "custom_field": "value"
    }
  }
}
```

### Rules:
- **MUST** be nested under `app` object
- **MUST** be namespaced by service name
- **MUST** be optional (services ignore if not present)
- **MUST NOT** be used for authorization
- Services **MUST** ignore unknown `app` namespaces

### Example:
```json
{
  "app": {
    "order-service": {
      "warehouse_id": "wh-123"
    },
    "billing-service": {
      "payment_method": "credit"
    }
  }
}
```

---

## 4. Complete INTERNAL JWT v1 Example

### Header:
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "gateway-key-1770544912549"
}
```

### Payload:
```json
{
  "iss": "https://gateway.internal",
  "aud": "backend-service",
  "sub": "alice",
  "ten": "default",
  "iat": 1770545119,
  "exp": 1770545179,
  "ctx": {
    "schema_ver": "1.0.0",
    "decision_id": "users-get-policy",
    "policy_version": "v1",
    "enforced_at": 1770545119
  }
}
```

### With Optional App Context:
```json
{
  "iss": "https://gateway.internal",
  "aud": "order-service",
  "sub": "alice",
  "ten": "acme-corp",
  "iat": 1770545119,
  "exp": 1770545179,
  "ctx": {
    "schema_ver": "1.0.0",
    "decision_id": "order-create-policy",
    "policy_version": "v2"
  },
  "app": {
    "order-service": {
      "warehouse_id": "wh-east-1",
      "priority": "high"
    }
  }
}
```

---

## 5. Versioning Rules

### Schema Version Format: `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | Backward Compatible |
|-------------|--------------|---------------------|
| Add optional field to `ctx` | PATCH | ✅ Yes |
| Add new `app` namespace | PATCH | ✅ Yes |
| Add optional platform claim | MINOR | ✅ Yes |
| Remove/rename platform claim | MAJOR | ❌ No |
| Change claim semantics | MAJOR | ❌ No |

### Version Support Policy:
- Gateway **MUST** emit only the latest version
- Backends **MUST** accept current version (v1.x.x)
- Backends **SHOULD** accept previous major version (v0.x.x) during migration
- Gateway **MUST** increment `ctx.schema_ver` on any change

### Migration Path:
1. Gateway adds new field with PATCH/MINOR bump
2. Backends ignore unknown fields (no code change)
3. After 30 days, field becomes stable
4. Breaking changes require v2 contract and coordinated rollout

---

## 6. Backend Contract (NON-NEGOTIABLE)

### Backends MUST:
✅ Verify JWT signature using gateway's JWKS
✅ Validate `iss = https://gateway.internal`
✅ Validate `aud` matches service name
✅ Validate `exp` (token not expired)
✅ Treat valid JWT as **proof of authorization**
✅ Ignore unknown fields in `ctx` and `app`
✅ Accept any `schema_ver` with same major version

### Backends MUST NOT:
❌ Perform authorization logic
❌ Validate `ctx` fields
❌ Enforce role or permission checks
❌ Reject unknown claims
❌ Parse or validate `app` context (unless service-specific)
❌ Make decisions based on `sub`, `ten`, or `ctx` values

### Backend Verification Code (Reference):
```javascript
// CORRECT: Verify only platform claims
const verified = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://gateway.internal',
  audience: 'backend-service'
});

// Token is valid = request is authorized
// No further checks needed

// WRONG: Do not check ctx or custom claims
if (verified.ctx.decision_id === 'admin-policy') { // ❌ WRONG
  // This violates Zero Trust
}
```

---

## 7. Gateway Contract (IMPLEMENTATION)

### Gateway MUST:
✅ Issue JWTs conforming to v1 schema
✅ Set `ctx.schema_ver = "1.0.0"`
✅ Include all mandatory platform claims
✅ Sign with RS256 using gateway private key
✅ Set TTL to 30-120 seconds
✅ Include authorization context in `ctx`

### Gateway MAY:
- Add optional fields to `ctx` (with version bump)
- Include `app` context for specific services
- Extend TTL for specific use cases

---

## 8. Security Properties

### Zero Trust Guarantees:
1. **Cryptographic Proof**: Valid JWT = authorized request
2. **Short-Lived**: 60s TTL limits replay window
3. **Audience Scoped**: Token valid only for target service
4. **Tenant Isolated**: `ten` claim for multi-tenancy
5. **Non-Repudiation**: `ctx` provides audit trail

### Attack Mitigation:
- **Token Replay**: Short TTL (60s)
- **Token Forgery**: RS256 signature verification
- **Privilege Escalation**: Gateway enforces all authorization
- **Tenant Confusion**: `ten` claim validated by gateway
- **Service Confusion**: `aud` claim prevents cross-service use

---

## 9. Migration Guidance

### Adding New Optional Field:
1. Update gateway to include new field in `ctx`
2. Bump `schema_ver` to `1.0.1` (PATCH)
3. Deploy gateway (no backend changes needed)
4. Backends automatically ignore new field

### Adding New Service:
1. Set `aud` to new service name
2. Service verifies JWT with `aud = "new-service"`
3. No changes to other services

### Breaking Change (v2):
1. Define new v2 contract
2. Gateway emits `ctx.schema_ver = "2.0.0"`
3. Backends updated to accept v1 and v2
4. After migration period, deprecate v1

---

## 10. Compliance Checklist

### For Backend Services:
- [ ] Verify JWT signature using JWKS
- [ ] Validate `iss`, `aud`, `exp`
- [ ] Accept valid JWT as authorization proof
- [ ] Ignore unknown fields in `ctx` and `app`
- [ ] No authorization logic in service code
- [ ] No validation of `ctx` fields

### For Gateway:
- [ ] Emit v1 compliant JWTs
- [ ] Include all mandatory platform claims
- [ ] Namespace authorization context under `ctx`
- [ ] Set `ctx.schema_ver = "1.0.0"`
- [ ] Sign with RS256
- [ ] TTL between 30-120 seconds

---

## 11. Examples of Valid vs Invalid JWTs

### ✅ VALID: Minimal JWT
```json
{
  "iss": "https://gateway.internal",
  "aud": "backend-service",
  "sub": "alice",
  "ten": "default",
  "iat": 1770545119,
  "exp": 1770545179,
  "ctx": {
    "schema_ver": "1.0.0"
  }
}
```

### ✅ VALID: With Full Context
```json
{
  "iss": "https://gateway.internal",
  "aud": "backend-service",
  "sub": "alice",
  "ten": "acme-corp",
  "iat": 1770545119,
  "exp": 1770545179,
  "ctx": {
    "schema_ver": "1.0.0",
    "decision_id": "policy-001",
    "policy_version": "v1"
  }
}
```

### ❌ INVALID: Authorization at Top Level
```json
{
  "iss": "https://gateway.internal",
  "aud": "backend-service",
  "sub": "alice",
  "ten": "default",
  "role": "admin",  // ❌ WRONG: Not namespaced
  "decision_id": "policy-001"  // ❌ WRONG: Must be in ctx
}
```

### ❌ INVALID: Missing Mandatory Claims
```json
{
  "iss": "https://gateway.internal",
  "sub": "alice",
  // ❌ WRONG: Missing aud, ten, iat, exp
  "ctx": {
    "schema_ver": "1.0.0"
  }
}
```

---

## 12. FAQ

**Q: Can backends use `sub` for logging?**
A: Yes, `sub` and `ten` can be used for logging and audit, but NOT for authorization.

**Q: What if a service needs custom claims?**
A: Use the `app` namespace with service-specific fields.

**Q: Can backends reject old schema versions?**
A: No, backends MUST accept any v1.x.x version.

**Q: What if `ctx` is missing?**
A: Backends MUST accept JWTs even if `ctx` is minimal or missing optional fields.

**Q: Can gateway add new platform claims?**
A: Only with MINOR version bump and backward compatibility guarantee.

---

## Document Control

- **Version**: 1.0.0
- **Status**: FROZEN
- **Last Updated**: 2026-02-08
- **Next Review**: 2026-08-08
- **Owner**: Platform Security Team
- **Approvers**: Architecture Review Board