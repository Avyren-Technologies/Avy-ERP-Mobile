import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '@/lib/api/dashboard';

// --- Query keys ---

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  revenue: () => [...dashboardKeys.all, 'revenue'] as const,
  billing: () => ['billing'] as const,
  billingSummary: () => [...dashboardKeys.billing(), 'summary'] as const,
  invoices: (params: any) => [...dashboardKeys.billing(), 'invoices', params] as const,
  revenueChart: () => [...dashboardKeys.billing(), 'chart'] as const,
  companyAdmin: () => [...dashboardKeys.all, 'company-admin'] as const,
};

// --- Queries ---

/** Super-admin dashboard KPIs (refreshes every 60s) */
export function useSuperAdminStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardApi.getSuperAdminStats(),
    refetchInterval: 60_000,
  });
}

/** Recent activity feed (refreshes every 30s) */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: () => dashboardApi.getRecentActivity(limit),
    refetchInterval: 30_000,
  });
}

/** Revenue metrics for super-admin */
export function useRevenueMetrics() {
  return useQuery({
    queryKey: dashboardKeys.revenue(),
    queryFn: () => dashboardApi.getRevenueMetrics(),
  });
}

/** Billing summary KPIs */
export function useBillingSummary() {
  return useQuery({
    queryKey: dashboardKeys.billingSummary(),
    queryFn: () => dashboardApi.getBillingSummary(),
  });
}

/** Paginated invoice list */
export function useInvoices(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: dashboardKeys.invoices(params),
    queryFn: () => dashboardApi.getInvoices(params),
  });
}

/** Monthly revenue trend for charts */
export function useRevenueChart() {
  return useQuery({
    queryKey: dashboardKeys.revenueChart(),
    queryFn: () => dashboardApi.getRevenueChart(),
  });
}

/** Company-admin dashboard stats (refreshes every 60s) */
export function useCompanyAdminStats() {
  return useQuery({
    queryKey: dashboardKeys.companyAdmin(),
    queryFn: () => dashboardApi.getCompanyAdminStats(),
    refetchInterval: 60_000,
  });
}
