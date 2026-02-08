import express from 'express';
import { getUsers, getUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';

const router = express.Router();

// Phase 4: JWT verification only - no authorization middleware
router.get('/', authenticateJWT, getUsers);
router.get('/:id', authenticateJWT, getUser);

export default router;
