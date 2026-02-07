import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import jwksRoutes from './routes/jwks.routes.js';
import { log } from './utils/logger.js';
import { startTimer, getElapsedTime } from './utils/timer.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  req.startTime = startTimer();
  
  const originalSend = res.send;
  res.send = function(data) {
    const elapsed = getElapsedTime(req.startTime);
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
