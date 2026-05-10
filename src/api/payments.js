import { apiGet, apiPost, apiPut, apiDelete } from './client'

/** GET /api/v1/payments — paged list */
export function listPayments({ partyId, from, to, page = 0, size = 20 } = {}) {
  return apiGet('/api/v1/payments', { partyId, from, to, page, size })
}

/** GET /api/v1/payments/:id */
export function getPayment(id) {
  return apiGet(`/api/v1/payments/${id}`)
}

/** POST /api/v1/payments */
export function createPayment(payload) {
  return apiPost('/api/v1/payments', payload)
}

/** PUT /api/v1/payments/:id */
export function updatePayment(id, payload) {
  return apiPut(`/api/v1/payments/${id}`, payload)
}

/** DELETE /api/v1/payments/:id */
export function deletePayment(id) {
  return apiDelete(`/api/v1/payments/${id}`)
}

/** GET /api/v1/payments/billing-parties/:partyId/outstanding-invoices */
export function getOutstandingInvoices(partyId) {
  return apiGet(`/api/v1/payments/billing-parties/${partyId}/outstanding-invoices`)
}
