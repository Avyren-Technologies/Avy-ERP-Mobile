import { client } from '@/lib/api/client';

// --- Types ---

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  departmentId?: string;
}

export interface AttendanceOverrideListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface HolidayListParams {
  page?: number;
  limit?: number;
  year?: number;
  type?: string;
}

export interface RosterListParams {
  page?: number;
  limit?: number;
}

// --- API Service ---

/**
 * Attendance API service — attendance records, rules, holidays, rosters, overtime.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const attendanceApi = {
  // ── Attendance Records ─────────────────────────────────────────────
  listRecords: (params?: AttendanceListParams) =>
    client.get('/hr/attendance', { params }),

  getRecord: (id: string) => client.get(`/hr/attendance/${id}`),

  createRecord: (data: Record<string, unknown>) =>
    client.post('/hr/attendance', data),

  updateRecord: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/attendance/${id}`, data),

  // ── Attendance Summary / Dashboard ─────────────────────────────────
  getSummary: () => client.get('/hr/attendance/summary'),

  // ── Attendance Rules ───────────────────────────────────────────────
  getRules: () => client.get('/hr/attendance/rules'),

  updateRules: (data: Record<string, unknown>) =>
    client.patch('/hr/attendance/rules', data),

  // ── Attendance Overrides ───────────────────────────────────────────
  listOverrides: (params?: AttendanceOverrideListParams) =>
    client.get('/hr/attendance/overrides', { params }),

  createOverride: (data: Record<string, unknown>) =>
    client.post('/hr/attendance/overrides', data),

  updateOverride: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/attendance/overrides/${id}`, data),

  // ── Holiday Calendar ───────────────────────────────────────────────
  listHolidays: (params?: HolidayListParams) =>
    client.get('/hr/holidays', { params }),

  createHoliday: (data: Record<string, unknown>) =>
    client.post('/hr/holidays', data),

  updateHoliday: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/holidays/${id}`, data),

  deleteHoliday: (id: string) =>
    client.delete(`/hr/holidays/${id}`),

  cloneHolidays: (data: Record<string, unknown>) =>
    client.post('/hr/holidays/clone', data),

  // ── Rosters ────────────────────────────────────────────────────────
  listRosters: (params?: RosterListParams) =>
    client.get('/hr/rosters', { params }),

  createRoster: (data: Record<string, unknown>) =>
    client.post('/hr/rosters', data),

  updateRoster: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/rosters/${id}`, data),

  deleteRoster: (id: string) =>
    client.delete(`/hr/rosters/${id}`),

  // ── Overtime Rules ─────────────────────────────────────────────────
  getOvertimeRules: () => client.get('/hr/overtime-rules'),

  updateOvertimeRules: (data: Record<string, unknown>) =>
    client.patch('/hr/overtime-rules', data),
};
