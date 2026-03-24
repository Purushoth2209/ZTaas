import express from 'express';
import { calculateRisk } from '../services/risk.service.js';
import { adminIdentityMiddleware } from '../middleware/admin.identity.middleware.js';
import { adminAuthorizationMiddleware } from '../middleware/admin.authorization.middleware.js';
import { log } from '../utils/logger.js';

const router = express.Router();

const logAdminAccess = (req, res, next) => {
  log(`[SECURITY] Admin ${req.user.userId} accessed risk engine`);
  next();
};

const protect = [adminIdentityMiddleware, adminAuthorizationMiddleware(['admin']), logAdminAccess];

router.get('/risk/:userId', ...protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.query.tenantId || 'default';
    const result = await calculateRisk(userId, tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Risk computation failed', details: err.message });
  }
});

export default router;
