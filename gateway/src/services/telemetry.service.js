import { randomUUID } from 'crypto';

const telemetryStore = [];
const MAX_RECORDS = 10000;

export const collectRequestTelemetry = (req) => {
  const identity = req.identity || {};
  
  return {
    requestId: randomUUID(),
    userId: identity.username || identity.sub || null,
    role: identity.role || null,
    ipAddress: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: Date.now(),
    authorizationResult: null,
    responseStatus: null
  };
};

export const storeTelemetry = (record) => {
  telemetryStore.push(record);
  limitTelemetryStore();
};

export const getUserTelemetry = (userId) => {
  return telemetryStore.filter(record => record.userId === userId);
};

export const getAllTelemetry = () => {
  return [...telemetryStore];
};

export const limitTelemetryStore = () => {
  if (telemetryStore.length > MAX_RECORDS) {
    telemetryStore.splice(0, telemetryStore.length - MAX_RECORDS);
  }
};
