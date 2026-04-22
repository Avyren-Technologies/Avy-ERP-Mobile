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

  fetchBook: (params: {
    date: string; shiftId?: string; departmentId?: string;
    designationId?: string; search?: string; page?: number; limit?: number;
  }) => client.get('/hr/attendance/book', { params }),

  bookMark: (data: {
    employeeId: string; date: string;
    firstHalf: { status: string; leaveTypeId?: string };
    secondHalf: { status: string; leaveTypeId?: string };
    punchInOverride?: string; punchOutOverride?: string;
    remarks?: string; forceOverride?: boolean;
    existingRecordUpdatedAt?: string;
  }) => client.post('/hr/attendance/book/mark', data),

  bookSaveAll: (data: {
    date: string;
    entries: Array<{
      employeeId: string;
      firstHalf: { status: string; leaveTypeId?: string };
      secondHalf: { status: string; leaveTypeId?: string };
      punchInOverride?: string; punchOutOverride?: string;
      remarks?: string; forceOverride?: boolean;
      existingRecordUpdatedAt?: string;
    }>;
  }) => client.post('/hr/attendance/book/save-all', data),
};

export const adminAttendanceKeys = {
  all: ['admin-attendance'] as const,
  employeeStatus: (id: string) => [...adminAttendanceKeys.all, 'employee-status', id] as const,
  todayLog: (params?: Record<string, unknown>) => [...adminAttendanceKeys.all, 'today-log', params] as const,
  book: (params?: Record<string, unknown>) => [...adminAttendanceKeys.all, 'book', params] as const,
};
