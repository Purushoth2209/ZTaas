export const DEFAULT_JWT_CONFIG = {
  issuer: 'http://localhost:5001',
  jwksUri: 'http://localhost:5001/.well-known/jwks.json',
  audience: 'api-gateway',
  algorithms: ['RS256']
};
