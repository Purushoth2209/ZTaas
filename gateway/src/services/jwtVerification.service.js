import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { getJwtConfig } from './config.service.js';

let client = null;

const getJwksClient = () => {
  const config = getJwtConfig();
  if (!client || client.options.jwksUri !== config.jwksUri) {
    client = jwksClient({
      jwksUri: config.jwksUri,
      cache: true,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }
  return client;
};

const getSigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    getJwksClient().getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
};

export const verifyJwt = async (token) => {
  const config = getJwtConfig();
  
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header.kid) {
    throw new Error('Invalid token structure');
  }

  const publicKey = await getSigningKey(decoded.header.kid);
  
  const verified = jwt.verify(token, publicKey, {
    algorithms: config.algorithms,
    issuer: config.issuer,
    audience: config.audience
  });

  return {
    userId: verified.sub,
    username: verified.username,
    role: verified.role,
    issuer: verified.iss
  };
};
