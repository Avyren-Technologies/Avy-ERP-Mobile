import { client } from '@/lib/api/client';

// --- Types ---

export interface ShiftScheduleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// --- API Service ---

/**
 * Shift Rotation API service — schedules CRUD, assign/remove employees,
 * and execute rotation.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const shiftRotationApi = {
  // ── Schedules ──────────────────────────────────────────────────
  listSchedules: (params?: ShiftScheduleListParams) =>
    client.get('/hr/shift-schedules', { params }),

  getSchedule: (id: string) =>
    client.get(`/hr/shift-schedules/${id}`),

  createSchedule: (data: Record<string, unknown>) =>
    client.post('/hr/shift-schedules', data),

  updateSchedule: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/shift-schedules/${id}`, data),

  deleteSchedule: (id: string) =>
    client.delete(`/hr/shift-schedules/${id}`),

  // ── Assign / Remove Employees ──────────────────────────────────
  assignEmployees: (id: string, data: Record<string, unknown>) =>
    client.post(`/hr/shift-schedules/${id}/assign`, data),

  removeEmployees: (id: string, data: Record<string, unknown>) =>
    client.post(`/hr/shift-schedules/${id}/remove`, data),

  // ── Execute Rotation ───────────────────────────────────────────
  executeRotation: (id: string) =>
    client.post(`/hr/shift-schedules/${id}/execute`),
};
