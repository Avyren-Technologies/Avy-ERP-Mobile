import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '@/lib/api/analytics';

// --- Query keys (no trailing undefined) ---

export const analyticsKeys = {
  all: ['analytics'] as const,

  dashboard: (dashboard: string, params?: Record<string, unknown>) =>
    params
      ? ([...analyticsKeys.all, 'dashboard', dashboard, params] as const)
      : ([...analyticsKeys.all, 'dashboard', dashboard] as const),

  drilldown: (dashboard: string, params: Record<string, unknown>) =>
    [...analyticsKeys.all, 'drilldown', dashboard, params] as const,

  alerts: (params?: Record<string, unknown>) =>
    params
      ? ([...analyticsKeys.all, 'alerts', params] as const)
      : ([...analyticsKeys.all, 'alerts'] as const),
};

// --- Query hooks ---

export function useAnalyticsDashboard(
  dashboard: string,
  params?: Record<string, unknown>,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(dashboard, params),
    queryFn: () => analyticsApi.getDashboard(dashboard, params),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAnalyticsDrilldown(
  dashboard: string,
  params: Record<string, unknown>,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.drilldown(dashboard, params),
    queryFn: () => analyticsApi.getDrilldown(dashboard, params),
    enabled,
  });
}

export function useAnalyticsAlerts(
  params?: Record<string, unknown>,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.alerts(params),
    queryFn: () => analyticsApi.getAlerts(params),
    enabled,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
