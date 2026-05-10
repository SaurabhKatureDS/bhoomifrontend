import { apiGet, apiPost, apiPut, apiDelete } from './client'

/** GET /api/v1/collections — paged list */
export function listCollections({ customerId, from, to, page = 0, size = 20 } = {}) {
  return apiGet('/api/v1/collections', { customerId, from, to, page, size })
}

/** GET /api/v1/collections/:id */
export function getCollection(id) {
  return apiGet(`/api/v1/collections/${id}`)
}

/** POST /api/v1/collections */
export function createCollection(payload) {
  return apiPost('/api/v1/collections', payload)
}

/** PUT /api/v1/collections/:id */
export function updateCollection(id, payload) {
  return apiPut(`/api/v1/collections/${id}`, payload)
}

/** DELETE /api/v1/collections/:id */
export function deleteCollection(id) {
  return apiDelete(`/api/v1/collections/${id}`)
}

/** GET /api/v1/collections/customers/:customerId/outstanding-challans */
export function getOutstandingChallans(customerId) {
  return apiGet(`/api/v1/collections/customers/${customerId}/outstanding-challans`)
}

/** GET /api/v1/collections/customers/:customerId/ledger */
export function getCustomerLedger(customerId) {
  return apiGet(`/api/v1/collections/customers/${customerId}/ledger`)
}
