import { client } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/auth';

/**
 * Dashboard & Billing API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 * We cast accordingly so TypeScript matches the runtime behaviour.
 */
export const dashboardApi = {
  /** Super-admin dashboard KPIs */
  getSuperAdminStats: () =>
    client.get('/platform/dashboard/stats') as Promise<ApiResponse<any>>,

  /** Recent platform activity feed */
  getRecentActivity: (limit?: number) =>
    client.get('/platform/dashboard/activity', { params: { limit } }) as Promise<
      ApiResponse<any[]>
    >,

  /** Revenue metrics for super-admin */
  getRevenueMetrics: () =>
    client.get('/platform/dashboard/revenue') as Promise<ApiResponse<any>>,

  /** Billing summary KPIs */
  getBillingSummary: () =>
    client.get('/platform/billing/summary') as Promise<ApiResponse<any>>,

  /** Paginated invoice list */
  getInvoices: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get('/platform/billing/invoices', { params }) as Promise<ApiResponse<any>>,

  /** Monthly revenue trend for chart */
  getRevenueChart: () =>
    client.get('/platform/billing/revenue-chart') as Promise<ApiResponse<any>>,

  /** Company-admin dashboard stats */
  getCompanyAdminStats: () =>
    client.get('/dashboard/company-stats') as Promise<ApiResponse<any>>,
};
