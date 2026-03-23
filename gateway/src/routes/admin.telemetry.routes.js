import express from 'express';
import { getTelemetry, getUserTelemetryData } from '../controllers/telemetry.controller.js';

const router = express.Router();

router.get('/telemetry', getTelemetry);
router.get('/telemetry/user/:userId', getUserTelemetryData);

export default router;
