import axios from 'axios';

export const forwardRequest = async (url, method, headers, data, params, identity = null) => {
  const cleanHeaders = { ...headers };
  
  // Remove standard headers that should not be forwarded
  delete cleanHeaders['content-length'];
  delete cleanHeaders['host'];
  delete cleanHeaders['connection'];
  
  // Strip any client-provided custom headers
  delete cleanHeaders['x-user-id'];
  delete cleanHeaders['x-username'];
  delete cleanHeaders['x-user-role'];
  delete cleanHeaders['x-issuer'];
  delete cleanHeaders['x-gateway-secret'];
  
  // Authorization header now contains internal JWT (replaced by jwtTranslationMiddleware)
  // No additional processing needed - just forward it

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
