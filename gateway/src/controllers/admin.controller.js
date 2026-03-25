import { getConfig, updateConfig } from '../services/systemConfig.service.js';
import { log } from '../utils/logger.js';

export const updateBackendConfig = async (req, res) => {
  const { backendUrl } = req.body;

  if (!backendUrl || typeof backendUrl !== 'string') {
    return res.status(400).json({ error: 'Invalid backendUrl' });
  }

  try {
    new URL(backendUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  await updateConfig({ backendUrl });
  log(`Backend target updated to: ${backendUrl}`);

  res.json({ success: true, backendUrl: getConfig().backendUrl });
};
