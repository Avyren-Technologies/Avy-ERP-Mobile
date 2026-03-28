import { useQuery } from '@tanstack/react-query';

import {
  retentionApi,
  type RetentionPolicyListParams,
  type DataRequestListParams,
  type ConsentListParams,
} from '@/lib/api/retention';

// --- Query keys ---

export const retentionKeys = {
  all: ['retention'] as const,

  // Policies
  policies: (params?: RetentionPolicyListParams) =>
    [...retentionKeys.all, 'policies', params] as const,
  policy: (id: string) =>
    [...retentionKeys.all, 'policy', id] as const,

  // Data Requests
  dataRequests: (params?: DataRequestListParams) =>
    [...retentionKeys.all, 'data-requests', params] as const,
  dataRequest: (id: string) =>
    [...retentionKeys.all, 'data-request', id] as const,

  // Consents
  consents: (params?: ConsentListParams) =>
    [...retentionKeys.all, 'consents', params] as const,

  // Due Check
  checkDue: () =>
    [...retentionKeys.all, 'check-due'] as const,
};

// --- Policy Queries ---

/** List retention policies */
export function useRetentionPolicies(params?: RetentionPolicyListParams) {
  return useQuery({
    queryKey: retentionKeys.policies(params),
    queryFn: () => retentionApi.listPolicies(params),
  });
}

/** Single retention policy by ID */
export function useRetentionPolicy(id: string) {
  return useQuery({
    queryKey: retentionKeys.policy(id),
    queryFn: () => retentionApi.getPolicy(id),
    enabled: !!id,
  });
}

// --- Data Request Queries ---

/** List data requests */
export function useDataRequests(params?: DataRequestListParams) {
  return useQuery({
    queryKey: retentionKeys.dataRequests(params),
    queryFn: () => retentionApi.listDataRequests(params),
  });
}

/** Single data request by ID */
export function useDataRequest(id: string) {
  return useQuery({
    queryKey: retentionKeys.dataRequest(id),
    queryFn: () => retentionApi.getDataRequest(id),
    enabled: !!id,
  });
}

// --- Consent Queries ---

/** List consents */
export function useConsents(params?: ConsentListParams) {
  return useQuery({
    queryKey: retentionKeys.consents(params),
    queryFn: () => retentionApi.listConsents(params),
  });
}

// --- Due Check Queries ---

/** Check which retention policies are due for execution */
export function useRetentionCheckDue() {
  return useQuery({
    queryKey: retentionKeys.checkDue(),
    queryFn: () => retentionApi.checkDue(),
  });
}
