import { client } from '@/lib/api/client';

// --- Types ---

export interface LeaveTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface LeavePolicyListParams {
  page?: number;
  limit?: number;
  leaveTypeId?: string;
}

export interface LeaveBalanceListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  year?: number;
}

export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
  from?: string;
  to?: string;
}

// --- API Service ---

/**
 * Leave Management API service — leave types, policies, balances, requests.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const leaveApi = {
  // ── Leave Types ────────────────────────────────────────────────────
  listLeaveTypes: (params?: LeaveTypeListParams) =>
    client.get('/hr/leave-types', { params }),

  getLeaveType: (id: string) => client.get(`/hr/leave-types/${id}`),

  createLeaveType: (data: Record<string, unknown>) =>
    client.post('/hr/leave-types', data),

  updateLeaveType: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/leave-types/${id}`, data),

  deleteLeaveType: (id: string) =>
    client.delete(`/hr/leave-types/${id}`),

  // ── Leave Policies ─────────────────────────────────────────────────
  listPolicies: (params?: LeavePolicyListParams) =>
    client.get('/hr/leave-policies', { params }),

  createPolicy: (data: Record<string, unknown>) =>
    client.post('/hr/leave-policies', data),

  updatePolicy: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/leave-policies/${id}`, data),

  deletePolicy: (id: string) =>
    client.delete(`/hr/leave-policies/${id}`),

  // ── Leave Balances ─────────────────────────────────────────────────
  listBalances: (params?: LeaveBalanceListParams) =>
    client.get('/hr/leave-balances', { params }),

  adjustBalance: (data: Record<string, unknown>) =>
    client.post('/hr/leave-balances/adjust', data),

  initializeBalances: (data: Record<string, unknown>) =>
    client.post('/hr/leave-balances/initialize', data),

  // ── Leave Requests ─────────────────────────────────────────────────
  listRequests: (params?: LeaveRequestListParams) =>
    client.get('/hr/leave-requests', { params }),

  getRequest: (id: string) => client.get(`/hr/leave-requests/${id}`),

  createRequest: (data: Record<string, unknown>) =>
    client.post('/hr/leave-requests', data),

  approveRequest: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/leave-requests/${id}/approve`, data ?? {}),

  rejectRequest: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/leave-requests/${id}/reject`, data ?? {}),

  cancelRequest: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/leave-requests/${id}/cancel`, data ?? {}),

  // ── Leave Dashboard / Summary ──────────────────────────────────────
  getSummary: () => client.get('/hr/leave/summary'),
};
