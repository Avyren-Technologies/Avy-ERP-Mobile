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

export function useCompleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { feedbackRating: number; feedbackNotes?: string } }) =>
      recruitmentApi.completeInterview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useCancelInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.cancelInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Candidate Action Mutations ─────────────────────────────────

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteCandidate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useAdvanceCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { stage: string; reason?: string; notes?: string } }) =>
      recruitmentApi.advanceCandidateStage(id, data),
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

// ── Training Session Mutations ──────────────────────────────────

export function useCreateTrainingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainingSession(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingSession(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingSessionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; cancelledReason?: string } }) =>
      recruitmentApi.updateTrainingSessionStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteTrainingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteTrainingSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Attendance Mutations ──────────────────────────────

export function useRegisterSessionAttendees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: Record<string, unknown> }) =>
      recruitmentApi.registerSessionAttendees(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.markAttendance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useBulkMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: Record<string, unknown> }) =>
      recruitmentApi.bulkMarkAttendance(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Evaluation Mutations ──────────────────────────────

export function useSubmitTrainingEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nominationId, data }: { nominationId: string; data: Record<string, unknown> }) =>
      recruitmentApi.submitTrainingEvaluation(nominationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useSubmitEssFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nominationId, data }: { nominationId: string; data: Record<string, unknown> }) =>
      recruitmentApi.submitEssFeedback(nominationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Trainer Mutations ──────────────────────────────────────────

export function useCreateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteTrainer(id),
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

// ── E-Sign Mutations ────────────────────────────────────────────

export function useDispatchESign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (letterId: string) => recruitmentApi.dispatchESign(letterId),
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

// ── Offer Mutations ────────────────────────────────────────────

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createOffer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateOffer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateOfferStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; rejectionReason?: string } }) =>
      recruitmentApi.updateOfferStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Candidate Profile Mutations ────────────────────────────────

export function useCreateCandidateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, data }: { candidateId: string; data: Record<string, unknown> }) =>
      recruitmentApi.createCandidateEducation(candidateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateCandidateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateCandidateEducation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteCandidateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteCandidateEducation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useCreateCandidateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, data }: { candidateId: string; data: Record<string, unknown> }) =>
      recruitmentApi.createCandidateExperience(candidateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateCandidateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateCandidateExperience(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteCandidateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteCandidateExperience(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useCreateCandidateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, data }: { candidateId: string; data: Record<string, unknown> }) =>
      recruitmentApi.createCandidateDocument(candidateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteCandidateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteCandidateDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Interview Evaluation Mutations ─────────────────────────────

export function useSubmitInterviewEvaluations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, data }: { interviewId: string; data: Record<string, unknown> }) =>
      recruitmentApi.submitInterviewEvaluations(interviewId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Candidate Conversion ───────────────────────────────────────

export function useConvertCandidateToEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) =>
      recruitmentApi.convertCandidateToEmployee(candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Program Mutations ──────────────────────────────────

export function useCreateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainingProgram(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingProgram(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteTrainingProgram(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useAddProgramCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: Record<string, unknown> }) =>
      recruitmentApi.addProgramCourse(programId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useRemoveProgramCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId }: { programId: string; courseId: string }) =>
      recruitmentApi.removeProgramCourse(programId, courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useEnrollInProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: Record<string, unknown> }) =>
      recruitmentApi.enrollInProgram(programId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Budget Mutations ───────────────────────────────────

export function useCreateTrainingBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      recruitmentApi.createTrainingBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

// ── Training Material Mutations ─────────────────────────────────

export function useCreateTrainingMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trainingId, data }: { trainingId: string; data: Record<string, unknown> }) =>
      recruitmentApi.createTrainingMaterial(trainingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useUpdateTrainingMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruitmentApi.updateTrainingMaterial(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}

export function useDeleteTrainingMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteTrainingMaterial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.all });
    },
  });
}
