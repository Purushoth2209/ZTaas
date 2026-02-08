import { log } from '../utils/logger.js';

// Phase 4: JWT-based authorization
// Backend accepts gateway-issued JWTs
export const gatewayAuthorityMiddleware = (req, res, next) => {
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
