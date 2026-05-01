import MLRisk from '../models/mlRisk.model.js';

export const getRecentMLScores = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const records = await MLRisk.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select({ userId: 1, tenantId: 1, score: 1, rawScore: 1, label: 1, timestamp: 1, requestId: 1 })
      .lean();

    res.json({ count: records.length, records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ML risk scores' });
  }
};

export const getMLScoresStats = async (req, res) => {
  try {
    const windowMs = Math.min(parseInt(req.query.windowMs, 10) || 86400000, 30 * 86400000);
    const since = new Date(Date.now() - windowMs);

    const [total, sinceCount, byLabel] = await Promise.all([
      MLRisk.countDocuments(),
      MLRisk.countDocuments({ timestamp: { $gte: since } }),
      MLRisk.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$label', count: { $sum: 1 } } }
      ])
    ]);

    const labelCounts = { normal: 0, anomaly: 0, other: 0 };
    for (const row of byLabel) {
      const key = (row._id || '').toLowerCase();
      if (key === 'normal') labelCounts.normal += row.count;
      else if (key === 'anomaly') labelCounts.anomaly += row.count;
      else labelCounts.other += row.count;
    }

    res.json({
      totalAllTime: total,
      windowMs,
      totalInWindow: sinceCount,
      labelCountsInWindow: labelCounts
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ML statistics' });
  }
};
