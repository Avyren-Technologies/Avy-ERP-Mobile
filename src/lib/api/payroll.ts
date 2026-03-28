import { client } from '@/lib/api/client';

// --- Types ---

export interface SalaryComponentListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SalaryStructureListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface EmployeeSalaryListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
}

export interface PTConfigListParams {
  page?: number;
  limit?: number;
}

export interface LWFConfigListParams {
  page?: number;
  limit?: number;
}

export interface LoanPolicyListParams {
  page?: number;
  limit?: number;
}

export interface LoanListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

// --- API Service ---

/**
 * Payroll API service — salary components, structures, employee salaries,
 * statutory configs, tax, bank, loans.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const payrollApi = {
  // ── Salary Components ─────────────────────────────────────────────
  listSalaryComponents: (params?: SalaryComponentListParams) =>
    client.get('/hr/salary-components', { params }),

  getSalaryComponent: (id: string) =>
    client.get(`/hr/salary-components/${id}`),

  createSalaryComponent: (data: Record<string, unknown>) =>
    client.post('/hr/salary-components', data),

  updateSalaryComponent: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/salary-components/${id}`, data),

  deleteSalaryComponent: (id: string) =>
    client.delete(`/hr/salary-components/${id}`),

  // ── Salary Structures ─────────────────────────────────────────────
  listSalaryStructures: (params?: SalaryStructureListParams) =>
    client.get('/hr/salary-structures', { params }),

  getSalaryStructure: (id: string) =>
    client.get(`/hr/salary-structures/${id}`),

  createSalaryStructure: (data: Record<string, unknown>) =>
    client.post('/hr/salary-structures', data),

  updateSalaryStructure: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/salary-structures/${id}`, data),

  deleteSalaryStructure: (id: string) =>
    client.delete(`/hr/salary-structures/${id}`),

  // ── Employee Salary ───────────────────────────────────────────────
  listEmployeeSalaries: (params?: EmployeeSalaryListParams) =>
    client.get('/hr/employee-salaries', { params }),

  getEmployeeSalary: (id: string) =>
    client.get(`/hr/employee-salaries/${id}`),

  assignEmployeeSalary: (data: Record<string, unknown>) =>
    client.post('/hr/employee-salaries', data),

  updateEmployeeSalary: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/employee-salaries/${id}`, data),

  // ── Statutory Config — PF ─────────────────────────────────────────
  getPFConfig: () => client.get('/hr/payroll/pf-config'),

  updatePFConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/pf-config', data),

  // ── Statutory Config — ESI ────────────────────────────────────────
  getESIConfig: () => client.get('/hr/payroll/esi-config'),

  updateESIConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/esi-config', data),

  // ── Statutory Config — PT (multi-state) ───────────────────────────
  listPTConfigs: (params?: PTConfigListParams) =>
    client.get('/hr/payroll/pt-configs', { params }),

  createPTConfig: (data: Record<string, unknown>) =>
    client.post('/hr/payroll/pt-configs', data),

  updatePTConfig: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/payroll/pt-configs/${id}`, data),

  deletePTConfig: (id: string) =>
    client.delete(`/hr/payroll/pt-configs/${id}`),

  // ── Statutory Config — Gratuity ───────────────────────────────────
  getGratuityConfig: () => client.get('/hr/payroll/gratuity-config'),

  updateGratuityConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/gratuity-config', data),

  // ── Statutory Config — Bonus ──────────────────────────────────────
  getBonusConfig: () => client.get('/hr/payroll/bonus-config'),

  updateBonusConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/bonus-config', data),

  // ── Statutory Config — LWF (multi-state) ──────────────────────────
  listLWFConfigs: (params?: LWFConfigListParams) =>
    client.get('/hr/payroll/lwf-configs', { params }),

  createLWFConfig: (data: Record<string, unknown>) =>
    client.post('/hr/payroll/lwf-configs', data),

  updateLWFConfig: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/payroll/lwf-configs/${id}`, data),

  deleteLWFConfig: (id: string) =>
    client.delete(`/hr/payroll/lwf-configs/${id}`),

  // ── Bank Config ───────────────────────────────────────────────────
  getBankConfig: () => client.get('/hr/payroll/bank-config'),

  updateBankConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/bank-config', data),

  // ── Loan Policies ─────────────────────────────────────────────────
  listLoanPolicies: (params?: LoanPolicyListParams) =>
    client.get('/hr/loan-policies', { params }),

  getLoanPolicy: (id: string) =>
    client.get(`/hr/loan-policies/${id}`),

  createLoanPolicy: (data: Record<string, unknown>) =>
    client.post('/hr/loan-policies', data),

  updateLoanPolicy: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/loan-policies/${id}`, data),

  deleteLoanPolicy: (id: string) =>
    client.delete(`/hr/loan-policies/${id}`),

  // ── Loan Records ──────────────────────────────────────────────────
  listLoans: (params?: LoanListParams) =>
    client.get('/hr/loans', { params }),

  createLoan: (data: Record<string, unknown>) =>
    client.post('/hr/loans', data),

  updateLoan: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/loans/${id}`, data),

  updateLoanStatus: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/loans/${id}/status`, data),

  // ── Tax Config ────────────────────────────────────────────────────
  getTaxConfig: () => client.get('/hr/payroll/tax-config'),

  updateTaxConfig: (data: Record<string, unknown>) =>
    client.patch('/hr/payroll/tax-config', data),

  // ── Travel Advances ─────────────────────────────────────────────
  createTravelAdvance: (data: Record<string, unknown>) =>
    client.post('/hr/loans/travel-advance', data),

  listTravelAdvances: (params?: Record<string, unknown>) =>
    client.get('/hr/loans/travel-advances', { params }),

  settleTravelAdvance: (id: string, data: { expenseClaimId: string }) =>
    client.post(`/hr/loans/${id}/settle-travel`, data),
};
