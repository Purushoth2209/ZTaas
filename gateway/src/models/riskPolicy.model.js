import mongoose from 'mongoose';

const riskPolicySchema = new mongoose.Schema({
  tenantId:        { type: String, required: true, unique: true, index: true },
  highThreshold:   { type: Number, default: 0.58 },
  mediumThreshold: { type: Number, default: 0.30 },
  updatedAt:       { type: Date, default: Date.now },
});

export default mongoose.model('RiskPolicy', riskPolicySchema, 'risk_policies');
