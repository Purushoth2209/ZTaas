import { proxyRequest } from '../services/proxy.service.js';
import { log } from '../utils/logger.js';
import { startTimer, getElapsedTime } from '../utils/timer.js';

export const handleProxyRequest = async (req, res) => {
  const startTime = startTimer();

  try {
    const response = await proxyRequest(
      req.path,
      req.method,
      req.headers,
      req.body,
      req.query,
      req.identity
    );

    const elapsed = getElapsedTime(startTime);
    
    const identityInfo = req.identity 
      ? `user=${req.identity.username} role=${req.identity.role} issuer=${req.identity.issuer}` 
      : 'anonymous';
    
    log(`method=${req.method} path=${req.path} ${identityInfo} status=${response.status} latency=${elapsed}ms`);

    Object.keys(response.headers).forEach(key => {
      if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, response.headers[key]);
      }
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    const elapsed = getElapsedTime(startTime);
    log(`${req.method} ${req.path} - ERROR: ${error.message} - ${elapsed}ms`);
    res.status(502).json({ error: 'Bad Gateway' });
  }
};
