import express from 'express';
import { updateBackendConfig } from '../controllers/admin.controller.js';
import jwtConfigRoutes from './admin.jwt.routes.js';

const router = express.Router();

router.post('/config/backend', updateBackendConfig);
router.use('/config', jwtConfigRoutes);

export default router;
