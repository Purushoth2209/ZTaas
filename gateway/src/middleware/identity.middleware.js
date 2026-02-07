import { verifyJwt } from '../services/jwtVerification.service.js';
import { log } from '../utils/logger.js';

export const identityMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log(`${req.method} ${req.path} - No JWT token provided`);
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const identity = await verifyJwt(token);
    req.identity = identity;
    log(`${req.method} ${req.path} - JWT verified: user=${identity.username}, role=${identity.role}`);
  } catch (error) {
    log(`${req.method} ${req.path} - JWT verification failed: ${error.message}`);
  }

  next();
};
