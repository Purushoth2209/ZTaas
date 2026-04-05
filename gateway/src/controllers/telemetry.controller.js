import { getAllTelemetry, getUserTelemetry } from '../services/telemetry.service.js';
import { getUserFeatures } from '../services/feature.service.js';
import { calculateRisk } from '../services/risk.service.js';
import { getBaseline } from '../services/baseline.service.js';
import TelemetryModel from '../models/telemetry.model.js';

export const getTelemetry = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 1000, 1000);
    const records = await getAllTelemetry(page, limit);
    res.json({ page, limit, count: records.length, records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
};

export const getUserTelemetryData = async (req, res) => {
  try {
    const { userId, page: p, limit: l } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const page = parseInt(p) || 1;
    const limit = Math.min(parseInt(l) || 500, 500);
    const records = await getUserTelemetry(userId, page, limit);
    res.json({ userId, page, limit, count: records.length, records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user telemetry' });
  }
};

export const getUserFeaturesData = async (req, res) => {
  try {
    const { userId, tenant = 'default', window: w } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const windowMs = parseInt(w) || 60000;
    const features = await getUserFeatures(userId, tenant, windowMs);
    res.json(features);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute user features' });
  }
};

export const getBaselineData = async (req, res) => {
  try {
    const { tenantId = 'default' } = req.query;
    const baseline = await getBaseline(tenantId);
    if (!baseline) return res.status(404).json({ error: 'No baseline data found' });
    res.json(baseline);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch baseline' });
  }
};

export const getBaselineTimeseries = async (req, res) => {
  try {
    const { tenantId = 'default', windowMs = 3600000 } = req.query;
    const since = Date.now() - parseInt(windowMs);
    const buckets = await TelemetryModel.aggregate([
      { $match: { tenantId, timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $floor: { $divide: ['$timestamp', 60000] } },
          requestsPerMin: { $sum: 1 },
          failedRequests: { $sum: { $cond: [{ $gte: ['$responseStatus', 400] }, 1, 0] } },
          uniqueIPs:      { $addToSet: '$ipAddress' },
          avgResponseTime:{ $avg: '$requestDuration' },
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const series = buckets.map(b => ({
      minute:         b._id * 60000,
      requestsPerMin: b.requestsPerMin,
      failureRate:    b.requestsPerMin > 0 ? +(b.failedRequests / b.requestsPerMin).toFixed(3) : 0,
      uniqueIPs:      b.uniqueIPs.length,
      avgResponseTime:Math.round(b.avgResponseTime || 0),
    }));
    res.json({ tenantId, windowMs: parseInt(windowMs), series });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch baseline timeseries' });
  }
};

export const getUsersRiskSummary = async (req, res) => {
  try {
    const userDocs = await TelemetryModel.aggregate([
      { $group: { _id: '$userId', lastSeen: { $max: '$timestamp' }, tenantId: { $last: '$tenantId' } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { lastSeen: -1 } }
    ]);

    const results = await Promise.allSettled(
      userDocs.map(u => calculateRisk(u._id, u.tenantId || 'default').then(r => ({ ...r, lastSeen: u.lastSeen })))
    );

    const users = results
      .filter(r => r.status === 'fulfilled' && !r.value.isColdStart)
      .map(r => r.value)
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json({ users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute users risk summary' });
  }
};
