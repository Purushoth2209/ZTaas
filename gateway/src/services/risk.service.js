import { getUserFeatures } from './feature.service.js';
import { getBaseline } from './baseline.service.js';
import { log } from '../utils/logger.js';

function deviationScore(value, mean, std) {
  if (!std || std === 0) return 0;
  const deviation = (value - mean) / std;
  if (deviation <= 0) return 0;
  return Math.min(deviation / 3, 1);
}

export const calculateRisk = async (userId, tenantId = 'default') => {
  const features = await getUserFeatures(userId, tenantId);
  const baseline = await getBaseline(tenantId);

  if (!baseline) {
    log(`[SECURITY] No baseline for tenant ${tenantId}, defaulting to LOW risk for ${userId}`);
    return {
      userId,
      tenantId,
      riskScore: 0,
      riskLevel: 'LOW',
      warning: 'No baseline available — using safe defaults',
      breakdown: { requestsScore: 0, failureScore: 0, ipScore: 0, responseTimeScore: 0 }
    };
  }

  const requestsScore = deviationScore(features.requestsPerMin, baseline.avgRequestsPerMin, baseline.stdRequestsPerMin);
  const failureScore = deviationScore(features.failureRate, baseline.avgFailureRate, baseline.stdFailureRate);
  const ipScore = deviationScore(features.uniqueIPs, baseline.avgUniqueIPs, baseline.stdUniqueIPs);
  const responseTimeScore = deviationScore(features.avgResponseTime, baseline.avgResponseTime, baseline.stdResponseTime);

  const riskScore = +(
    requestsScore * 0.3 +
    failureScore * 0.3 +
    ipScore * 0.2 +
    responseTimeScore * 0.2
  ).toFixed(4);

  const riskLevel = riskScore < 0.3 ? 'LOW' : riskScore < 0.7 ? 'MEDIUM' : 'HIGH';

  log(`[SECURITY] Risk computed for ${userId} → score: ${riskScore}, level: ${riskLevel}`);

  return {
    userId,
    tenantId,
    riskScore,
    riskLevel,
    breakdown: { requestsScore, failureScore, ipScore, responseTimeScore }
  };
};

export default { calculateRisk };
