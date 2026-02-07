import { DEFAULT_JWT_CONFIG } from '../config/default.jwt.config.js';
import { log } from '../utils/logger.js';

let jwtConfig = { ...DEFAULT_JWT_CONFIG };

export const getJwtConfig = () => ({ ...jwtConfig });

export const setJwtConfig = (config) => {
  jwtConfig = { ...jwtConfig, ...config };
};

export const getEnforcementMode = () => {
  return { enforcementMode: jwtConfig.enforcementMode };
};

export const updateEnforcementMode = (mode) => {
  if (mode !== 'observe' && mode !== 'enforce') {
    throw new Error('Invalid enforcementMode. Must be "observe" or "enforce"');
  }
  jwtConfig.enforcementMode = mode;
  log(`Enforcement mode updated to: ${mode}`);
  return { enforcementMode: jwtConfig.enforcementMode };
};

export const updateJwtConfig = (config) => {
  const updates = {};
  if (config.issuer) updates.issuer = config.issuer;
  if (config.jwksUri) updates.jwksUri = config.jwksUri;
  if (config.audience) updates.audience = config.audience;
  if (config.algorithms) updates.algorithms = config.algorithms;
  if (config.enforcementMode) {
    if (config.enforcementMode !== 'observe' && config.enforcementMode !== 'enforce') {
      throw new Error('Invalid enforcementMode. Must be "observe" or "enforce"');
    }
    updates.enforcementMode = config.enforcementMode;
  }
  setJwtConfig(updates);
  return getJwtConfig();
};
