import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { biometricApi } from '@/lib/api/biometric';
import { biometricKeys } from '@/features/company-admin/api/use-biometric-queries';

// ── Devices ──────────────────────────────────────────────────────────

/** Create a biometric device */
export function useCreateBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      biometricApi.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
    },
    onError: showError,
  });
}

/** Update a biometric device */
export function useUpdateBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      biometricApi.updateDevice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      queryClient.invalidateQueries({
        queryKey: biometricKeys.device(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a biometric device */
export function useDeleteBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => biometricApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
    },
    onError: showError,
  });
}

// ── Test & Sync ──────────────────────────────────────────────────────

/** Test connectivity to a biometric device */
export function useTestBiometricDevice() {
  return useMutation({
    mutationFn: (id: string) => biometricApi.testDevice(id),
    onError: showError,
  });
}

/** Sync data from a biometric device */
export function useSyncBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => biometricApi.syncDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.device(id) });
    },
    onError: showError,
  });
}
