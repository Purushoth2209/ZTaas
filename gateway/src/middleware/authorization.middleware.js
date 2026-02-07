import { log } from '../utils/logger.js';
import { getJwtConfig } from '../services/config.service.js';
import { findMatchingPolicy } from '../services/policy.service.js';

export const authorizationMiddleware = (req, res, next) => {
  const { enforcementMode } = getJwtConfig();
  const { method, path } = req;
  const role = req.identity?.role;

  const policy = findMatchingPolicy(method, path);
  
  if (!policy) {
    log(`AUTHZ decision=allow policy=none role=${role || 'none'} method=${method} path=${path}`);
    return next();
  }

  const allowed = role && policy.roles.includes(role);
  const decision = allowed ? 'allow' : 'deny';
  
  log(`AUTHZ decision=${decision} policy=${policy.id} role=${role || 'none'} method=${method} path=${path}`);
  
  if (!allowed && enforcementMode === 'enforce') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied for this role'
    });
  }

  next();
};
