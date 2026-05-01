import express from 'express';
import { getTelemetry, getUserTelemetryData, getUserFeaturesData, getUsersRiskSummary, getUserRiskDetail, getBaselineData, getBaselineTimeseries } from '../controllers/telemetry.controller.js';
import { adminIdentityMiddleware } from '../middleware/admin.identity.middleware.js';
import { adminAuthorizationMiddleware } from '../middleware/admin.authorization.middleware.js';
import { log } from '../utils/logger.js';

const router = express.Router();

const logAdminAccess = (req, res, next) => {
  log(`[SECURITY] Admin ${req.user.userId} accessed telemetry`);
  next();
};

const protect = [adminIdentityMiddleware, adminAuthorizationMiddleware(['admin']), logAdminAccess];

router.get('/telemetry', ...protect, getTelemetry);
router.get('/telemetry/user', ...protect, getUserTelemetryData);
router.get('/telemetry/features', ...protect, getUserFeaturesData);
router.get('/users/risk/summary', ...protect, getUsersRiskSummary);
router.get('/users/risk/detail', ...protect, getUserRiskDetail);
router.get('/baseline', ...protect, getBaselineData);
router.get('/baseline/timeseries', ...protect, getBaselineTimeseries);

export default router;
