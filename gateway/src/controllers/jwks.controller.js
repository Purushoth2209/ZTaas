import { JWTService } from '../services/jwt.service.js';

export const getJWKS = (req, res) => {
  try {
    const jwks = JWTService.getJWKS();
    res.json(jwks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve JWKS' });
  }
};