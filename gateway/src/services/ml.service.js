import MLRisk from '../models/mlRisk.model.js';
import { log } from '../utils/logger.js';

/**
 * Latest ML anomaly score for a user from risk_scores (written by ML microservice).
 * Fail-safe: returns null on error or missing data (caller uses rule-based risk only).
 */
export async function getLatestMLScore(userId) {
  try {
    const doc = await MLRisk.findOne({ userId })
      .sort({ timestamp: -1 })
      .select({ score: 1, label: 1, timestamp: 1 })
      .lean();

    if (!doc) return null;

    return {
      score: doc.score,
      label: doc.label,
      timestamp: doc.timestamp
    };
  } catch (err) {
    log(`[ML] getLatestMLScore failed for ${userId}: ${err.message}`);
    return null;
  }
}

export default { getLatestMLScore };
