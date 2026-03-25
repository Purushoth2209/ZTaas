import SystemConfig from '../models/systemConfig.model.js';
import { log } from '../utils/logger.js';

const DEFAULTS = {
  backendUrl: 'http://localhost:5001',
  jwt: {
    issuer: 'http://localhost:5001',
    jwksUri: 'http://localhost:5001/.well-known/jwks.json',
    audience: 'api-gateway',
    algorithms: ['RS256'],
  },
  enforcementMode: 'observe',
};

let cache = { ...DEFAULTS };

export const loadConfig = async () => {
  try {
    const doc = await SystemConfig.getOrCreate();
    cache = {
      backendUrl: doc.backendUrl,
      jwt: { ...doc.jwt.toObject?.() ?? doc.jwt },
      enforcementMode: doc.enforcementMode,
    };
    log('[CONFIG] System config loaded from DB');
  } catch (err) {
    log(`[CONFIG] DB load failed, using defaults: ${err.message}`);
  }
};

export const getConfig = () => ({ ...cache, jwt: { ...cache.jwt } });

export const updateConfig = async (updates) => {
  try {
    const doc = await SystemConfig.findOneAndUpdate(
      {},
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    cache = {
      backendUrl: doc.backendUrl,
      jwt: { ...doc.jwt.toObject?.() ?? doc.jwt },
      enforcementMode: doc.enforcementMode,
    };
    log(`[CONFIG] System config updated → ${JSON.stringify(updates)}`);
  } catch (err) {
    log(`[CONFIG] DB update failed, applying in-memory only: ${err.message}`);
    cache = { ...cache, ...updates, jwt: { ...cache.jwt, ...(updates.jwt ?? {}) } };
  }
  return getConfig();
};
