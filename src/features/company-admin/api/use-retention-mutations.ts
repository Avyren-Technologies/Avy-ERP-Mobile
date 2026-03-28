import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { retentionApi } from '@/lib/api/retention';
import { retentionKeys } from '@/features/company-admin/api/use-retention-queries';

// ── Policies ─────────────────────────────────────────────────────────

/** Create a retention policy */
export function useCreateRetentionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      retentionApi.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.policies() });
    },
    onError: showError,
  });
}

/** Update a retention policy */
export function useUpdateRetentionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      retentionApi.updatePolicy(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.policies() });
      queryClient.invalidateQueries({
        queryKey: retentionKeys.policy(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a retention policy */
export function useDeleteRetentionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retentionApi.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.policies() });
    },
    onError: showError,
  });
}

// ── Data Requests ────────────────────────────────────────────────────

/** Create a data request (export / deletion / access) */
export function useCreateDataRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      retentionApi.createDataRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.dataRequests() });
    },
    onError: showError,
  });
}

/** Update a data request */
export function useUpdateDataRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      retentionApi.updateDataRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.dataRequests() });
      queryClient.invalidateQueries({
        queryKey: retentionKeys.dataRequest(variables.id),
      });
    },
    onError: showError,
  });
}

// ── Data Export ──────────────────────────────────────────────────────

/** Export employee data */
export function useExportData() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      retentionApi.exportData(data),
    onError: showError,
  });
}

// ── Anonymise ────────────────────────────────────────────────────────

/** Anonymise employee data */
export function useAnonymise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      retentionApi.anonymise(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.checkDue() });
    },
    onError: showError,
  });
}

// ── Consents ─────────────────────────────────────────────────────────

/** Create a consent record */
export function useCreateConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      retentionApi.createConsent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.consents() });
    },
    onError: showError,
  });
}

/** Update a consent record */
export function useUpdateConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      retentionApi.updateConsent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.consents() });
    },
    onError: showError,
  });
}
