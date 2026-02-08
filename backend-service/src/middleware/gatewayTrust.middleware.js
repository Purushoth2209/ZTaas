import { GATEWAY_SECRET } from '../config/gateway.secret.js';
import { log } from '../utils/logger.js';

export const gatewayTrustMiddleware = (req, res, next) => {
  // Log received headers from gateway
  log(`[BACKEND RECEIVED] X-Gateway-Secret: ${req.headers['x-gateway-secret'] || 'MISSING'}`);
  log(`[BACKEND RECEIVED] X-User-Id: ${req.headers['x-user-id'] || 'MISSING'}`);
  log(`[BACKEND RECEIVED] X-Username: ${req.headers['x-username'] || 'MISSING'}`);
  log(`[BACKEND RECEIVED] X-User-Role: ${req.headers['x-user-role'] || 'MISSING'}`);
  log(`[BACKEND RECEIVED] X-Issuer: ${req.headers['x-issuer'] || 'MISSING'}`);
  
  const gatewaySecret = req.headers['x-gateway-secret'];
  
  if (!gatewaySecret || gatewaySecret !== GATEWAY_SECRET) {
    if (gatewaySecret) {
      log(`GATEWAY_TRUST_WARNING: Invalid gateway secret for ${req.method} ${req.path}`);
    }
    return next();
  }
  
  const userId = req.headers['x-user-id'];
  const username = req.headers['x-username'];
  const role = req.headers['x-user-role'];
  const issuer = req.headers['x-issuer'];
  
  if (!userId || !role) {
    log(`GATEWAY_TRUST_WARNING: Missing required headers (userId or role) for ${req.method} ${req.path}`);
    return next();
  }
  
  req.gatewayIdentity = {
    userId,
    username,
    role,
    issuer
  };
  
  next();
};
