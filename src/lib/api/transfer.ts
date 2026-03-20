import { client } from '@/lib/api/client';

// --- Types ---

export interface TransferListParams {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
}

export interface PromotionListParams {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
}

export interface DelegateListParams {
  page?: number;
  limit?: number;
  managerId?: string;
}

// --- API Service ---

/**
 * Transfer, Promotion & Delegation API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const transferApi = {
  // ── Transfers ────────────────────────────────────────────────────
  listTransfers: (params?: TransferListParams) =>
    client.get('/hr/transfers', { params }),

  getTransfer: (id: string) => client.get(`/hr/transfers/${id}`),

  createTransfer: (data: Record<string, unknown>) =>
    client.post('/hr/transfers', data),

  approveTransfer: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/transfers/${id}/approve`, data ?? {}),

  applyTransfer: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/transfers/${id}/apply`, data ?? {}),

  rejectTransfer: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/transfers/${id}/reject`, data ?? {}),

  cancelTransfer: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/transfers/${id}/cancel`, data ?? {}),

  // ── Promotions ───────────────────────────────────────────────────
  listPromotions: (params?: PromotionListParams) =>
    client.get('/hr/promotions', { params }),

  getPromotion: (id: string) => client.get(`/hr/promotions/${id}`),

  createPromotion: (data: Record<string, unknown>) =>
    client.post('/hr/promotions', data),

  approvePromotion: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/promotions/${id}/approve`, data ?? {}),

  applyPromotion: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/promotions/${id}/apply`, data ?? {}),

  rejectPromotion: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/promotions/${id}/reject`, data ?? {}),

  cancelPromotion: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/promotions/${id}/cancel`, data ?? {}),

  // ── Delegates ────────────────────────────────────────────────────
  listDelegates: (params?: DelegateListParams) =>
    client.get('/hr/delegates', { params }),

  createDelegate: (data: Record<string, unknown>) =>
    client.post('/hr/delegates', data),

  revokeDelegate: (id: string) =>
    client.patch(`/hr/delegates/${id}/revoke`),
};
