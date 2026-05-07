import { client } from '@/lib/api/client';

// --- API Service ---

/**
 * Biometric ADMS API service — devices, mappings, and punch logs.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const biometricApi = {
  // ── Devices ────────────────────────────────────────────────────
  listDevices: () => client.get('/hr/biometric/devices'),

  getDevice: (id: string) => client.get(`/hr/biometric/devices/${id}`),

  getDeviceStats: () => client.get('/hr/biometric/devices/stats'),

  claimDevice: (data: {
    serialNumber: string;
    deviceName: string;
    locationId?: string;
    timezone?: string;
  }) => client.post('/hr/biometric/devices/claim', data),

  updateDevice: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/biometric/devices/${id}`, data),

  deactivateDevice: (id: string) =>
    client.delete(`/hr/biometric/devices/${id}`),

  // ── Mappings ───────────────────────────────────────────────────
  listMappings: () => client.get('/hr/biometric/mappings'),

  createMapping: (data: {
    employeeId: string;
    deviceSerialNumber: string;
    deviceUserId: string;
  }) => client.post('/hr/biometric/mappings', data),

  deleteMapping: (id: string) =>
    client.delete(`/hr/biometric/mappings/${id}`),

  getUnmappedPunches: () => client.get('/hr/biometric/mappings/unmapped'),

  // ── Punch Logs ─────────────────────────────────────────────────
  listPunchLogs: (params?: Record<string, unknown>) =>
    client.get('/hr/biometric/punch-logs', { params }),
};
