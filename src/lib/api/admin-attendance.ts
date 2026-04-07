import { client } from '@/lib/api/client';

export const adminAttendanceApi = {
  getEmployeeStatus: (employeeId: string) =>
    client.get(`/hr/attendance/admin/employee/${employeeId}/status`),

  mark: (data: {
    employeeId: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    latitude?: number;
    longitude?: number;
    remarks?: string;
    skipValidation?: boolean;
  }) => client.post('/hr/attendance/admin/mark', data),

  bulkMark: (data: {
    employeeIds: string[];
    action: 'CHECK_IN' | 'CHECK_OUT';
    remarks: string;
  }) => client.post('/hr/attendance/admin/mark/bulk', data),

  getTodayLog: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get('/hr/attendance/admin/today-log', { params }),
};

export const adminAttendanceKeys = {
  all: ['admin-attendance'] as const,
  employeeStatus: (id: string) => [...adminAttendanceKeys.all, 'employee-status', id] as const,
  todayLog: (params?: Record<string, unknown>) => [...adminAttendanceKeys.all, 'today-log', params] as const,
};
