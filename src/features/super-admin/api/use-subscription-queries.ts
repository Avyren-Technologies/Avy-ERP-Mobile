import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { subscriptionApi } from '@/lib/api/subscription';
import type {
  ChangeBillingTypePayload,
  ChangeTierPayload,
  ExtendTrialPayload,
  BillingType,
} from '@/lib/api/subscription';

// --- Query keys ---

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  detail: (companyId: string) => [...subscriptionKeys.all, 'detail', companyId] as const,
  costPreview: (companyId: string, params: any) => [...subscriptionKeys.all, 'cost-preview', companyId, params] as const,
};

// --- Queries ---

/** Subscription detail with per-location cost breakdown */
export function useSubscriptionDetail(companyId: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(companyId),
    queryFn: () => subscriptionApi.getDetail(companyId),
    enabled: !!companyId,
  });
}

/** Cost preview for billing type change */
export function useCostPreview(companyId: string, params: { billingType?: BillingType; locationId?: string }) {
  return useQuery({
    queryKey: subscriptionKeys.costPreview(companyId, params),
    queryFn: () => subscriptionApi.getCostPreview(companyId, params),
    enabled: !!companyId && !!params.billingType,
  });
}

// --- Mutations ---

/** Change billing type */
export function useChangeBillingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: ChangeBillingTypePayload }) =>
      subscriptionApi.changeBillingType(companyId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.companyId) });
    },
  });
}

/** Change user tier */
export function useChangeTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: ChangeTierPayload }) =>
      subscriptionApi.changeTier(companyId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.companyId) });
    },
  });
}

/** Extend trial */
export function useExtendTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: ExtendTrialPayload }) =>
      subscriptionApi.extendTrial(companyId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.companyId) });
    },
  });
}

/** Cancel subscription */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => subscriptionApi.cancel(companyId),
    onSuccess: (_data, companyId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(companyId) });
    },
  });
}

/** Reactivate subscription */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => subscriptionApi.reactivate(companyId),
    onSuccess: (_data, companyId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(companyId) });
    },
  });
}
