import { useQuery } from '@tanstack/react-query';

import {
  shiftRotationApi,
  type ShiftScheduleListParams,
} from '@/lib/api/shift-rotation';

// --- Query keys ---

export const shiftRotationKeys = {
  all: ['shift-rotation'] as const,

  // Schedules
  schedules: (params?: ShiftScheduleListParams) =>
    [...shiftRotationKeys.all, 'schedules', params] as const,
  schedule: (id: string) =>
    [...shiftRotationKeys.all, 'schedule', id] as const,
};

// --- Schedule Queries ---

/** List shift rotation schedules */
export function useShiftSchedules(params?: ShiftScheduleListParams) {
  return useQuery({
    queryKey: shiftRotationKeys.schedules(params),
    queryFn: () => shiftRotationApi.listSchedules(params),
  });
}

/** Single shift rotation schedule by ID */
export function useShiftSchedule(id: string) {
  return useQuery({
    queryKey: shiftRotationKeys.schedule(id),
    queryFn: () => shiftRotationApi.getSchedule(id),
    enabled: !!id,
  });
}
