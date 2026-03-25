import 'dotenv/config';
import app from './app.js';
import { log } from './utils/logger.js';
import { connectDB } from './config/db.js';
import { startBaselineJob } from './jobs/baseline.job.js';
import { loadConfig, getConfig } from './services/systemConfig.service.js';

const PORT = 8081;

const start = async () => {
  await connectDB();
  await loadConfig();
  startBaselineJob();
  app.listen(PORT, () => {
    log(`Gateway listening on port ${PORT}`);
    log(`Backend target: ${getConfig().backendUrl}`);
  });
};

start();
