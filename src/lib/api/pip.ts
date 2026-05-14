import { client } from '@/lib/api/client';

// ---------- Types ----------

export interface SlabTier {
  fromQty: number;
  toQty: number | null;
  ratePerPiece: number;
}

export interface PipSlabConfig {
  id: string;
  companyId: string;
  locationId?: string;
  machineId: string;
  machine?: { id: string; assetCode: string; assetName: string };
  partId: string;
  part?: { id: string; partNumber: string; name: string };
  shiftTargetQty: number;
  slabTiers: SlabTier[];
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipDailyEntry {
  id: string;
  companyId: string;
  locationId?: string;
  entryDate: string;
  shiftId: string;
  operatorId: string;
  sessionRef?: string;
  machineId: string;
  partId: string;
  slabConfigId?: string;
  qtyProduced: number;
  shiftTargetQty: number;
  achievementPct: number;
  ncCount: number;
  ncReason?: string;
  methodUsed?: string;
  methodNumber?: number;
  cumulativeRatio?: number;
  isEligible: boolean;
  incentiveAmount: number;
  totalIncentive: number;
  calcBreakdown?: Record<string, unknown>;
  status: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipIncentiveConfig {
  id: string;
  companyId: string;
  method1Enabled: boolean;
  method1Name: string;
  method2Enabled: boolean;
  method2Name: string;
}

export interface PipMonthlyReport {
  id: string;
  companyId: string;
  locationId?: string;
  month: number;
  year: number;
  status: string;
  totalIncentive: number;
  operatorCount: number;
  workingDays: number;
  avgPerDay: number;
  maxSingleDay: number;
  maxSingleDayDate?: string;
  operatorSummary?: Record<string, unknown>[];
  partSummary?: Record<string, unknown>[];
  dailyTrend?: Record<string, unknown>[];
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  payrollRunId?: string;
  mergedAt?: string;
}

export interface PipDashboardMetrics {
  partCount: number;
  machineCount: number;
  slabConfigCount: number;
  /** UI field; API may send `todayTotalIncentive` instead */
  todayIncentive: number;
  todayOperatorCount: number;
}

export interface CalculationResult {
  totalIncentive: number;
  cumulativeRatio: number;
  isEligible: boolean;
  methodUsed: string;
  methodNumber: number;
  parts: Array<{
    partId: string;
    partNumber: string;
    partName: string;
    machineId: string;
    machineCode: string;
    qtyProduced: number;
    shiftTargetQty: number;
    achievementPct: number;
    earningQty: number;
    incentiveAmount: number;
    breakdown: string;
    case: string;
    milestone?: number;
  }>;
}

// ---------- PIP API ----------

export const pipApi = {
  // Config
  getConfig: () =>
    client.get('/production/pip/config'),
  updateConfig: (data: Record<string, unknown>) =>
    client.patch('/production/pip/config', data),

  // Slab Configs
  listSlabConfigs: (params?: Record<string, unknown>) =>
    client.get('/production/pip/slab-configs', { params }),
  getSlabConfig: (id: string) =>
    client.get(`/production/pip/slab-configs/${id}`),
  createSlabConfig: (data: Record<string, unknown>) =>
    client.post('/production/pip/slab-configs', data),
  bulkCreateSlabConfigs: (data: Record<string, unknown>) =>
    client.post('/production/pip/slab-configs/bulk', data),
  updateSlabConfig: (id: string, data: Record<string, unknown>) =>
    client.patch(`/production/pip/slab-configs/${id}`, data),
  deleteSlabConfig: (id: string) =>
    client.delete(`/production/pip/slab-configs/${id}`),

  // Daily Entries
  saveDailyEntries: (data: Record<string, unknown>) =>
    client.post('/production/pip/daily-entries', data),
  listDailyEntries: (params?: Record<string, unknown>) =>
    client.get('/production/pip/daily-entries', { params }),
  getDailyEntrySummary: (params?: Record<string, unknown>) =>
    client.get('/production/pip/daily-entries/summary', { params }),
  deleteDailyEntries: (sessionRef: string) =>
    client.delete(`/production/pip/daily-entries/${sessionRef}`),

  // Calculator
  simulateIncentive: (data: Record<string, unknown>) =>
    client.post('/production/pip/calculate', data),

  // Dashboard
  getDashboardMetrics: (params?: Record<string, unknown>) =>
    client.get('/production/pip/dashboard', { params }),

  // Monthly Reports
  generateMonthlyReport: (data: Record<string, unknown>) =>
    client.post('/production/pip/monthly-reports/generate', data),
  listMonthlyReports: (params?: Record<string, unknown>) =>
    client.get('/production/pip/monthly-reports', { params }),
  getMonthlyReport: (id: string) =>
    client.get(`/production/pip/monthly-reports/${id}`),
  submitMonthlyReport: (id: string) =>
    client.post(`/production/pip/monthly-reports/${id}/submit`),
  approveMonthlyReport: (id: string) =>
    client.patch(`/production/pip/monthly-reports/${id}/approve`),
  rejectMonthlyReport: (id: string, data: Record<string, unknown>) =>
    client.patch(`/production/pip/monthly-reports/${id}/reject`, data),

  // Payroll
  mergeToPayroll: (id: string, data: Record<string, unknown>) =>
    client.post(`/production/pip/monthly-reports/${id}/merge`, data),
  previewPayrollMerge: (id: string) =>
    client.get(`/production/pip/monthly-reports/${id}/merge-preview`),
  reversePayrollMerge: (id: string) =>
    client.post(`/production/pip/monthly-reports/${id}/reverse`),
};
