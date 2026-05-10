import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client'

/**
 * GET /api/v1/rates  — list with optional filters
 * @param {{ customerId?, q?, cluster?, from?, to?, status?, validTillStatus?, page?, size?, sort? }} params
 */
export function listRates({ customerId, q, cluster, from, to, status, validTillStatus, page = 0, size = 20, sort } = {}) {
  return apiGet('/api/v1/rates', { customerId, q, cluster, from, to, status, validTillStatus, page, size, sort })
}

/** GET /api/v1/rates/:id */
export function getRate(id) {
  return apiGet(`/api/v1/rates/${id}`)
}

/** GET /api/v1/rates/last-shared?customerId=X */
export function getLastSharedRate(customerId) {
  return apiGet('/api/v1/rates/last-shared', { customerId })
}

/** POST /api/v1/rates */
export function createRate(payload) {
  return apiPost('/api/v1/rates', payload)
}

/** PUT /api/v1/rates/:id */
export function updateRate(id, payload) {
  return apiPut(`/api/v1/rates/${id}`, payload)
}

/** PATCH /api/v1/rates/:id/status */
export function updateRateStatus(id, status) {
  return apiPatch(`/api/v1/rates/${id}/status`, { status })
}

/** DELETE /api/v1/rates/:id */
export function deleteRate(id) {
  return apiDelete(`/api/v1/rates/${id}`)
}
