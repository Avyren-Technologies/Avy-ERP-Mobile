import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { shiftRotationApi } from '@/lib/api/shift-rotation';
import { shiftRotationKeys } from '@/features/company-admin/api/use-shift-rotation-queries';

/** Create a shift rotation schedule */
export function useCreateShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      shiftRotationApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}

/** Update a shift rotation schedule */
export function useUpdateShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shiftRotationApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}

/** Delete a shift rotation schedule */
export function useDeleteShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftRotationApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}

/** Assign employees to a shift schedule */
export function useAssignShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shiftRotationApi.assignEmployees(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}

/** Remove a single employee from a shift schedule */
export function useRemoveShiftScheduleEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      shiftRotationApi.removeEmployee(id, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}

/** Execute shift rotation (all active schedules) */
export function useExecuteShiftRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => shiftRotationApi.executeRotation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.all });
    },
    onError: showError,
  });
}
