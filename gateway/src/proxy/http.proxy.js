import axios from 'axios';

export const forwardRequest = async (url, method, headers, data, params) => {
  const cleanHeaders = { ...headers };
  delete cleanHeaders['content-length'];
  delete cleanHeaders['host'];
  delete cleanHeaders['connection'];

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
