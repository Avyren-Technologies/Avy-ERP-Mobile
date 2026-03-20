import { client } from '@/lib/api/client';

// --- Types ---

export interface PayrollRunListParams {
  page?: number;
  limit?: number;
  year?: number;
  month?: number;
  status?: string;
}

export interface PayrollEntryListParams {
  page?: number;
  limit?: number;
  search?: string;
  isException?: boolean;
}

export interface PayslipListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  month?: number;
  year?: number;
}

export interface SalaryHoldListParams {
  page?: number;
  limit?: number;
  payrollRunId?: string;
}

export interface SalaryRevisionListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

export interface ArrearEntryListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  payrollRunId?: string;
}

export interface StatutoryFilingListParams {
  page?: number;
  limit?: number;
  year?: number;
  type?: string;
  status?: string;
}

export interface PayrollReportParams {
  month?: number;
  year?: number;
  payrollRunId?: string;
}

// --- API Service ---

/**
 * Payroll Run API service — payroll runs (6-step wizard), entries, payslips,
 * salary holds, salary revisions, arrears, statutory filings, and reports.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const payrollRunApi = {
  // ── Payroll Runs ────────────────────────────────────────────────
  listPayrollRuns: (params?: PayrollRunListParams) =>
    client.get('/hr/payroll-runs', { params }),

  createPayrollRun: (data: Record<string, unknown>) =>
    client.post('/hr/payroll-runs', data),

  getPayrollRun: (id: string) =>
    client.get(`/hr/payroll-runs/${id}`),

  // 6-step wizard actions
  lockAttendance: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/lock-attendance`),

  reviewExceptions: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/review-exceptions`),

  computeSalaries: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/compute`),

  computeStatutory: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/statutory`),

  approveRun: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/approve`),

  disburseRun: (id: string) =>
    client.patch(`/hr/payroll-runs/${id}/disburse`),

  // ── Payroll Entries ─────────────────────────────────────────────
  listPayrollEntries: (runId: string, params?: PayrollEntryListParams) =>
    client.get(`/hr/payroll-runs/${runId}/entries`, { params }),

  getPayrollEntry: (runId: string, entryId: string) =>
    client.get(`/hr/payroll-runs/${runId}/entries/${entryId}`),

  overridePayrollEntry: (runId: string, entryId: string, data: Record<string, unknown>) =>
    client.patch(`/hr/payroll-runs/${runId}/entries/${entryId}`, data),

  // ── Payslips ────────────────────────────────────────────────────
  listPayslips: (params?: PayslipListParams) =>
    client.get('/hr/payslips', { params }),

  getPayslip: (id: string) =>
    client.get(`/hr/payslips/${id}`),

  emailPayslip: (id: string) =>
    client.post(`/hr/payslips/${id}/email`),

  generatePayslips: (runId: string) =>
    client.post(`/hr/payroll-runs/${runId}/generate-payslips`),

  // ── Salary Holds ────────────────────────────────────────────────
  listSalaryHolds: (params?: SalaryHoldListParams) =>
    client.get('/hr/salary-holds', { params }),

  createSalaryHold: (data: Record<string, unknown>) =>
    client.post('/hr/salary-holds', data),

  releaseSalaryHold: (id: string) =>
    client.patch(`/hr/salary-holds/${id}/release`),

  // ── Salary Revisions ────────────────────────────────────────────
  listSalaryRevisions: (params?: SalaryRevisionListParams) =>
    client.get('/hr/salary-revisions', { params }),

  createSalaryRevision: (data: Record<string, unknown>) =>
    client.post('/hr/salary-revisions', data),

  getSalaryRevision: (id: string) =>
    client.get(`/hr/salary-revisions/${id}`),

  approveSalaryRevision: (id: string) =>
    client.patch(`/hr/salary-revisions/${id}/approve`),

  applySalaryRevision: (id: string) =>
    client.patch(`/hr/salary-revisions/${id}/apply`),

  // ── Arrears ─────────────────────────────────────────────────────
  listArrearEntries: (params?: ArrearEntryListParams) =>
    client.get('/hr/arrear-entries', { params }),

  // ── Statutory Filings ───────────────────────────────────────────
  listStatutoryFilings: (params?: StatutoryFilingListParams) =>
    client.get('/hr/statutory-filings', { params }),

  createStatutoryFiling: (data: Record<string, unknown>) =>
    client.post('/hr/statutory-filings', data),

  updateStatutoryFiling: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/statutory-filings/${id}`, data),

  // ── Statutory Dashboard ─────────────────────────────────────────
  getStatutoryDashboard: () =>
    client.get('/hr/statutory/dashboard'),

  // ── Payroll Reports ─────────────────────────────────────────────
  getSalaryRegister: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/salary-register', { params }),

  getBankFile: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/bank-file', { params }),

  getPFECR: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/pf-ecr', { params }),

  getESIChallan: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/esi-challan', { params }),

  getPTChallan: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/pt-challan', { params }),

  getVarianceReport: (params?: PayrollReportParams) =>
    client.get('/hr/payroll-reports/variance', { params }),
};
