import { useQuery } from '@tanstack/react-query';

import {
  transferApi,
  type TransferListParams,
  type PromotionListParams,
  type DelegateListParams,
} from '@/lib/api/transfer';

// --- Query keys ---

export const transferKeys = {
  all: ['transfer'] as const,

  // Transfers
  transfers: (params?: TransferListParams) =>
    [...transferKeys.all, 'transfers', params] as const,
  transfer: (id: string) => [...transferKeys.all, 'transfer', id] as const,

  // Promotions
  promotions: (params?: PromotionListParams) =>
    [...transferKeys.all, 'promotions', params] as const,
  promotion: (id: string) => [...transferKeys.all, 'promotion', id] as const,

  // Delegates
  delegates: (params?: DelegateListParams) =>
    [...transferKeys.all, 'delegates', params] as const,
};

// --- Transfer Queries ---

/** List transfers with optional filters */
export function useTransfers(params?: TransferListParams) {
  return useQuery({
    queryKey: transferKeys.transfers(params),
    queryFn: () => transferApi.listTransfers(params),
  });
}

/** Single transfer by ID */
export function useTransfer(id: string) {
  return useQuery({
    queryKey: transferKeys.transfer(id),
    queryFn: () => transferApi.getTransfer(id),
    enabled: !!id,
  });
}

// --- Promotion Queries ---

/** List promotions with optional filters */
export function usePromotions(params?: PromotionListParams) {
  return useQuery({
    queryKey: transferKeys.promotions(params),
    queryFn: () => transferApi.listPromotions(params),
  });
}

/** Single promotion by ID */
export function usePromotion(id: string) {
  return useQuery({
    queryKey: transferKeys.promotion(id),
    queryFn: () => transferApi.getPromotion(id),
    enabled: !!id,
  });
}

// --- Delegate Queries ---

/** List delegates with optional managerId filter */
export function useDelegates(params?: DelegateListParams) {
  return useQuery({
    queryKey: transferKeys.delegates(params),
    queryFn: () => transferApi.listDelegates(params),
  });
}
