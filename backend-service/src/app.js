import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import jwksRoutes from './routes/jwks.routes.js';
import { gatewayTrustMiddleware } from './middleware/gatewayTrust.middleware.js';
import { AUTHZ_SOURCE } from './config/authz.config.js';
import { log } from './utils/logger.js';
import { startTimer, getElapsedTime } from './utils/timer.js';

const app = express();

log(`AUTHZ_SOURCE configured as: ${AUTHZ_SOURCE}`);

app.use(express.json());

// Phase 1: Extract gateway identity headers (observe only)
app.use(gatewayTrustMiddleware);

app.use((req, res, next) => {
  req.startTime = startTimer();
  
  const originalSend = res.send;
  res.send = function(data) {
    const elapsed = getElapsedTime(req.startTime);
    
    // Log JWT identity
    if (req.user) {
      log(`IDENTITY jwt={user=${req.user.username}, role=${req.user.role}}`);
    }
    
    // Log gateway identity
    if (req.gatewayIdentity) {
      log(`IDENTITY gateway={user=${req.gatewayIdentity.username}, role=${req.gatewayIdentity.role}}`);
      
      // Check for mismatch
      if (req.user && req.user.role !== req.gatewayIdentity.role) {
        log(`IDENTITY_MISMATCH jwtRole=${req.user.role} gatewayRole=${req.gatewayIdentity.role}`);
      }
    }
    
    // Phase 2: Log authorization source
    if (req.authzSource && req.authzIdentity) {
      log(`AUTHZ source=${req.authzSource} user=${req.authzIdentity.username} role=${req.authzIdentity.role} method=${req.method} path=${req.path}`);
    }
    
    const user = req.user ? `user=${req.user.username} role=${req.user.role}` : 'anonymous';
    log(`method=${req.method} path=${req.path} ${user} status=${res.statusCode} latency=${elapsed}ms`);
    return originalSend.call(this, data);
  };
  
  next();
});

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from backend service!' });
});

app.use('/.well-known', jwksRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/orders', orderRoutes);

export default app;
