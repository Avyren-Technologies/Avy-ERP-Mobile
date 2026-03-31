import { useQuery } from '@tanstack/react-query';

import {
  essApi,
  type ApprovalWorkflowListParams,
  type ApprovalRequestListParams,
  type NotificationTemplateListParams,
  type NotificationRuleListParams,
  type ITDeclarationListParams,
  type EssMyAttendanceParams,
  type MssTeamMembersParams,
} from '@/lib/api/ess';

// --- Query keys ---

export const essKeys = {
  all: ['ess'] as const,

  // Dashboard
  dashboard: () =>
    [...essKeys.all, 'dashboard'] as const,

  // ESS Config
  essConfig: () =>
    [...essKeys.all, 'config'] as const,

  // Approval Workflows
  workflows: (params?: ApprovalWorkflowListParams) =>
    [...essKeys.all, 'workflows', params] as const,
  workflow: (id: string) =>
    [...essKeys.all, 'workflow', id] as const,

  // Approval Requests
  requests: (params?: ApprovalRequestListParams) =>
    [...essKeys.all, 'requests', params] as const,
  request: (id: string) =>
    [...essKeys.all, 'request', id] as const,
  pendingApprovals: () =>
    [...essKeys.all, 'pending-approvals'] as const,

  // Notification Templates
  notificationTemplates: (params?: NotificationTemplateListParams) =>
    [...essKeys.all, 'notification-templates', params] as const,

  // Notification Rules
  notificationRules: (params?: NotificationRuleListParams) =>
    [...essKeys.all, 'notification-rules', params] as const,

  // IT Declarations
  itDeclarations: (params?: ITDeclarationListParams) =>
    [...essKeys.all, 'it-declarations', params] as const,
  itDeclaration: (id: string) =>
    [...essKeys.all, 'it-declaration', id] as const,

  // ESS Self-Service
  myProfile: () =>
    [...essKeys.all, 'my-profile'] as const,
  myPayslips: () =>
    [...essKeys.all, 'my-payslips'] as const,
  myLeaveBalance: () =>
    [...essKeys.all, 'my-leave-balance'] as const,
  myAttendance: (params?: EssMyAttendanceParams) =>
    [...essKeys.all, 'my-attendance', params] as const,
  myDeclarations: () =>
    [...essKeys.all, 'my-declarations'] as const,

  // ESS Self-Service (Goals, Grievances, Training, Assets, Form16)
  myGoals: () =>
    [...essKeys.all, 'my-goals'] as const,
  myGrievances: () =>
    [...essKeys.all, 'my-grievances'] as const,
  myTraining: () =>
    [...essKeys.all, 'my-training'] as const,
  myAssets: () =>
    [...essKeys.all, 'my-assets'] as const,
  myForm16: () =>
    [...essKeys.all, 'my-form16'] as const,

  // MSS Manager Self-Service
  teamMembers: (params?: MssTeamMembersParams) =>
    [...essKeys.all, 'team-members', params] as const,
  pendingMssApprovals: () =>
    [...essKeys.all, 'pending-mss-approvals'] as const,
  teamAttendance: () =>
    [...essKeys.all, 'team-attendance'] as const,
  teamLeaveCalendar: () =>
    [...essKeys.all, 'team-leave-calendar'] as const,
};

// --- Dashboard Query ---

/** Employee/Manager dynamic dashboard with 30s auto-refetch */
export function useDashboard() {
  return useQuery({
    queryKey: essKeys.dashboard(),
    queryFn: () => essApi.getDashboard(),
    refetchInterval: 30_000,
  });
}

// --- ESS Config Queries ---

/** Get ESS configuration */
export function useEssConfig() {
  return useQuery({
    queryKey: essKeys.essConfig(),
    queryFn: () => essApi.getEssConfig(),
  });
}

// --- Approval Workflow Queries ---

/** List approval workflows */
export function useApprovalWorkflows(params?: ApprovalWorkflowListParams) {
  return useQuery({
    queryKey: essKeys.workflows(params),
    queryFn: () => essApi.listApprovalWorkflows(params),
  });
}

/** Single approval workflow by ID */
export function useApprovalWorkflow(id: string) {
  return useQuery({
    queryKey: essKeys.workflow(id),
    queryFn: () => essApi.getApprovalWorkflow(id),
    enabled: !!id,
  });
}

// --- Approval Request Queries ---

/** List approval requests with optional filters */
export function useApprovalRequests(params?: ApprovalRequestListParams) {
  return useQuery({
    queryKey: essKeys.requests(params),
    queryFn: () => essApi.listApprovalRequests(params),
  });
}

