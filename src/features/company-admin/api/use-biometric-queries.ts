import { useQuery } from '@tanstack/react-query';

import {
  biometricApi,
  type BiometricDeviceListParams,
} from '@/lib/api/biometric';

// --- Query keys ---

export const biometricKeys = {
  all: ['biometric'] as const,

  // Devices
  devices: (params?: BiometricDeviceListParams) =>
    [...biometricKeys.all, 'devices', params] as const,
  device: (id: string) =>
    [...biometricKeys.all, 'device', id] as const,
};

// --- Device Queries ---

/** List biometric devices */
export function useBiometricDevices(params?: BiometricDeviceListParams) {
  return useQuery({
    queryKey: biometricKeys.devices(params),
    queryFn: () => biometricApi.listDevices(params),
  });
}

/** Single biometric device by ID */
export function useBiometricDevice(id: string) {
  return useQuery({
    queryKey: biometricKeys.device(id),
    queryFn: () => biometricApi.getDevice(id),
    enabled: !!id,
  });
}
