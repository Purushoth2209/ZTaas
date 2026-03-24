import { collectRequestTelemetry, storeTelemetry } from '../services/telemetry.service.js';
import { log } from '../utils/logger.js';

export const telemetryMiddleware = (req, res, next) => {
  const telemetryRecord = collectRequestTelemetry(req);
  const start = Date.now();
  
  res.on('finish', () => {
    telemetryRecord.responseStatus = res.statusCode;
    telemetryRecord.authorizationResult = res.statusCode === 403 ? 'denied' : 'allowed';
    telemetryRecord.requestDuration = Date.now() - start;
    
    storeTelemetry(telemetryRecord).catch(err => {
      log(`[Telemetry] Failed to store: ${err.message}`);
    });
    
    log(`[Telemetry] User ${telemetryRecord.userId || 'anonymous'} accessed ${telemetryRecord.method} ${telemetryRecord.endpoint} status=${telemetryRecord.responseStatus} duration=${telemetryRecord.requestDuration}ms`);
  });
  
  next();
};
