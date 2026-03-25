import apiClient from '../../../services/apiClient.js'

export async function loginAdmin({ username, password }) {
  const data = await apiClient.post('/auth/admin/login', { username, password })
  // gateway returns { token: '...' }
  return data.token
}
