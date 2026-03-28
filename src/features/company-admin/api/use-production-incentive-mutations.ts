import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { productionIncentiveApi } from '@/lib/api/production-incentive';
import { productionIncentiveKeys } from '@/features/company-admin/api/use-production-incentive-queries';

// ── Configs ──────────────────────────────────────────────────────────

/** Create a production incentive config */
export function useCreateIncentiveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      productionIncentiveApi.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionIncentiveKeys.configs() });
    },
    onError: showError,
  });
}

/** Update a production incentive config */
export function useUpdateIncentiveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      productionIncentiveApi.updateConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productionIncentiveKeys.configs() });
      queryClient.invalidateQueries({
        queryKey: productionIncentiveKeys.config(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a production incentive config */
export function useDeleteIncentiveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productionIncentiveApi.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionIncentiveKeys.configs() });
    },
    onError: showError,
  });
}

// ── Compute & Merge ──────────────────────────────────────────────────

/** Compute production incentives */
export function useComputeIncentives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      productionIncentiveApi.compute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionIncentiveKeys.records() });
    },
    onError: showError,
  });
}

/** Merge production incentives into payroll */
export function useMergeIncentives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      productionIncentiveApi.merge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionIncentiveKeys.records() });
    },
    onError: showError,
  });
}
