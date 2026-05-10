import { apiGet } from './client'

/** GET /api/v1/billed-items/summary — GST summary of all billed/closed transactions */
export function getBilledItemsSummary() {
  return apiGet('/api/v1/billed-items/summary')
}

/** GET /api/v1/billed-items/reconciliation — product+invoice-wise reconciliation */
export function getBilledItemsReconciliation() {
  return apiGet('/api/v1/billed-items/reconciliation')
}
