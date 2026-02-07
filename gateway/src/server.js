import app from './app.js';
import { log } from './utils/logger.js';
import { getBackendTarget } from './config/config.js';

const PORT = 8081;

app.listen(PORT, () => {
  log(`Gateway listening on port ${PORT}`);
  log(`Backend target: ${getBackendTarget()}`);
});
