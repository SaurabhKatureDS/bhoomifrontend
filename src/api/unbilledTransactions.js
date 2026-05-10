import { apiGet, apiPost, apiPut, apiDelete } from './client'

/** GET /api/v1/unbilled-transactions — paged list */
export function listUnbilledTransactions({ partyId, from, to, status, page = 0, size = 20 } = {}) {
  return apiGet('/api/v1/unbilled-transactions', { partyId, from, to, status, page, size })
}

/** GET /api/v1/unbilled-transactions/:id */
export function getUnbilledTransaction(id) {
  return apiGet(`/api/v1/unbilled-transactions/${id}`)
}

/** GET /api/v1/unbilled-transactions/:id/timeline */
export function getUnbilledTimeline(id) {
  return apiGet(`/api/v1/unbilled-transactions/${id}/timeline`)
}

/** POST /api/v1/unbilled-transactions */
export function createUnbilledTransaction(payload) {
  return apiPost('/api/v1/unbilled-transactions', payload)
}

/** PUT /api/v1/unbilled-transactions/:id */
export function updateUnbilledTransaction(id, payload) {
  return apiPut(`/api/v1/unbilled-transactions/${id}`, payload)
}

/** DELETE /api/v1/unbilled-transactions/:id */
export function deleteUnbilledTransaction(id) {
  return apiDelete(`/api/v1/unbilled-transactions/${id}`)
}

/** POST /api/v1/unbilled-transactions/:id/push-to-zoho */
export function pushToZoho(id) {
  return apiPost(`/api/v1/unbilled-transactions/${id}/push-to-zoho`, {})
}

/** POST /api/v1/unbilled-transactions/:id/verify-zoho */
export function verifyZoho(id) {
  return apiPost(`/api/v1/unbilled-transactions/${id}/verify-zoho`, {})
}

/** POST /api/v1/unbilled-transactions/:id/close */
export function closeUnbilledTransaction(id) {
  return apiPost(`/api/v1/unbilled-transactions/${id}/close`, {})
}

/** GET /api/v1/unbilled-transactions/summary */
export function getUnbilledSummary() {
  return apiGet('/api/v1/unbilled-transactions/summary')
}

/** GET /api/v1/unbilled-transactions/summary/sku/:sku */
export function getUnbilledBySku(sku) {
  return apiGet(`/api/v1/unbilled-transactions/summary/sku/${sku}`)
}
