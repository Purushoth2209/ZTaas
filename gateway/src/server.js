import 'dotenv/config';
import app from './app.js';
import { log } from './utils/logger.js';
import { getBackendTarget } from './config/config.js';
import { connectDB } from './config/db.js';

const PORT = 8081;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    log(`Gateway listening on port ${PORT}`);
    log(`Backend target: ${getBackendTarget()}`);
  });
};

start();
