import { forwardRequest } from '../proxy/http.proxy.js';
import { getConfig } from './systemConfig.service.js';

export const proxyRequest = async (path, method, headers, body, query, identity = null) => {
  const backendUrl = getConfig().backendUrl;
  const targetUrl = `${backendUrl}${path}`;
  return forwardRequest(targetUrl, method, headers, body, query, identity);
};
