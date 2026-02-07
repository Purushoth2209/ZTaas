import app from './app.js';
import { log } from './utils/logger.js';

const PORT = 5001;

app.listen(PORT, () => {
  log(`Backend service listening on port ${PORT}`);
});
