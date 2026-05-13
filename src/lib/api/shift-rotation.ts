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
 * Shift Rotation API service — matches backend routes at /hr/shift-rotations/*.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const shiftRotationApi = {
  // ── Schedules ──────────────────────────────────────────────────
  listSchedules: (params?: ShiftScheduleListParams) =>
    client.get('/hr/shift-rotations', { params }),

  getSchedule: (id: string) =>
    client.get(`/hr/shift-rotations/${id}`),

  createSchedule: (data: Record<string, unknown>) =>
    client.post('/hr/shift-rotations', data),

  updateSchedule: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/shift-rotations/${id}`, data),

  deleteSchedule: (id: string) =>
    client.delete(`/hr/shift-rotations/${id}`),

  // ── Assign / Remove Employees ──────────────────────────────────
  assignEmployees: (id: string, data: Record<string, unknown>) =>
    client.post(`/hr/shift-rotations/${id}/assign`, data),

  removeEmployee: (id: string, employeeId: string) =>
    client.delete(`/hr/shift-rotations/${id}/assign/${employeeId}`),

  // ── Execute Rotation ───────────────────────────────────────────
  executeRotation: () =>
    client.post('/hr/shift-rotations/execute'),

  // ── Employee Overview ──────────────────────────────────────────
  getEmployeeOverview: (params?: { search?: string }) =>
    client.get('/hr/shift-rotations/employee-overview', { params }),
};
