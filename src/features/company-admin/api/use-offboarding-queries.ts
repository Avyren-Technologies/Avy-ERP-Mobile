import { useQuery } from '@tanstack/react-query';

import {
  offboardingApi,
  type ExitRequestListParams,
  type FnFSettlementListParams,
} from '@/lib/api/offboarding';

// --- Query keys ---

export const offboardingKeys = {
  all: ['offboarding'] as const,

  // Exit Requests
  exitRequests: (params?: ExitRequestListParams) =>
    [...offboardingKeys.all, 'exit-requests', params] as const,
  exitRequest: (id: string) =>
    [...offboardingKeys.all, 'exit-request', id] as const,

  // Clearances
  exitClearances: (exitRequestId: string) =>
    [...offboardingKeys.all, 'exit-clearances', exitRequestId] as const,

  // Exit Interview
  exitInterview: (exitRequestId: string) =>
    [...offboardingKeys.all, 'exit-interview', exitRequestId] as const,

  // F&F Settlements
  fnfSettlements: (params?: FnFSettlementListParams) =>
    [...offboardingKeys.all, 'fnf-settlements', params] as const,
  fnfSettlement: (id: string) =>
    [...offboardingKeys.all, 'fnf-settlement', id] as const,
};

// --- Exit Request Queries ---

export function useExitRequests(params?: ExitRequestListParams) {
  return useQuery({
    queryKey: offboardingKeys.exitRequests(params),
    queryFn: () => offboardingApi.listExitRequests(params),
  });
}

export function useExitRequest(id: string) {
  return useQuery({
    queryKey: offboardingKeys.exitRequest(id),
    queryFn: () => offboardingApi.getExitRequest(id),
    enabled: !!id,
  });
}

// --- Clearance Queries ---

export function useExitClearances(exitRequestId: string) {
  return useQuery({
    queryKey: offboardingKeys.exitClearances(exitRequestId),
    queryFn: () => offboardingApi.getExitClearances(exitRequestId),
    enabled: !!exitRequestId,
  });
}

// --- Exit Interview Queries ---

export function useExitInterview(exitRequestId: string) {
  return useQuery({
    queryKey: offboardingKeys.exitInterview(exitRequestId),
    queryFn: () => offboardingApi.getExitInterview(exitRequestId),
    enabled: !!exitRequestId,
  });
}

// --- F&F Settlement Queries ---

export function useFnFSettlements(params?: FnFSettlementListParams) {
  return useQuery({
    queryKey: offboardingKeys.fnfSettlements(params),
    queryFn: () => offboardingApi.listFnFSettlements(params),
  });
}

export function useFnFSettlement(id: string) {
  return useQuery({
    queryKey: offboardingKeys.fnfSettlement(id),
    queryFn: () => offboardingApi.getFnFSettlement(id),
    enabled: !!id,
  });
}
