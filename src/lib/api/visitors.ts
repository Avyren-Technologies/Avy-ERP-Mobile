import { client } from '@/lib/api/client';

/**
 * Visitor Management System API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const visitorsApi = {
  // ── Visits ──────────────────────────────────────────────────────────
  listVisits: (params?: Record<string, unknown>) =>
    client.get('/visitors/visits', { params }),

  createVisit: (data: Record<string, unknown>) =>
    client.post('/visitors/visits', data),

  getVisit: (id: string) =>
    client.get(`/visitors/visits/${id}`),

  updateVisit: (id: string, data: Record<string, unknown>) =>
    client.put(`/visitors/visits/${id}`, data),

  cancelVisit: (id: string) =>
    client.delete(`/visitors/visits/${id}`),

  checkInVisit: (id: string, data?: Record<string, unknown>) =>
    client.post(`/visitors/visits/${id}/check-in`, data),

  checkOutVisit: (id: string, data?: Record<string, unknown>) =>
    client.post(`/visitors/visits/${id}/check-out`, data),

  approveVisit: (id: string, data?: Record<string, unknown>) =>
    client.post(`/visitors/visits/${id}/approve`, data),

  rejectVisit: (id: string, data?: Record<string, unknown>) =>
    client.post(`/visitors/visits/${id}/reject`, data),

  extendVisit: (id: string, data: Record<string, unknown>) =>
    client.post(`/visitors/visits/${id}/extend`, data),

  getVisitByCode: (code: string) =>
    client.get(`/visitors/visits/code/${code}`),

  // ── Visitor Types ───────────────────────────────────────────────────
  listVisitorTypes: (params?: Record<string, unknown>) =>
    client.get('/visitors/types', { params }),

  createVisitorType: (data: Record<string, unknown>) =>
    client.post('/visitors/types', data),

  updateVisitorType: (id: string, data: Record<string, unknown>) =>
    client.put(`/visitors/types/${id}`, data),

  deleteVisitorType: (id: string) =>
    client.delete(`/visitors/types/${id}`),

  // ── Gates ───────────────────────────────────────────────────────────
  listGates: (params?: Record<string, unknown>) =>
    client.get('/visitors/gates', { params }),

  createGate: (data: Record<string, unknown>) =>
    client.post('/visitors/gates', data),

  updateGate: (id: string, data: Record<string, unknown>) =>
    client.put(`/visitors/gates/${id}`, data),

  deleteGate: (id: string) =>
    client.delete(`/visitors/gates/${id}`),

  // ── Dashboard ───────────────────────────────────────────────────────
  getDashboardToday: (params?: Record<string, unknown>) =>
    client.get('/visitors/dashboard/today', { params }),

  getOnSiteVisitors: () =>
    client.get('/visitors/dashboard/on-site'),

  getDashboardStats: () =>
    client.get('/visitors/dashboard/stats'),

  // ── Watchlist ───────────────────────────────────────────────────────
  listWatchlist: (params?: Record<string, unknown>) =>
    client.get('/visitors/watchlist', { params }),

  createWatchlistEntry: (data: Record<string, unknown>) =>
    client.post('/visitors/watchlist', data),

  checkWatchlist: (data: Record<string, unknown>) =>
    client.post('/visitors/watchlist/check', data),

  // ── Recurring Passes ────────────────────────────────────────────────
  listRecurringPasses: (params?: Record<string, unknown>) =>
    client.get('/visitors/recurring-passes', { params }),

  checkInRecurringPass: (id: string) =>
    client.post(`/visitors/recurring-passes/${id}/check-in`),

  // ── Vehicle / Material Passes ───────────────────────────────────────
  listVehiclePasses: (params?: Record<string, unknown>) =>
    client.get('/visitors/vehicle-passes', { params }),

  createVehiclePass: (data: Record<string, unknown>) =>
    client.post('/visitors/vehicle-passes', data),

  listMaterialPasses: (params?: Record<string, unknown>) =>
    client.get('/visitors/material-passes', { params }),

  createMaterialPass: (data: Record<string, unknown>) =>
    client.post('/visitors/material-passes', data),

  // ── Group Visits ────────────────────────────────────────────────────
  listGroupVisits: (params?: Record<string, unknown>) =>
    client.get('/visitors/group-visits', { params }),

  batchCheckIn: (id: string) =>
    client.post(`/visitors/group-visits/${id}/batch-check-in`),

  // ── Emergency ───────────────────────────────────────────────────────
  triggerEmergency: (data: Record<string, unknown>) =>
    client.post('/visitors/emergency/trigger', data),

  getMusterList: () =>
    client.get('/visitors/emergency/muster-list'),

  markSafe: (data: Record<string, unknown>) =>
    client.post('/visitors/emergency/mark-safe', data),

  resolveEmergency: () =>
    client.post('/visitors/emergency/resolve'),

  // ── Config ──────────────────────────────────────────────────────────
  getVMSConfig: () =>
    client.get('/visitors/config'),

  updateVMSConfig: (data: Record<string, unknown>) =>
    client.put('/visitors/config', data),
};
