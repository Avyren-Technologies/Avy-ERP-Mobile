import { useQuery } from '@tanstack/react-query';

import {
  payrollRunApi,
  type PayrollRunListParams,
  type PayrollEntryListParams,
  type PayslipListParams,
  type SalaryHoldListParams,
  type SalaryRevisionListParams,
  type ArrearEntryListParams,
  type StatutoryFilingListParams,
  type PayrollReportParams,
} from '@/lib/api/payroll-run';

// --- Query keys ---

export const payrollRunKeys = {
  all: ['payroll-run'] as const,

  // Payroll Runs
  runs: (params?: PayrollRunListParams) =>
    [...payrollRunKeys.all, 'runs', params] as const,
  run: (id: string) =>
    [...payrollRunKeys.all, 'run', id] as const,

  // Payroll Entries
  entries: (runId: string, params?: PayrollEntryListParams) =>
    [...payrollRunKeys.all, 'entries', runId, params] as const,
  entry: (runId: string, entryId: string) =>
    [...payrollRunKeys.all, 'entry', runId, entryId] as const,

  // Payslips
  payslips: (params?: PayslipListParams) =>
    [...payrollRunKeys.all, 'payslips', params] as const,
  payslip: (id: string) =>
    [...payrollRunKeys.all, 'payslip', id] as const,

  // Salary Holds
  salaryHolds: (params?: SalaryHoldListParams) =>
    [...payrollRunKeys.all, 'salary-holds', params] as const,

  // Salary Revisions
  salaryRevisions: (params?: SalaryRevisionListParams) =>
    [...payrollRunKeys.all, 'salary-revisions', params] as const,
  salaryRevision: (id: string) =>
    [...payrollRunKeys.all, 'salary-revision', id] as const,

  // Arrears
  arrearEntries: (params?: ArrearEntryListParams) =>
    [...payrollRunKeys.all, 'arrear-entries', params] as const,

  // Statutory Filings
  statutoryFilings: (params?: StatutoryFilingListParams) =>
    [...payrollRunKeys.all, 'statutory-filings', params] as const,

  // Statutory Dashboard
  statutoryDashboard: () =>
    [...payrollRunKeys.all, 'statutory-dashboard'] as const,

  // Payroll Reports
  salaryRegister: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'salary-register', params] as const,
  bankFile: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'bank-file', params] as const,
  pfECR: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'pf-ecr', params] as const,
  esiChallan: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'esi-challan', params] as const,
  ptChallan: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'pt-challan', params] as const,
  varianceReport: (params?: PayrollReportParams) =>
    [...payrollRunKeys.all, 'variance', params] as const,
};

// --- Payroll Run Queries ---

/** List payroll runs with optional year/month/status filters */
export function usePayrollRuns(params?: PayrollRunListParams) {
  return useQuery({
    queryKey: payrollRunKeys.runs(params),
    queryFn: () => payrollRunApi.listPayrollRuns(params),
  });
}

/** Single payroll run by ID */
export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: payrollRunKeys.run(id),
    queryFn: () => payrollRunApi.getPayrollRun(id),
    enabled: !!id,
  });
}

// --- Payroll Entry Queries ---

/** List entries for a payroll run */
export function usePayrollEntries(runId: string, params?: PayrollEntryListParams) {
  return useQuery({
    queryKey: payrollRunKeys.entries(runId, params),
    queryFn: () => payrollRunApi.listPayrollEntries(runId, params),
    enabled: !!runId,
  });
}

/** Single payroll entry */
export function usePayrollEntry(runId: string, entryId: string) {
  return useQuery({
    queryKey: payrollRunKeys.entry(runId, entryId),
    queryFn: () => payrollRunApi.getPayrollEntry(runId, entryId),
    enabled: !!runId && !!entryId,
  });
}

// --- Payslip Queries ---

/** List payslips with optional filters */
export function usePayslips(params?: PayslipListParams) {
  return useQuery({
    queryKey: payrollRunKeys.payslips(params),
    queryFn: () => payrollRunApi.listPayslips(params),
  });
}

/** Single payslip by ID */
export function usePayslip(id: string) {
  return useQuery({
    queryKey: payrollRunKeys.payslip(id),
    queryFn: () => payrollRunApi.getPayslip(id),
    enabled: !!id,
  });
}

// --- Salary Hold Queries ---

/** List salary holds */
export function useSalaryHolds(params?: SalaryHoldListParams) {
  return useQuery({
    queryKey: payrollRunKeys.salaryHolds(params),
    queryFn: () => payrollRunApi.listSalaryHolds(params),
  });
}

// --- Salary Revision Queries ---

/** List salary revisions */
export function useSalaryRevisions(params?: SalaryRevisionListParams) {
  return useQuery({
    queryKey: payrollRunKeys.salaryRevisions(params),
    queryFn: () => payrollRunApi.listSalaryRevisions(params),
  });
}

/** Single salary revision by ID */
export function useSalaryRevision(id: string) {
  return useQuery({
    queryKey: payrollRunKeys.salaryRevision(id),
    queryFn: () => payrollRunApi.getSalaryRevision(id),
    enabled: !!id,
  });
}

// --- Arrear Queries ---

/** List arrear entries */
export function useArrearEntries(params?: ArrearEntryListParams) {
  return useQuery({
    queryKey: payrollRunKeys.arrearEntries(params),
    queryFn: () => payrollRunApi.listArrearEntries(params),
  });
}

// --- Statutory Filing Queries ---

/** List statutory filings */
export function useStatutoryFilings(params?: StatutoryFilingListParams) {
  return useQuery({
    queryKey: payrollRunKeys.statutoryFilings(params),
    queryFn: () => payrollRunApi.listStatutoryFilings(params),
  });
}

// --- Statutory Dashboard ---

/** Get statutory compliance dashboard */
export function useStatutoryDashboard() {
  return useQuery({
    queryKey: payrollRunKeys.statutoryDashboard(),
    queryFn: () => payrollRunApi.getStatutoryDashboard(),
  });
}

// --- Payroll Report Queries ---

/** Salary register report */
export function useSalaryRegister(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.salaryRegister(params),
    queryFn: () => payrollRunApi.getSalaryRegister(params),
    enabled: !!params?.month && !!params?.year,
  });
}

/** Bank file for disbursement */
export function useBankFile(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.bankFile(params),
    queryFn: () => payrollRunApi.getBankFile(params),
    enabled: !!params?.payrollRunId,
  });
}

/** PF ECR report */
export function usePFECR(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.pfECR(params),
    queryFn: () => payrollRunApi.getPFECR(params),
    enabled: !!params?.month && !!params?.year,
  });
}

/** ESI challan report */
export function useESIChallan(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.esiChallan(params),
    queryFn: () => payrollRunApi.getESIChallan(params),
    enabled: !!params?.month && !!params?.year,
  });
}

/** PT challan report */
export function usePTChallan(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.ptChallan(params),
    queryFn: () => payrollRunApi.getPTChallan(params),
    enabled: !!params?.month && !!params?.year,
  });
}

/** Month-on-month variance report */
export function useVarianceReport(params?: PayrollReportParams) {
  return useQuery({
    queryKey: payrollRunKeys.varianceReport(params),
    queryFn: () => payrollRunApi.getVarianceReport(params),
    enabled: !!params?.month && !!params?.year,
  });
}
