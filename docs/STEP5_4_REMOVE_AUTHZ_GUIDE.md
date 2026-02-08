# STEP 5.4: Remove Backend Authorization Logic

## Goal
Transform backend services into pure execution engines that trust gateway-issued JWTs as cryptographic proof of authorization.

---

## Current State Analysis

### ❌ Authorization Logic Found:

1. **order.controller.js** - Role-based filtering:
```javascript
// WRONG: Authorization logic in backend
const orders = identity.role === 'admin' 
  ? getAllOrders() 
  : getOrdersByUser(identity.userId);
```

2. **authz.middleware.js** - Dual-path authorization:
```javascript
// TRANSITIONAL: Should be simplified
if (req.gatewayIdentity) { ... }
if (req.user) { ... }
```

3. **gatewayTrust.middleware.js** - Legacy header validation:
```javascript
// LEGACY: Phase 3 gateway headers
if (gatewaySecret !== GATEWAY_SECRET) { ... }
```

---

## Target State: Execution-Only Backend

### ✅ Backend Request Flow (After Step 5.4):

```
Request with INTERNAL JWT
    ↓
[1] authenticateJWT
    - Verify JWT signature (JWKS)
    - Validate iss, aud, exp
    - Extract identity → req.user
    ↓
[2] Business Logic Controller
    - Execute business logic
    - Use req.user.sub, req.user.ten for data filtering
    - NO authorization decisions
    ↓
Response
```

---

## Changes Required

### 1. Simplify JWT Middleware (Keep)

**File**: `src/middleware/jwt.middleware.js`

**Current**: Already correct - only verifies JWT
**Action**: ✅ No changes needed

### 2. Remove Authorization Middleware

**File**: `src/middleware/authz.middleware.js`

**Action**: ❌ DELETE this file entirely

**Reason**: Backend must not make authorization decisions

### 3. Remove Gateway Trust Middleware

**File**: `src/middleware/gatewayTrust.middleware.js`

**Action**: ❌ DELETE this file entirely (or mark as deprecated)

**Reason**: Phase 3 headers are replaced by Phase 4 JWTs

### 4. Update Routes - Remove authz middleware

**Files**: 
- `src/routes/user.routes.js`
- `src/routes/order.routes.js`

**Before**:
```javascript
router.get('/', authenticateJWT, gatewayAuthorityMiddleware, getUsers);
```

**After**:
```javascript
router.get('/', authenticateJWT, getUsers);
```

### 5. Remove Authorization Logic from Controllers

**File**: `src/controllers/order.controller.js`

**Before** (WRONG):
```javascript
const orders = identity.role === 'admin' 
  ? getAllOrders() 
  : getOrdersByUser(identity.userId);
```

**After** (CORRECT):
```javascript
// Gateway already authorized this request
// Just execute business logic
const orders = getAllOrders();
```

**Alternative** (if tenant isolation needed):
```javascript
// Use tenant for data filtering (NOT authorization)
const orders = getOrdersByTenant(req.user.ten);
```

### 6. Update Controllers - Use req.user

**Files**:
- `src/controllers/user.controller.js`
- `src/controllers/order.controller.js`

**Before**:
```javascript
res.json({ users: getAllUsers(), requestedBy: req.authzIdentity.username });
```

**After**:
```javascript
res.json({ users: getAllUsers(), requestedBy: req.user.sub });
```

---

## Implementation Steps

### Step 1: Update Order Controller (Remove Role Check)

```javascript
// src/controllers/order.controller.js
import { getAllOrders } from '../services/order.service.js';
import { randomDelay } from '../utils/delay.js';

export const getOrders = async (req, res) => {
  await randomDelay();
  
  // Valid JWT = authorized request
  // Gateway already decided what this user can access
  const orders = getAllOrders();

  res.json({ 
    orders, 
    requestedBy: req.user.sub,
    tenant: req.user.ten 
  });
};
```

### Step 2: Update User Controller

```javascript
// src/controllers/user.controller.js
import { getAllUsers, getUserById } from '../services/user.service.js';
import { randomDelay } from '../utils/delay.js';

export const getUsers = async (req, res) => {
  await randomDelay();
  res.json({ 
    users: getAllUsers(), 
    requestedBy: req.user.sub,
    tenant: req.user.ten
  });
};

export const getUser = async (req, res) => {
  await randomDelay();
  const user = getUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ 
    user, 
    requestedBy: req.user.sub,
    tenant: req.user.ten
  });
};
```

### Step 3: Update Routes (Remove authz middleware)

```javascript
// src/routes/user.routes.js
import express from 'express';
import { getUsers, getUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';

const router = express.Router();

// Phase 4: JWT verification only - no authorization
router.get('/', authenticateJWT, getUsers);
router.get('/:id', authenticateJWT, getUser);

export default router;
```

```javascript
// src/routes/order.routes.js
import express from 'express';
import { getOrders } from '../controllers/order.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';

const router = express.Router();

// Phase 4: JWT verification only - no authorization
router.get('/', authenticateJWT, getOrders);

export default router;
```

### Step 4: Delete Authorization Middleware Files

```bash
# Mark as deprecated or delete
rm src/middleware/authz.middleware.js
rm src/middleware/gatewayTrust.middleware.js
```

---

## Backend Security Model (Final)

### ✅ Backend MUST:
1. Verify INTERNAL JWT signature using gateway JWKS
2. Enforce `iss = https://gateway.internal`
3. Enforce `aud = backend-service`
4. Enforce token expiry (`exp`)
5. Execute business logic if JWT is valid

