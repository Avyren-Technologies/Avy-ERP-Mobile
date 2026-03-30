import { useMutation, useQueryClient } from '@tanstack/react-query';

import { essApi, type ESSConfig } from '@/lib/api/ess';
import { essKeys } from '@/features/company-admin/api/use-ess-queries';

// ── ESS Config ────────────────────────────────────────────────────

/** Update ESS configuration (upsert) */
export function useUpdateEssConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ESSConfig>) =>
      essApi.updateEssConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.essConfig() });
    },
  });
}

// ── Approval Workflows ────────────────────────────────────────────

/** Create an approval workflow */
export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.createApprovalWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.workflows() });
    },
  });
}

/** Update an approval workflow */
export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      essApi.updateApprovalWorkflow(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: essKeys.workflows() });
      queryClient.invalidateQueries({ queryKey: essKeys.workflow(id) });
    },
  });
}

/** Delete an approval workflow */
export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.deleteApprovalWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.workflows() });
    },
  });
}

// ── Approval Requests ─────────────────────────────────────────────

/** Approve an approval request (current step) */
export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      essApi.approveRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: essKeys.requests() });
      queryClient.invalidateQueries({ queryKey: essKeys.request(id) });
      queryClient.invalidateQueries({ queryKey: essKeys.pendingApprovals() });
    },
  });
}

/** Reject an approval request */
export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      essApi.rejectRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: essKeys.requests() });
      queryClient.invalidateQueries({ queryKey: essKeys.request(id) });
      queryClient.invalidateQueries({ queryKey: essKeys.pendingApprovals() });
    },
  });
}

// ── Notification Templates ────────────────────────────────────────

/** Create a notification template */
export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.createNotificationTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationTemplates() });
    },
  });
}

/** Update a notification template */
export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      essApi.updateNotificationTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationTemplates() });
    },
  });
}

/** Delete a notification template */
export function useDeleteNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.deleteNotificationTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationTemplates() });
    },
  });
}

// ── Notification Rules ────────────────────────────────────────────

/** Create a notification rule */
export function useCreateNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.createNotificationRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationRules() });
    },
  });
}

/** Update a notification rule */
export function useUpdateNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      essApi.updateNotificationRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationRules() });
    },
  });
}

/** Delete a notification rule */
export function useDeleteNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.deleteNotificationRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.notificationRules() });
    },
  });
}

// ── IT Declarations ───────────────────────────────────────────────

/** Create an IT declaration */
export function useCreateITDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.createITDeclaration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclarations() });
    },
  });
}

/** Update an IT declaration */
export function useUpdateITDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      essApi.updateITDeclaration(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclarations() });
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclaration(id) });
    },
  });
}

/** Submit an IT declaration for verification */
export function useSubmitITDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.submitITDeclaration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclarations() });
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclaration(id) });
    },
  });
}

/** Verify an IT declaration (HR action) */
export function useVerifyITDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.verifyITDeclaration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclarations() });
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclaration(id) });
    },
  });
}

/** Lock an IT declaration for payroll */
export function useLockITDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.lockITDeclaration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclarations() });
      queryClient.invalidateQueries({ queryKey: essKeys.itDeclaration(id) });
    },
  });
}

// ── ESS Self-Service (File Grievance) ────────────────────────────

/** File a grievance (employee) */
export function useFileGrievance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId: string; description: string; isAnonymous?: boolean }) =>
      essApi.fileGrievance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.myGrievances() });
    },
  });
}

// ── ESS Self-Service Mutations ────────────────────────────────────

/** Apply for leave (employee) */
export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.applyLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.myLeaveBalance() });
    },
  });
}

/** Request attendance regularization (employee) */
export function useRegularizeAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      essApi.regularizeAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essKeys.myAttendance() });
    },
  });
}
