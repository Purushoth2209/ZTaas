import { getAllTelemetry, getUserTelemetry } from '../services/telemetry.service.js';

export const getTelemetry = (req, res) => {
  const telemetry = getAllTelemetry();
  res.json({
    count: telemetry.length,
    records: telemetry
  });
};

export const getUserTelemetryData = (req, res) => {
  const { userId } = req.params;
  const telemetry = getUserTelemetry(userId);
  res.json({
    userId,
    count: telemetry.length,
    records: telemetry
  });
};
