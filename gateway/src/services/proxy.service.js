import { forwardRequest } from '../proxy/http.proxy.js';
import { getBackendTarget } from '../config/config.js';

export const proxyRequest = async (path, method, headers, body, query, identity = null) => {
  const backendUrl = getBackendTarget();
  const targetUrl = `${backendUrl}${path}`;

  const response = await forwardRequest(targetUrl, method, headers, body, query, identity);

  return response;
};
