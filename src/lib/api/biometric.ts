import { client } from '@/lib/api/client';

// --- Types ---

export interface BiometricDeviceListParams {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  status?: string;
}

// --- API Service ---

/**
 * Biometric Device API service — devices CRUD, test connectivity, and sync.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const biometricApi = {
  // ── Devices ────────────────────────────────────────────────────
  listDevices: (params?: BiometricDeviceListParams) =>
    client.get('/hr/biometric-devices', { params }),

  getDevice: (id: string) =>
    client.get(`/hr/biometric-devices/${id}`),

  createDevice: (data: Record<string, unknown>) =>
    client.post('/hr/biometric-devices', data),

  updateDevice: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/biometric-devices/${id}`, data),

  deleteDevice: (id: string) =>
    client.delete(`/hr/biometric-devices/${id}`),

  // ── Test Connectivity ──────────────────────────────────────────
  testDevice: (id: string) =>
    client.post(`/hr/biometric-devices/${id}/test`),

  // ── Sync ───────────────────────────────────────────────────────
  syncDevice: (id: string) =>
    client.post(`/hr/biometric-devices/${id}/sync`),
};
