import mongoose from 'mongoose';

const baselineSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  windowMs: Number,
  avgRequestsPerMin: Number,
  stdRequestsPerMin: Number,
  avgFailureRate: Number,
  stdFailureRate: Number,
  avgUniqueIPs: Number,
  stdUniqueIPs: Number,
  avgResponseTime: Number,
  stdResponseTime: Number,
  createdAt: { type: Date, default: Date.now }
});

baselineSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Baseline', baselineSchema, 'baselines');
