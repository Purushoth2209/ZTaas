import { JWTService } from '../services/jwt.service.js';
import { log } from '../utils/logger.js';
import { findMatchingPolicy } from '../services/policy.service.js';

const JWT_CONTRACT_VERSION = '1.0.0';

export const jwtTranslationMiddleware = (req, res, next) => {
  // Skip translation for public paths or if no identity
  if (!req.identity) {
    return next();
  }

  const policy = findMatchingPolicy(req.method, req.path);
  
  // Build v1 compliant internal JWT
  const internalPayload = {
    // Platform claims (mandatory)
    sub: req.identity.username,
    aud: 'backend-service',
    ten: req.identity.tenant || 'default',
    
    // Authorization context (namespaced)
    ctx: {
      schema_ver: JWT_CONTRACT_VERSION,
      decision_id: policy?.id || 'no-policy',
      policy_version: policy?.version || 'none',
      enforced_at: Math.floor(Date.now() / 1000)
    }
  };

  const internalJwt = JWTService.signToken(internalPayload, {
    expiresIn: '60s'
  });

  // Replace Authorization header with internal JWT
  req.headers.authorization = `Bearer ${internalJwt}`;
  
  log(`JWT_TRANSLATION sub=${internalPayload.sub} ten=${internalPayload.ten} schema_ver=${JWT_CONTRACT_VERSION} ttl=60s`);
  
  next();
};
