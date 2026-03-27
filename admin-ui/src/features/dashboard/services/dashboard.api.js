import apiClient from '../../../services/apiClient.js'

export async function fetchTelemetry() {
  const data = await apiClient.get('/admin/telemetry')
  return Array.isArray(data) ? data : (data.records ?? [])
}

export async function fetchUsersRiskSummary() {
  const data = await apiClient.get('/admin/users/risk/summary')
  return data.users ?? []
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
