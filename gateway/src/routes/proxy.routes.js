import express from 'express';
import { identityMiddleware } from '../middleware/identity.middleware.js';
import { handleProxyRequest } from '../controllers/proxy.controller.js';

const router = express.Router();

router.all('*', identityMiddleware, handleProxyRequest);

export default router;
