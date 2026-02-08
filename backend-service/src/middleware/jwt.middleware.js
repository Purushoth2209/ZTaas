import { verifyToken } from '../services/auth.service.js';
import { isJwtAuditMode } from '../config/authz.config.js';
import { log } from '../utils/logger.js';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=missing_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    if (isJwtAuditMode()) {
      log(`JWT_AUDIT valid=false reason=invalid_token method=${req.method} path=${req.path}`);
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  
  if (isJwtAuditMode()) {
    log(`JWT_AUDIT valid=true user=${decoded.username} role=${decoded.role}`);
  }
  
  next();
};
