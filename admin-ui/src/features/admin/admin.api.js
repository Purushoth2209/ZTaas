import apiClient from '../../services/apiClient.js'

// --- Auth Policies ---
export const fetchPolicies = (tenantId = 'default') =>
  apiClient.get(`/admin/policies?tenantId=${tenantId}`)

export const savePolicies = (tenantId, policies) =>
  apiClient.post('/admin/policies', { tenantId, policies })

export const clearPolicies = (tenantId = 'default') =>
  apiClient.delete('/admin/policies', { tenantId })

// --- Risk Policy ---
export const fetchRiskPolicy = (tenantId = 'default') =>
  apiClient.get(`/admin/risk/policies?tenantId=${tenantId}`)

export const saveRiskPolicy = (tenantId, highThreshold, mediumThreshold) =>
  apiClient.put('/admin/risk/policies', { tenantId, highThreshold, mediumThreshold })

// --- System Config ---
export const fetchSystemConfig = () =>
  apiClient.get('/admin/config')

export const saveBackendUrl = (backendUrl) =>
  apiClient.post('/admin/config/backend', { backendUrl })

export const saveEnforcement = (enforcementMode) =>
  apiClient.post('/admin/config/enforcement', { enforcementMode })

// --- User Telemetry ---
export const fetchUserTelemetry = (userId, page = 1, limit = 50) =>
  apiClient.get(`/admin/telemetry/user?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`)

// --- Baseline ---
export const fetchBaseline = (tenantId = 'default') =>
  apiClient.get(`/admin/baseline?tenantId=${tenantId}`)

export const fetchBaselineTimeseries = (tenantId = 'default', windowMs = 3600000) =>
  apiClient.get(`/admin/baseline/timeseries?tenantId=${tenantId}&windowMs=${windowMs}`)

/** Rule + latest ML + fused score for one user (admin JWT). */
export const fetchUserRiskDetail = (userId, tenantId = 'default') =>
  apiClient.get(
    `/admin/users/risk/detail?userId=${encodeURIComponent(userId)}&tenantId=${encodeURIComponent(tenantId)}`
  )
