import TelemetryModel from '../models/telemetry.model.js';
import BaselineModel from '../models/baseline.model.js';
import { log } from '../utils/logger.js';

/** Must match `baseline.job.js` INTERVAL_MS so getBaseline reads the same doc the job writes */
export const BASELINE_WINDOW_MS = 3600000;

const std = (values, mean) => {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const computeBaseline = async (tenantId, windowMs = 3600000) => {
  const since = Date.now() - windowMs;

  const buckets = await TelemetryModel.aggregate([
    { $match: { tenantId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: { $floor: { $divide: ['$timestamp', 60000] } },
        requestsPerMin: { $sum: 1 },
        failedRequests: {
          $sum: { $cond: [{ $gte: ['$responseStatus', 400] }, 1, 0] }
        },
        uniqueIPs: { $addToSet: '$ipAddress' },
        avgResponseTime: { $avg: '$requestDuration' }
      }
    }
  ]);

  if (!buckets.length) {
    log(`[BASELINE] No telemetry data for tenant ${tenantId}, skipping`);
    return null;
  }

  const metrics = buckets.map(b => ({
    requestsPerMin: b.requestsPerMin,
    failureRate: b.requestsPerMin > 0 ? b.failedRequests / b.requestsPerMin : 0,
    uniqueIPs: b.uniqueIPs.length,
    responseTime: b.avgResponseTime || 0
  }));

  const avg = (arr, key) => arr.reduce((s, m) => s + m[key], 0) / arr.length;

  const avgRequestsPerMin = avg(metrics, 'requestsPerMin');
  const avgFailureRate = avg(metrics, 'failureRate');
  const avgUniqueIPs = avg(metrics, 'uniqueIPs');
  const avgResponseTime = avg(metrics, 'responseTime');

  const baseline = await BaselineModel.findOneAndUpdate(
    { tenantId, windowMs },
    {
      tenantId,
      windowMs,
      avgRequestsPerMin,
      stdRequestsPerMin: std(metrics.map(m => m.requestsPerMin), avgRequestsPerMin),
      avgFailureRate,
      stdFailureRate: std(metrics.map(m => m.failureRate), avgFailureRate),
      avgUniqueIPs,
      stdUniqueIPs: std(metrics.map(m => m.uniqueIPs), avgUniqueIPs),
      avgResponseTime,
      stdResponseTime: std(metrics.map(m => m.responseTime), avgResponseTime),
      createdAt: new Date()
    },
    { upsert: true, new: true }
  );

  log(`[BASELINE] Computed for tenant ${tenantId}`);
  return baseline;
};

export const getBaseline = async (tenantId, windowMs = BASELINE_WINDOW_MS) => {
  let baseline = await BaselineModel.findOne({ tenantId, windowMs }).sort({ createdAt: -1 }).lean();
  if (!baseline) {
    baseline = await BaselineModel.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
  }
  if (baseline) {
    log(`[BASELINE] Loaded baseline for tenant ${tenantId} windowMs=${baseline.windowMs ?? windowMs}`);
    return baseline;
  }
  log(`[BASELINE] No baseline found for tenant ${tenantId}, computing now`);
  return computeBaseline(tenantId, windowMs);
};

export default { computeBaseline, getBaseline };
