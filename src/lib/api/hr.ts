import { client } from '@/lib/api/client';

/** Large bulk validate/import runs can take several minutes. */
const BULK_HR_REQUEST_TIMEOUT_MS = 600_000; // 10 minutes

// --- Types ---

export interface HrListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface DepartmentListParams extends HrListParams {}

export interface DesignationListParams extends HrListParams {
  departmentId?: string;
}

export interface EmployeeListParams extends HrListParams {
  departmentId?: string;
  locationId?: string;
  type?: string;
}

// --- API Service ---

/**
 * HRMS API service — org structure & employee endpoints.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const hrApi = {
  // ── Departments ─────────────────────────────────────────────────────
  listDepartments: (params?: DepartmentListParams) =>
    client.get('/hr/departments', { params }),

  getDepartment: (id: string) => client.get(`/hr/departments/${id}`),

  createDepartment: (data: Record<string, unknown>) =>
    client.post('/hr/departments', data),

  updateDepartment: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/departments/${id}`, data),

  deleteDepartment: (id: string) =>
    client.delete(`/hr/departments/${id}`),

  // ── Designations ────────────────────────────────────────────────────
  listDesignations: (params?: DesignationListParams) =>
    client.get('/hr/designations', { params }),

  getDesignation: (id: string) => client.get(`/hr/designations/${id}`),

  createDesignation: (data: Record<string, unknown>) =>
    client.post('/hr/designations', data),

  updateDesignation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/designations/${id}`, data),

  deleteDesignation: (id: string) =>
    client.delete(`/hr/designations/${id}`),

  // ── Grades ──────────────────────────────────────────────────────────
  listGrades: (params?: HrListParams) =>
    client.get('/hr/grades', { params }),

  getGrade: (id: string) => client.get(`/hr/grades/${id}`),

  createGrade: (data: Record<string, unknown>) =>
    client.post('/hr/grades', data),

  updateGrade: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/grades/${id}`, data),

  deleteGrade: (id: string) => client.delete(`/hr/grades/${id}`),

  // ── Employee Types ──────────────────────────────────────────────────
  listEmployeeTypes: (params?: HrListParams) =>
    client.get('/hr/employee-types', { params }),

  getEmployeeType: (id: string) =>
    client.get(`/hr/employee-types/${id}`),

  createEmployeeType: (data: Record<string, unknown>) =>
    client.post('/hr/employee-types', data),

  updateEmployeeType: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/employee-types/${id}`, data),

  deleteEmployeeType: (id: string) =>
    client.delete(`/hr/employee-types/${id}`),

  // ── Cost Centres ────────────────────────────────────────────────────
  listCostCentres: (params?: HrListParams) =>
    client.get('/hr/cost-centres', { params }),

  getCostCentre: (id: string) => client.get(`/hr/cost-centres/${id}`),

  createCostCentre: (data: Record<string, unknown>) =>
    client.post('/hr/cost-centres', data),

  updateCostCentre: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/cost-centres/${id}`, data),

  deleteCostCentre: (id: string) =>
    client.delete(`/hr/cost-centres/${id}`),

  // ── Employees ───────────────────────────────────────────────────────
  listEmployees: (params?: EmployeeListParams) =>
    client.get('/hr/employees', { params }),

  getEmployee: (id: string) => client.get(`/hr/employees/${id}`),

  createEmployee: (data: Record<string, unknown>) =>
    client.post('/hr/employees', data),

  updateEmployee: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/employees/${id}`, data),

  updateEmployeeStatus: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/employees/${id}/status`, data),

  deleteEmployee: (id: string) =>
    client.delete(`/hr/employees/${id}`),

  // ── Employee Sub-resources: Nominees ────────────────────────────────
  listNominees: (employeeId: string) =>
    client.get(`/hr/employees/${employeeId}/nominees`),

  createNominee: (employeeId: string, data: Record<string, unknown>) =>
    client.post(`/hr/employees/${employeeId}/nominees`, data),

  updateNominee: (
    employeeId: string,
    nomineeId: string,
    data: Record<string, unknown>,
  ) =>
    client.patch(
      `/hr/employees/${employeeId}/nominees/${nomineeId}`,
      data,
    ),

  deleteNominee: (employeeId: string, nomineeId: string) =>
    client.delete(
      `/hr/employees/${employeeId}/nominees/${nomineeId}`,
    ),

  // ── Employee Sub-resources: Education ───────────────────────────────
  listEducation: (employeeId: string) =>
    client.get(`/hr/employees/${employeeId}/education`),

  createEducation: (employeeId: string, data: Record<string, unknown>) =>
    client.post(`/hr/employees/${employeeId}/education`, data),

  updateEducation: (
    employeeId: string,
    educationId: string,
    data: Record<string, unknown>,
  ) =>
    client.patch(
      `/hr/employees/${employeeId}/education/${educationId}`,
      data,
    ),

  deleteEducation: (employeeId: string, educationId: string) =>
    client.delete(
      `/hr/employees/${employeeId}/education/${educationId}`,
    ),

  // ── Employee Sub-resources: Previous Employment ─────────────────────
  listPrevEmployment: (employeeId: string) =>
    client.get(`/hr/employees/${employeeId}/previous-employment`),

  createPrevEmployment: (employeeId: string, data: Record<string, unknown>) =>
    client.post(
      `/hr/employees/${employeeId}/previous-employment`,
      data,
    ),

  updatePrevEmployment: (
    employeeId: string,
    prevEmploymentId: string,
    data: Record<string, unknown>,
  ) =>
    client.patch(
      `/hr/employees/${employeeId}/previous-employment/${prevEmploymentId}`,
      data,
    ),

  deletePrevEmployment: (employeeId: string, prevEmploymentId: string) =>
    client.delete(
      `/hr/employees/${employeeId}/previous-employment/${prevEmploymentId}`,
    ),

  // ── Employee Sub-resources: Documents ───────────────────────────────
  listDocuments: (employeeId: string) =>
    client.get(`/hr/employees/${employeeId}/documents`),

  uploadDocument: (employeeId: string, data: FormData) =>
    client.post(`/hr/employees/${employeeId}/documents`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteDocument: (employeeId: string, documentId: string) =>
    client.delete(
      `/hr/employees/${employeeId}/documents/${documentId}`,
    ),

  // ── Employee Sub-resources: Timeline ────────────────────────────────
  getTimeline: (employeeId: string) =>
    client.get(`/hr/employees/${employeeId}/timeline`),

  // ── Probation ─────────────────────────────────────────────────────
  listProbationDue: () =>
    client.get('/hr/employees/probation-due'),

  submitProbationReview: (id: string, data: Record<string, unknown>) =>
    client.post(`/hr/employees/${id}/probation-review`, data),

  // ── Org Chart ─────────────────────────────────────────────────────
  getOrgChart: () =>
    client.get('/hr/employees/org-chart'),

  // ── Bulk Import ─────────────────────────────────────────────────────
  /** Large spreadsheets / many rows can exceed typical client timeouts; align with web (10 min). */
  bulkDownloadTemplate: () =>
    client.get('/hr/employees/bulk/template', {
      responseType: 'arraybuffer',
      timeout: BULK_HR_REQUEST_TIMEOUT_MS,
    }),

  bulkValidate: (formData: FormData) =>
    client.post('/hr/employees/bulk/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: BULK_HR_REQUEST_TIMEOUT_MS,
    }),

  bulkImport: (rows: Record<string, unknown>[], defaultPassword: string) =>
    client.post('/hr/employees/bulk/import', { rows, defaultPassword }, { timeout: BULK_HR_REQUEST_TIMEOUT_MS }),
};
