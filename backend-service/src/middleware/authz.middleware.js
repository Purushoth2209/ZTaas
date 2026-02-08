import { isGatewayAuthz } from '../config/authz.config.js';
import { log } from '../utils/logger.js';

export const authzMiddleware = (req, res, next) => {
  let authzIdentity = null;
  let source = 'jwt';

  if (isGatewayAuthz() && req.gatewayIdentity) {
    authzIdentity = req.gatewayIdentity;
    source = 'gateway';
  } else if (req.user) {
    authzIdentity = req.user;
    source = 'jwt';
    
    if (isGatewayAuthz()) {
      log(`AUTHZ_FALLBACK source=jwt reason=missing_gateway_identity path=${req.path}`);
    }
  }

  if (!authzIdentity) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.authzIdentity = authzIdentity;
  req.authzSource = source;
  
  next();
};
