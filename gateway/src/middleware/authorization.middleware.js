import { log } from '../utils/logger.js';
import { getJwtConfig } from '../services/config.service.js';

const authorizationRules = {
  '/orders': {
    'GET': ['admin', 'user'],
    'POST': ['admin']
  },
  '/users': {
    'GET': ['admin']
  }
};

export const authorizationMiddleware = (req, res, next) => {
  const { enforcementMode } = getJwtConfig();
  const { method, path } = req;
  const role = req.identity?.role;

  const rules = authorizationRules[path];
  
  if (!rules) {
    return next();
  }

  const allowedRoles = rules[method];
  
  if (!allowedRoles) {
    return next();
  }

  if (!role || !allowedRoles.includes(role)) {
    log(`BLOCKED reason=forbidden role=${role || 'none'} method=${method} path=${path}`);
    
    if (enforcementMode === 'enforce') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied for this role'
      });
    }
  }

  next();
};
