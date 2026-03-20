import { useMutation, useQueryClient } from '@tanstack/react-query';

import { offboardingApi } from '@/lib/api/offboarding';
import { offboardingKeys } from './use-offboarding-queries';

// ── Exit Request Mutations ─────────────────────────────────────

export function useCreateExitRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      offboardingApi.createExitRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

export function useUpdateExitRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      offboardingApi.updateExitRequest(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

// ── Clearance Mutations ────────────────────────────────────────

export function useUpdateClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      offboardingApi.updateClearance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

// ── Exit Interview Mutations ───────────────────────────────────

export function useCreateExitInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exitRequestId, data }: { exitRequestId: string; data: Record<string, unknown> }) =>
      offboardingApi.createExitInterview(exitRequestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

// ── F&F Mutations ──────────────────────────────────────────────

export function useComputeFnF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exitRequestId: string) =>
      offboardingApi.computeFnF(exitRequestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

export function useApproveFnF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => offboardingApi.approveFnF(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

export function usePayFnF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => offboardingApi.payFnF(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}
