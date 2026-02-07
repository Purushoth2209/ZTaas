import express from 'express';
import { identityMiddleware } from '../middleware/identity.middleware.js';
import { authorizationMiddleware } from '../middleware/authorization.middleware.js';
import { handleProxyRequest } from '../controllers/proxy.controller.js';

const router = express.Router();

router.all('*', identityMiddleware, authorizationMiddleware, handleProxyRequest);

export default router;
