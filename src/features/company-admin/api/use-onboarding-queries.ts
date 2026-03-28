import { useQuery } from '@tanstack/react-query';

import {
  onboardingApi,
  type OnboardingTemplateListParams,
  type OnboardingTaskListParams,
} from '@/lib/api/onboarding';

// --- Query keys ---

export const onboardingKeys = {
  all: ['onboarding'] as const,

  // Templates
  templates: (params?: OnboardingTemplateListParams) =>
    [...onboardingKeys.all, 'templates', params] as const,
  template: (id: string) =>
    [...onboardingKeys.all, 'template', id] as const,

  // Tasks
  tasks: (params?: OnboardingTaskListParams) =>
    [...onboardingKeys.all, 'tasks', params] as const,

  // Progress
  progress: (employeeId: string) =>
    [...onboardingKeys.all, 'progress', employeeId] as const,
};

// --- Template Queries ---

/** List onboarding templates */
export function useOnboardingTemplates(params?: OnboardingTemplateListParams) {
  return useQuery({
    queryKey: onboardingKeys.templates(params),
    queryFn: () => onboardingApi.listTemplates(params),
  });
}

/** Single onboarding template by ID */
export function useOnboardingTemplate(id: string) {
  return useQuery({
    queryKey: onboardingKeys.template(id),
    queryFn: () => onboardingApi.getTemplate(id),
    enabled: !!id,
  });
}

// --- Task Queries ---

/** List onboarding tasks with optional filters */
export function useOnboardingTasks(params?: OnboardingTaskListParams) {
  return useQuery({
    queryKey: onboardingKeys.tasks(params),
    queryFn: () => onboardingApi.listTasks(params),
  });
}

// --- Progress Queries ---

/** Get onboarding progress for an employee */
export function useOnboardingProgress(employeeId: string) {
  return useQuery({
    queryKey: onboardingKeys.progress(employeeId),
    queryFn: () => onboardingApi.getProgress(employeeId),
    enabled: !!employeeId,
  });
}
