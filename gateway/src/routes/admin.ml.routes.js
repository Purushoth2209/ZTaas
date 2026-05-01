import express from 'express';
import { getRecentMLScores, getMLScoresStats } from '../controllers/mlScores.controller.js';
import { adminIdentityMiddleware } from '../middleware/admin.identity.middleware.js';
import { adminAuthorizationMiddleware } from '../middleware/admin.authorization.middleware.js';
import { log } from '../utils/logger.js';

const router = express.Router();

const logAdminAccess = (req, res, next) => {
  log(`[SECURITY] Admin ${req.user.userId} accessed ML scores`);
  next();
};

const protect = [adminIdentityMiddleware, adminAuthorizationMiddleware(['admin']), logAdminAccess];

router.get('/ml/scores/recent', ...protect, getRecentMLScores);
router.get('/ml/scores/stats', ...protect, getMLScoresStats);

export default router;
