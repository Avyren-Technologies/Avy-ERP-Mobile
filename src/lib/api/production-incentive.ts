import { client } from '@/lib/api/client';

// --- Types ---

export interface IncentiveConfigListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IncentiveRecordListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  month?: number;
  year?: number;
  status?: string;
}

// --- API Service ---

/**
 * Production Incentive API service — configs CRUD, compute, merge,
 * and records listing.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const productionIncentiveApi = {
  // ── Configs ────────────────────────────────────────────────────
  listConfigs: (params?: IncentiveConfigListParams) =>
    client.get('/hr/production-incentive-configs', { params }),

  getConfig: (id: string) =>
    client.get(`/hr/production-incentive-configs/${id}`),

  createConfig: (data: Record<string, unknown>) =>
    client.post('/hr/production-incentive-configs', data),

  updateConfig: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/production-incentive-configs/${id}`, data),

  deleteConfig: (id: string) =>
    client.delete(`/hr/production-incentive-configs/${id}`),

  // ── Compute ────────────────────────────────────────────────────
  compute: (data: Record<string, unknown>) =>
    client.post('/hr/production-incentives/compute', data),

  // ── Merge into Payroll ─────────────────────────────────────────
  merge: (data: Record<string, unknown>) =>
    client.post('/hr/production-incentives/merge', data),

  // ── Records ────────────────────────────────────────────────────
  listRecords: (params?: IncentiveRecordListParams) =>
    client.get('/hr/production-incentives', { params }),
};
