import { client } from '@/lib/api/client';

// --- Types ---

export interface ExitRequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  separationType?: string;
}

export interface FnFSettlementListParams {
  page?: number;
  limit?: number;
  status?: string;
}

// --- API Service ---

/**
 * Offboarding API service — exit requests, clearances, exit interviews,
 * F&F settlements.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const offboardingApi = {
  // ── Exit Requests ──────────────────────────────────────────────
  listExitRequests: (params?: ExitRequestListParams) =>
    client.get('/hr/exit-requests', { params }),

  createExitRequest: (data: Record<string, unknown>) =>
    client.post('/hr/exit-requests', data),

  getExitRequest: (id: string) =>
    client.get(`/hr/exit-requests/${id}`),

  updateExitRequest: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/exit-requests/${id}`, data),

  // ── Clearances ─────────────────────────────────────────────────
  getExitClearances: (exitRequestId: string) =>
    client.get(`/hr/exit-requests/${exitRequestId}/clearances`),

  updateClearance: (clearanceId: string, data: Record<string, unknown>) =>
    client.patch(`/hr/exit-clearances/${clearanceId}`, data),

  // ── Exit Interview ─────────────────────────────────────────────
  createExitInterview: (exitRequestId: string, data: Record<string, unknown>) =>
    client.post(`/hr/exit-requests/${exitRequestId}/interview`, data),

  getExitInterview: (exitRequestId: string) =>
    client.get(`/hr/exit-requests/${exitRequestId}/interview`),

  // ── F&F Settlements ────────────────────────────────────────────
  computeFnF: (exitRequestId: string) =>
    client.post(`/hr/exit-requests/${exitRequestId}/compute-fnf`),

  listFnFSettlements: (params?: FnFSettlementListParams) =>
    client.get('/hr/fnf-settlements', { params }),

  getFnFSettlement: (id: string) =>
    client.get(`/hr/fnf-settlements/${id}`),

  approveFnF: (id: string) =>
    client.patch(`/hr/fnf-settlements/${id}/approve`),

  payFnF: (id: string) =>
    client.patch(`/hr/fnf-settlements/${id}/pay`),
};
