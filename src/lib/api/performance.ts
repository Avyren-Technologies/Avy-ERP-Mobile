import { client } from '@/lib/api/client';

// --- Types ---

export interface AppraisalCycleListParams {
  page?: number;
  limit?: number;
}

export interface GoalListParams {
  page?: number;
  limit?: number;
}

export interface AppraisalEntryListParams {
  page?: number;
  limit?: number;
  cycleId?: string;
  employeeId?: string;
  status?: string;
}

export interface Feedback360ListParams {
  page?: number;
  limit?: number;
  cycleId?: string;
  employeeId?: string;
}

export interface SkillListParams {
  page?: number;
  limit?: number;
}

export interface SkillMappingListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
}

export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
}

// --- API Service ---

/**
 * Performance Management API service — appraisal cycles, goals, appraisal entries,
 * 360 feedback, skills, succession planning, and performance dashboard.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const performanceApi = {
  // ── Appraisal Cycles ────────────────────────────────────────
  listAppraisalCycles: (params?: AppraisalCycleListParams) =>
    client.get('/hr/appraisal-cycles', { params }),

  createAppraisalCycle: (data: Record<string, unknown>) =>
    client.post('/hr/appraisal-cycles', data),

  getAppraisalCycle: (id: string) =>
    client.get(`/hr/appraisal-cycles/${id}`),

  updateAppraisalCycle: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/appraisal-cycles/${id}`, data),

  deleteAppraisalCycle: (id: string) =>
    client.delete(`/hr/appraisal-cycles/${id}`),

  activateAppraisalCycle: (id: string) =>
    client.patch(`/hr/appraisal-cycles/${id}/activate`),

  publishAppraisalCycle: (id: string) =>
    client.patch(`/hr/appraisal-cycles/${id}/publish`),

  closeAppraisalCycle: (id: string) =>
    client.patch(`/hr/appraisal-cycles/${id}/close`),

  // ── Goals (KRA/OKR) ────────────────────────────────────────
  listGoals: (params?: GoalListParams) =>
    client.get('/hr/goals', { params }),

  createGoal: (data: Record<string, unknown>) =>
    client.post('/hr/goals', data),

  getGoal: (id: string) =>
    client.get(`/hr/goals/${id}`),

  updateGoal: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/goals/${id}`, data),

  deleteGoal: (id: string) =>
    client.delete(`/hr/goals/${id}`),

  getDepartmentGoals: (departmentId: string) =>
    client.get(`/hr/goals/cascade/${departmentId}`),

  // ── Appraisal Entries ───────────────────────────────────────
  listAppraisalEntries: (params?: AppraisalEntryListParams) =>
    client.get('/hr/appraisal-entries', { params }),

  getAppraisalEntry: (id: string) =>
    client.get(`/hr/appraisal-entries/${id}`),

  updateAppraisalEntry: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/appraisal-entries/${id}`, data),

  submitSelfReview: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/appraisal-entries/${id}/self-review`, data),

  submitManagerReview: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/appraisal-entries/${id}/manager-review`, data),

  publishAppraisalEntry: (id: string) =>
    client.patch(`/hr/appraisal-entries/${id}/publish`),

  getCalibrationData: (cycleId: string) =>
    client.get(`/hr/appraisal-cycles/${cycleId}/calibration`),

  // ── 360 Feedback ────────────────────────────────────────────
  listFeedback360: (params?: Feedback360ListParams) =>
    client.get('/hr/feedback360', { params }),

  createFeedback360: (data: Record<string, unknown>) =>
    client.post('/hr/feedback360', data),

  getFeedback360: (id: string) =>
    client.get(`/hr/feedback360/${id}`),

  updateFeedback360: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/feedback360/${id}`, data),

  getFeedback360Report: (employeeId: string, cycleId: string) =>
    client.get(`/hr/feedback360/report/${employeeId}/${cycleId}`),

  // ── Skills ──────────────────────────────────────────────────
  listSkills: (params?: SkillListParams) =>
    client.get('/hr/skills', { params }),

  createSkill: (data: Record<string, unknown>) =>
    client.post('/hr/skills', data),

  getSkill: (id: string) =>
    client.get(`/hr/skills/${id}`),

  updateSkill: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/skills/${id}`, data),

  deleteSkill: (id: string) =>
    client.delete(`/hr/skills/${id}`),

  // ── Skill Mappings ──────────────────────────────────────────
  listSkillMappings: (params?: SkillMappingListParams) =>
    client.get('/hr/skill-mappings', { params }),

  createSkillMapping: (data: Record<string, unknown>) =>
    client.post('/hr/skill-mappings', data),

  updateSkillMapping: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/skill-mappings/${id}`, data),

  deleteSkillMapping: (id: string) =>
    client.delete(`/hr/skill-mappings/${id}`),

  getSkillGapAnalysis: (employeeId: string) =>
    client.get(`/hr/skill-mappings/gap-analysis/${employeeId}`),

  // ── Succession Planning ─────────────────────────────────────
  listSuccessionPlans: (params?: SuccessionPlanListParams) =>
    client.get('/hr/succession-plans', { params }),

  createSuccessionPlan: (data: Record<string, unknown>) =>
    client.post('/hr/succession-plans', data),

  getSuccessionPlan: (id: string) =>
    client.get(`/hr/succession-plans/${id}`),

  updateSuccessionPlan: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/succession-plans/${id}`, data),

  deleteSuccessionPlan: (id: string) =>
    client.delete(`/hr/succession-plans/${id}`),

  getNineBoxData: () =>
    client.get('/hr/succession-plans/nine-box'),

  getBenchStrength: () =>
    client.get('/hr/succession-plans/bench-strength'),

  // ── Performance Dashboard ───────────────────────────────────
  getPerformanceDashboard: () =>
    client.get('/hr/performance-dashboard'),
};
