import { useQuery } from '@tanstack/react-query';

import {
  recruitmentApi,
  type RequisitionListParams,
  type CandidateListParams,
  type InterviewListParams,
  type TrainingCatalogueListParams,
  type TrainingNominationListParams,
  type AssetCategoryListParams,
  type AssetListParams,
  type AssetAssignmentListParams,
  type ExpenseClaimListParams,
  type LetterTemplateListParams,
  type LetterListParams,
  type GrievanceCategoryListParams,
  type GrievanceCaseListParams,
  type DisciplinaryActionListParams,
} from '@/lib/api/recruitment';

// --- Query keys ---

export const recruitmentKeys = {
  all: ['recruitment'] as const,

  // Requisitions
  requisitions: (params?: RequisitionListParams) =>
    [...recruitmentKeys.all, 'requisitions', params] as const,
  requisition: (id: string) =>
    [...recruitmentKeys.all, 'requisition', id] as const,

  // Candidates
  candidates: (params?: CandidateListParams) =>
    [...recruitmentKeys.all, 'candidates', params] as const,
  candidate: (id: string) =>
    [...recruitmentKeys.all, 'candidate', id] as const,

  // Interviews
  interviews: (params?: InterviewListParams) =>
    [...recruitmentKeys.all, 'interviews', params] as const,
  interview: (id: string) =>
    [...recruitmentKeys.all, 'interview', id] as const,

  // Recruitment Dashboard
  recruitmentDashboard: () =>
    [...recruitmentKeys.all, 'recruitment-dashboard'] as const,

  // Training Catalogue
  trainingCatalogue: (params?: TrainingCatalogueListParams) =>
    [...recruitmentKeys.all, 'training-catalogue', params] as const,
  trainingCatalogueItem: (id: string) =>
    [...recruitmentKeys.all, 'training-catalogue-item', id] as const,

  // Training Nominations
  trainingNominations: (params?: TrainingNominationListParams) =>
    [...recruitmentKeys.all, 'training-nominations', params] as const,

  // Training Dashboard
  trainingDashboard: () =>
    [...recruitmentKeys.all, 'training-dashboard'] as const,

  // Asset Categories
  assetCategories: (params?: AssetCategoryListParams) =>
    [...recruitmentKeys.all, 'asset-categories', params] as const,
  assetCategory: (id: string) =>
    [...recruitmentKeys.all, 'asset-category', id] as const,

  // Assets
  assets: (params?: AssetListParams) =>
    [...recruitmentKeys.all, 'assets', params] as const,
  asset: (id: string) =>
    [...recruitmentKeys.all, 'asset', id] as const,

  // Asset Assignments
  assetAssignments: (params?: AssetAssignmentListParams) =>
    [...recruitmentKeys.all, 'asset-assignments', params] as const,

  // Expense Claims
  expenseClaims: (params?: ExpenseClaimListParams) =>
    [...recruitmentKeys.all, 'expense-claims', params] as const,
  expenseClaim: (id: string) =>
    [...recruitmentKeys.all, 'expense-claim', id] as const,

  // Letter Templates
  letterTemplates: (params?: LetterTemplateListParams) =>
    [...recruitmentKeys.all, 'letter-templates', params] as const,
  letterTemplate: (id: string) =>
    [...recruitmentKeys.all, 'letter-template', id] as const,

  // Letters
  letters: (params?: LetterListParams) =>
    [...recruitmentKeys.all, 'letters', params] as const,
  letter: (id: string) =>
    [...recruitmentKeys.all, 'letter', id] as const,

  // E-Sign
  eSignStatus: (letterId: string) =>
    [...recruitmentKeys.all, 'esign-status', letterId] as const,
  pendingESign: () =>
    [...recruitmentKeys.all, 'pending-esign'] as const,

  // Grievance Categories
  grievanceCategories: (params?: GrievanceCategoryListParams) =>
    [...recruitmentKeys.all, 'grievance-categories', params] as const,
  grievanceCategory: (id: string) =>
    [...recruitmentKeys.all, 'grievance-category', id] as const,

  // Grievance Cases
  grievanceCases: (params?: GrievanceCaseListParams) =>
    [...recruitmentKeys.all, 'grievance-cases', params] as const,
  grievanceCase: (id: string) =>
    [...recruitmentKeys.all, 'grievance-case', id] as const,

  // Disciplinary Actions
  disciplinaryActions: (params?: DisciplinaryActionListParams) =>
    [...recruitmentKeys.all, 'disciplinary-actions', params] as const,
  disciplinaryAction: (id: string) =>
    [...recruitmentKeys.all, 'disciplinary-action', id] as const,
};

// --- Requisition Queries ---

export function useRequisitions(params?: RequisitionListParams) {
  return useQuery({
    queryKey: recruitmentKeys.requisitions(params),
    queryFn: () => recruitmentApi.listRequisitions(params),
  });
}

export function useRequisition(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.requisition(id),
    queryFn: () => recruitmentApi.getRequisition(id),
    enabled: !!id,
  });
}

// --- Candidate Queries ---

export function useCandidates(params?: CandidateListParams) {
  return useQuery({
    queryKey: recruitmentKeys.candidates(params),
    queryFn: () => recruitmentApi.listCandidates(params),
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.candidate(id),
    queryFn: () => recruitmentApi.getCandidate(id),
    enabled: !!id,
  });
}

// --- Interview Queries ---

export function useInterviews(params?: InterviewListParams) {
  return useQuery({
    queryKey: recruitmentKeys.interviews(params),
    queryFn: () => recruitmentApi.listInterviews(params),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.interview(id),
    queryFn: () => recruitmentApi.getInterview(id),
    enabled: !!id,
  });
}

