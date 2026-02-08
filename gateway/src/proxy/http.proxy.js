import axios from 'axios';
import { GATEWAY_SECRET } from '../config/gateway.secret.js';

export const forwardRequest = async (url, method, headers, data, params, identity = null) => {
  const cleanHeaders = { ...headers };
  delete cleanHeaders['content-length'];
  delete cleanHeaders['host'];
  delete cleanHeaders['connection'];
  
  // Strip any client-provided gateway headers
  delete cleanHeaders['x-user-id'];
  delete cleanHeaders['x-username'];
  delete cleanHeaders['x-user-role'];
  delete cleanHeaders['x-issuer'];
  delete cleanHeaders['x-gateway-secret'];
  
  // Inject trusted identity headers from verified JWT
  if (identity) {
    cleanHeaders['X-Gateway-Secret'] = GATEWAY_SECRET;
    cleanHeaders['X-User-Id'] = identity.userId;
    cleanHeaders['X-Username'] = identity.username;
    cleanHeaders['X-User-Role'] = identity.role;
    cleanHeaders['X-Issuer'] = identity.issuer;
  }

  const response = await axios({
    url,
    method,
    headers: cleanHeaders,
    data,
    params,
    validateStatus: () => true,
    maxRedirects: 5,
    timeout: 30000,
    decompress: true
  });

  return {
    status: response.status,
    headers: response.headers,
    data: response.data
  };
};
