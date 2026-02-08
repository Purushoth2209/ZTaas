export const STS_CONFIG = {
  issuer: 'https://gateway.internal',
  jwksUri: 'http://localhost:3000/gateway/.well-known/jwks.json',
  defaultAudience: 'api-clients',
  defaultExpiresIn: '1h',
  algorithm: 'RS256',
  keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxKeys: 3 // Keep maximum 3 keys for rotation
};