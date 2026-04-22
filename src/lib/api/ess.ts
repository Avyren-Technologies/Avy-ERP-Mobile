import { client } from '@/lib/api/client';

// --- Dashboard Types ---

export interface DashboardAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
}

export interface DashboardShiftInfo {
  shiftName: string;
  startTime: string;
  endTime: string;
  status: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NOT_LINKED';
  attendanceRecordId: string | null;
  punchIn: string | null;
  punchOut: string | null;
  elapsedSeconds: number;
  workedHours: number | string | null;
  locationName: string | null;
  canStartNewShift?: boolean;
  completedShifts?: number;
}

export interface DashboardLeaveBalanceItem {
  leaveTypeName: string;
  allocated: number;
  used: number;
  remaining: number;
  color?: string;
}

export interface DashboardAttendanceDay {
  date: string;
  status: string;
  punchIn: string | null;
  punchOut: string | null;
  workedHours: number | string | null;
}

export interface DashboardTeamSummary {
  present: number;
  absent: number;
  onLeave: number;
  notCheckedIn: number;
  total: number;
}

export interface DashboardPendingApproval {
  id: string;
  type: string;
  employeeName: string;
  description: string;
  createdAt: string;
}

export interface DashboardHoliday {
  id: string;
  name: string;
  date: string;
  type: string;
}

export interface DashboardGoalsSummary {
  activeCount: number;
  avgCompletion: number;
}

export interface DashboardStats {
  leaveBalanceTotal: number;
  attendancePercentage: number;
  presentDays: number;
  workingDays: number;
  pendingApprovalsCount: number;
  goals: DashboardGoalsSummary;
}

export interface DashboardShiftCalendarDay {
  date: string;
  dayName: string;
  shiftName: string | null;
  shiftType: string | null;
  startTime: string | null;
  endTime: string | null;
  isHoliday: boolean;
  holidayName?: string;
  isWeekOff: boolean;
  isToday: boolean;
}

export interface DashboardWeeklyChartDay {
  date: string;
  dayName: string;
  hoursWorked: number;
  status: string;
  isHoliday: boolean;
  isWeekOff: boolean;
}

export interface DashboardLeaveDonutItem {
  category: string;
  totalEntitled: number;
  used: number;
  remaining: number;
  color: string;
}

export interface DashboardMonthlyTrendItem {
  month: string;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
}

export interface DashboardData {
  announcements: DashboardAnnouncement[];
  shift: DashboardShiftInfo | null;
  stats: DashboardStats;
  leaveBalances: DashboardLeaveBalanceItem[];
  recentAttendance: DashboardAttendanceDay[];
  teamSummary: DashboardTeamSummary | null;
  pendingApprovals: DashboardPendingApproval[];
  upcomingHolidays: DashboardHoliday[];
  shiftCalendar: DashboardShiftCalendarDay[] | null;
  weeklyChart: DashboardWeeklyChartDay[] | null;
  leaveDonut: DashboardLeaveDonutItem[] | null;
  monthlyTrend: DashboardMonthlyTrendItem[] | null;
  attendanceMode: string;
  checkInUIMode: string;
  companyShifts: Array<{ id: string; name: string; startTime: string; endTime: string; shiftType?: string }>;
}

// --- Types ---

