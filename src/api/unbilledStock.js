import { apiGet } from './client'

/** GET /api/v1/unbilled-stock — all open stock, or filter by sku/challanId */
export function listUnbilledStock({ sku, challanId } = {}) {
  return apiGet('/api/v1/unbilled-stock', { sku, challanId })
}

/** GET /api/v1/unbilled-stock/summary — GST summary + product-wise */
export function getUnbilledStockSummary() {
  return apiGet('/api/v1/unbilled-stock/summary')
}

/** GET /api/v1/unbilled-stock/summary/sku/:sku — product+challan-wise drill-down */
export function getUnbilledStockBySku(sku) {
  return apiGet(`/api/v1/unbilled-stock/summary/sku/${sku}`)
}
