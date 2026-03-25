import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  path:    { type: String, required: true },
  methods: { type: [String], required: true },
  roles:   { type: [String], required: true },
}, { _id: false });

const authPolicySchema = new mongoose.Schema({
  tenantId:  { type: String, required: true, unique: true, index: true },
  rules:     { type: [ruleSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('AuthPolicy', authPolicySchema, 'auth_policies');
