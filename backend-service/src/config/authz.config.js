export const AUTHZ_SOURCE = process.env.AUTHZ_SOURCE || 'gateway';

export const isGatewayAuthz = () => AUTHZ_SOURCE === 'gateway';
export const isJwtAuthz = () => AUTHZ_SOURCE === 'jwt';
