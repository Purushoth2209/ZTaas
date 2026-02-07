import express from 'express';
import { getAllPolicies, updatePolicies, deletePolicies } from '../controllers/admin.policy.controller.js';

const router = express.Router();

router.get('/policies', getAllPolicies);
router.post('/policies', updatePolicies);
router.delete('/policies', deletePolicies);

export default router;
