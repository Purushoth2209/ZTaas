import { verifyJwt } from '../services/jwtVerification.service.js';
import { log } from '../utils/logger.js';
import { getJwtConfig } from '../services/config.service.js';

const PUBLIC_PATHS = ['/login'];

export const identityMiddleware = async (req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const { enforcementMode } = getJwtConfig();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log(`${req.method} ${req.path} - No JWT token provided`);
    
    if (enforcementMode === 'enforce') {
      log(`BLOCKED reason=missing_jwt method=${req.method} path=${req.path}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid JWT'
      });
    }
    
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const identity = await verifyJwt(token);
    req.identity = identity;
    log(`${req.method} ${req.path} - JWT verified: user=${identity.username}, role=${identity.role}`);
  } catch (error) {
    log(`${req.method} ${req.path} - JWT verification failed: ${error.message}`);
    
    if (enforcementMode === 'enforce') {
      log(`BLOCKED reason=invalid_jwt method=${req.method} path=${req.path}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid JWT'
      });
    }
  }

  next();
};
