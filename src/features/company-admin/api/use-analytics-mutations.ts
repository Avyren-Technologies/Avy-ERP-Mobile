import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError, showSuccess } from '@/components/ui/utils';
import { analyticsKeys } from '@/features/company-admin/api/use-analytics-queries';
import { analyticsApi } from '@/lib/api/analytics';

/** Acknowledge an analytics alert */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analyticsApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.alerts() });
      showSuccess('Alert acknowledged');
    },
    onError: showError,
  });
}

/** Resolve an analytics alert */
export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analyticsApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.alerts() });
      showSuccess('Alert resolved');
    },
    onError: showError,
  });
}

/** Trigger analytics recomputation */
export function useRecompute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { date?: string }) => analyticsApi.recompute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      showSuccess('Recompute triggered', 'Analytics data will refresh shortly');
    },
    onError: showError,
  });
}
