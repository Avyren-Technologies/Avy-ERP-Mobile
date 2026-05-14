import { useQuery } from '@tanstack/react-query';

import { pipApi } from '@/lib/api/pip';

// --- Query keys ---

export const pipKeys = {
  all: ['pip'] as const,
  config: () => [...pipKeys.all, 'config'] as const,
  slabConfigs: (params?: Record<string, unknown>) =>
    params ? ([...pipKeys.all, 'slab-configs', params] as const) : ([...pipKeys.all, 'slab-configs'] as const),
  slabConfig: (id: string) => [...pipKeys.all, 'slab-config', id] as const,
  dailyEntries: (params?: Record<string, unknown>) =>
    params ? ([...pipKeys.all, 'daily-entries', params] as const) : ([...pipKeys.all, 'daily-entries'] as const),
  dailyEntrySummary: (params?: Record<string, unknown>) =>
    params ? ([...pipKeys.all, 'daily-entry-summary', params] as const) : ([...pipKeys.all, 'daily-entry-summary'] as const),
  dashboard: (params?: Record<string, unknown>) =>
    params ? ([...pipKeys.all, 'dashboard', params] as const) : ([...pipKeys.all, 'dashboard'] as const),
  monthlyReports: (params?: Record<string, unknown>) =>
    params ? ([...pipKeys.all, 'monthly-reports', params] as const) : ([...pipKeys.all, 'monthly-reports'] as const),
  monthlyReport: (id: string) => [...pipKeys.all, 'monthly-report', id] as const,
  payrollMergePreview: (id: string) => [...pipKeys.all, 'merge-preview', id] as const,
};

// --- Queries ---

export function usePipConfig() {
  return useQuery({
    queryKey: pipKeys.config(),
    queryFn: () => pipApi.getConfig(),
  });
}

export function usePipSlabConfigs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: pipKeys.slabConfigs(params),
    queryFn: () => pipApi.listSlabConfigs(params),
  });
}

export function usePipSlabConfig(id: string) {
  return useQuery({
    queryKey: pipKeys.slabConfig(id),
    queryFn: () => pipApi.getSlabConfig(id),
    enabled: !!id,
  });
}

export function usePipDailyEntries(
  params?: Record<string, unknown>,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: pipKeys.dailyEntries(params),
    queryFn: () => pipApi.listDailyEntries(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePipDailyEntrySummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: pipKeys.dailyEntrySummary(params),
    queryFn: () => pipApi.getDailyEntrySummary(params),
  });
}

export function usePipDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: pipKeys.dashboard(params),
    queryFn: () => pipApi.getDashboardMetrics(params),
  });
}

export function usePipMonthlyReports(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: pipKeys.monthlyReports(params),
    queryFn: () => pipApi.listMonthlyReports(params),
  });
}

export function usePipMonthlyReport(id: string) {
  return useQuery({
    queryKey: pipKeys.monthlyReport(id),
    queryFn: () => pipApi.getMonthlyReport(id),
    enabled: !!id,
  });
}

export function usePipPayrollMergePreview(id: string) {
  return useQuery({
    queryKey: pipKeys.payrollMergePreview(id),
    queryFn: () => pipApi.previewPayrollMerge(id),
    enabled: !!id,
  });
}
