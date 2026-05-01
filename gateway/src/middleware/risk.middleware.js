import { calculateRisk } from '../services/risk.service.js';
import { getLatestMLScore } from '../services/ml.service.js';
import { getPolicy } from '../services/riskPolicy.service.js';
import { publishToQueue } from '../services/queue.service.js';
import { log } from '../utils/logger.js';
import { randomUUID } from 'crypto';

export const riskMiddleware = async (req, res, next) => {
  const userId = req.identity?.username || req.identity?.userId || 'unknown';
  const tenantId = req.identity?.tenantId || req.identity?.tenant || 'default';
  const requestId = req.headers['x-request-id'] || randomUUID();

  try {
    const risk = await calculateRisk(userId, tenantId);
    req.risk = risk;

    const ml = await getLatestMLScore(userId);

    let finalScore = risk.riskScore;
    if (ml && ml.score !== undefined && ml.score !== null) {
      finalScore = +(0.5 * risk.riskScore + 0.5 * ml.score).toFixed(4);
    }

    req.ml = ml;
    req.finalRiskScore = finalScore;

    console.log('[RISK] Rule:', risk.riskScore, 'ML:', ml?.score, 'Final:', finalScore);

    if (risk.features) {
      const payload = {
        requestId,
        userId,
        tenantId,
        timestamp: Date.now(),
        features: {
          requestsPerMin: risk.features.requestsPerMin,
          failureRate:    risk.features.failureRate,
          uniqueIPs:      risk.features.uniqueIPs,
          avgResponseTime: risk.features.avgResponseTime
        }
      };

      console.log('[QUEUE] Publishing ML features:', payload);
      publishToQueue(payload);
    }

    if (risk.isColdStart) {
      log(`[SECURITY] Cold start detected for ${userId} → action=allow (monitoring)`);
      return next();
    }

    const policy = await getPolicy(tenantId);

    if (finalScore >= policy.highThreshold) {
      log(`[SECURITY] User ${userId} final=${finalScore} (rule=${risk.riskScore}) level=${risk.riskLevel} → action=block`);
      return res.status(403).json({
        message: 'Access denied: High risk detected',
        riskScore: finalScore,
        ruleRiskScore: risk.riskScore,
        mlScore: ml?.score ?? null
      });
    }

    if (finalScore >= policy.mediumThreshold) {
      log(`[SECURITY] User ${userId} final=${finalScore} (rule=${risk.riskScore}) level=${risk.riskLevel} → action=step-up`);
      return res.status(401).json({
        message: 'Step-up authentication required',
        riskScore: finalScore,
        ruleRiskScore: risk.riskScore,
        mlScore: ml?.score ?? null
      });
    }

    log(`[SECURITY] User ${userId} final=${finalScore} (rule=${risk.riskScore}) level=${risk.riskLevel} → action=allow`);
    next();
  } catch (err) {
    log(`[SECURITY] Risk calculation failed for ${userId}: ${err.message} → action=allow (fail-open)`);
    next();
  }
};
