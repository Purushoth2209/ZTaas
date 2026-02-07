const config = {
  backendTarget: 'http://localhost:5001'
};

export const getBackendTarget = () => config.backendTarget;

export const setBackendTarget = (url) => {
  config.backendTarget = url;
};
