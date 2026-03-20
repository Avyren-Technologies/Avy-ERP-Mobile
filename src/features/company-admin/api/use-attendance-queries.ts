import { useQuery } from '@tanstack/react-query';

import {
  attendanceApi,
  type AttendanceListParams,
  type AttendanceOverrideListParams,
  type HolidayListParams,
  type RosterListParams,
} from '@/lib/api/attendance';

// --- Query keys ---

export const attendanceKeys = {
  all: ['attendance'] as const,

  // Attendance Records
  records: (params?: AttendanceListParams) =>
    [...attendanceKeys.all, 'records', params] as const,
  record: (id: string) => [...attendanceKeys.all, 'record', id] as const,

  // Summary / Dashboard
  summary: () => [...attendanceKeys.all, 'summary'] as const,

  // Rules
  rules: () => [...attendanceKeys.all, 'rules'] as const,

  // Overrides
  overrides: (params?: AttendanceOverrideListParams) =>
    [...attendanceKeys.all, 'overrides', params] as const,

  // Holidays
  holidays: (params?: HolidayListParams) =>
    [...attendanceKeys.all, 'holidays', params] as const,

  // Rosters
  rosters: (params?: RosterListParams) =>
    [...attendanceKeys.all, 'rosters', params] as const,

  // Overtime Rules
  overtimeRules: () => [...attendanceKeys.all, 'overtime-rules'] as const,
};

// --- Attendance Record Queries ---

/** List attendance records with optional filters */
export function useAttendanceRecords(params?: AttendanceListParams) {
  return useQuery({
    queryKey: attendanceKeys.records(params),
    queryFn: () => attendanceApi.listRecords(params),
  });
}

/** Single attendance record by ID */
export function useAttendanceRecord(id: string) {
  return useQuery({
    queryKey: attendanceKeys.record(id),
    queryFn: () => attendanceApi.getRecord(id),
    enabled: !!id,
  });
}

// --- Attendance Summary ---

/** Dashboard stats (present/absent/late/onLeave counts) */
export function useAttendanceSummary() {
  return useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: () => attendanceApi.getSummary(),
  });
}

// --- Attendance Rules ---

/** Get company attendance rules */
export function useAttendanceRules() {
  return useQuery({
    queryKey: attendanceKeys.rules(),
    queryFn: () => attendanceApi.getRules(),
  });
}

// --- Attendance Overrides ---

/** List attendance overrides with optional status filter */
export function useAttendanceOverrides(params?: AttendanceOverrideListParams) {
  return useQuery({
    queryKey: attendanceKeys.overrides(params),
    queryFn: () => attendanceApi.listOverrides(params),
  });
}

// --- Holidays ---

/** List holidays with optional year/type filter */
export function useHolidays(params?: HolidayListParams) {
  return useQuery({
    queryKey: attendanceKeys.holidays(params),
    queryFn: () => attendanceApi.listHolidays(params),
  });
}

// --- Rosters ---

/** List rosters */
export function useRosters(params?: RosterListParams) {
  return useQuery({
    queryKey: attendanceKeys.rosters(params),
    queryFn: () => attendanceApi.listRosters(params),
  });
}

// --- Overtime Rules ---

/** Get overtime rules */
export function useOvertimeRules() {
  return useQuery({
    queryKey: attendanceKeys.overtimeRules(),
    queryFn: () => attendanceApi.getOvertimeRules(),
  });
}
