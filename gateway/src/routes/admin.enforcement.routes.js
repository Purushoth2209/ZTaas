import express from 'express';
import { getEnforcement, setEnforcement } from '../controllers/enforcement.controller.js';

const router = express.Router();

router.get('/enforcement', getEnforcement);
router.post('/enforcement', setEnforcement);

export default router;
