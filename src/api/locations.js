import { apiGet } from './client'

/** GET /api/v1/locations */
export function listLocations() {
  return apiGet('/api/v1/locations')
}
