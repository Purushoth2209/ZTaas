import { log } from '../utils/logger.js';

// DEPRECATED: Phase 4 - Authorization middleware removed
// Backend services are now execution-only
// Valid JWT = authorized request (no additional checks)

// This middleware is kept for backward compatibility only
// TODO: Remove after all services migrate to Phase 4

export const gatewayAuthorityMiddleware = (req, res, next) => {
  log('DEPRECATED: gatewayAuthorityMiddleware should not be used in Phase 4');
  
  // Accept either gateway headers (Phase 3) or JWT (Phase 4)
  if (req.gatewayIdentity) {
    req.authzIdentity = req.gatewayIdentity;
    req.authzAuthority = 'gateway-headers';
    return next();
  }
  
  // JWT-based identity (Phase 4)
  if (req.user) {
    req.authzIdentity = {
      userId: req.user.sub,
      username: req.user.sub,
      role: req.user.role,
      issuer: req.user.iss
    };
    req.authzAuthority = 'gateway-jwt';
    return next();
  }

  log(`MISSING_IDENTITY method=${req.method} path=${req.path}`);
  return res.status(401).json({ 
    error: 'Unauthorized',
    message: 'Authentication required'
  });
};
