import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema({
  requestId: String,
  userId: String,
  role: String,
  tenantId: { type: String, default: 'default' },
  ipAddress: String,
  xForwardedFor: String,
  userAgent: String,
  endpoint: String,
  method: String,
  timestamp: Number,
  authorizationResult: String,
  responseStatus: Number,
  requestDuration: Number
}, { timestamps: true });

telemetrySchema.index({ userId: 1 });
telemetrySchema.index({ timestamp: -1 });
telemetrySchema.index({ tenantId: 1, timestamp: -1 });

export default mongoose.model('Telemetry', telemetrySchema, 'telemetry_logs');
