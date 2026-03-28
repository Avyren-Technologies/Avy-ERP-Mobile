import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { shiftRotationApi } from '@/lib/api/shift-rotation';
import { shiftRotationKeys } from '@/features/company-admin/api/use-shift-rotation-queries';

// ── Schedules ────────────────────────────────────────────────────────

/** Create a shift rotation schedule */
export function useCreateShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      shiftRotationApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.schedules() });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.schedules() });
      queryClient.invalidateQueries({
        queryKey: shiftRotationKeys.schedule(variables.id),
      });
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
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.schedules() });
    },
    onError: showError,
  });
}

// ── Assign / Remove ──────────────────────────────────────────────────

/** Assign employees to a shift schedule */
export function useAssignShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shiftRotationApi.assignEmployees(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: shiftRotationKeys.schedule(variables.id),
      });
    },
    onError: showError,
  });
}

/** Remove employees from a shift schedule */
export function useRemoveShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shiftRotationApi.removeEmployees(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: shiftRotationKeys.schedule(variables.id),
      });
    },
    onError: showError,
  });
}

// ── Execute ──────────────────────────────────────────────────────────

/** Execute a shift rotation */
export function useExecuteShiftRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftRotationApi.executeRotation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: shiftRotationKeys.schedule(id) });
    },
    onError: showError,
  });
}
