import TelemetryModel from '../models/telemetry.model.js';
import { computeBaseline } from '../services/baseline.service.js';
import { log } from '../utils/logger.js';

const INTERVAL_MS = 3600000; // 1 hour

const runBaselineJob = async () => {
  try {
    const tenants = await TelemetryModel.distinct('tenantId');
    log(`[BASELINE JOB] Running for ${tenants.length} tenant(s)`);
    for (const tenantId of tenants) {
      await computeBaseline(tenantId, INTERVAL_MS);
    }
  } catch (err) {
    log(`[BASELINE JOB] Error: ${err.message}`);
  }
};

export const startBaselineJob = () => {
  log(`[BASELINE JOB] Scheduled every ${INTERVAL_MS / 60000} min`);
  setInterval(runBaselineJob, INTERVAL_MS);
  runBaselineJob(); // run immediately on startup
};

export default { startBaselineJob };
