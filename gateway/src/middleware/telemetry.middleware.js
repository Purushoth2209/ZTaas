import { collectRequestTelemetry, storeTelemetry } from '../services/telemetry.service.js';
import { log } from '../utils/logger.js';

export const telemetryMiddleware = (req, res, next) => {
  const telemetryRecord = collectRequestTelemetry(req);
  
  res.on('finish', () => {
    telemetryRecord.responseStatus = res.statusCode;
    telemetryRecord.authorizationResult = res.statusCode === 403 ? 'denied' : 'allowed';
    
    storeTelemetry(telemetryRecord);
    
    log(`[Telemetry] User ${telemetryRecord.userId || 'anonymous'} accessed ${telemetryRecord.method} ${telemetryRecord.endpoint} status=${telemetryRecord.responseStatus}`);
  });
  
  next();
};
