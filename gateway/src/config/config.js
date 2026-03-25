import { getConfig } from '../services/systemConfig.service.js';

export const getBackendTarget = () => getConfig().backendUrl;
export const setBackendTarget = () => {}; // no-op — use systemConfig.service.updateConfig instead