### ❌ Backend MUST NOT:
1. Perform authorization checks
2. Inspect roles or permissions
3. Validate `ctx` fields
4. Make decisions based on custom claims
5. Accept client-issued JWTs for authorization

---

## Request Handling Rules

| Scenario | Action |
|----------|--------|
| Valid INTERNAL JWT | ✅ Execute business logic |
| Invalid JWT signature | ❌ Reject 401 |
| Expired JWT | ❌ Reject 401 |
| Wrong issuer | ❌ Reject 401 |
| Wrong audience | ❌ Reject 401 |
| Missing JWT | ❌ Reject 401 |

**Key Principle**: Valid JWT = Authorized Request

---

## Validation Checklist

### Code Review:
- [ ] No role checks in controllers
- [ ] No permission checks in services
- [ ] No policy evaluation in backend
- [ ] No resource-based authorization
- [ ] Only JWT verification middleware remains
- [ ] Controllers use `req.user.sub` and `req.user.ten` only

### Log Review:
- [ ] No "AUTHZ decision" logs in backend
- [ ] No "role check" logs in backend
- [ ] Only "JWT_AUDIT valid=true" logs
- [ ] No authorization-related errors

### Test Validation:
- [ ] Valid gateway JWT → 200 OK
- [ ] Invalid JWT → 401 Unauthorized
- [ ] Expired JWT → 401 Unauthorized
- [ ] No JWT → 401 Unauthorized
- [ ] Client JWT (not gateway) → 401 Unauthorized

---

## Example Logs (After Step 5.4)

### ✅ CORRECT Backend Logs:
```
JWT_AUDIT valid=true user=alice issuer=https://gateway.internal
method=GET path=/users user=alice tenant=default status=200 latency=5ms
```

### ❌ WRONG Backend Logs (Should NOT appear):
```
AUTHZ decision=allow role=admin  // ❌ No authorization decisions
ROLE_CHECK user=alice role=admin // ❌ No role checks
POLICY_EVAL policy=users-get     // ❌ No policy evaluation
```

---

## Tenant Isolation Pattern (Allowed)

Using `ten` claim for data filtering is **allowed** (not authorization):

```javascript
// ✅ CORRECT: Tenant-based data filtering
export const getOrders = async (req, res) => {
  const tenant = req.user.ten;
  
  // Filter data by tenant (multi-tenancy)
  const orders = await db.orders.find({ tenant });
  
  res.json({ orders });
};
```

**Why this is OK**: 
- Not an authorization decision
- Gateway already authorized access to orders
- Tenant filtering is data isolation, not access control

---

## Migration from Phase 3 to Phase 4

### Phase 3 (Gateway Headers):
```javascript
if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
req.user = {
  id: req.headers['x-user-id'],
  role: req.headers['x-user-role']
};
```

### Phase 4 (Gateway JWT):
```javascript
const verified = await verifyInternalJWT(token);
req.user = {
  sub: verified.sub,
  ten: verified.ten
};
// No authorization checks - JWT is proof
```

---

## Backward Compatibility (Temporary)

If you need to support both Phase 3 and Phase 4 during migration:

```javascript
export const authenticateRequest = async (req, res, next) => {
  // Try JWT first (Phase 4 - preferred)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const verified = await verifyInternalJWT(token);
      req.user = { sub: verified.sub, ten: verified.ten };
      req.authMethod = 'jwt'; // For logging
      return next();
    } catch (error) {
      // Fall through to Phase 3
    }
  }
  
  // Fallback to gateway headers (Phase 3 - deprecated)
  const gatewaySecret = req.headers['x-gateway-secret'];
  if (gatewaySecret === GATEWAY_SECRET) {
    req.user = {
      sub: req.headers['x-username'],
      ten: 'default'
    };
    req.authMethod = 'headers'; // For logging
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
};
```

**Deprecation Plan**:
1. Deploy Phase 4 support
2. Monitor `authMethod` logs
3. After 30 days, remove Phase 3 fallback

---

## Final Backend Architecture

```
┌─────────────────────────────────────────┐
│         BACKEND SERVICE                  │
├─────────────────────────────────────────┤
│                                          │
│  [1] authenticateJWT                     │
│      ✓ Verify JWT signature (JWKS)      │
│      ✓ Validate iss, aud, exp           │
│      ✓ Extract identity → req.user      │
│      ✗ NO authorization logic           │
│                                          │
│  [2] Business Logic Controller           │
│      ✓ Execute business logic           │
│      ✓ Use req.user.sub for logging     │
│      ✓ Use req.user.ten for filtering   │
│      ✗ NO role checks                   │
│      ✗ NO permission checks             │
│                                          │
│  [3] Response                            │
│      ✓ Return data                      │
│                                          │
└─────────────────────────────────────────┘
```

---

## Summary

### What Was Removed:
- ❌ Authorization middleware (`authz.middleware.js`)
- ❌ Gateway trust middleware (`gatewayTrust.middleware.js`)
- ❌ Role checks in controllers
- ❌ Permission validation
- ❌ Policy evaluation

### What Remains:
- ✅ JWT verification middleware
- ✅ Business logic controllers
- ✅ Data filtering by tenant
- ✅ Logging with `req.user.sub`

### Key Principle:
**Valid INTERNAL JWT = Cryptographic Proof of Authorization**

No additional checks needed.