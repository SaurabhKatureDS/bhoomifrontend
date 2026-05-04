import { apiGet, apiPost } from './client'

/**
 * GET /api/v1/items — paged + searchable + optional status filter
 * @returns PageResponse<ItemResponse>
 */
export function listItems({ q = '', status, page = 0, size = 25 } = {}) {
  return apiGet('/api/v1/items', { q, status, page, size })
}

/**
 * POST /api/v1/zoho/sync/items — trigger Zoho item sync
 * @returns ZohoSyncStatus
 */
export function syncItemsFromZoho() {
  return apiPost('/api/v1/zoho/sync/items', {})
}

/**
 * GET /api/v1/zoho/status — returns sync status for all entity types
 * @returns { CUSTOMERS: ZohoSyncStatus, ITEMS: ZohoSyncStatus, LOCATIONS: ZohoSyncStatus }
 */
export function getZohoStatus() {
  return apiGet('/api/v1/zoho/status', {})
}
