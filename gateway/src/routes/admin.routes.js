import express from 'express';
import { updateBackendConfig } from '../controllers/admin.controller.js';
import { getConfig } from '../services/systemConfig.service.js';
import jwtConfigRoutes from './admin.jwt.routes.js';
import enforcementRoutes from './admin.enforcement.routes.js';
import policyRoutes from './admin.policy.routes.js';
import telemetryRoutes from './admin.telemetry.routes.js';
import riskRoutes from './admin.risk.routes.js';

const router = express.Router();

router.post('/config/backend', updateBackendConfig);
router.get('/config', (req, res) => res.json(getConfig()));
router.use('/config', jwtConfigRoutes);
router.use('/config', enforcementRoutes);
router.use('/', policyRoutes);
router.use('/', telemetryRoutes);
router.use('/', riskRoutes);

export default router;
