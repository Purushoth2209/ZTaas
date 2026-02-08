import jwt from 'jsonwebtoken';
import { keyManager } from '../utils/keyManager.js';

const GATEWAY_ISSUER = 'https://gateway.internal';

export class JWTService {
  static signToken(payload, options = {}) {
    const currentKey = keyManager.getCurrentKey();
    const privateKey = keyManager.getPrivateKey(currentKey.kid);
    
    const defaultOptions = {
      algorithm: 'RS256',
      issuer: GATEWAY_ISSUER,
      expiresIn: '1h',
      keyid: currentKey.kid
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    return jwt.sign(payload, privateKey, finalOptions);
  }

  static verifyToken(token, options = {}) {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token: missing kid');
    }

    const publicKey = keyManager.getPublicKey(decoded.header.kid);
    if (!publicKey) {
      throw new Error('Invalid token: unknown key');
    }

    const defaultOptions = {
      algorithms: ['RS256'],
      issuer: GATEWAY_ISSUER
    };

    return jwt.verify(token, publicKey, { ...defaultOptions, ...options });
  }

  static getJWKS() {
    return keyManager.getJWKS();
  }
}