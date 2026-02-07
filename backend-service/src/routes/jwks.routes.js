import express from 'express';
import { getJWKS } from '../utils/jwk.util.js';

const router = express.Router();

router.get('/jwks.json', (req, res) => {
  res.json(getJWKS());
});

export default router;
