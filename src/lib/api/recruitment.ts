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

export interface TrainingSessionListParams {
  page?: number;
  limit?: number;
  status?: string;
  trainingId?: string;
}

export interface TrainerListParams {
  page?: number;
  limit?: number;
  type?: string;
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

  completeInterview: (id: string, data: { feedbackRating: number; feedbackNotes?: string }) =>
    client.patch(`/hr/interviews/${id}/complete`, data),

  cancelInterview: (id: string) =>
    client.patch(`/hr/interviews/${id}/cancel`),

  // ── Candidates (actions) ────────────────────────────────────────
  deleteCandidate: (id: string) =>
    client.delete(`/hr/candidates/${id}`),

  advanceCandidateStage: (id: string, data: { stage: string; reason?: string; notes?: string }) =>
    client.patch(`/hr/candidates/${id}/stage`, data),

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

  // ── Training Sessions ───────────────────────────────────────
  listTrainingSessions: (params?: TrainingSessionListParams) =>
    client.get('/hr/training-sessions', { params }),

  createTrainingSession: (data: Record<string, unknown>) =>
    client.post('/hr/training-sessions', data),

  getTrainingSession: (id: string) =>
    client.get(`/hr/training-sessions/${id}`),

  updateTrainingSession: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-sessions/${id}`, data),

  updateTrainingSessionStatus: (id: string, data: { status: string; cancelledReason?: string }) =>
    client.patch(`/hr/training-sessions/${id}/status`, data),

  deleteTrainingSession: (id: string) =>
    client.delete(`/hr/training-sessions/${id}`),

  // ── Training Attendance ─────────────────────────────────────
  listSessionAttendance: (sessionId: string) =>
    client.get(`/hr/training-sessions/${sessionId}/attendance`),

  registerSessionAttendees: (sessionId: string, data: Record<string, unknown>) =>
    client.post(`/hr/training-sessions/${sessionId}/attendance`, data),

  markAttendance: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-attendance/${id}`, data),

  bulkMarkAttendance: (sessionId: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-sessions/${sessionId}/attendance/bulk`, data),

  // ── Training Evaluations ────────────────────────────────────
  submitTrainingEvaluation: (nominationId: string, data: Record<string, unknown>) =>
    client.post(`/hr/training-nominations/${nominationId}/evaluation`, data),

  getTrainingEvaluation: (nominationId: string) =>
    client.get(`/hr/training-nominations/${nominationId}/evaluation`),

  listSessionEvaluations: (sessionId: string) =>
    client.get(`/hr/training-sessions/${sessionId}/evaluations`),

  getTrainingEvaluationSummary: (trainingId: string) =>
    client.get('/hr/training-evaluations/summary', { params: { trainingId } }),

  submitEssFeedback: (nominationId: string, data: Record<string, unknown>) =>
    client.post(`/ess/training/${nominationId}/feedback`, data),

  // ── Expiring Certificates ──────────────────────────────────
  getExpiringCertificates: (days: number = 30) =>
    client.get('/hr/training-certificates/expiring', { params: { days } }),

  // ── Trainers ───────────────────────────────────────────────
  listTrainers: (params?: TrainerListParams) =>
    client.get('/hr/trainers', { params }),

  createTrainer: (data: Record<string, unknown>) =>
    client.post('/hr/trainers', data),

  getTrainer: (id: string) =>
    client.get(`/hr/trainers/${id}`),

  updateTrainer: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/trainers/${id}`, data),

  deleteTrainer: (id: string) =>
    client.delete(`/hr/trainers/${id}`),

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

  // ── Offers ──────────────────────────────────────────────────────
  listOffers: (params?: Record<string, unknown>) =>
    client.get('/hr/offers', { params }),

  createOffer: (data: Record<string, unknown>) =>
    client.post('/hr/offers', data),

  getOffer: (id: string) =>
    client.get(`/hr/offers/${id}`),

  updateOffer: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/offers/${id}`, data),

  updateOfferStatus: (id: string, data: { status: string; rejectionReason?: string }) =>
    client.patch(`/hr/offers/${id}/status`, data),

  deleteOffer: (id: string) =>
    client.delete(`/hr/offers/${id}`),

  // ── Candidate Profile ───────────────────────────────────────────
  listCandidateEducation: (candidateId: string) =>
    client.get(`/hr/candidates/${candidateId}/education`),

  createCandidateEducation: (candidateId: string, data: Record<string, unknown>) =>
    client.post(`/hr/candidates/${candidateId}/education`, data),

  updateCandidateEducation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/candidate-education/${id}`, data),

  deleteCandidateEducation: (id: string) =>
    client.delete(`/hr/candidate-education/${id}`),

  listCandidateExperience: (candidateId: string) =>
    client.get(`/hr/candidates/${candidateId}/experience`),

  createCandidateExperience: (candidateId: string, data: Record<string, unknown>) =>
    client.post(`/hr/candidates/${candidateId}/experience`, data),

  updateCandidateExperience: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/candidate-experience/${id}`, data),

  deleteCandidateExperience: (id: string) =>
    client.delete(`/hr/candidate-experience/${id}`),

  listCandidateDocuments: (candidateId: string) =>
    client.get(`/hr/candidates/${candidateId}/documents`),

  createCandidateDocument: (candidateId: string, data: Record<string, unknown>) =>
    client.post(`/hr/candidates/${candidateId}/documents`, data),

  deleteCandidateDocument: (id: string) =>
    client.delete(`/hr/candidate-documents/${id}`),

  // ── Interview Evaluations ───────────────────────────────────────
  submitInterviewEvaluations: (interviewId: string, data: Record<string, unknown>) =>
    client.post(`/hr/interviews/${interviewId}/evaluations`, data),

  listInterviewEvaluations: (interviewId: string) =>
    client.get(`/hr/interviews/${interviewId}/evaluations`),

  // ── Candidate Conversion ────────────────────────────────────────
  convertCandidateToEmployee: (candidateId: string) =>
    client.post(`/hr/candidates/${candidateId}/convert-to-employee`),

  // ── Training Programs ──────────────────────────────────────────
  listTrainingPrograms: (params?: Record<string, unknown>) =>
    client.get('/hr/training-programs', { params }),

  createTrainingProgram: (data: Record<string, unknown>) =>
    client.post('/hr/training-programs', data),

  getTrainingProgram: (id: string) =>
    client.get(`/hr/training-programs/${id}`),

  updateTrainingProgram: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-programs/${id}`, data),

  deleteTrainingProgram: (id: string) =>
    client.delete(`/hr/training-programs/${id}`),

  addProgramCourse: (programId: string, data: Record<string, unknown>) =>
    client.post(`/hr/training-programs/${programId}/courses`, data),

  removeProgramCourse: (programId: string, courseId: string) =>
    client.delete(`/hr/training-programs/${programId}/courses/${courseId}`),

  enrollInProgram: (programId: string, data: Record<string, unknown>) =>
    client.post(`/hr/training-programs/${programId}/enroll`, data),

  listProgramEnrollments: (programId: string) =>
    client.get(`/hr/training-programs/${programId}/enrollments`),

  // ── Training Budgets ───────────────────────────────────────────
  listTrainingBudgets: (params?: Record<string, unknown>) =>
    client.get('/hr/training-budgets', { params }),

  createTrainingBudget: (data: Record<string, unknown>) =>
    client.post('/hr/training-budgets', data),

  updateTrainingBudget: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-budgets/${id}`, data),

  getBudgetUtilization: (fiscalYear: string) =>
    client.get('/hr/training-budgets/utilization', { params: { fiscalYear } }),

  // ── Training Materials ─────────────────────────────────────────
  listTrainingMaterials: (trainingId: string) =>
    client.get(`/hr/training-catalogues/${trainingId}/materials`),

  createTrainingMaterial: (trainingId: string, data: Record<string, unknown>) =>
    client.post(`/hr/training-catalogues/${trainingId}/materials`, data),

  updateTrainingMaterial: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/training-materials/${id}`, data),

  deleteTrainingMaterial: (id: string) =>
    client.delete(`/hr/training-materials/${id}`),
};
