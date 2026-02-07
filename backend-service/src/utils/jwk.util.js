import crypto from 'crypto';
import { JWT_CONFIG } from '../config/jwt.config.js';

export const getJWKS = () => {
  const publicKey = crypto.createPublicKey(JWT_CONFIG.publicKey);
  const jwk = publicKey.export({ format: 'jwk' });

  return {
    keys: [
      {
        kty: jwk.kty,
        use: 'sig',
        alg: JWT_CONFIG.algorithm,
        kid: JWT_CONFIG.kid,
        n: jwk.n,
        e: jwk.e
      }
    ]
  };
};
