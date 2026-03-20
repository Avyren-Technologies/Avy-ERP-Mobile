import { useQuery } from '@tanstack/react-query';

import {
  leaveApi,
  type LeaveTypeListParams,
  type LeavePolicyListParams,
  type LeaveBalanceListParams,
  type LeaveRequestListParams,
} from '@/lib/api/leave';

// --- Query keys ---

export const leaveKeys = {
  all: ['leave'] as const,

  // Leave Types
  leaveTypes: (params?: LeaveTypeListParams) =>
    [...leaveKeys.all, 'leave-types', params] as const,
  leaveType: (id: string) => [...leaveKeys.all, 'leave-type', id] as const,

  // Leave Policies
  policies: (params?: LeavePolicyListParams) =>
    [...leaveKeys.all, 'policies', params] as const,

  // Leave Balances
  balances: (params?: LeaveBalanceListParams) =>
    [...leaveKeys.all, 'balances', params] as const,

  // Leave Requests
  requests: (params?: LeaveRequestListParams) =>
    [...leaveKeys.all, 'requests', params] as const,
  request: (id: string) => [...leaveKeys.all, 'request', id] as const,

  // Summary / Dashboard
  summary: () => [...leaveKeys.all, 'summary'] as const,
};

// --- Leave Type Queries ---

/** List leave types */
export function useLeaveTypes(params?: LeaveTypeListParams) {
  return useQuery({
    queryKey: leaveKeys.leaveTypes(params),
    queryFn: () => leaveApi.listLeaveTypes(params),
  });
}

/** Single leave type by ID */
export function useLeaveType(id: string) {
  return useQuery({
    queryKey: leaveKeys.leaveType(id),
    queryFn: () => leaveApi.getLeaveType(id),
    enabled: !!id,
  });
}

// --- Leave Policy Queries ---

/** List leave policies with optional leaveTypeId filter */
export function useLeavePolicies(params?: LeavePolicyListParams) {
  return useQuery({
    queryKey: leaveKeys.policies(params),
    queryFn: () => leaveApi.listPolicies(params),
  });
}

// --- Leave Balance Queries ---

/** List leave balances with optional employeeId/year filter */
export function useLeaveBalances(params?: LeaveBalanceListParams) {
  return useQuery({
    queryKey: leaveKeys.balances(params),
    queryFn: () => leaveApi.listBalances(params),
  });
}

// --- Leave Request Queries ---

/** List leave requests with optional filters */
export function useLeaveRequests(params?: LeaveRequestListParams) {
  return useQuery({
    queryKey: leaveKeys.requests(params),
    queryFn: () => leaveApi.listRequests(params),
  });
}

/** Single leave request by ID */
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: leaveKeys.request(id),
    queryFn: () => leaveApi.getRequest(id),
    enabled: !!id,
  });
}

// --- Leave Summary ---

/** Dashboard stats (by type, pending approvals count) */
export function useLeaveSummary() {
  return useQuery({
    queryKey: leaveKeys.summary(),
    queryFn: () => leaveApi.getSummary(),
  });
}
