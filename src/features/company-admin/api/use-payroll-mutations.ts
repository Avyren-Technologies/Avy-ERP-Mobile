import { useMutation, useQueryClient } from '@tanstack/react-query';

import { payrollApi } from '@/lib/api/payroll';
import { payrollKeys } from '@/features/company-admin/api/use-payroll-queries';

// ── Salary Components ───────────────────────────────────────────────

/** Create a salary component */
export function useCreateSalaryComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createSalaryComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryComponents() });
    },
  });
}

/** Update a salary component */
export function useUpdateSalaryComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateSalaryComponent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryComponents() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.salaryComponent(variables.id),
      });
    },
  });
}

/** Delete a salary component */
export function useDeleteSalaryComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteSalaryComponent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryComponents() });
    },
  });
}

// ── Salary Structures ───────────────────────────────────────────────

/** Create a salary structure */
export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createSalaryStructure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryStructures() });
    },
  });
}

/** Update a salary structure */
export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateSalaryStructure(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryStructures() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.salaryStructure(variables.id),
      });
    },
  });
}

/** Delete a salary structure */
export function useDeleteSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteSalaryStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryStructures() });
    },
  });
}

// ── Employee Salary ─────────────────────────────────────────────────

/** Assign salary to an employee */
export function useAssignEmployeeSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.assignEmployeeSalary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.employeeSalaries() });
    },
  });
}

/** Update an employee salary */
export function useUpdateEmployeeSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateEmployeeSalary(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.employeeSalaries() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.employeeSalary(variables.id),
      });
    },
  });
}

// ── Statutory Config — PF ───────────────────────────────────────────

/** Update PF configuration */
export function useUpdatePFConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updatePFConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.pfConfig() });
    },
  });
}

// ── Statutory Config — ESI ──────────────────────────────────────────

/** Update ESI configuration */
export function useUpdateESIConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updateESIConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.esiConfig() });
    },
  });
}

// ── Statutory Config — PT ───────────────────────────────────────────

/** Create PT config for a state */
export function useCreatePTConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createPTConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.ptConfigs() });
    },
  });
}

/** Update a PT config */
export function useUpdatePTConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updatePTConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.ptConfigs() });
    },
  });
}

/** Delete a PT config */
export function useDeletePTConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deletePTConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.ptConfigs() });
    },
  });
}

// ── Statutory Config — Gratuity ─────────────────────────────────────

/** Update gratuity configuration */
export function useUpdateGratuityConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updateGratuityConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.gratuityConfig() });
    },
  });
}

// ── Statutory Config — Bonus ────────────────────────────────────────

/** Update bonus configuration */
export function useUpdateBonusConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updateBonusConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.bonusConfig() });
    },
  });
}

// ── Statutory Config — LWF ──────────────────────────────────────────

/** Create LWF config for a state */
export function useCreateLWFConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createLWFConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lwfConfigs() });
    },
  });
}

/** Update a LWF config */
export function useUpdateLWFConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateLWFConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lwfConfigs() });
    },
  });
}

/** Delete a LWF config */
export function useDeleteLWFConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteLWFConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lwfConfigs() });
    },
  });
}

// ── Bank Config ─────────────────────────────────────────────────────

/** Update bank configuration */
export function useUpdateBankConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updateBankConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.bankConfig() });
    },
  });
}

// ── Loan Policies ───────────────────────────────────────────────────

/** Create a loan policy */
export function useCreateLoanPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createLoanPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loanPolicies() });
    },
  });
}

/** Update a loan policy */
export function useUpdateLoanPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateLoanPolicy(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loanPolicies() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.loanPolicy(variables.id),
      });
    },
  });
}

/** Delete a loan policy */
export function useDeleteLoanPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteLoanPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loanPolicies() });
    },
  });
}

// ── Loans ───────────────────────────────────────────────────────────

/** Create a loan */
export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createLoan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loans() });
    },
  });
}

/** Update a loan (approve/disburse) */
export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateLoan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loans() });
    },
  });
}

/** Change loan status */
export function useUpdateLoanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollApi.updateLoanStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.loans() });
    },
  });
}

// ── Tax Config ──────────────────────────────────────────────────────

/** Update tax configuration */
export function useUpdateTaxConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.updateTaxConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.taxConfig() });
    },
  });
}

// ── Travel Advances ─────────────────────────────────────────────────

/** Create a travel advance */
export function useCreateTravelAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollApi.createTravelAdvance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.travelAdvances() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.loans() });
    },
  });
}

/** Settle a travel advance against an expense claim */
export function useSettleTravelAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { expenseClaimId: string } }) =>
      payrollApi.settleTravelAdvance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.travelAdvances() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.loans() });
    },
  });
}
