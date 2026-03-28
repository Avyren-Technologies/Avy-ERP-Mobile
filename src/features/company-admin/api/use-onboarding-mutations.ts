import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { onboardingApi } from '@/lib/api/onboarding';
import { onboardingKeys } from '@/features/company-admin/api/use-onboarding-queries';

// ── Templates ───────────────────────────────────────────────────────

/** Create an onboarding template */
export function useCreateOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      onboardingApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.templates() });
    },
    onError: showError,
  });
}

/** Update an onboarding template */
export function useUpdateOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      onboardingApi.updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.templates() });
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.template(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete an onboarding template */
export function useDeleteOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onboardingApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.templates() });
    },
    onError: showError,
  });
}

// ── Tasks ────────────────────────────────────────────────────────────

/** Generate onboarding tasks for an employee */
export function useGenerateOnboardingTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      onboardingApi.generateTasks(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.tasks() });
    },
    onError: showError,
  });
}

/** Update an onboarding task */
export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      onboardingApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.tasks() });
    },
    onError: showError,
  });
}
