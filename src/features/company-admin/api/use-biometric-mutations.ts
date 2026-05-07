import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { biometricApi } from '@/lib/api/biometric';
import { biometricKeys } from '@/features/company-admin/api/use-biometric-queries';

// ── Devices ──────────────────────────────────────────────────────────

/** Claim (register) an ADMS biometric device */
export function useClaimBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      serialNumber: string;
      deviceName: string;
      locationId?: string;
      timezone?: string;
    }) => biometricApi.claimDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      queryClient.invalidateQueries({ queryKey: biometricKeys.deviceStats() });
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
      queryClient.invalidateQueries({ queryKey: biometricKeys.deviceStats() });
    },
    onError: showError,
  });
}

/** Deactivate a biometric device */
export function useDeactivateBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => biometricApi.deactivateDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      queryClient.invalidateQueries({ queryKey: biometricKeys.deviceStats() });
    },
    onError: showError,
  });
}

// ── Mappings ─────────────────────────────────────────────────────────

/** Create an employee-device mapping */
export function useCreateBiometricMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      deviceSerialNumber: string;
      deviceUserId: string;
    }) => biometricApi.createMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.mappings() });
      queryClient.invalidateQueries({ queryKey: biometricKeys.unmappedPunches() });
    },
    onError: showError,
  });
}

/** Delete an employee-device mapping */
export function useDeleteBiometricMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => biometricApi.deleteMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.mappings() });
    },
    onError: showError,
  });
}
