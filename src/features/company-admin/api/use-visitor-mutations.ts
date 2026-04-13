import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { visitorsApi } from '@/lib/api/visitors';
import { visitorKeys } from '@/features/company-admin/api/use-visitor-queries';

// ── Visits ───────────────────────────────────────────────────────────

/** Create a new visit (pre-registration or walk-in) */
export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats() });
    },
    onError: showError,
  });
}

/** Update an existing visit */
export function useUpdateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      visitorsApi.updateVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
    },
    onError: showError,
  });
}

/** Cancel a visit */
export function useCancelVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.cancelVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats() });
    },
    onError: showError,
  });
}

/** Check in a visitor */
export function useCheckInVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      visitorsApi.checkInVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats() });
    },
    onError: showError,
  });
}

/** Check out a visitor */
export function useCheckOutVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      visitorsApi.checkOutVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats() });
    },
    onError: showError,
  });
}

/** Approve a visit */
export function useApproveVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      visitorsApi.approveVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
    },
    onError: showError,
  });
}

/** Reject a visit */
export function useRejectVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      visitorsApi.rejectVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
    },
    onError: showError,
  });
}

/** Extend a visit duration */
export function useExtendVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      visitorsApi.extendVisit(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.visits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.visit(variables.id) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
    },
    onError: showError,
  });
}

// ── Visitor Types ────────────────────────────────────────────────────

/** Create a new visitor type */
export function useCreateVisitorType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createVisitorType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.types() });
    },
    onError: showError,
  });
}

/** Update an existing visitor type */
export function useUpdateVisitorType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      visitorsApi.updateVisitorType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.types() });
    },
    onError: showError,
  });
}

/** Delete a visitor type */
export function useDeleteVisitorType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.deleteVisitorType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.types() });
    },
    onError: showError,
  });
}

// ── Gates ────────────────────────────────────────────────────────────

/** Create a new gate */
export function useCreateGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createGate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.gates() });
    },
    onError: showError,
  });
}

/** Update an existing gate */
export function useUpdateGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      visitorsApi.updateGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.gates() });
    },
    onError: showError,
  });
}

/** Delete a gate */
export function useDeleteGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.deleteGate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.gates() });
    },
    onError: showError,
  });
}

// ── Watchlist ────────────────────────────────────────────────────────

/** Add a watchlist entry */
export function useCreateWatchlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createWatchlistEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.watchlist() });
    },
    onError: showError,
  });
}

/** Check a visitor against the watchlist */
export function useCheckWatchlist() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.checkWatchlist(data),
    onError: showError,
  });
}

// ── Recurring Passes ─────────────────────────────────────────────────

/** Check in a recurring pass */
export function useCheckInRecurringPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.checkInRecurringPass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.recurringPasses() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
    },
    onError: showError,
  });
}

// ── Vehicle / Material Passes ────────────────────────────────────────

/** Create a vehicle pass */
export function useCreateVehiclePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createVehiclePass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.vehiclePasses() });
    },
    onError: showError,
  });
}

/** Create a material pass */
export function useCreateMaterialPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.createMaterialPass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.materialPasses() });
    },
    onError: showError,
  });
}

// ── Group Visits ─────────────────────────────────────────────────────

/** Batch check-in for a group visit */
export function useBatchCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.batchCheckIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.groupVisits() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.dashboardToday() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats() });
    },
    onError: showError,
  });
}

// ── Emergency ────────────────────────────────────────────────────────

/** Trigger an emergency evacuation */
export function useTriggerEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.triggerEmergency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.musterList() });
    },
    onError: showError,
  });
}

/** Mark a visitor as safe during emergency */
export function useMarkSafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.markSafe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.musterList() });
    },
    onError: showError,
  });
}

/** Resolve an active emergency */
export function useResolveEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => visitorsApi.resolveEmergency(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.musterList() });
      queryClient.invalidateQueries({ queryKey: visitorKeys.onSite() });
    },
    onError: showError,
  });
}

// ── Config ───────────────────────────────────────────────────────────

/** Update VMS configuration */
export function useUpdateVMSConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      visitorsApi.updateVMSConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.config() });
    },
    onError: showError,
  });
}
