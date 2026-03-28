import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { bonusBatchApi } from '@/lib/api/bonus-batch';
import { bonusBatchKeys } from '@/features/company-admin/api/use-bonus-batch-queries';

// ── Batches ──────────────────────────────────────────────────────────

/** Create a bonus batch */
export function useCreateBonusBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      bonusBatchApi.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batches() });
    },
    onError: showError,
  });
}

/** Update a bonus batch */
export function useUpdateBonusBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      bonusBatchApi.updateBatch(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batches() });
      queryClient.invalidateQueries({
        queryKey: bonusBatchKeys.batch(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a bonus batch */
export function useDeleteBonusBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bonusBatchApi.deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batches() });
    },
    onError: showError,
  });
}

// ── Approve & Merge ──────────────────────────────────────────────────

/** Approve a bonus batch */
export function useApproveBonusBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bonusBatchApi.approveBatch(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batches() });
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batch(id) });
    },
    onError: showError,
  });
}

/** Merge a bonus batch into payroll */
export function useMergeBonusBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bonusBatchApi.mergeBatch(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batches() });
      queryClient.invalidateQueries({ queryKey: bonusBatchKeys.batch(id) });
    },
    onError: showError,
  });
}
