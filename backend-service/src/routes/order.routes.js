import express from 'express';
import { getOrders } from '../controllers/order.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';
import { gatewayAuthorityMiddleware } from '../middleware/authz.middleware.js';

const router = express.Router();

// Phase 3: Gateway is the sole authorization authority
router.get('/', authenticateJWT, gatewayAuthorityMiddleware, getOrders);

export default router;
