# STEP 5.4 Quick Reference: Execution-Only Backend

## Backend Request Flow

```
Request with INTERNAL JWT
    ↓
authenticateJWT (verify JWT only)
    ↓
Business Logic Controller
    ↓
Response
```

## What Was Removed

❌ Authorization middleware
❌ Role checks in controllers
❌ Permission validation
❌ Policy evaluation
❌ `req.authzIdentity` usage

## What Remains

✅ JWT verification middleware
✅ Business logic controllers
✅ `req.user.sub` for logging
✅ `req.user.ten` for tenant filtering

## Backend Rules

### MUST:
- Verify JWT signature (JWKS)
- Validate `iss`, `aud`, `exp`
- Execute business logic if JWT valid

### MUST NOT:
- Perform authorization checks
- Inspect roles or permissions
- Validate `ctx` fields
- Reject based on custom claims

## Request Handling

| Scenario | Action |
|----------|--------|
| Valid JWT | ✅ Execute → 200 |
| Invalid JWT | ❌ Reject → 401 |
| No JWT | ❌ Reject → 401 |

## Key Principle

**Valid JWT = Authorized Request**

No additional checks needed.

## Testing

```bash
./test-step5-4-validation.sh
```

## Files Changed

1. `controllers/order.controller.js` - Removed role check
2. `controllers/user.controller.js` - Use req.user
3. `routes/user.routes.js` - Removed authz middleware
4. `routes/order.routes.js` - Removed authz middleware
5. `middleware/authz.middleware.js` - Marked DEPRECATED