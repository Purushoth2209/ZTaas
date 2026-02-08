import express from 'express';
import { getOrders } from '../controllers/order.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';
import { authzMiddleware } from '../middleware/authz.middleware.js';

const router = express.Router();

router.get('/', authenticateJWT, authzMiddleware, getOrders);

export default router;
