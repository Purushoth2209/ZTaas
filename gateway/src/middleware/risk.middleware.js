import { calculateRisk } from '../services/risk.service.js';
import { getPolicy } from '../services/riskPolicy.service.js';
import { log } from '../utils/logger.js';

export const riskMiddleware = async (req, res, next) => {
  const userId = req.identity?.username || req.identity?.userId || 'unknown';
  const tenantId = req.identity?.tenantId || req.identity?.tenant || 'default';

  try {
    const risk = await calculateRisk(userId, tenantId);
    req.risk = risk;

    if (risk.isColdStart) {
      log(`[SECURITY] Cold start detected for ${userId} → action=allow (monitoring)`);
      return next();
    }

    const policy = await getPolicy(tenantId);

    if (risk.riskScore >= policy.highThreshold) {
      log(`[SECURITY] User ${userId} risk=${risk.riskScore} level=${risk.riskLevel} → action=block`);
      return res.status(403).json({
        message: 'Access denied: High risk detected',
        riskScore: risk.riskScore
      });
    }

    if (risk.riskScore >= policy.mediumThreshold) {
      log(`[SECURITY] User ${userId} risk=${risk.riskScore} level=${risk.riskLevel} → action=step-up`);
      return res.status(401).json({
        message: 'Step-up authentication required',
        riskScore: risk.riskScore
      });
    }

    log(`[SECURITY] User ${userId} risk=${risk.riskScore} level=${risk.riskLevel} → action=allow`);
    next();
  } catch (err) {
    log(`[SECURITY] Risk calculation failed for ${userId}: ${err.message} → action=allow (fail-open)`);
    next();
  }
};
