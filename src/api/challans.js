import { apiGet, apiPost, apiPut, apiDelete } from './client'

/** GET /api/v1/challans — paged list with optional filters */
export function listChallans({ customerId, from, to, status, page = 0, size = 20, sort } = {}) {
  return apiGet('/api/v1/challans', { customerId, from, to, status, page, size, sort })
}

/** GET /api/v1/challans/:id */
export function getChallan(id) {
  return apiGet(`/api/v1/challans/${id}`)
}

/** GET /api/v1/challans/:id/timeline */
export function getChallanTimeline(id) {
  return apiGet(`/api/v1/challans/${id}/timeline`)
}

/** GET /api/v1/challans/:id/print-preview */
export function getChallanPrintPreview(id) {
  return apiGet(`/api/v1/challans/${id}/print-preview`)
}

/** POST /api/v1/challans */
export function createChallan(payload) {
  return apiPost('/api/v1/challans', payload)
}

/** PUT /api/v1/challans/:id */
export function updateChallan(id, payload) {
  return apiPut(`/api/v1/challans/${id}`, payload)
}

/** DELETE /api/v1/challans/:id — archives the challan */
export function deleteChallan(id) {
  return apiDelete(`/api/v1/challans/${id}`)
}

/** POST /api/v1/challans/:id/mark-dispatched */
export function markDispatched(id) {
  return apiPost(`/api/v1/challans/${id}/mark-dispatched`, {})
}

/** POST /api/v1/challans/:id/mark-delivered */
export function markDelivered(id) {
  return apiPost(`/api/v1/challans/${id}/mark-delivered`, {})
}

/** GET /api/v1/challans/dashboard */
export function getChallanDashboard({ from, to } = {}) {
  return apiGet('/api/v1/challans/dashboard', { from, to })
}
