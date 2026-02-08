import express from 'express';
import { getUsers, getUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';
import { gatewayAuthorityMiddleware } from '../middleware/authz.middleware.js';

const router = express.Router();

// Phase 3: Gateway is the sole authorization authority
router.get('/', authenticateJWT, gatewayAuthorityMiddleware, getUsers);
router.get('/:id', authenticateJWT, gatewayAuthorityMiddleware, getUser);

export default router;
