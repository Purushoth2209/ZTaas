import { log } from '../utils/logger.js';

// Phase 3: Gateway is the sole authorization authority
// Backend trusts gateway identity completely
export const gatewayAuthorityMiddleware = (req, res, next) => {
  // Gateway identity is REQUIRED
  if (!req.gatewayIdentity) {
    log(`MISSING_GATEWAY_IDENTITY method=${req.method} path=${req.path}`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Gateway identity required'
    });
  }

  // Trust gateway identity completely - no authorization checks
  req.authzIdentity = req.gatewayIdentity;
  req.authzAuthority = 'gateway';
  
  next();
};
