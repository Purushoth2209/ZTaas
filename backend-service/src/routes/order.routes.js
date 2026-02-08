import express from 'express';
import { getOrders } from '../controllers/order.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';

const router = express.Router();

// Phase 4: JWT verification only - no authorization middleware
router.get('/', authenticateJWT, getOrders);

export default router;
