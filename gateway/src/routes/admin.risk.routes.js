import express from 'express';
import { calculateRisk } from '../services/risk.service.js';
import { getPolicy, updatePolicy, deletePolicy, listPolicies } from '../services/riskPolicy.service.js';
import { adminIdentityMiddleware } from '../middleware/admin.identity.middleware.js';
import { adminAuthorizationMiddleware } from '../middleware/admin.authorization.middleware.js';
import { log } from '../utils/logger.js';

const router = express.Router();

const logAdminAccess = (req, res, next) => {
  log(`[SECURITY] Admin ${req.user.userId} accessed risk engine`);
  next();
};

const protect = [adminIdentityMiddleware, adminAuthorizationMiddleware(['admin']), logAdminAccess];

// GET all → /admin/risk/policies
// GET one → /admin/risk/policies?tenantId=acme
router.get('/risk/policies', ...protect, async (req, res) => {
  const { tenantId } = req.query;
  if (tenantId) return res.json(await getPolicy(tenantId));
  res.json(await listPolicies());
});

// PUT → body: { tenantId, highThreshold, mediumThreshold }
router.put('/risk/policies', ...protect, async (req, res) => {
  try {
    const { tenantId = 'default', highThreshold, mediumThreshold } = req.body;
    res.json(await updatePolicy(tenantId, { highThreshold, mediumThreshold }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE → body: { tenantId }
router.delete('/risk/policies', ...protect, async (req, res) => {
  const tenantId = req.body.tenantId || 'default';
  await deletePolicy(tenantId);
  res.json({ message: `Policy for ${tenantId} reset to defaults` });
});

// GET risk score → body: { userId, tenantId }
router.get('/risk', ...protect, async (req, res) => {
  try {
    const { userId, tenantId = 'default' } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    res.json(await calculateRisk(userId, tenantId));
  } catch (err) {
    res.status(500).json({ error: 'Risk computation failed', details: err.message });
  }
});

export default router;
