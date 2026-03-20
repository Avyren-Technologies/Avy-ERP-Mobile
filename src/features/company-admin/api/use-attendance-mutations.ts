import { useMutation, useQueryClient } from '@tanstack/react-query';

import { attendanceApi } from '@/lib/api/attendance';
import { attendanceKeys } from '@/features/company-admin/api/use-attendance-queries';

// ── Attendance Records ───────────────────────────────────────────────

/** Create/log an attendance record */
export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.createRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.summary() });
    },
  });
}

/** Update an attendance record */
export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      attendanceApi.updateRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.record(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.summary() });
    },
  });
}

// ── Attendance Rules ─────────────────────────────────────────────────

/** Update company attendance rules */
export function useUpdateAttendanceRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.updateRules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.rules() });
    },
  });
}

// ── Attendance Overrides ─────────────────────────────────────────────

/** Create an attendance override request */
export function useCreateAttendanceOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.createOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.overrides() });
    },
  });
}

/** Approve/reject an attendance override */
export function useUpdateAttendanceOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      attendanceApi.updateOverride(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.overrides() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    },
  });
}

// ── Holidays ─────────────────────────────────────────────────────────

/** Create a holiday */
export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidays() });
    },
  });
}

/** Update a holiday */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      attendanceApi.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidays() });
    },
  });
}

/** Delete a holiday */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidays() });
    },
  });
}

/** Clone holidays from one year to another */
export function useCloneHolidays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.cloneHolidays(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidays() });
    },
  });
}

// ── Rosters ──────────────────────────────────────────────────────────

/** Create a roster */
export function useCreateRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.createRoster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.rosters() });
    },
  });
}

/** Update a roster */
export function useUpdateRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      attendanceApi.updateRoster(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.rosters() });
    },
  });
}

/** Delete a roster */
export function useDeleteRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.deleteRoster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.rosters() });
    },
  });
}

// ── Overtime Rules ───────────────────────────────────────────────────

/** Update overtime rules */
export function useUpdateOvertimeRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      attendanceApi.updateOvertimeRules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.overtimeRules(),
      });
    },
  });
}
