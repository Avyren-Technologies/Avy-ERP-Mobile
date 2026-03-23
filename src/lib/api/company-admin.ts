import { client } from '@/lib/api/client';

// --- Types ---

export interface CompanyAdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

// --- API Service ---

/**
 * Company-admin API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const companyAdminApi = {
  // ── Profile ──────────────────────────────────────────────────────────
  getProfile: () => client.get('/company/profile'),

  updateProfileSection: (sectionKey: string, data: Record<string, unknown>) =>
    client.patch(`/company/profile/sections/${sectionKey}`, data),

  // ── Locations (NO create — provisioned by super-admin) ───────────────
  listLocations: () => client.get('/company/locations'),

  getLocation: (id: string) => client.get(`/company/locations/${id}`),

  updateLocation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/locations/${id}`, data),

  deleteLocation: (id: string) => client.delete(`/company/locations/${id}`),

  // ── Shifts (full CRUD) ──────────────────────────────────────────────
  listShifts: () => client.get('/company/shifts'),

  createShift: (data: Record<string, unknown>) =>
    client.post('/company/shifts', data),

  updateShift: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/shifts/${id}`, data),

  deleteShift: (id: string) => client.delete(`/company/shifts/${id}`),

  // ── Contacts (full CRUD) ────────────────────────────────────────────
  listContacts: () => client.get('/company/contacts'),

  createContact: (data: Record<string, unknown>) =>
    client.post('/company/contacts', data),

  updateContact: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/contacts/${id}`, data),

  deleteContact: (id: string) => client.delete(`/company/contacts/${id}`),

  // ── No Series (full CRUD) ──────────────────────────────────────────
  listNoSeries: () => client.get('/company/no-series'),

  createNoSeries: (data: Record<string, unknown>) =>
    client.post('/company/no-series', data),

  updateNoSeries: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/no-series/${id}`, data),

  deleteNoSeries: (id: string) => client.delete(`/company/no-series/${id}`),

  // ── IOT Reasons (full CRUD) ────────────────────────────────────────
  listIOTReasons: () => client.get('/company/iot-reasons'),

  createIOTReason: (data: Record<string, unknown>) =>
    client.post('/company/iot-reasons', data),

  updateIOTReason: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/iot-reasons/${id}`, data),

  deleteIOTReason: (id: string) => client.delete(`/company/iot-reasons/${id}`),

  // ── Controls ───────────────────────────────────────────────────────
  getControls: () => client.get('/company/controls'),

  updateControls: (data: Record<string, unknown>) =>
    client.patch('/company/controls', data),

  // ── Settings ───────────────────────────────────────────────────────
  getSettings: () => client.get('/company/settings'),

  updateSettings: (data: Record<string, unknown>) =>
    client.patch('/company/settings', data),

  // ── Users ──────────────────────────────────────────────────────────
  listUsers: (params?: CompanyAdminListParams) =>
    client.get('/company/users', { params }),

  getUser: (id: string) => client.get(`/company/users/${id}`),

  createUser: (data: Record<string, unknown>) =>
    client.post('/company/users', data),

  updateUser: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/users/${id}`, data),

  updateUserStatus: (id: string, data: { isActive: boolean }) =>
    client.patch(`/company/users/${id}/status`, data),

  // ── Audit Logs (tenant-scoped) ─────────────────────────────────────
  listAuditLogs: (params?: CompanyAdminListParams) =>
    client.get('/company/audit-logs', { params }),

  // ── Dashboard (company-admin specific) ─────────────────────────────
  getActivity: (limit?: number) =>
    client.get('/dashboard/company-activity', { params: { limit } }),

  // ── Module Catalogue ──────────────────────────────────────────────
  getModuleCatalogue: () => client.get('/modules/catalogue'),

  // ── Billing ──────────────────────────────────────────────────────
  getMySubscription: () => client.get('/company/billing/subscription'),

  getMyInvoices: (params?: CompanyAdminListParams) =>
    client.get('/company/billing/invoices', { params }),

  getMyInvoiceDetail: (id: string) =>
    client.get(`/company/billing/invoices/${id}`),

  getMyPayments: (params?: CompanyAdminListParams) =>
    client.get('/company/billing/payments', { params }),

  getMyCostBreakdown: () => client.get('/company/billing/cost-breakdown'),

  // ── RBAC (roles & permissions) ────────────────────────────────────
  listRoles: () => client.get('/rbac/roles'),

  listReferenceRoles: () => client.get('/rbac/reference-roles'),

  createRole: (data: Record<string, unknown>) =>
    client.post('/rbac/roles', data),

  updateRole: (id: string, data: Record<string, unknown>) =>
    client.patch(`/rbac/roles/${id}`, data),

  deleteRole: (id: string) => client.delete(`/rbac/roles/${id}`),
};
