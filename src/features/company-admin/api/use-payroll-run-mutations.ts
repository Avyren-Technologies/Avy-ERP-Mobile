import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { payrollRunApi } from '@/lib/api/payroll-run';
import { payrollRunKeys } from '@/features/company-admin/api/use-payroll-run-queries';

/**
 * Invalidate every cache that depends on a payroll-run's state so the
 * list view, run detail, KPI strip, attendance/compute/statutory/approval
 * summaries, and statutory files all stay in sync after any wizard mutation.
 */
function invalidateRunCaches(qc: QueryClient, runId?: string) {
  qc.invalidateQueries({ queryKey: payrollRunKeys.runs() });
  qc.invalidateQueries({ queryKey: payrollRunKeys.fiscalYearKpis() });
  if (runId) {
    qc.invalidateQueries({ queryKey: payrollRunKeys.run(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.entries(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.attendanceSummary(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.attendanceDetail(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.computeSummary(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.statutorySummary(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.statutoryFiles(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.approvalSummary(runId) });
    qc.invalidateQueries({ queryKey: payrollRunKeys.disbursementBreakdown(runId) });
  }
}

// ── Payroll Runs ───────────────────────────────────────────────────

/** Create a new payroll run */
export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => payrollRunApi.createPayrollRun(data),
    onSuccess: () => invalidateRunCaches(queryClient),
  });
}

export function useDeletePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.deletePayrollRun(id),
    onSuccess: (_, id) => {
      invalidateRunCaches(queryClient, id);
      queryClient.removeQueries({ queryKey: payrollRunKeys.run(id) });
    },
  });
}

/** Step 1: Lock attendance for a payroll run */
export function useLockAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.lockAttendance(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
  });
}

/** Step 2: Mark exceptions reviewed */
export function useReviewExceptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.reviewExceptions(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
  });
}

/** Step 2: Resolve a single exception (action: RESOLVE / SKIP) */
export function useResolveException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, exceptionIndex, action, note }: { runId: string; exceptionIndex: number; action: 'RESOLVE' | 'SKIP'; note?: string }) =>
      payrollRunApi.resolveException(runId, exceptionIndex, action, note),
    onSuccess: (_, vars) => invalidateRunCaches(queryClient, vars.runId),
  });
}

/** Step 3: Compute salaries */
export function useComputeSalaries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.computeSalaries(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
  });
}

/** Step 4: Compute statutory deductions */
export function useComputeStatutory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.computeStatutory(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
  });
}

/** Step 5: Approve payroll run */
export function useApproveRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.approveRun(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
  });
}

/** Step 5: Save approval notes (no status change) */
export function useSaveApprovalNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, notes }: { runId: string; notes: string }) =>
      payrollRunApi.saveApprovalNotes(runId, notes),
    onSuccess: (_, vars) => invalidateRunCaches(queryClient, vars.runId),
  });
}

/** Step 6: Disburse & archive */
export function useDisburseRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.disburseRun(id),
    onSuccess: (_, id) => {
      invalidateRunCaches(queryClient, id);
      queryClient.invalidateQueries({ queryKey: payrollRunKeys.payslips() });
    },
  });
}

/** Step 6: Archive the run (separate from disburse) */
export function useArchiveRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, payload }: { runId: string; payload?: Record<string, unknown> }) =>
      payrollRunApi.archiveRun(runId, payload),
    onSuccess: (_, vars) => invalidateRunCaches(queryClient, vars.runId),
  });
}

/** Reset to compute step (re-compute) */
export function useResetToCompute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.resetToCompute(id),
    onSuccess: (_, id) => invalidateRunCaches(queryClient, id),
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

// ── Form 16 & 24Q Reports ──────────────────────────────────────────

/** Generate Form 16 for a financial year */
export function useGenerateForm16() {
  return useMutation({
    mutationFn: (data: { financialYear: string }) =>
      payrollRunApi.generateForm16(data),
  });
}

/** Generate Form 24Q for a quarter */
export function useGenerateForm24Q() {
  return useMutation({
    mutationFn: (data: { quarter: number; financialYear: string }) =>
      payrollRunApi.generateForm24Q(data),
  });
}

/** Bulk email Form 16 to all employees */
export function useBulkEmailForm16() {
  return useMutation({
    mutationFn: (data: { financialYear: string }) =>
      payrollRunApi.bulkEmailForm16(data),
  });
}
