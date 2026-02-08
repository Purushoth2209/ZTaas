import express from 'express';
import { issueToken, verifyToken } from '../controllers/sts.controller.js';

const router = express.Router();

router.post('/token', issueToken);
router.post('/verify', verifyToken);

export default router;