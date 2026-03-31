import { client } from '@/lib/api/client';

export const analyticsApi = {
  getDashboard: (dashboard: string, params?: Record<string, unknown>) =>
    client.get(`/hr/analytics/dashboard/${dashboard}`, { params }).then(r => r.data),

  getDrilldown: (dashboard: string, params: Record<string, unknown>) =>
    client.get(`/hr/analytics/drilldown/${dashboard}`, { params }).then(r => r.data),

  exportReport: (reportType: string, params: Record<string, unknown>) =>
    client.get(`/hr/analytics/export/${reportType}`, { params, responseType: 'blob' }),

  getAlerts: (params?: Record<string, unknown>) =>
    client.get('/hr/analytics/alerts', { params }).then(r => r.data),

  acknowledgeAlert: (id: string) =>
    client.post(`/hr/analytics/alerts/${id}/acknowledge`).then(r => r.data),

  resolveAlert: (id: string) =>
    client.post(`/hr/analytics/alerts/${id}/resolve`).then(r => r.data),

  recompute: (data?: { date?: string }) =>
    client.post('/hr/analytics/recompute', data).then(r => r.data),
};
