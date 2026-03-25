import { getAllTelemetry, getUserTelemetry } from '../services/telemetry.service.js';
import { getUserFeatures } from '../services/feature.service.js';

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
