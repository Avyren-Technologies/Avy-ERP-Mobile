import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recruitmentApi } from '@/lib/api/recruitment';
import { recruitmentKeys } from './use-recruitment-queries';

// ── Requisition Mutations ───────────────────────────────────────

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createRequisition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateRequisition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteRequisition(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Candidate Mutations ─────────────────────────────────────────

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createCandidate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateCandidate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Interview Mutations ─────────────────────────────────────────

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createInterview(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateInterview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Catalogue Mutations ────────────────────────────────

export function useCreateTrainingCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainingCatalogue(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingCatalogue(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteTrainingCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteTrainingCatalogue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Nomination Mutations ───────────────────────────────

export function useCreateTrainingNomination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainingNomination(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingNomination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingNomination(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Asset Category Mutations ────────────────────────────────────

export function useCreateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createAssetCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateAssetCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteAssetCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Asset Mutations ─────────────────────────────────────────────

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createAsset(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateAsset(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Asset Assignment Mutations ──────────────────────────────────

export function useCreateAssetAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createAssetAssignment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateAssetAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateAssetAssignment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Expense Claim Mutations ─────────────────────────────────────

export function useCreateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createExpenseClaim(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateExpenseClaim(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useApproveExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.approveExpenseClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useRejectExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.rejectExpenseClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Letter Template Mutations ───────────────────────────────────

export function useCreateLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createLetterTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateLetterTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteLetterTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Letter Mutations ────────────────────────────────────────────

export function useCreateLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createLetter(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useGenerateLetterPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.generateLetterPdf(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Grievance Category Mutations ────────────────────────────────

export function useCreateGrievanceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createGrievanceCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateGrievanceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateGrievanceCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteGrievanceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteGrievanceCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Grievance Case Mutations ────────────────────────────────────

export function useCreateGrievanceCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createGrievanceCase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateGrievanceCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateGrievanceCase(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Disciplinary Action Mutations ───────────────────────────────

export function useCreateDisciplinaryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createDisciplinaryAction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateDisciplinaryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateDisciplinaryAction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}