/** Single approval request by ID */
export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: essKeys.request(id),
    queryFn: () => essApi.getApprovalRequest(id),
    enabled: !!id,
  });
}

/** Pending approvals for current user */
export function usePendingApprovals() {
  return useQuery({
    queryKey: essKeys.pendingApprovals(),
    queryFn: () => essApi.getPendingApprovals(),
  });
}

// --- Notification Template Queries ---

/** List notification templates */
export function useNotificationTemplates(params?: NotificationTemplateListParams) {
  return useQuery({
    queryKey: essKeys.notificationTemplates(params),
    queryFn: () => essApi.listNotificationTemplates(params),
  });
}

// --- Notification Rule Queries ---

/** List notification rules */
export function useNotificationRules(params?: NotificationRuleListParams) {
  return useQuery({
    queryKey: essKeys.notificationRules(params),
    queryFn: () => essApi.listNotificationRules(params),
  });
}

// --- IT Declaration Queries ---

/** List IT declarations with optional filters */
export function useITDeclarations(params?: ITDeclarationListParams) {
  return useQuery({
    queryKey: essKeys.itDeclarations(params),
    queryFn: () => essApi.listITDeclarations(params),
  });
}

/** Single IT declaration by ID */
export function useITDeclaration(id: string) {
  return useQuery({
    queryKey: essKeys.itDeclaration(id),
    queryFn: () => essApi.getITDeclaration(id),
    enabled: !!id,
  });
}

// --- ESS Self-Service Queries ---

/** Employee's own profile */
export function useMyProfile() {
  return useQuery({
    queryKey: essKeys.myProfile(),
    queryFn: () => essApi.getMyProfile(),
  });
}

/** Employee's payslips */
export function useMyPayslips() {
  return useQuery({
    queryKey: essKeys.myPayslips(),
    queryFn: () => essApi.getMyPayslips(),
  });
}

/** Employee's leave balance */
export function useMyLeaveBalance() {
  return useQuery({
    queryKey: essKeys.myLeaveBalance(),
    queryFn: () => essApi.getMyLeaveBalance(),
  });
}

/** Employee's attendance records */
export function useMyAttendance(params?: EssMyAttendanceParams) {
  return useQuery({
    queryKey: essKeys.myAttendance(params),
    queryFn: () => essApi.getMyAttendance(params),
  });
}

/** Employee's IT declarations */
export function useMyDeclarations() {
  return useQuery({
    queryKey: essKeys.myDeclarations(),
    queryFn: () => essApi.getMyDeclarations(),
  });
}

// --- ESS Self-Service (Goals, Grievances, Training, Assets, Form16) ---

/** Employee's own goals */
export function useMyGoals() {
  return useQuery({
    queryKey: essKeys.myGoals(),
    queryFn: () => essApi.getMyGoals(),
  });
}

/** Employee's own grievances */
export function useMyGrievances() {
  return useQuery({
    queryKey: essKeys.myGrievances(),
    queryFn: () => essApi.getMyGrievances(),
  });
}

/** Employee's training nominations */
export function useMyTraining() {
  return useQuery({
    queryKey: essKeys.myTraining(),
    queryFn: () => essApi.getMyTraining(),
  });
}

/** Employee's assigned assets */
export function useMyAssets() {
  return useQuery({
    queryKey: essKeys.myAssets(),
    queryFn: () => essApi.getMyAssets(),
  });
}

/** Employee's Form-16 / tax records */
export function useMyForm16() {
  return useQuery({
    queryKey: essKeys.myForm16(),
    queryFn: () => essApi.getMyForm16(),
  });
}

// --- MSS Manager Self-Service Queries ---

/** Manager's team members */
export function useTeamMembers(params?: MssTeamMembersParams) {
  return useQuery({
    queryKey: essKeys.teamMembers(params),
    queryFn: () => essApi.getTeamMembers(params),
  });
}

/** Pending leave/attendance approvals for manager */
export function usePendingMssApprovals() {
  return useQuery({
    queryKey: essKeys.pendingMssApprovals(),
    queryFn: () => essApi.getPendingMssApprovals(),
  });
}

/** Team attendance view */
export function useTeamAttendance() {
  return useQuery({
    queryKey: essKeys.teamAttendance(),
    queryFn: () => essApi.getTeamAttendance(),
  });
}

/** Team leave calendar */
export function useTeamLeaveCalendar() {
  return useQuery({
    queryKey: essKeys.teamLeaveCalendar(),
    queryFn: () => essApi.getTeamLeaveCalendar(),
  });
}
