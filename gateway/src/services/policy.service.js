import AuthPolicy from '../models/authPolicy.model.js';
import { log } from '../utils/logger.js';

// cache: tenantId → rules[]
const cache = new Map();

const loadTenant = async (tenantId) => {
  try {
    const doc = await AuthPolicy.findOne({ tenantId });
    const rules = doc ? doc.rules.map(r => r.toObject()) : [];
    cache.set(tenantId, rules);
    return rules;
  } catch (err) {
    log(`[POLICY] DB read failed for ${tenantId}: ${err.message}`);
    return cache.get(tenantId) || [];
  }
};

export const getPolicies = async (tenantId = 'default') => {
  if (cache.has(tenantId)) return cache.get(tenantId);
  return loadTenant(tenantId);
};

export const setPolicies = async (tenantId = 'default', rules) => {
  try {
    await AuthPolicy.findOneAndUpdate(
      { tenantId },
      { rules, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (err) {
    log(`[POLICY] DB write failed for ${tenantId}: ${err.message}`);
  }
  cache.set(tenantId, rules);
  log(`[POLICY] tenant=${tenantId} action=set count=${rules.length}`);
};

export const clearPolicies = async (tenantId = 'default') => {
  try {
    await AuthPolicy.findOneAndUpdate(
      { tenantId },
      { rules: [], updatedAt: new Date() },
      { upsert: true }
    );
  } catch (err) {
    log(`[POLICY] DB clear failed for ${tenantId}: ${err.message}`);
  }
  cache.set(tenantId, []);
  log(`[POLICY] tenant=${tenantId} action=clear`);
};

export const findMatchingPolicy = async (tenantId = 'default', method, path) => {
  const rules = await getPolicies(tenantId);
  return rules.find(r => r.path === path && r.methods.includes(method)) || null;
};

export const listAllPolicies = async () => {
  try {
    const docs = await AuthPolicy.find({}, 'tenantId rules -_id');
    return docs.map(d => ({ tenantId: d.tenantId, rules: d.rules }));
  } catch (err) {
    log(`[POLICY] DB list failed: ${err.message}`);
    return [...cache.entries()].map(([tenantId, rules]) => ({ tenantId, rules }));
  }
};
