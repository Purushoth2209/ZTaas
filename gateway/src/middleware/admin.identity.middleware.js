import jwt from 'jsonwebtoken';
import { ADMIN_SECRET } from '../controllers/admin.auth.controller.js';

export const adminIdentityMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(authHeader.substring(7), ADMIN_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
