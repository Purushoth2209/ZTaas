import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { users } from '../data/users.js';
import { JWT_CONFIG } from '../config/jwt.config.js';

const GATEWAY_ISSUER = 'https://gateway.internal';
const GATEWAY_JWKS_URI = 'http://localhost:8081/gateway/.well-known/jwks.json';
const GATEWAY_AUDIENCE = 'backend-service';

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

// DEPRECATED: Only for testing - production uses gateway
export const authenticateUser = (username, password) => {
  console.warn('DEPRECATED: Direct backend login. Use gateway for production.');
  
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

// STEP 5.5: GATEWAY-ONLY - Strict issuer enforcement
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token structure');
    }

    // STRICT: Only accept gateway-issued tokens
    if (decoded.payload.iss !== GATEWAY_ISSUER) {
      throw new Error(`Rejected: issuer=${decoded.payload.iss}, expected=${GATEWAY_ISSUER}`);
    }

    // Verify signature using gateway JWKS
    const publicKey = await getGatewaySigningKey(decoded.header.kid);
    
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: GATEWAY_ISSUER,
      audience: GATEWAY_AUDIENCE
    });

    return verified;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};
