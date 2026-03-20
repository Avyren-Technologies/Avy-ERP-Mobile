import { useMutation, useQueryClient } from '@tanstack/react-query';

import { transferApi } from '@/lib/api/transfer';
import { transferKeys } from '@/features/company-admin/api/use-transfer-queries';

// ── Transfers ────────────────────────────────────────────────────────

/** Initiate a new transfer */
export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      transferApi.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.transfers() });
    },
  });
}

/** Approve a transfer */
export function useApproveTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.approveTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.transfers() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.transfer(variables.id),
      });
    },
  });
}

/** Apply (execute) a transfer */
export function useApplyTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.applyTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.transfers() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.transfer(variables.id),
      });
    },
  });
}

/** Reject a transfer */
export function useRejectTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.rejectTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.transfers() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.transfer(variables.id),
      });
    },
  });
}

/** Cancel a transfer */
export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.cancelTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.transfers() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.transfer(variables.id),
      });
    },
  });
}

// ── Promotions ───────────────────────────────────────────────────────

/** Initiate a new promotion */
export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      transferApi.createPromotion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.promotions() });
    },
  });
}

/** Approve a promotion */
export function useApprovePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.approvePromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.promotions() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.promotion(variables.id),
      });
    },
  });
}

/** Apply (execute) a promotion */
export function useApplyPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.applyPromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.promotions() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.promotion(variables.id),
      });
    },
  });
}

/** Reject a promotion */
export function useRejectPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.rejectPromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.promotions() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.promotion(variables.id),
      });
    },
  });
}

/** Cancel a promotion */
export function useCancelPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      transferApi.cancelPromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.promotions() });
      queryClient.invalidateQueries({
        queryKey: transferKeys.promotion(variables.id),
      });
    },
  });
}

// ── Delegates ────────────────────────────────────────────────────────

/** Create a new delegation */
export function useCreateDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      transferApi.createDelegate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.delegates() });
    },
  });
}

/** Revoke an active delegation */
export function useRevokeDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transferApi.revokeDelegate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.delegates() });
    },
  });
}
