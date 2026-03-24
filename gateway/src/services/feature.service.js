import TelemetryModel from '../models/telemetry.model.js';
import { log } from '../utils/logger.js';

// ML stability caps — prevents extreme outliers from skewing models
const CAPS = {
  requestsPerMin: 1000,
  failedRequests: 500,
  uniqueEndpoints: 200,
  avgResponseTime: 30000,
  uniqueIPs: 50,
  uniqueUserAgents: 50,
  authDeniedCount: 500,
  peakRequestBurst: 500,
  writeMethods: 500
};

const cap = (value, key) => Math.min(value, CAPS[key] ?? value);

export const getUserFeatures = async (userId, tenantId = 'default', windowMs = 60000) => {
  const since = Date.now() - windowMs;
  const burstWindowMs = 5000;

  const [result] = await TelemetryModel.aggregate([
    { $match: { userId, tenantId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: null,
        requestsPerMin: { $sum: 1 },
        failedRequests: {
          $sum: { $cond: [{ $gte: ['$responseStatus', 400] }, 1, 0] }
        },
        authDeniedCount: {
          $sum: { $cond: [{ $eq: ['$authorizationResult', 'denied'] }, 1, 0] }
        },
        endpoints: { $addToSet: '$endpoint' },
        ips: { $addToSet: '$ipAddress' },
        userAgents: { $addToSet: '$userAgent' },
        avgResponseTime: { $avg: '$requestDuration' },
        methods: { $push: '$method' },
        timestamps: { $push: '$timestamp' }
      }
    }
  ]);

  if (!result) {
    const empty = {
      userId, tenantId, requestsPerMin: 0, failedRequests: 0, failureRate: 0,
      uniqueEndpoints: 0, avgResponseTime: 0, uniqueIPs: 0,
      uniqueUserAgents: 0, authDeniedCount: 0, peakRequestBurst: 0,
      writeMethods: 0, writeRatio: 0
    };
    log(`[FEATURE] User ${userId} (tenant: ${tenantId}) → ${JSON.stringify(empty)}`);
    return empty;
  }

  const total = cap(result.requestsPerMin, 'requestsPerMin');
  const writeMethods = cap(
    result.methods.filter(m => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(m)).length,
    'writeMethods'
  );

  // peak burst: max requests in any 5s sub-window
  let peakRequestBurst = 0;
  if (result.timestamps.length > 0) {
    const sorted = result.timestamps.sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < sorted.length; end++) {
      while (sorted[end] - sorted[start] > burstWindowMs) start++;
      peakRequestBurst = Math.max(peakRequestBurst, end - start + 1);
    }
  }

  const features = {
    userId,
    tenantId,
    requestsPerMin: total,
    failedRequests: cap(result.failedRequests, 'failedRequests'),
    failureRate: total > 0 ? +(result.failedRequests / result.requestsPerMin).toFixed(3) : 0,
    uniqueEndpoints: cap(result.endpoints.length, 'uniqueEndpoints'),
    avgResponseTime: cap(Math.round(result.avgResponseTime || 0), 'avgResponseTime'),
    uniqueIPs: cap(result.ips.length, 'uniqueIPs'),
    uniqueUserAgents: cap(result.userAgents.length, 'uniqueUserAgents'),
    authDeniedCount: cap(result.authDeniedCount, 'authDeniedCount'),
    peakRequestBurst: cap(peakRequestBurst, 'peakRequestBurst'),
    writeMethods,
    writeRatio: total > 0 ? +(writeMethods / total).toFixed(3) : 0
  };

  log(`[FEATURE] User ${userId} (tenant: ${tenantId}) → ${JSON.stringify(features)}`);
  return features;
};

export default { getUserFeatures };
