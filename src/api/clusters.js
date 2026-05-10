import { apiGet, apiPost, apiPut } from './client'

/** GET /api/v1/clusters → ClusterResponse[] */
export function listClusters() {
  return apiGet('/api/v1/clusters')
}

/** POST /api/v1/clusters → ClusterResponse */
export function createCluster(name) {
  return apiPost('/api/v1/clusters', { name, status: 'ACTIVE' })
}

/** PUT /api/v1/clusters/:id → ClusterResponse */
export function updateCluster(id, name) {
  return apiPut(`/api/v1/clusters/${id}`, { name, status: 'ACTIVE' })
}
