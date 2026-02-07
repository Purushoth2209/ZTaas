import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import jwksRoutes from './routes/jwks.routes.js';
import { log } from './utils/logger.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const user = req.headers.authorization ? 'authenticated' : 'anonymous';
  log(`${req.method} ${req.path} - ${user}`);
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
