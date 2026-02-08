import express from 'express';
import { getUsers, getUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';
import { authzMiddleware } from '../middleware/authz.middleware.js';

const router = express.Router();

router.get('/', authenticateJWT, authzMiddleware, getUsers);
router.get('/:id', authenticateJWT, authzMiddleware, getUser);

export default router;
