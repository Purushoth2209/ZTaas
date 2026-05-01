import TelemetryModel from '../models/telemetry.model.js';
import { getUserFeatures } from './feature.service.js';
import { getBaseline, BASELINE_WINDOW_MS } from './baseline.service.js';
import { getPolicy } from './riskPolicy.service.js';
import { log } from '../utils/logger.js';

async function activeUserCount(tenantId, windowMs = BASELINE_WINDOW_MS) {
  const since = Date.now() - windowMs;
  const ids = await TelemetryModel.distinct('userId', {
    tenantId,
    timestamp: { $gte: since },
    userId: { $nin: [null, ''] },
  });
  return Math.max(ids.length, 1);
}

function deviationScore(value, mean, std) {
  if (!std || std === 0) return 0;
  const deviation = (value - mean) / std;
  if (deviation <= 0) return 0;
  return Math.min(deviation / 3, 1);
}

/** When tenant baseline is polluted by the same attack traffic, z-scores collapse; ratio catches bursts. */
function burstVolumeScore(userRpmEst, fairShareRpm) {
  if (!fairShareRpm || fairShareRpm <= 0 || userRpmEst <= 0) return 0;
  const ratio = userRpmEst / fairShareRpm;
  if (ratio < 4) return 0;
  return Math.min(Math.log2(ratio / 2) / 4, 1);
}

/** Penalize very high absolute failure rates even if tenant baseline failures are already elevated. */
function absoluteFailureScore(failureRate) {
  if (failureRate <= 0.45) return 0;
  return Math.min((failureRate - 0.45) / 0.45, 1);
}

const WINDOWS = [60000, 10 * 60000, 60 * 60000];

export const calculateRisk = async (userId, tenantId = 'default') => {
  let features = null;
  let usedWindow = WINDOWS[0];

  for (const windowMs of WINDOWS) {
    features = await getUserFeatures(userId, tenantId, windowMs);
    if (features && features.requestsPerMin > 0) {
      usedWindow = windowMs;
      break;
    }
  }

  if (usedWindow > WINDOWS[0]) {
    log(`[SECURITY] Multi-window fallback triggered for ${userId} → window=${usedWindow}ms`);
  }

  if (!features || features.requestsPerMin === 0) {
    log(`[SECURITY] Cold start for ${userId} — no behavioral data`);
    return {
      userId, tenantId, riskScore: 0.4, riskLevel: 'MEDIUM',
      isColdStart: true, reason: 'No recent behavioral data'
    };
  }

  const baseline = await getBaseline(tenantId);

  const mlFeaturePayload = {
    requestsPerMin: features.requestsPerMin,
    failureRate: features.failureRate,
    uniqueIPs: features.uniqueIPs,
    avgResponseTime: features.avgResponseTime,
  };

  if (!baseline) {
    log(`[SECURITY] No baseline for tenant ${tenantId}, defaulting to LOW risk for ${userId}`);
    return {
      userId, tenantId, riskScore: 0, riskLevel: 'LOW',
      warning: 'No baseline available — using safe defaults',
      breakdown: { requestsScore: 0, failureScore: 0, ipScore: 0, responseTimeScore: 0 },
      features: mlFeaturePayload,
    };
  }

  /**
   * Baseline aggregates tenant-wide traffic per calendar minute; user features count requests in `usedWindow`.
   * Compare each user's estimated per-minute rate to a fair share of tenant RPM so bursts show up on the dashboard.
   */
  const nUsers = await activeUserCount(tenantId, BASELINE_WINDOW_MS);
  const userRpmEst = features.requestsPerMin * (60000 / usedWindow);
  const fairShareRpm = Math.max((baseline.avgRequestsPerMin || 0) / nUsers, 0.05);
  const stdRpmShare = Math.max((baseline.stdRequestsPerMin || 0) / Math.sqrt(nUsers), 0.01);

  const fairShareIp = Math.max((baseline.avgUniqueIPs || 0) / nUsers, 0.25);
  const stdIpShare = Math.max((baseline.stdUniqueIPs || 0) / Math.sqrt(nUsers), 0.25);

  const requestsScore = Math.max(
    deviationScore(userRpmEst, fairShareRpm, stdRpmShare),
    burstVolumeScore(userRpmEst, fairShareRpm)
  );
  const failureScore = Math.max(
    deviationScore(features.failureRate, baseline.avgFailureRate, baseline.stdFailureRate),
    absoluteFailureScore(features.failureRate)
  );
  const ipScore = deviationScore(features.uniqueIPs, fairShareIp, stdIpShare);
  const responseTimeScore = deviationScore(features.avgResponseTime, baseline.avgResponseTime, baseline.stdResponseTime);

  const riskScore = +(
    requestsScore * 0.3 +
    failureScore * 0.3 +
    ipScore * 0.2 +
    responseTimeScore * 0.2
  ).toFixed(4);

  const policy = await getPolicy(tenantId);
  const riskLevel = riskScore >= policy.highThreshold ? 'HIGH'
    : riskScore >= policy.mediumThreshold ? 'MEDIUM' : 'LOW';

  log(`[SECURITY] Risk computed for ${userId} → score: ${riskScore}, level: ${riskLevel}`);

  return {
    userId, tenantId, riskScore, riskLevel,
    breakdown: { requestsScore, failureScore, ipScore, responseTimeScore },
    features: mlFeaturePayload,
  };
};

export default { calculateRisk };
