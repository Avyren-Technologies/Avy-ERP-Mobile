import { client } from '@/lib/api/client';

// ── Phase A: Configuration Prerequisites ──

export async function getConfigurationStatus() {
  const response = await client.get('/hr/payroll/configuration-status');
  return response.data;
}

// ── Phase B: Pre-Run Checklist ──

export async function getPreRunChecklist(runId: string) {
  const response = await client.get(`/hr/payroll-runs/${runId}/pre-run-checklist`);
  return response.data;
}

// ── Phase D: Post-Run ──

export async function getPostRunChecklist(runId: string) {
  const response = await client.get(`/hr/payroll-runs/${runId}/post-run-checklist`);
  return response.data;
}

export async function completePostRunActivity(runId: string, activityId: string, data?: { note?: string }) {
  const response = await client.patch(`/hr/payroll-runs/${runId}/post-run-checklist/${activityId}/complete`, data ?? {});
  return response.data;
}

export async function getPostRunInsights(runId: string) {
  const response = await client.get(`/hr/payroll-runs/${runId}/post-run-insights`);
  return response.data;
}

export const payrollPhasesApi = {
  getConfigurationStatus,
  getPreRunChecklist,
  getPostRunChecklist,
  completePostRunActivity,
  getPostRunInsights,
};
