import jwt from 'jsonwebtoken';
import { users } from '../data/users.js';
import { JWT_CONFIG } from '../config/jwt.config.js';

export const authenticateUser = (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return null;

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role
    },
    JWT_CONFIG.privateKey,
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      keyid: JWT_CONFIG.kid
    }
  );

  return { accessToken: token };
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.publicKey, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch {
    return null;
  }
};
