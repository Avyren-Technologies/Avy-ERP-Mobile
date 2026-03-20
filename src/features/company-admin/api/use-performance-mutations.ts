import { useMutation, useQueryClient } from '@tanstack/react-query';

import { performanceApi } from '@/lib/api/performance';
import { performanceKeys } from './use-performance-queries';

// ── Appraisal Cycle Mutations ─────────────────────────────────

/** Create a new appraisal cycle */
export function useCreateAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createAppraisalCycle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update an existing appraisal cycle */
export function useUpdateAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateAppraisalCycle(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Delete an appraisal cycle */
export function useDeleteAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteAppraisalCycle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Activate an appraisal cycle */
export function useActivateAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.activateAppraisalCycle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Publish an appraisal cycle */
export function usePublishAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.publishAppraisalCycle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Close an appraisal cycle */
export function useCloseAppraisalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.closeAppraisalCycle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── Goal Mutations ────────────────────────────────────────────

/** Create a new goal */
export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update an existing goal */
export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Delete a goal */
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── Appraisal Entry Mutations ─────────────────────────────────

/** Update an appraisal entry */
export function useUpdateAppraisalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateAppraisalEntry(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Submit self-review for an appraisal entry */
export function useSubmitSelfReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.submitSelfReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Submit manager review for an appraisal entry */
export function useSubmitManagerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.submitManagerReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Publish an appraisal entry */
export function usePublishAppraisalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.publishAppraisalEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── 360 Feedback Mutations ────────────────────────────────────

/** Create a 360 feedback request */
export function useCreateFeedback360() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createFeedback360(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update a 360 feedback entry */
export function useUpdateFeedback360() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateFeedback360(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── Skill Mutations ───────────────────────────────────────────

/** Create a new skill */
export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createSkill(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update an existing skill */
export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateSkill(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Delete a skill */
export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteSkill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── Skill Mapping Mutations ───────────────────────────────────

/** Create a skill mapping */
export function useCreateSkillMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createSkillMapping(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update a skill mapping */
export function useUpdateSkillMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateSkillMapping(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Delete a skill mapping */
export function useDeleteSkillMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteSkillMapping(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

// ── Succession Plan Mutations ─────────────────────────────────

/** Create a succession plan */
export function useCreateSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      performanceApi.createSuccessionPlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Update a succession plan */
export function useUpdateSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      performanceApi.updateSuccessionPlan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}

/** Delete a succession plan */
export function useDeleteSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteSuccessionPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.all });
    },
  });
}
