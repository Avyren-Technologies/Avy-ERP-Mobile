import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollPhasesApi } from '@/lib/api/payroll-phases';
import { payrollRunKeys } from './use-payroll-run-queries';

export const payrollPhasesKeys = {
  all: ['payroll-phases'] as const,
  configStatus: () => [...payrollPhasesKeys.all, 'config-status'] as const,
  preRunChecklist: (runId: string) => [...payrollPhasesKeys.all, 'pre-run-checklist', runId] as const,
  postRunChecklist: (runId: string) => [...payrollPhasesKeys.all, 'post-run-checklist', runId] as const,
  postRunInsights: (runId: string) => [...payrollPhasesKeys.all, 'post-run-insights', runId] as const,
};

export function useConfigurationStatus() {
  return useQuery({
    queryKey: payrollPhasesKeys.configStatus(),
    queryFn: () => payrollPhasesApi.getConfigurationStatus(),
  });
}

export function usePreRunChecklist(runId: string) {
  return useQuery({
    queryKey: payrollPhasesKeys.preRunChecklist(runId),
    queryFn: () => payrollPhasesApi.getPreRunChecklist(runId),
    enabled: !!runId,
  });
}

export function usePostRunChecklist(runId: string) {
  return useQuery({
    queryKey: payrollPhasesKeys.postRunChecklist(runId),
    queryFn: () => payrollPhasesApi.getPostRunChecklist(runId),
    enabled: !!runId,
  });
}

export function usePostRunInsights(runId: string) {
  return useQuery({
    queryKey: payrollPhasesKeys.postRunInsights(runId),
    queryFn: () => payrollPhasesApi.getPostRunInsights(runId),
    enabled: !!runId,
  });
}

/** Mark a manual post-run activity (bank_reconciliation / variance_audit / gl_posting) as complete */
export function useCompletePostRunActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, activityId, note }: { runId: string; activityId: string; note?: string }) =>
      payrollPhasesApi.completePostRunActivity(runId, activityId, note ? { note } : undefined),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: payrollPhasesKeys.postRunChecklist(vars.runId) });
      qc.invalidateQueries({ queryKey: payrollPhasesKeys.postRunInsights(vars.runId) });
      qc.invalidateQueries({ queryKey: payrollRunKeys.run(vars.runId) });
    },
  });
}
