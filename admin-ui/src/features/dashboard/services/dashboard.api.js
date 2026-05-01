import apiClient from '../../../services/apiClient.js'

export async function fetchTelemetry() {
  const data = await apiClient.get('/admin/telemetry')
  return Array.isArray(data) ? data : (data.records ?? [])
}

export async function fetchUsersRiskSummary() {
  const data = await apiClient.get('/admin/users/risk/summary')
  return data.users ?? []
}

export async function fetchMLScoresStats(windowMs = 86400000) {
  return apiClient.get(`/admin/ml/scores/stats?windowMs=${windowMs}`)
}

export async function fetchMLScoresRecent(limit = 30) {
  const data = await apiClient.get(`/admin/ml/scores/recent?limit=${limit}`)
  return data.records ?? []
}

export async function fetchBaselineTimeseries(tenantId = 'default', windowMs = 86400000) {
  const q = new URLSearchParams({ tenantId, windowMs: String(windowMs) })
  const data = await apiClient.get(`/admin/baseline/timeseries?${q}`)
  return data.series ?? []
}

/** Stored baseline doc (avg/std); null if 404 or error — rule engine uses this collection. */
export async function fetchBaselineSnapshot(tenantId = 'default') {
  try {
    return await apiClient.get(`/admin/baseline?tenantId=${encodeURIComponent(tenantId)}`)
  } catch {
    return null
  }
}

export function computeMetrics(users) {
  const total = users.length
  let low = 0, medium = 0, high = 0
  for (const u of users) {
    if (u.riskLevel === 'HIGH') high++
    else if (u.riskLevel === 'MEDIUM') medium++
    else low++
  }
  return { total, low, medium, high }
}
