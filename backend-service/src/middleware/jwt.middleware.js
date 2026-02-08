import { verifyToken } from '../services/auth.service.js';
import { isJwtAuditMode } from '../config/authz.config.js';
import { log } from '../utils/logger.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=missing_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const decoded = await verifyToken(token);

  if (!decoded) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=invalid_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Only gateway-issued tokens are accepted'
    });
  }

  req.user = decoded;
  
  if (isJwtAuditMode()) {
    log(`JWT_AUDIT valid=true user=${decoded.sub} issuer=${decoded.iss} audience=${decoded.aud}`);
  }
  
  next();
};
