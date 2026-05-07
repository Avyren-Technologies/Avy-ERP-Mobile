import { useQuery } from '@tanstack/react-query';

import { biometricApi } from '@/lib/api/biometric';

// --- Query keys ---

export const biometricKeys = {
  all: ['biometric'] as const,

  // Devices
  devices: () => [...biometricKeys.all, 'devices'] as const,
  device: (id: string) => [...biometricKeys.all, 'device', id] as const,
  deviceStats: () => [...biometricKeys.all, 'device-stats'] as const,

  // Mappings
  mappings: () => [...biometricKeys.all, 'mappings'] as const,
  unmappedPunches: () => [...biometricKeys.all, 'unmapped-punches'] as const,

  // Punch Logs
  punchLogs: (params?: Record<string, unknown>) =>
    params
      ? ([...biometricKeys.all, 'punch-logs', params] as const)
      : ([...biometricKeys.all, 'punch-logs'] as const),
};

// --- Device Queries ---

/** List all ADMS biometric devices */
export function useBiometricDevices() {
  return useQuery({
    queryKey: biometricKeys.devices(),
    queryFn: () => biometricApi.listDevices(),
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

/** Device stats with 30s auto-refresh */
export function useBiometricDeviceStats() {
  return useQuery({
    queryKey: biometricKeys.deviceStats(),
    queryFn: () => biometricApi.getDeviceStats(),
    refetchInterval: 30_000,
  });
}

// --- Mapping Queries ---

/** List all employee-device mappings */
export function useBiometricMappings() {
  return useQuery({
    queryKey: biometricKeys.mappings(),
    queryFn: () => biometricApi.listMappings(),
  });
}

/** Get unmapped punch entries */
export function useUnmappedPunches() {
  return useQuery({
    queryKey: biometricKeys.unmappedPunches(),
    queryFn: () => biometricApi.getUnmappedPunches(),
  });
}

// --- Punch Log Queries ---

/** List punch logs with optional filters */
export function useBiometricPunchLogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: biometricKeys.punchLogs(params),
    queryFn: () => biometricApi.listPunchLogs(params),
  });
}
