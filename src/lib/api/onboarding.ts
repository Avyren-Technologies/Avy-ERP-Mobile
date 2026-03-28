import { client } from '@/lib/api/client';

// --- Types ---

export interface OnboardingTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface OnboardingTaskListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

// --- API Service ---

/**
 * Onboarding API service — templates CRUD, tasks generation/listing/updating,
 * and progress tracking.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const onboardingApi = {
  // ── Templates ──────────────────────────────────────────────────
  listTemplates: (params?: OnboardingTemplateListParams) =>
    client.get('/hr/onboarding-templates', { params }),

  getTemplate: (id: string) =>
    client.get(`/hr/onboarding-templates/${id}`),

  createTemplate: (data: Record<string, unknown>) =>
    client.post('/hr/onboarding-templates', data),

  updateTemplate: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/onboarding-templates/${id}`, data),

  deleteTemplate: (id: string) =>
    client.delete(`/hr/onboarding-templates/${id}`),

  // ── Tasks ──────────────────────────────────────────────────────
  generateTasks: (data: Record<string, unknown>) =>
    client.post('/hr/onboarding-tasks/generate', data),

  listTasks: (params?: OnboardingTaskListParams) =>
    client.get('/hr/onboarding-tasks', { params }),

  updateTask: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/onboarding-tasks/${id}`, data),

  // ── Progress ───────────────────────────────────────────────────
  getProgress: (employeeId: string) =>
    client.get(`/hr/onboarding-tasks/progress/${employeeId}`),
};
