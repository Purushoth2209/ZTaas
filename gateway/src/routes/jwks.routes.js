import express from 'express';
import { getJWKS } from '../controllers/jwks.controller.js';

const router = express.Router();

router.get('/jwks.json', getJWKS);

export default router;