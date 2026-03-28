import { useQuery } from '@tanstack/react-query';

import {
  productionIncentiveApi,
  type IncentiveConfigListParams,
  type IncentiveRecordListParams,
} from '@/lib/api/production-incentive';

// --- Query keys ---

export const productionIncentiveKeys = {
  all: ['production-incentive'] as const,

  // Configs
  configs: (params?: IncentiveConfigListParams) =>
    [...productionIncentiveKeys.all, 'configs', params] as const,
  config: (id: string) =>
    [...productionIncentiveKeys.all, 'config', id] as const,

  // Records
  records: (params?: IncentiveRecordListParams) =>
    [...productionIncentiveKeys.all, 'records', params] as const,
};

// --- Config Queries ---

/** List production incentive configs */
export function useIncentiveConfigs(params?: IncentiveConfigListParams) {
  return useQuery({
    queryKey: productionIncentiveKeys.configs(params),
    queryFn: () => productionIncentiveApi.listConfigs(params),
  });
}

/** Single production incentive config by ID */
export function useIncentiveConfig(id: string) {
  return useQuery({
    queryKey: productionIncentiveKeys.config(id),
    queryFn: () => productionIncentiveApi.getConfig(id),
    enabled: !!id,
  });
}

// --- Record Queries ---

/** List production incentive records */
export function useIncentiveRecords(params?: IncentiveRecordListParams) {
  return useQuery({
    queryKey: productionIncentiveKeys.records(params),
    queryFn: () => productionIncentiveApi.listRecords(params),
  });
}