// --- Recruitment Dashboard ---

export function useRecruitmentDashboard() {
  return useQuery({
    queryKey: recruitmentKeys.recruitmentDashboard(),
    queryFn: () => recruitmentApi.getRecruitmentDashboard(),
  });
}

// --- Training Catalogue Queries ---

export function useTrainingCatalogue(params?: TrainingCatalogueListParams) {
  return useQuery({
    queryKey: recruitmentKeys.trainingCatalogue(params),
    queryFn: () => recruitmentApi.listTrainingCatalogue(params),
  });
}

export function useTrainingCatalogueItem(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.trainingCatalogueItem(id),
    queryFn: () => recruitmentApi.getTrainingCatalogue(id),
    enabled: !!id,
  });
}

// --- Training Nomination Queries ---

export function useTrainingNominations(params?: TrainingNominationListParams) {
  return useQuery({
    queryKey: recruitmentKeys.trainingNominations(params),
    queryFn: () => recruitmentApi.listTrainingNominations(params),
  });
}

// --- Training Dashboard ---

export function useTrainingDashboard() {
  return useQuery({
    queryKey: recruitmentKeys.trainingDashboard(),
    queryFn: () => recruitmentApi.getTrainingDashboard(),
  });
}

// --- Asset Category Queries ---

export function useAssetCategories(params?: AssetCategoryListParams) {
  return useQuery({
    queryKey: recruitmentKeys.assetCategories(params),
    queryFn: () => recruitmentApi.listAssetCategories(params),
  });
}

export function useAssetCategory(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.assetCategory(id),
    queryFn: () => recruitmentApi.getAssetCategory(id),
    enabled: !!id,
  });
}

// --- Asset Queries ---

export function useAssets(params?: AssetListParams) {
  return useQuery({
    queryKey: recruitmentKeys.assets(params),
    queryFn: () => recruitmentApi.listAssets(params),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.asset(id),
    queryFn: () => recruitmentApi.getAsset(id),
    enabled: !!id,
  });
}

// --- Asset Assignment Queries ---

export function useAssetAssignments(params?: AssetAssignmentListParams) {
  return useQuery({
    queryKey: recruitmentKeys.assetAssignments(params),
    queryFn: () => recruitmentApi.listAssetAssignments(params),
  });
}

// --- Expense Claim Queries ---

export function useExpenseClaims(params?: ExpenseClaimListParams) {
  return useQuery({
    queryKey: recruitmentKeys.expenseClaims(params),
    queryFn: () => recruitmentApi.listExpenseClaims(params),
  });
}

export function useExpenseClaim(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.expenseClaim(id),
    queryFn: () => recruitmentApi.getExpenseClaim(id),
    enabled: !!id,
  });
}

// --- Letter Template Queries ---

export function useLetterTemplates(params?: LetterTemplateListParams) {
  return useQuery({
    queryKey: recruitmentKeys.letterTemplates(params),
    queryFn: () => recruitmentApi.listLetterTemplates(params),
  });
}

export function useLetterTemplate(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.letterTemplate(id),
    queryFn: () => recruitmentApi.getLetterTemplate(id),
    enabled: !!id,
  });
}

// --- Letter Queries ---

export function useLetters(params?: LetterListParams) {
  return useQuery({
    queryKey: recruitmentKeys.letters(params),
    queryFn: () => recruitmentApi.listLetters(params),
  });
}

export function useLetter(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.letter(id),
    queryFn: () => recruitmentApi.getLetter(id),
    enabled: !!id,
  });
}

// --- E-Sign Queries ---

/** Get e-sign status for a letter */
export function useESignStatus(letterId: string) {
  return useQuery({
    queryKey: recruitmentKeys.eSignStatus(letterId),
    queryFn: () => recruitmentApi.getESignStatus(letterId),
    enabled: !!letterId,
  });
}

/** List letters pending e-sign */
export function usePendingESign() {
  return useQuery({
    queryKey: recruitmentKeys.pendingESign(),
    queryFn: () => recruitmentApi.listPendingESign(),
  });
}

// --- Grievance Category Queries ---

export function useGrievanceCategories(params?: GrievanceCategoryListParams) {
  return useQuery({
    queryKey: recruitmentKeys.grievanceCategories(params),
    queryFn: () => recruitmentApi.listGrievanceCategories(params),
  });
}

export function useGrievanceCategory(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.grievanceCategory(id),
    queryFn: () => recruitmentApi.getGrievanceCategory(id),
    enabled: !!id,
  });
}

// --- Grievance Case Queries ---

export function useGrievanceCases(params?: GrievanceCaseListParams) {
  return useQuery({
    queryKey: recruitmentKeys.grievanceCases(params),
    queryFn: () => recruitmentApi.listGrievanceCases(params),
  });
}

export function useGrievanceCase(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.grievanceCase(id),
    queryFn: () => recruitmentApi.getGrievanceCase(id),
    enabled: !!id,
  });
}

// --- Disciplinary Action Queries ---

export function useDisciplinaryActions(params?: DisciplinaryActionListParams) {
  return useQuery({
    queryKey: recruitmentKeys.disciplinaryActions(params),
    queryFn: () => recruitmentApi.listDisciplinaryActions(params),
  });
}

export function useDisciplinaryAction(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.disciplinaryAction(id),
    queryFn: () => recruitmentApi.getDisciplinaryAction(id),
    enabled: !!id,
  });
}
