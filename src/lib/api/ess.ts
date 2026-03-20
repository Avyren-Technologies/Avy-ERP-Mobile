import { client } from '@/lib/api/client';

// --- Types ---

export interface EssConfigParams {
  // No params needed for GET
}

export interface ApprovalWorkflowListParams {
  page?: number;
  limit?: number;
}

export interface ApprovalRequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  entityType?: string;
}

export interface NotificationTemplateListParams {
  page?: number;
  limit?: number;
}

export interface NotificationRuleListParams {
  page?: number;
  limit?: number;
}

export interface ITDeclarationListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  year?: number;
  status?: string;
}

export interface EssMyAttendanceParams {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
}

export interface MssTeamMembersParams {
  page?: number;
  limit?: number;
}

// --- API Service ---

/**
 * ESS & Workflow API service — ESS config, approval workflows, approval requests,
 * notification templates/rules, IT declarations, and self-service endpoints.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const essApi = {
  // ── ESS Config ────────────────────────────────────────────────
  getEssConfig: () =>
    client.get('/hr/ess-config'),

  updateEssConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/ess-config', data),

  // ── Approval Workflows ────────────────────────────────────────
  listApprovalWorkflows: (params?: ApprovalWorkflowListParams) =>
    client.get('/hr/approval-workflows', { params }),

  createApprovalWorkflow: (data: Record<string, unknown>) =>
    client.post('/hr/approval-workflows', data),

  getApprovalWorkflow: (id: string) =>
    client.get(`/hr/approval-workflows/${id}`),

  updateApprovalWorkflow: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/approval-workflows/${id}`, data),

  deleteApprovalWorkflow: (id: string) =>
    client.delete(`/hr/approval-workflows/${id}`),

  // ── Approval Requests ─────────────────────────────────────────
  listApprovalRequests: (params?: ApprovalRequestListParams) =>
    client.get('/hr/approval-requests', { params }),

  getApprovalRequest: (id: string) =>
    client.get(`/hr/approval-requests/${id}`),

  approveRequest: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/approval-requests/${id}/approve`, data),

  rejectRequest: (id: string, data?: Record<string, unknown>) =>
    client.patch(`/hr/approval-requests/${id}/reject`, data),

  getPendingApprovals: () =>
    client.get('/hr/approval-requests/pending'),

  // ── Notification Templates ────────────────────────────────────
  listNotificationTemplates: (params?: NotificationTemplateListParams) =>
    client.get('/hr/notification-templates', { params }),

  createNotificationTemplate: (data: Record<string, unknown>) =>
    client.post('/hr/notification-templates', data),

  updateNotificationTemplate: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/notification-templates/${id}`, data),

  deleteNotificationTemplate: (id: string) =>
    client.delete(`/hr/notification-templates/${id}`),

  // ── Notification Rules ────────────────────────────────────────
  listNotificationRules: (params?: NotificationRuleListParams) =>
    client.get('/hr/notification-rules', { params }),

  createNotificationRule: (data: Record<string, unknown>) =>
    client.post('/hr/notification-rules', data),

  updateNotificationRule: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/notification-rules/${id}`, data),

  deleteNotificationRule: (id: string) =>
    client.delete(`/hr/notification-rules/${id}`),

  // ── IT Declarations ───────────────────────────────────────────
  listITDeclarations: (params?: ITDeclarationListParams) =>
    client.get('/hr/it-declarations', { params }),

  createITDeclaration: (data: Record<string, unknown>) =>
    client.post('/hr/it-declarations', data),

  getITDeclaration: (id: string) =>
    client.get(`/hr/it-declarations/${id}`),

  updateITDeclaration: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/it-declarations/${id}`, data),

  submitITDeclaration: (id: string) =>
    client.patch(`/hr/it-declarations/${id}/submit`),

  verifyITDeclaration: (id: string) =>
    client.patch(`/hr/it-declarations/${id}/verify`),

  lockITDeclaration: (id: string) =>
    client.patch(`/hr/it-declarations/${id}/lock`),

  // ── ESS Employee Self-Service ─────────────────────────────────
  getMyProfile: () =>
    client.get('/hr/ess/my-profile'),

  getMyPayslips: () =>
    client.get('/hr/ess/my-payslips'),

  getMyLeaveBalance: () =>
    client.get('/hr/ess/my-leave-balance'),

  getMyAttendance: (params?: EssMyAttendanceParams) =>
    client.get('/hr/ess/my-attendance', { params }),

  getMyDeclarations: () =>
    client.get('/hr/ess/my-declarations'),

  applyLeave: (data: Record<string, unknown>) =>
    client.post('/hr/ess/apply-leave', data),

  regularizeAttendance: (data: Record<string, unknown>) =>
    client.post('/hr/ess/regularize-attendance', data),

  // ── MSS Manager Self-Service ──────────────────────────────────
  getTeamMembers: (params?: MssTeamMembersParams) =>
    client.get('/hr/mss/team-members', { params }),

  getPendingMssApprovals: () =>
    client.get('/hr/mss/pending-approvals'),

  getTeamAttendance: () =>
    client.get('/hr/mss/team-attendance'),

  getTeamLeaveCalendar: () =>
    client.get('/hr/mss/team-leave-calendar'),
};
