import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError, showSuccess } from '@/components/ui/utils';
import { pipApi } from '@/lib/api/pip';
import { pipKeys } from '@/features/production/pip/api/use-pip-queries';

// ── Process Categories ────────────────────────────────────────────────

export function useCreateProcessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.createProcessCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.processCategories() });
      showSuccess('Process category created');
    },
    onError: showError,
  });
}

export function useUpdateProcessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.updateProcessCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.processCategories() });
      showSuccess('Process category updated');
    },
    onError: showError,
  });
}

export function useDeleteProcessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.deleteProcessCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.processCategories() });
      showSuccess('Process category deleted');
    },
    onError: showError,
  });
}

// ── Downtime Reasons ─────────────────────────────────────────────────

export function useCreateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.createDowntimeReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.downtimeReasons() });
      showSuccess('Downtime reason created');
    },
    onError: showError,
  });
}

export function useUpdateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.updateDowntimeReason(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.downtimeReasons() });
      showSuccess('Downtime reason updated');
    },
    onError: showError,
  });
}

export function useDeleteDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.deleteDowntimeReason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.downtimeReasons() });
      showSuccess('Downtime reason deleted');
    },
    onError: showError,
  });
}

// ── Operations ────────────────────────────────────────────────────────

export function useCreateOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.createOperation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Operation created', 'New operation has been added');
    },
    onError: showError,
  });
}

export function useUpdateOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.updateOperation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.operation(variables.id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Operation updated');
    },
    onError: showError,
  });
}

export function useDeleteOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.deleteOperation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Operation deleted');
    },
    onError: showError,
  });
}

// ── Config ─────────────────────────────────────────────────────────────

export function useUpdatePipConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.config() });
      showSuccess('Config updated', 'Incentive configuration saved');
    },
    onError: showError,
  });
}

// ── Slab Configs ───────────────────────────────────────────────────────

export function useCreatePipSlabConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.createSlabConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Slab config created', 'New slab configuration has been added');
    },
    onError: showError,
  });
}

export function useBulkCreatePipSlabConfigs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.bulkCreateSlabConfigs(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Slab configs created', 'Bulk slab configurations have been added');
    },
    onError: showError,
  });
}

export function useUpdatePipSlabConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.updateSlabConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.slabConfig(variables.id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Slab config updated');
    },
    onError: showError,
  });
}

export function useDeletePipSlabConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.deleteSlabConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Slab config deleted');
    },
    onError: showError,
  });
}

// ── Daily Entries ──────────────────────────────────────────────────────

export function useSavePipDailyEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.saveDailyEntries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Entries saved', 'Daily production entries have been recorded');
    },
    onError: showError,
  });
}

export function useDeletePipDailyEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionRef: string) => pipApi.deleteDailyEntries(sessionRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Entries deleted');
    },
    onError: showError,
  });
}

// ── Calculator ─────────────────────────────────────────────────────────

export function useSimulatePipIncentive() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.simulateIncentive(data),
    onError: showError,
  });
}

// ── Monthly Reports ────────────────────────────────────────────────────

export function useGeneratePipMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pipApi.generateMonthlyReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Report generated', 'Monthly incentive report is ready');
    },
    onError: showError,
  });
}

export function useSubmitPipMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.submitMonthlyReport(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.monthlyReport(id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Report submitted', 'Report has been sent for approval');
    },
    onError: showError,
  });
}

export function useApprovePipMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.approveMonthlyReport(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.monthlyReport(id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Report approved');
    },
    onError: showError,
  });
}

export function useRejectPipMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.rejectMonthlyReport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.monthlyReport(variables.id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Report rejected');
    },
    onError: showError,
  });
}

// ── Payroll ────────────────────────────────────────────────────────────

export function useMergePipToPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pipApi.mergeToPayroll(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.monthlyReport(variables.id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Merged to payroll', 'Incentive data has been merged to payroll');
    },
    onError: showError,
  });
}

export function useReversePipPayrollMerge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pipApi.reversePayrollMerge(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pipKeys.monthlyReport(id) });
      queryClient.invalidateQueries({ queryKey: pipKeys.all });
      showSuccess('Payroll merge reversed');
    },
    onError: showError,
  });
}
