import { useQuery } from '@tanstack/react-query';

import {
  payrollApi,
  type SalaryComponentListParams,
  type SalaryStructureListParams,
  type EmployeeSalaryListParams,
  type PTConfigListParams,
  type LWFConfigListParams,
  type LoanPolicyListParams,
  type LoanListParams,
} from '@/lib/api/payroll';

// --- Query keys ---

export const payrollKeys = {
  all: ['payroll'] as const,

  // Salary Components
  salaryComponents: (params?: SalaryComponentListParams) =>
    [...payrollKeys.all, 'salary-components', params] as const,
  salaryComponent: (id: string) =>
    [...payrollKeys.all, 'salary-component', id] as const,

  // Salary Structures
  salaryStructures: (params?: SalaryStructureListParams) =>
    [...payrollKeys.all, 'salary-structures', params] as const,
  salaryStructure: (id: string) =>
    [...payrollKeys.all, 'salary-structure', id] as const,

  // Employee Salary
  employeeSalaries: (params?: EmployeeSalaryListParams) =>
    [...payrollKeys.all, 'employee-salaries', params] as const,
  employeeSalary: (id: string) =>
    [...payrollKeys.all, 'employee-salary', id] as const,

  // Statutory Configs (singletons)
  pfConfig: () => [...payrollKeys.all, 'pf-config'] as const,
  esiConfig: () => [...payrollKeys.all, 'esi-config'] as const,
  gratuityConfig: () => [...payrollKeys.all, 'gratuity-config'] as const,
  bonusConfig: () => [...payrollKeys.all, 'bonus-config'] as const,

  // Statutory Configs (multi-state)
  ptConfigs: (params?: PTConfigListParams) =>
    [...payrollKeys.all, 'pt-configs', params] as const,
  lwfConfigs: (params?: LWFConfigListParams) =>
    [...payrollKeys.all, 'lwf-configs', params] as const,

  // Bank Config
  bankConfig: () => [...payrollKeys.all, 'bank-config'] as const,

  // Loan Policies
  loanPolicies: (params?: LoanPolicyListParams) =>
    [...payrollKeys.all, 'loan-policies', params] as const,
  loanPolicy: (id: string) =>
    [...payrollKeys.all, 'loan-policy', id] as const,

  // Loans
  loans: (params?: LoanListParams) =>
    [...payrollKeys.all, 'loans', params] as const,

  // Tax Config
  taxConfig: () => [...payrollKeys.all, 'tax-config'] as const,

  // Travel Advances
  travelAdvances: (params?: Record<string, unknown>) =>
    [...payrollKeys.all, 'travel-advances', params] as const,
};

// --- Salary Component Queries ---

/** List salary components */
export function useSalaryComponents(params?: SalaryComponentListParams) {
  return useQuery({
    queryKey: payrollKeys.salaryComponents(params),
    queryFn: () => payrollApi.listSalaryComponents(params),
  });
}

/** Single salary component by ID */
export function useSalaryComponent(id: string) {
  return useQuery({
    queryKey: payrollKeys.salaryComponent(id),
    queryFn: () => payrollApi.getSalaryComponent(id),
    enabled: !!id,
  });
}

// --- Salary Structure Queries ---

/** List salary structures */
export function useSalaryStructures(params?: SalaryStructureListParams) {
  return useQuery({
    queryKey: payrollKeys.salaryStructures(params),
    queryFn: () => payrollApi.listSalaryStructures(params),
  });
}

/** Single salary structure by ID */
export function useSalaryStructure(id: string) {
  return useQuery({
    queryKey: payrollKeys.salaryStructure(id),
    queryFn: () => payrollApi.getSalaryStructure(id),
    enabled: !!id,
  });
}

// --- Employee Salary Queries ---

/** List employee salaries with optional employeeId filter */
export function useEmployeeSalaries(params?: EmployeeSalaryListParams) {
  return useQuery({
    queryKey: payrollKeys.employeeSalaries(params),
    queryFn: () => payrollApi.listEmployeeSalaries(params),
  });
}

/** Single employee salary by ID */
export function useEmployeeSalary(id: string) {
  return useQuery({
    queryKey: payrollKeys.employeeSalary(id),
    queryFn: () => payrollApi.getEmployeeSalary(id),
    enabled: !!id,
  });
}

// --- Statutory Config Queries ---

/** Get PF configuration */
export function usePFConfig() {
  return useQuery({
    queryKey: payrollKeys.pfConfig(),
    queryFn: () => payrollApi.getPFConfig(),
  });
}

/** Get ESI configuration */
export function useESIConfig() {
  return useQuery({
    queryKey: payrollKeys.esiConfig(),
    queryFn: () => payrollApi.getESIConfig(),
  });
}

/** List PT configurations (multi-state) */
export function usePTConfigs(params?: PTConfigListParams) {
  return useQuery({
    queryKey: payrollKeys.ptConfigs(params),
    queryFn: () => payrollApi.listPTConfigs(params),
  });
}

/** Get gratuity configuration */
export function useGratuityConfig() {
  return useQuery({
    queryKey: payrollKeys.gratuityConfig(),
    queryFn: () => payrollApi.getGratuityConfig(),
  });
}

/** Get bonus configuration */
export function useBonusConfig() {
  return useQuery({
    queryKey: payrollKeys.bonusConfig(),
    queryFn: () => payrollApi.getBonusConfig(),
  });
}

/** List LWF configurations (multi-state) */
export function useLWFConfigs(params?: LWFConfigListParams) {
  return useQuery({
    queryKey: payrollKeys.lwfConfigs(params),
    queryFn: () => payrollApi.listLWFConfigs(params),
  });
}

// --- Bank Config Queries ---

/** Get bank configuration */
export function useBankConfig() {
  return useQuery({
    queryKey: payrollKeys.bankConfig(),
    queryFn: () => payrollApi.getBankConfig(),
  });
}

// --- Loan Policy Queries ---

/** List loan policies */
export function useLoanPolicies(params?: LoanPolicyListParams) {
  return useQuery({
    queryKey: payrollKeys.loanPolicies(params),
    queryFn: () => payrollApi.listLoanPolicies(params),
  });
}

/** Single loan policy by ID */
export function useLoanPolicy(id: string) {
  return useQuery({
    queryKey: payrollKeys.loanPolicy(id),
    queryFn: () => payrollApi.getLoanPolicy(id),
    enabled: !!id,
  });
}

// --- Loan Queries ---

/** List loans with optional filters */
export function useLoans(params?: LoanListParams) {
  return useQuery({
    queryKey: payrollKeys.loans(params),
    queryFn: () => payrollApi.listLoans(params),
  });
}

// --- Tax Config Queries ---

/** Get tax configuration */
export function useTaxConfig() {
  return useQuery({
    queryKey: payrollKeys.taxConfig(),
    queryFn: () => payrollApi.getTaxConfig(),
  });
}

// --- Travel Advance Queries ---

/** List travel advances */
export function useTravelAdvances(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: payrollKeys.travelAdvances(params),
    queryFn: () => payrollApi.listTravelAdvances(params),
  });
}
