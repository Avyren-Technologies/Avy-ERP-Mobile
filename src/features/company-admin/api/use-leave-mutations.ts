import { useMutation, useQueryClient } from '@tanstack/react-query';

import { leaveApi } from '@/lib/api/leave';
import { leaveKeys } from '@/features/company-admin/api/use-leave-queries';

// ── Leave Types ──────────────────────────────────────────────────────

/** Create a new leave type */
export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      leaveApi.createLeaveType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.leaveTypes() });
    },
  });
}

/** Update a leave type */
export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      leaveApi.updateLeaveType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.leaveTypes() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.leaveType(variables.id),
      });
    },
  });
}

/** Delete a leave type */
export function useDeleteLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.deleteLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.leaveTypes() });
    },
  });
}

// ── Leave Policies ───────────────────────────────────────────────────

/** Create a leave policy */
export function useCreateLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      leaveApi.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.policies() });
    },
  });
}

/** Update a leave policy */
export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      leaveApi.updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.policies() });
    },
  });
}

/** Delete a leave policy */
export function useDeleteLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.policies() });
    },
  });
}

// ── Leave Balances ───────────────────────────────────────────────────

/** Manual credit/debit adjustment (HR override) */
export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      leaveApi.adjustBalance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.summary() });
    },
  });
}

/** Initialize balances for a new employee */
export function useInitializeLeaveBalances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      leaveApi.initializeBalances(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
    },
  });
}

// ── Leave Requests ───────────────────────────────────────────────────

/** Apply for leave */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      leaveApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.summary() });
    },
  });
}

/** Approve a leave request */
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      leaveApi.approveRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.request(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.summary() });
    },
  });
}

/** Reject a leave request */
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      leaveApi.rejectRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.request(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leaveKeys.summary() });
    },
  });
}

/** Cancel a leave request */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      leaveApi.cancelRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.request(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.summary() });
    },
  });
}
