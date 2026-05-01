import mongoose from 'mongoose';

const mlRiskSchema = new mongoose.Schema({
  requestId: String,
  userId: { type: String, required: true, index: true },
  tenantId: String,
  score: Number,
  rawScore: Number,
  label: String,
  features: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, index: true }
});

mlRiskSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('MLRisk', mlRiskSchema, 'risk_scores');
