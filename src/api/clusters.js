import { apiGet } from './client'

/** GET /api/v1/clusters → ClusterResponse[] */
export function listClusters() {
  return apiGet('/api/v1/clusters')
}
