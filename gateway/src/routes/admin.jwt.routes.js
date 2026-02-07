import express from 'express';
import { getJwt, setJwt } from '../controllers/jwt.controller.js';

const router = express.Router();

router.get('/jwt', getJwt);
router.post('/jwt', setJwt);

export default router;
