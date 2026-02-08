import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { users } from '../data/users.js';
import { JWT_CONFIG } from '../config/jwt.config.js';

const GATEWAY_ISSUER = 'https://gateway.internal';
const GATEWAY_JWKS_URI = 'http://localhost:8081/gateway/.well-known/jwks.json';

let gatewayJwksClient = null;

const getGatewayJwksClient = () => {
  if (!gatewayJwksClient) {
    gatewayJwksClient = jwksClient({
      jwksUri: GATEWAY_JWKS_URI,
      cache: true,
      cacheMaxAge: 600000
    });
  }
  return gatewayJwksClient;
};

const getGatewaySigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    getGatewayJwksClient().getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
};

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

export const verifyToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;

    const issuer = decoded.payload.iss;

    // Gateway-issued token
    if (issuer === GATEWAY_ISSUER) {
      const publicKey = await getGatewaySigningKey(decoded.header.kid);
      return jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: GATEWAY_ISSUER,
        audience: 'backend-service'
      });
    }

    // Backend-issued token (legacy)
    return jwt.verify(token, JWT_CONFIG.publicKey, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch {
    return null;
  }
};
