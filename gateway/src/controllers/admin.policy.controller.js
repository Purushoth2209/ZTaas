import { getPolicies, setPolicies, clearPolicies, listAllPolicies } from '../services/policy.service.js';

export const getAllPolicies = async (req, res) => {
  const tenantId = req.query.tenantId;
  if (tenantId) {
    const rules = await getPolicies(tenantId);
    return res.json({ tenantId, policies: rules });
  }
  const all = await listAllPolicies();
  res.json({ tenants: all });
};

export const updatePolicies = async (req, res) => {
  const tenantId = req.body.tenantId || 'default';
  const { policies } = req.body;

  if (!policies || !Array.isArray(policies)) {
    return res.status(400).json({ error: 'policies must be an array' });
  }

  await setPolicies(tenantId, policies);
  res.json({ message: 'Policies updated', tenantId, count: policies.length });
};

export const deletePolicies = async (req, res) => {
  const tenantId = req.body.tenantId || 'default';
  await clearPolicies(tenantId);
  res.json({ message: 'Policies cleared', tenantId });
};
