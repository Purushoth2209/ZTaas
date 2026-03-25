import { getConfig, updateConfig } from './systemConfig.service.js';
import { log } from '../utils/logger.js';

export const getJwtConfig = () => getConfig().jwt;

export const setJwtConfig = async (updates) => {
  await updateConfig({ jwt: { ...getConfig().jwt, ...updates } });
};

export const getEnforcementMode = () => ({ enforcementMode: getConfig().enforcementMode });

export const updateEnforcementMode = async (mode) => {
  if (mode !== 'observe' && mode !== 'enforce') {
    throw new Error('Invalid enforcementMode. Must be "observe" or "enforce"');
  }
  await updateConfig({ enforcementMode: mode });
  log(`Enforcement mode updated to: ${mode}`);
  return getEnforcementMode();
};

export const updateJwtConfig = async (config) => {
  const updates = {};
  if (config.issuer)     updates.issuer     = config.issuer;
  if (config.jwksUri)    updates.jwksUri    = config.jwksUri;
  if (config.audience)   updates.audience   = config.audience;
  if (config.algorithms) updates.algorithms = config.algorithms;
  if (config.enforcementMode) {
    if (config.enforcementMode !== 'observe' && config.enforcementMode !== 'enforce') {
      throw new Error('Invalid enforcementMode. Must be "observe" or "enforce"');
    }
    updates.enforcementMode = config.enforcementMode;
  }
  await updateConfig({ jwt: { ...getConfig().jwt, ...updates }, ...(updates.enforcementMode ? { enforcementMode: updates.enforcementMode } : {}) });
  return getJwtConfig();
};
