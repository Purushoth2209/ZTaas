// Phase 3: Gateway is the sole authorization authority
export const AUTHZ_SOURCE = process.env.AUTHZ_SOURCE || 'gateway';
export const JWT_VALIDATION_MODE = process.env.JWT_VALIDATION_MODE || 'enforce';

// Startup validation: Enforce gateway-only authorization
if (AUTHZ_SOURCE !== 'gateway') {
  console.error(`FATAL: AUTHZ_SOURCE must be 'gateway'. Current value: '${AUTHZ_SOURCE}'`);
  console.error('Phase 3 requires gateway as the sole authorization authority.');
  process.exit(1);
}

if (JWT_VALIDATION_MODE !== 'enforce' && JWT_VALIDATION_MODE !== 'audit') {
  console.error(`FATAL: JWT_VALIDATION_MODE must be 'enforce' or 'audit'. Current value: '${JWT_VALIDATION_MODE}'`);
  process.exit(1);
}

export const isJwtAuditMode = () => JWT_VALIDATION_MODE === 'audit';
