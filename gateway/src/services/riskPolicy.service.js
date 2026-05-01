import RiskPolicy from '../models/riskPolicy.model.js';
import { log } from '../utils/logger.js';

const DEFAULT_POLICY = { highThreshold: 0.58, mediumThreshold: 0.30 };
const cache = new Map();

export const getPolicy = async (tenantId = 'default') => {
  if (cache.has(tenantId)) return cache.get(tenantId);

  try {
    const doc = await RiskPolicy.findOne({ tenantId });
    if (doc) {
      let { highThreshold: high, mediumThreshold: med } = doc;
      // Legacy UI/seed defaults (0.9 / 0.6) made MEDIUM/HIGH unreachable for typical fused scores
      if (high >= 0.85 && med >= 0.5) {
        high = DEFAULT_POLICY.highThreshold;
        med = DEFAULT_POLICY.mediumThreshold;
      }
      const policy = { highThreshold: high, mediumThreshold: med };
      cache.set(tenantId, policy);
      return policy;
    }
  } catch (err) {
    log(`[RISK-POLICY] DB read failed for ${tenantId}, using defaults: ${err.message}`);
  }

  return { ...DEFAULT_POLICY };
};

export const updatePolicy = async (tenantId, data) => {
  const current = await getPolicy(tenantId);
  const updated = {
    highThreshold:   data.highThreshold   ?? current.highThreshold,
    mediumThreshold: data.mediumThreshold ?? current.mediumThreshold,
  };

  if (updated.mediumThreshold >= updated.highThreshold) {
    throw new Error('mediumThreshold must be less than highThreshold');
  }

  try {
    await RiskPolicy.findOneAndUpdate(
      { tenantId },
      { ...updated, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (err) {
    log(`[RISK-POLICY] DB write failed for ${tenantId}, applying in-memory only: ${err.message}`);
  }

  cache.set(tenantId, updated);
  log(`[RISK-POLICY] Tenant ${tenantId} → high=${updated.highThreshold}, medium=${updated.mediumThreshold}`);
  return updated;
};

export const deletePolicy = async (tenantId) => {
  try {
    await RiskPolicy.deleteOne({ tenantId });
  } catch (err) {
    log(`[RISK-POLICY] DB delete failed for ${tenantId}: ${err.message}`);
  }
  cache.delete(tenantId);
  log(`[RISK-POLICY] Tenant ${tenantId} policy deleted → using defaults`);
};

export const listPolicies = async () => {
  const result = { _default: { ...DEFAULT_POLICY } };
  try {
    const docs = await RiskPolicy.find({}, 'tenantId highThreshold mediumThreshold -_id');
    for (const doc of docs) {
      result[doc.tenantId] = { highThreshold: doc.highThreshold, mediumThreshold: doc.mediumThreshold };
    }
  } catch (err) {
    log(`[RISK-POLICY] DB list failed, returning cache: ${err.message}`);
    for (const [tenant, policy] of cache) result[tenant] = policy;
  }
  return result;
};

// keep backward-compat alias used by existing code
export const getRiskPolicy  = (tenantId) => cache.get(tenantId) || { ...DEFAULT_POLICY };
export const setRiskPolicy  = (tenantId, policy) => updatePolicy(tenantId, policy);
export const deleteRiskPolicy = (tenantId) => deletePolicy(tenantId);
export const listRiskPolicies = () => listPolicies();
