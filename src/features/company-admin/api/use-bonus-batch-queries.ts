import { useQuery } from '@tanstack/react-query';

import {
  bonusBatchApi,
  type BonusBatchListParams,
} from '@/lib/api/bonus-batch';

// --- Query keys ---

export const bonusBatchKeys = {
  all: ['bonus-batch'] as const,

  // Batches
  batches: (params?: BonusBatchListParams) =>
    [...bonusBatchKeys.all, 'batches', params] as const,
  batch: (id: string) =>
    [...bonusBatchKeys.all, 'batch', id] as const,
};

// --- Batch Queries ---

/** List bonus batches */
export function useBonusBatches(params?: BonusBatchListParams) {
  return useQuery({
    queryKey: bonusBatchKeys.batches(params),
    queryFn: () => bonusBatchApi.listBatches(params),
  });
}

/** Single bonus batch by ID */
export function useBonusBatch(id: string) {
  return useQuery({
    queryKey: bonusBatchKeys.batch(id),
    queryFn: () => bonusBatchApi.getBatch(id),
    enabled: !!id,
  });
}
