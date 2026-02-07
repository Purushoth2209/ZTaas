import express from 'express';
import { getJwtConfig, setJwtConfig } from '../services/config.service.js';

const router = express.Router();

router.get('/jwt', (req, res) => {
  res.json(getJwtConfig());
});

router.post('/jwt', (req, res) => {
  const { issuer, jwksUri, audience, algorithms } = req.body;
  
  const config = {};
  if (issuer) config.issuer = issuer;
  if (jwksUri) config.jwksUri = jwksUri;
  if (audience) config.audience = audience;
  if (algorithms) config.algorithms = algorithms;

  setJwtConfig(config);
  
  res.json({ message: 'JWT configuration updated', config: getJwtConfig() });
});

export default router;
