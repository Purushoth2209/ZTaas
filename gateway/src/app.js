import express from 'express';
import adminRoutes from './routes/admin.routes.js';
import proxyRoutes from './routes/proxy.routes.js';
import jwksRoutes from './routes/jwks.routes.js';
import stsRoutes from './routes/sts.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/admin', adminRoutes);
app.use('/gateway/.well-known', jwksRoutes);
app.use('/sts', stsRoutes);
app.use('/', proxyRoutes);

export default app;
