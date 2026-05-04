/**
 * Shared API request helper.
 * Adds Authorization header (JWT) and parses JSON.
 * Wraps backend ApiResponse<T> — returns the inner `data`.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function apiRequest(path, { method = 'GET', body, params, headers } = {}) {
  const token = localStorage.getItem('accessToken')
  const url = new URL(`${BASE_URL}${path}`)

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v)
    })
  }

  const finalHeaders = { 'Content-Type': 'application/json', ...(headers || {}) }
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  const res = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  let json
  try {
    json = await res.json()
  } catch {
    json = {}
  }

  if (!res.ok || json?.success === false) {
    const message = json?.message || `Request failed (${res.status})`
    const err = new Error(message)
    err.response = { data: json, status: res.status }
    throw err
  }
  return json.data
}

export const apiGet = (path, params) => apiRequest(path, { method: 'GET', params })
export const apiPost = (path, body) => apiRequest(path, { method: 'POST', body })
export const apiPut = (path, body) => apiRequest(path, { method: 'PUT', body })
export const apiDelete = (path) => apiRequest(path, { method: 'DELETE' })

export default apiRequest
