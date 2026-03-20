import { useMutation, useQueryClient } from '@tanstack/react-query';

import { payrollRunApi } from '@/lib/api/payroll-run';
import { payrollRunKeys } from '@/features/company-admin/api/use-payroll-run-queries';

// ── Payroll Runs ───────────────────────────────────────────────────

/** Create a new payroll run */
export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollRunApi.createPayrollRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
    },
  });
}

/** Step 1: Lock attendance for a payroll run */
export function useLockAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.lockAttendance(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
    },
  });
}

/** Step 2: Mark exceptions reviewed */
export function useReviewExceptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.reviewExceptions(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
    },
  });
}

/** Step 3: Compute salaries */
export function useComputeSalaries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.computeSalaries(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.entries(id) });
    },
  });
}

/** Step 4: Compute statutory deductions */
export function useComputeStatutory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.computeStatutory(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.entries(id) });
    },
  });
}

/** Step 5: Approve payroll run */
export function useApproveRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.approveRun(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
    },
  });
}

/** Step 6: Disburse & archive */
export function useDisburseRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.disburseRun(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.run(id) });
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.payslips() });
    },
  });
}

// ── Payroll Entries ─────────────────────────────────────────────────

/** Override a payroll entry (manual adjustment) */
export function useOverridePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      entryId,
      data,
    }: {
      runId: string;
      entryId: string;
      data: Record<string, unknown>;
    }) => payrollRunApi.overridePayrollEntry(runId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.entries(variables.runId),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.entry(variables.runId, variables.entryId),
      });
    },
  });
}

// ── Payslips ────────────────────────────────────────────────────────

/** Email a payslip to employee */
export function useEmailPayslip() {
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.emailPayslip(id),
  });
}

/** Bulk generate payslips for a run */
export function useGeneratePayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => payrollRunApi.generatePayslips(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.payslips() });
    },
  });
}

// ── Salary Holds ────────────────────────────────────────────────────

/** Create a salary hold */
export function useCreateSalaryHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollRunApi.createSalaryHold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.salaryHolds() });
    },
  });
}

/** Release a salary hold */
export function useReleaseSalaryHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.releaseSalaryHold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.salaryHolds() });
    },
  });
}

// ── Salary Revisions ────────────────────────────────────────────────

/** Create a salary revision */
export function useCreateSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollRunApi.createSalaryRevision(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.salaryRevisions(),
      });
    },
  });
}

/** Approve a salary revision */
export function useApproveSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.approveSalaryRevision(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.salaryRevisions(),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.salaryRevision(id),
      });
    },
  });
}

/** Apply a salary revision (update salary + compute arrears) */
export function useApplySalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.applySalaryRevision(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.salaryRevisions(),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.salaryRevision(id),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.arrearEntries(),
      });
    },
  });
}

// ── Statutory Filings ───────────────────────────────────────────────

/** Create/generate a statutory filing */
export function useCreateStatutoryFiling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      payrollRunApi.createStatutoryFiling(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.statutoryFilings(),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.statutoryDashboard(),
      });
    },
  });
}

/** Update a statutory filing (mark as filed) */
export function useUpdateStatutoryFiling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      payrollRunApi.updateStatutoryFiling(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.statutoryFilings(),
      });
      queryClient.invalidateQueries({
        queryKey: payrollRunKeys.statutoryDashboard(),
      });
    },
  });
}
