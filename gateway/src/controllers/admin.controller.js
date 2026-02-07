import { setBackendTarget, getBackendTarget } from '../config/config.js';
import { log } from '../utils/logger.js';

export const updateBackendConfig = (req, res) => {
  const { backendUrl } = req.body;

  if (!backendUrl || typeof backendUrl !== 'string') {
    return res.status(400).json({ error: 'Invalid backendUrl' });
  }

  try {
    new URL(backendUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  setBackendTarget(backendUrl);
  log(`Backend target updated to: ${backendUrl}`);

  res.json({
    success: true,
    backendUrl: getBackendTarget()
  });
};
