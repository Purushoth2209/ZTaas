import { DEFAULT_JWT_CONFIG } from '../config/default.jwt.config.js';

let jwtConfig = { ...DEFAULT_JWT_CONFIG };

export const getJwtConfig = () => ({ ...jwtConfig });

export const setJwtConfig = (config) => {
  jwtConfig = { ...jwtConfig, ...config };
};
