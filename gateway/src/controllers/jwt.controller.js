import { getJwtConfig, updateJwtConfig } from '../services/config.service.js';

export const getJwt = (req, res) => {
  const result = getJwtConfig();
  res.json(result);
};

export const setJwt = (req, res) => {
  try {
    const result = updateJwtConfig(req.body);
    res.json({ message: 'JWT configuration updated', config: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
