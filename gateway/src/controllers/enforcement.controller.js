import { getEnforcementMode, updateEnforcementMode } from '../services/config.service.js';

export const getEnforcement = (req, res) => {
  const result = getEnforcementMode();
  res.json(result);
};

export const setEnforcement = (req, res) => {
  try {
    const result = updateEnforcementMode(req.body.enforcementMode);
    res.json({ message: 'Enforcement mode updated', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
