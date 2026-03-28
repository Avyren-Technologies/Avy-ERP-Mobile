import { client } from '@/lib/api/client';

// --- Types ---

export interface RequisitionListParams {
  page?: number;
  limit?: number;
}

export interface CandidateListParams {
  page?: number;
  limit?: number;
  requisitionId?: string;
  stage?: string;
}

export interface InterviewListParams {
  page?: number;
  limit?: number;
  candidateId?: string;
}

export interface TrainingCatalogueListParams {
  page?: number;
  limit?: number;
}

export interface TrainingNominationListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

export interface AssetCategoryListParams {
  page?: number;
  limit?: number;
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: string;
}

export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
}

export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

export interface LetterTemplateListParams {
  page?: number;
  limit?: number;
}

export interface LetterListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  type?: string;
}

export interface GrievanceCategoryListParams {
  page?: number;
  limit?: number;
}

export interface GrievanceCaseListParams {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
}

export interface DisciplinaryActionListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  type?: string;
}

// --- API Service ---

/**
 * Recruitment, Training & Advanced HR API service — requisitions, candidates,
 * interviews, training, assets, expense claims, letters, grievances, discipline.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const recruitmentApi = {
  // ── Requisitions ──────────────────────────────────────────────
  listRequisitions: (params?: RequisitionListParams) =>
    client.get('/hr/requisitions', { params }),

  createRequisition: (data: Record<string, unknown>) =>
    client.post('/hr/requisitions', data),

  getRequisition: (id: string) =>
    client.get(`/hr/requisitions/${id}`),

  updateRequisition: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/requisitions/${id}`, data),

  deleteRequisition: (id: string) =>
    client.delete(`/hr/requisitions/${id}`),

  // ── Candidates ────────────────────────────────────────────────
  listCandidates: (params?: CandidateListParams) =>
    client.get('/hr/candidates', { params }),

  createCandidate: (data: Record<string, unknown>) =>
    client.post('/hr/candidates', data),

  getCandidate: (id: string) =>
    client.get(`/hr/candidates/${id}`),

  updateCandidate: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/candidates/${id}`, data),

  // ── Interviews ────────────────────────────────────────────────
  listInterviews: (params?: InterviewListParams) =>
    client.get('/hr/interviews', { params }),

  createInterview: (data: Record<string, unknown>) =>
    client.post('/hr/interviews', data),

  getInterview: (id: string) =>
    client.get(`/hr/interviews/${id}`),

  updateInterview: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/interviews/${id}`, data),

  // ── Recruitment Dashboard ─────────────────────────────────────
  getRecruitmentDashboard: () =>
    client.get('/hr/recruitment-dashboard'),

  // ── Training Catalogue ────────────────────────────────────────
  listTrainingCatalogue: (params?: TrainingCatalogueListParams) =>
    client.get('/hr/training-catalogues', { params }),

  createTrainingCatalogue: (data: Record<string, unknown>) =>
    client.post('/hr/training-catalogues', data),

  getTrainingCatalogue: (id: string) =>
    client.get(`/hr/training-catalogues/${id}`),

  updateTrainingCatalogue: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-catalogues/${id}`, data),

  deleteTrainingCatalogue: (id: string) =>
    client.delete(`/hr/training-catalogues/${id}`),

  // ── Training Nominations ──────────────────────────────────────
  listTrainingNominations: (params?: TrainingNominationListParams) =>
    client.get('/hr/training-nominations', { params }),

  createTrainingNomination: (data: Record<string, unknown>) =>
    client.post('/hr/training-nominations', data),

  updateTrainingNomination: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-nominations/${id}`, data),

  // ── Training Dashboard ────────────────────────────────────────
  getTrainingDashboard: () =>
    client.get('/hr/training-dashboard'),

  // ── Asset Categories ──────────────────────────────────────────
  listAssetCategories: (params?: AssetCategoryListParams) =>
    client.get('/hr/asset-categories', { params }),

  createAssetCategory: (data: Record<string, unknown>) =>
    client.post('/hr/asset-categories', data),

  getAssetCategory: (id: string) =>
    client.get(`/hr/asset-categories/${id}`),

  updateAssetCategory: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/asset-categories/${id}`, data),

  deleteAssetCategory: (id: string) =>
    client.delete(`/hr/asset-categories/${id}`),

  // ── Assets ────────────────────────────────────────────────────
  listAssets: (params?: AssetListParams) =>
    client.get('/hr/assets', { params }),

  createAsset: (data: Record<string, unknown>) =>
    client.post('/hr/assets', data),

  getAsset: (id: string) =>
    client.get(`/hr/assets/${id}`),

  updateAsset: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/assets/${id}`, data),

  // ── Asset Assignments ─────────────────────────────────────────
  listAssetAssignments: (params?: AssetAssignmentListParams) =>
    client.get('/hr/asset-assignments', { params }),

  createAssetAssignment: (data: Record<string, unknown>) =>
    client.post('/hr/asset-assignments', data),

  updateAssetAssignment: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/asset-assignments/${id}/return`, data),

  // ── Expense Claims ────────────────────────────────────────────
  listExpenseClaims: (params?: ExpenseClaimListParams) =>
    client.get('/hr/expense-claims', { params }),

  createExpenseClaim: (data: Record<string, unknown>) =>
    client.post('/hr/expense-claims', data),

  getExpenseClaim: (id: string) =>
    client.get(`/hr/expense-claims/${id}`),

  updateExpenseClaim: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/expense-claims/${id}`, data),

  approveExpenseClaim: (id: string) =>
    client.patch(`/hr/expense-claims/${id}/approve-reject`, { action: 'approve' }),

  rejectExpenseClaim: (id: string) =>
    client.patch(`/hr/expense-claims/${id}/approve-reject`, { action: 'reject' }),

  // ── Letter Templates ──────────────────────────────────────────
  listLetterTemplates: (params?: LetterTemplateListParams) =>
    client.get('/hr/letter-templates', { params }),

  createLetterTemplate: (data: Record<string, unknown>) =>
    client.post('/hr/letter-templates', data),

  getLetterTemplate: (id: string) =>
    client.get(`/hr/letter-templates/${id}`),

  updateLetterTemplate: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/letter-templates/${id}`, data),

  deleteLetterTemplate: (id: string) =>
    client.delete(`/hr/letter-templates/${id}`),

  // ── Letters ───────────────────────────────────────────────────
  listLetters: (params?: LetterListParams) =>
    client.get('/hr/hr-letters', { params }),

  createLetter: (data: Record<string, unknown>) =>
    client.post('/hr/hr-letters', data),

  getLetter: (id: string) =>
    client.get(`/hr/hr-letters/${id}`),

  generateLetterPdf: (id: string) =>
    client.post(`/hr/hr-letters/${id}/generate-pdf`),

  dispatchESign: (letterId: string) =>
    client.post(`/hr/hr-letters/${letterId}/dispatch-esign`),

  getESignStatus: (letterId: string) =>
    client.get(`/hr/hr-letters/${letterId}/esign-status`),

  listPendingESign: () =>
    client.get('/hr/hr-letters/pending-esign'),

  // ── Grievance Categories ──────────────────────────────────────
  listGrievanceCategories: (params?: GrievanceCategoryListParams) =>
    client.get('/hr/grievance-categories', { params }),

  createGrievanceCategory: (data: Record<string, unknown>) =>
    client.post('/hr/grievance-categories', data),

  getGrievanceCategory: (id: string) =>
    client.get(`/hr/grievance-categories/${id}`),

  updateGrievanceCategory: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/grievance-categories/${id}`, data),

  deleteGrievanceCategory: (id: string) =>
    client.delete(`/hr/grievance-categories/${id}`),

  // ── Grievance Cases ───────────────────────────────────────────
  listGrievanceCases: (params?: GrievanceCaseListParams) =>
    client.get('/hr/grievance-cases', { params }),

  createGrievanceCase: (data: Record<string, unknown>) =>
    client.post('/hr/grievance-cases', data),

  getGrievanceCase: (id: string) =>
    client.get(`/hr/grievance-cases/${id}`),

  updateGrievanceCase: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/grievance-cases/${id}`, data),

  // ── Disciplinary Actions ──────────────────────────────────────
  listDisciplinaryActions: (params?: DisciplinaryActionListParams) =>
    client.get('/hr/disciplinary-actions', { params }),

  createDisciplinaryAction: (data: Record<string, unknown>) =>
    client.post('/hr/disciplinary-actions', data),

  getDisciplinaryAction: (id: string) =>
    client.get(`/hr/disciplinary-actions/${id}`),

  updateDisciplinaryAction: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/disciplinary-actions/${id}`, data),
};