export type LocationAccuracy = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ESSConfig {
  id?: string;
  // Payroll & Tax
  viewPayslips: boolean;
  downloadPayslips: boolean;
  downloadForm16: boolean;
  viewSalaryStructure: boolean;
  itDeclaration: boolean;
  // Leave
  leaveApplication: boolean;
  leaveBalanceView: boolean;
  leaveCancellation: boolean;
  // Attendance
  attendanceView: boolean;
  attendanceRegularization: boolean;
  viewShiftSchedule: boolean;
  shiftSwapRequest: boolean;
  wfhRequest: boolean;
  // Profile & Documents
  profileUpdate: boolean;
  documentUpload: boolean;
  employeeDirectory: boolean;
  viewOrgChart: boolean;
  // Financial
  reimbursementClaims: boolean;
  loanApplication: boolean;
  assetView: boolean;
  // Performance & Development
  performanceGoals: boolean;
  appraisalAccess: boolean;
  feedback360: boolean;
  trainingEnrollment: boolean;
  // Support & Communication
  helpDesk: boolean;
  grievanceSubmission: boolean;
  holidayCalendar: boolean;
  policyDocuments: boolean;
  announcementBoard: boolean;
  // Manager Self-Service (MSS)
  mssViewTeam: boolean;
  mssApproveLeave: boolean;
  mssApproveAttendance: boolean;
  mssViewTeamAttendance: boolean;
  // Mobile Behavior
  mobileOfflinePunch: boolean;
  mobileSyncRetryMinutes: number;
  mobileLocationAccuracy: LocationAccuracy;
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
 * ESS & Workflow API service -- ESS config, approval workflows, approval requests,
 * notification templates/rules, IT declarations, and self-service endpoints.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const essApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () =>
    client.get('/hr/ess/dashboard'),

  // ── ESS Config ────────────────────────────────────────────────
  getEssConfig: () =>
    client.get('/hr/ess-config'),

  updateEssConfig: (data: Partial<ESSConfig>) =>
    client.patch('/hr/ess-config', data),

  // ── Approval Workflow Config ─────────────────────────────────
  getApprovalWorkflowConfig: () =>
    client.get('/hr/approval-workflow-config'),

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

  // ── ESS Self-Service (Goals, Grievances, Training, Assets, Form16) ──
  getMyGoals: () =>
    client.get('/hr/ess/my-goals'),

  getMyGrievances: () =>
    client.get('/hr/ess/my-grievances'),

  fileGrievance: (data: { categoryId: string; description: string; isAnonymous?: boolean }) =>
    client.post('/hr/ess/file-grievance', data),

  getMyTraining: () =>
    client.get('/hr/ess/my-training'),

  getMyAssets: () =>
    client.get('/hr/ess/my-assets'),

  getMyForm16: () =>
    client.get('/hr/ess/my-form16'),

  // ── MSS Manager Self-Service ──────────────────────────────────
  getTeamMembers: (params?: MssTeamMembersParams) =>
    client.get('/hr/mss/team-members', { params }),

  getPendingMssApprovals: () =>
    client.get('/hr/mss/pending-approvals'),

  getTeamAttendance: () =>
    client.get('/hr/mss/team-attendance'),

  getTeamLeaveCalendar: () =>
    client.get('/hr/mss/team-leave-calendar'),

  // ── ESS Additional Self-Service ────────────────────────────────
  updateMyProfile: async (data: any) => {
    const r = await client.patch('/hr/ess/my-profile', data);
    return r.data;
  },

  getPayslipDetail: async (payslipId: string) => {
    const r = await client.get(`/hr/ess/my-payslips/${payslipId}/detail`);
    return r.data;
  },

  downloadPayslipPdf: async (payslipId: string) => {
    const r = await client.get(`/hr/ess/my-payslips/${payslipId}/pdf`, { responseType: 'arraybuffer' });
    return r.data;
  },

  cancelLeave: async (id: string) => {
    const r = await client.patch(`/hr/leave-requests/${id}/cancel`);
    return r.data;
  },

  // ── Shift Swap ──────────────────────────────────────────────────
  getMyShiftSwaps: async () => {
    const r = await client.get('/hr/ess/my-shift-swaps');
    return r.data;
  },

  createShiftSwap: async (data: any) => {
    const r = await client.post('/hr/ess/shift-swap', data);
    return r.data;
  },

  cancelShiftSwap: async (id: string) => {
    const r = await client.patch(`/hr/ess/shift-swap/${id}/cancel`);
    return r.data;
  },

  // ── WFH Requests ───────────────────────────────────────────────
  getMyWfhRequests: async () => {
    const r = await client.get('/hr/ess/my-wfh-requests');
    return r.data;
  },

  createWfhRequest: async (data: any) => {
    const r = await client.post('/hr/ess/wfh-request', data);
    return r.data;
  },

  cancelWfhRequest: async (id: string) => {
    const r = await client.patch(`/hr/ess/wfh-request/${id}/cancel`);
    return r.data;
  },

  // ── My Documents ───────────────────────────────────────────────
  getMyDocuments: async () => {
    const r = await client.get('/hr/ess/my-documents');
    return r.data;
  },

  uploadMyDocument: async (data: any) => {
    const r = await client.post('/hr/ess/my-documents', data);
    return r.data;
  },

  deleteMyDocument: async (id: string) => {
    const r = await client.delete(`/hr/ess/my-documents/${id}`);
    return r.data;
  },

  // ── Policy Documents ──────────────────────────────────────────
  getPolicyDocuments: async () => {
    const r = await client.get('/hr/ess/policy-documents');
    return r.data;
  },

  // ── Holiday Calendar ──────────────────────────────────────────
  getMyHolidays: async (year?: number) => {
    const r = await client.get('/hr/ess/my-holidays', { params: year ? { year } : {} });
    return r.data;
  },

  // ── Expense Claims ────────────────────────────────────────────
  getMyExpenseClaims: async () => {
    const r = await client.get('/hr/ess/my-expense-claims');
    return r.data;
  },

  createMyExpenseClaim: async (data: any) => {
    const r = await client.post('/hr/ess/my-expense-claims', data);
    return r.data;
  },

  submitMyExpenseClaim: async (id: string) => {
    const r = await client.patch(`/hr/ess/my-expense-claims/${id}/submit`);
    return r.data;
  },

  cancelMyExpenseClaim: async (id: string) => {
    const r = await client.patch(`/hr/ess/my-expense-claims/${id}/cancel`);
    return r.data;
  },

  getExpenseCategories: async () => {
    const r = await client.get('/hr/ess/expense-categories');
    return r.data;
  },

  getMyExpenseClaimsSummary: async () => {
    const r = await client.get('/hr/ess/my-expense-claims/summary');
    return r.data;
  },

  // ── Loans ─────────────────────────────────────────────────────
  getMyLoans: async () => {
    const r = await client.get('/hr/ess/my-loans');
    return r.data;
  },

  getAvailableLoanPolicies: async () => {
    const r = await client.get('/hr/ess/loan-policies');
    return r.data;
  },

  applyForLoan: async (data: any) => {
    const r = await client.post('/hr/ess/apply-loan', data);
    return r.data;
  },

  // ── Appraisal Entries ──────────────────────────────────────────
  getMyAppraisals: () =>
    client.get('/hr/appraisal-entries'),

  getMyAppraisalEntry: (id: string) =>
    client.get(`/hr/appraisal-entries/${id}`),

  submitSelfReview: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/appraisal-entries/${id}/self-review`, data),
};

// ── Overtime Types ──

export type OvertimeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'COMP_OFF_ACCRUED';
export type OTMultiplierSource = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | 'NIGHT_SHIFT';
export type OvertimeRequestSource = 'AUTO' | 'MANUAL';

export interface OvertimeRequestListItem {
  id: string;
  date: string;
  source: OvertimeRequestSource;
  requestedHours: number;
  appliedMultiplier: number;
  multiplierSource: OTMultiplierSource;
  calculatedAmount: number | null;
  status: OvertimeRequestStatus;
  reason: string | null;
  attachments: string[] | null;
  compOffGranted: boolean;
  approvalNotes: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface OvertimeRequestDetail extends OvertimeRequestListItem {
  attendanceRecord: {
    date: string;
    punchIn: string | null;
    punchOut: string | null;
    workedHours: number | null;
    status: string;
    shiftName: string | null;
  } | null;
  approvedByName: string | null;
  requestedByName: string | null;
}

export interface OvertimeSummary {
  totalOtHours: number;
  pendingCount: number;
  approvedAmount: number;
  totalRequests: number;
  compOff: {
    balance: number;
    expiresAt: string | null;
    leaveTypeId: string | null;
  } | null;
}

export interface ClaimOvertimePayload {
  date: string;
  hours: number;
  reason: string;
  attachments?: string[];
}

export interface OvertimeListParams {
  status?: OvertimeRequestStatus;
  source?: OvertimeRequestSource;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ── Overtime API ──

export const essOvertimeApi = {
  getMyOvertimeRequests: (params?: OvertimeListParams) =>
    client.get('/hr/ess/my-overtime-requests', { params }),

  getMyOvertimeDetail: (id: string) =>
    client.get(`/hr/ess/my-overtime-requests/${id}`),

  getMyOvertimeSummary: (params?: { month?: number; year?: number }) =>
    client.get('/hr/ess/my-overtime-summary', { params }),

  claimOvertime: (data: ClaimOvertimePayload) =>
    client.post('/hr/ess/claim-overtime', data),
};
