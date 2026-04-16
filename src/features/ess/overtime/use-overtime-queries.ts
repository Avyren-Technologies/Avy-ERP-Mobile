import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  essOvertimeApi,
  type ClaimOvertimePayload,
  type OvertimeListParams,
} from '@/lib/api/ess';

export const overtimeKeys = {
  all: ['ess-overtime'] as const,
  list: (params?: OvertimeListParams) =>
    params
      ? ([...overtimeKeys.all, 'list', params] as const)
      : ([...overtimeKeys.all, 'list'] as const),
  detail: (id: string) => [...overtimeKeys.all, 'detail', id] as const,
  summary: (month?: number, year?: number) =>
    [...overtimeKeys.all, 'summary', { month, year }] as const,
};

export function useMyOvertimeRequests(params?: OvertimeListParams) {
  return useQuery({
    queryKey: overtimeKeys.list(params),
    queryFn: () => essOvertimeApi.getMyOvertimeRequests(params),
  });
}

export function useMyOvertimeDetail(id: string) {
  return useQuery({
    queryKey: overtimeKeys.detail(id),
    queryFn: () => essOvertimeApi.getMyOvertimeDetail(id),
    enabled: !!id,
  });
}

export function useMyOvertimeSummary(month?: number, year?: number) {
  return useQuery({
    queryKey: overtimeKeys.summary(month, year),
    queryFn: () => essOvertimeApi.getMyOvertimeSummary({ month, year }),
  });
}

export function useClaimOvertime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClaimOvertimePayload) => essOvertimeApi.claimOvertime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
    },
  });
}
