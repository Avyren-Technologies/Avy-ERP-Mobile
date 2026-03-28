import { client } from '@/lib/api/client';

// --- Types ---

export interface RetentionPolicyListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface DataRequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export interface ConsentListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
}

// --- API Service ---

/**
 * Data Retention API service — policies, data requests, data export,
 * anonymisation, consents, and due-checks.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const retentionApi = {
  // ── Policies ───────────────────────────────────────────────────
  listPolicies: (params?: RetentionPolicyListParams) =>
    client.get('/hr/retention-policies', { params }),

  getPolicy: (id: string) =>
    client.get(`/hr/retention-policies/${id}`),

  createPolicy: (data: Record<string, unknown>) =>
    client.post('/hr/retention-policies', data),

  updatePolicy: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/retention-policies/${id}`, data),

  deletePolicy: (id: string) =>
    client.delete(`/hr/retention-policies/${id}`),

  // ── Data Requests ──────────────────────────────────────────────
  listDataRequests: (params?: DataRequestListParams) =>
    client.get('/hr/data-requests', { params }),

  getDataRequest: (id: string) =>
    client.get(`/hr/data-requests/${id}`),

  createDataRequest: (data: Record<string, unknown>) =>
    client.post('/hr/data-requests', data),

  updateDataRequest: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/data-requests/${id}`, data),

  // ── Data Export ────────────────────────────────────────────────
  exportData: (data: Record<string, unknown>) =>
    client.post('/hr/data-export', data),

  // ── Anonymise ──────────────────────────────────────────────────
  anonymise: (data: Record<string, unknown>) =>
    client.post('/hr/anonymise', data),

  // ── Consents ───────────────────────────────────────────────────
  listConsents: (params?: ConsentListParams) =>
    client.get('/hr/consents', { params }),

  createConsent: (data: Record<string, unknown>) =>
    client.post('/hr/consents', data),

  updateConsent: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/consents/${id}`, data),

  // ── Due Check ──────────────────────────────────────────────────
  checkDue: () =>
    client.get('/hr/retention-policies/check-due'),
};
