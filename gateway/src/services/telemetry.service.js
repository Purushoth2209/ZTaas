import { randomUUID } from 'crypto';
import TelemetryModel from '../models/telemetry.model.js';

export const collectRequestTelemetry = (req) => {
  const identity = req.identity || {};
  
  return {
    requestId: randomUUID(),
    userId: identity.username || identity.sub || null,
    role: identity.role || null,
    tenantId: identity.tenantId || 'default',
    ipAddress: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: Date.now(),
    authorizationResult: null,
    responseStatus: null,
    requestDuration: null
  };
};

export const storeTelemetry = (record) => {
  return TelemetryModel.create(record);
};

export const getAllTelemetry = (page = 1, limit = 1000) => {
  const skip = (page - 1) * limit;
  return TelemetryModel.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
};

export const getUserTelemetry = (userId, page = 1, limit = 500) => {
  const skip = (page - 1) * limit;
  return TelemetryModel.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
};
