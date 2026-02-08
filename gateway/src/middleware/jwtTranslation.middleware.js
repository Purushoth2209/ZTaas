import { JWTService } from '../services/jwt.service.js';
import { log } from '../utils/logger.js';
import { findMatchingPolicy } from '../services/policy.service.js';

export const jwtTranslationMiddleware = (req, res, next) => {
  // Skip translation for public paths or if no identity
  if (!req.identity) {
    return next();
  }

  const policy = findMatchingPolicy(req.method, req.path);
  
  // Mint internal JWT
  const internalPayload = {
    sub: req.identity.username,
    aud: 'backend-service',
    ten: req.identity.tenant || 'default',
    role: req.identity.role,
    decision_id: policy?.id || 'no-policy',
    policy_version: policy?.version || 'none'
  };

  const internalJwt = JWTService.signToken(internalPayload, {
    expiresIn: '60s' // Short-lived: 60 seconds
  });

  // Replace Authorization header with internal JWT
  req.headers.authorization = `Bearer ${internalJwt}`;
  
  log(`JWT_TRANSLATION sub=${internalPayload.sub} ten=${internalPayload.ten} ttl=60s`);
  
  next();
};
