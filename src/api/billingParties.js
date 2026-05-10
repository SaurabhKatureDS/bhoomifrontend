import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from './client'

/** GET /api/v1/billing-parties — paged list with financial stats */
export function listBillingParties({ q = '', page = 0, size = 25 } = {}) {
  return apiGet('/api/v1/billing-parties', { q, page, size })
}

/** GET /api/v1/billing-parties/:id */
export function getBillingParty(id) {
  return apiGet(`/api/v1/billing-parties/${id}`)
}

/** POST /api/v1/billing-parties */
export function createBillingParty(payload) {
  return apiPost('/api/v1/billing-parties', payload)
}

/** PUT /api/v1/billing-parties/:id */
export function updateBillingParty(id, payload) {
  return apiPut(`/api/v1/billing-parties/${id}`, payload)
}

/** PATCH /api/v1/billing-parties/:id/reminder */
export function updateReminderDate(id, reminderDate) {
  return apiPatch(`/api/v1/billing-parties/${id}/reminder`, { reminderDate })
}

/** DELETE /api/v1/billing-parties/:id */
export function deleteBillingParty(id) {
  return apiDelete(`/api/v1/billing-parties/${id}`)
}

/** GET /api/v1/billing-parties/:id/ledger */
export function getBillingPartyLedger(id) {
  return apiGet(`/api/v1/billing-parties/${id}/ledger`)
}
