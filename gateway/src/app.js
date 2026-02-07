import express from 'express';
import adminRoutes from './routes/admin.routes.js';
import proxyRoutes from './routes/proxy.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/admin', adminRoutes);
app.use('/', proxyRoutes);

export default app;
