import { apiGet, apiPost, apiPut, apiDelete } from './client'

/**
 * GET /api/v1/cash-customers — paged + searchable + cluster filters
 * @returns PageResponse<CustomerResponse>
 */
export function listCashCustomers({ q = '', clusterId, page = 0, size = 50 } = {}) {
  return apiGet('/api/v1/cash-customers', { q, clusterId, page, size })
}

/** GET /api/v1/customers/gst — read-only Zoho-synced B2B */
export function listGstCustomers({ q = '', clusterId, page = 0, size = 50 } = {}) {
  return apiGet('/api/v1/customers/gst', { q, clusterId, page, size })
}

/** POST /api/v1/cash-customers */
export function createCashCustomer(payload) {
  return apiPost('/api/v1/cash-customers', payload)
}

/** PUT /api/v1/cash-customers/{id} */
export function updateCashCustomer(id, payload) {
  return apiPut(`/api/v1/cash-customers/${id}`, payload)
}

/** DELETE /api/v1/cash-customers/{id} */
export function deleteCashCustomer(id) {
  return apiDelete(`/api/v1/cash-customers/${id}`)
}
