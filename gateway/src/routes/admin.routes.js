import express from 'express';
import { updateBackendConfig } from '../controllers/admin.controller.js';
import jwtConfigRoutes from './admin.jwt.routes.js';
import enforcementRoutes from './admin.enforcement.routes.js';
import policyRoutes from './admin.policy.routes.js';

const router = express.Router();

router.post('/config/backend', updateBackendConfig);
router.use('/config', jwtConfigRoutes);
router.use('/config', enforcementRoutes);
router.use('/', policyRoutes);

export default router;
