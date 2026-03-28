import { client } from '@/lib/api/client';

// --- Types ---

export interface BonusBatchListParams {
  page?: number;
  limit?: number;
  status?: string;
  financialYear?: string;
}

// --- API Service ---

/**
 * Bonus Batch API service — batches CRUD, approve, and merge into payroll.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const bonusBatchApi = {
  // ── Batches ────────────────────────────────────────────────────
  listBatches: (params?: BonusBatchListParams) =>
    client.get('/hr/bonus-batches', { params }),

  getBatch: (id: string) =>
    client.get(`/hr/bonus-batches/${id}`),

  createBatch: (data: Record<string, unknown>) =>
    client.post('/hr/bonus-batches', data),

  updateBatch: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/bonus-batches/${id}`, data),

  deleteBatch: (id: string) =>
    client.delete(`/hr/bonus-batches/${id}`),

  // ── Approve ────────────────────────────────────────────────────
  approveBatch: (id: string) =>
    client.post(`/hr/bonus-batches/${id}/approve`),

  // ── Merge into Payroll ─────────────────────────────────────────
  mergeBatch: (id: string) =>
    client.post(`/hr/bonus-batches/${id}/merge`),
};
