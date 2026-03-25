import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import proxyRoutes from './routes/proxy.routes.js';
import jwksRoutes from './routes/jwks.routes.js';
import stsRoutes from './routes/sts.routes.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/gateway/.well-known', jwksRoutes);
app.use('/sts', stsRoutes);
app.use('/', proxyRoutes);

export default app;
