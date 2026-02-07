import { forwardRequest } from '../proxy/http.proxy.js';
import { getBackendTarget } from '../config/config.js';
import { log } from '../utils/logger.js';

export const proxyRequest = async (path, method, headers, body, query) => {
  const backendUrl = getBackendTarget();
  const targetUrl = `${backendUrl}${path}`;

  log(`[INCOMING] ${method} ${path}`);
  log(`[INCOMING] Headers: ${JSON.stringify(headers)}`);
  if (body && Object.keys(body).length > 0) {
    log(`[INCOMING] Body: ${JSON.stringify(body)}`);
  }
  if (query && Object.keys(query).length > 0) {
    log(`[INCOMING] Query: ${JSON.stringify(query)}`);
  }

  log(`[OUTGOING] Forwarding to: ${targetUrl}`);

  const response = await forwardRequest(targetUrl, method, headers, body, query);

  log(`[RESPONSE] Status: ${response.status}`);
  log(`[RESPONSE] Headers: ${JSON.stringify(response.headers)}`);
  if (response.data) {
    log(`[RESPONSE] Body: ${JSON.stringify(response.data)}`);
  }

  return response;
};
