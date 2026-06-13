import { client } from '@/lib/api/client';

// ---------- Types ----------

export interface ProcessCategory {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Operation {
  id: string;
  companyId: string;
  code: string;
  name: string;
  processType?: string;
  processCategoryId?: string;
  processCategory?: { id: string; name: string; code: string };
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DowntimeReason {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  operationId: string;
  operation?: { id: string; code: string; name: string; processType?: string; processCategoryId?: string; processCategory?: { id: string; name: string; code: string } };
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
  operationId?: string;
  operation?: { id: string; code: string; name: string };
  qtyProduced: number;
  shiftTargetQty: number;
  achievementPct: number;
  ncCount: number;
  ncReason?: string;
  downtimeReasonId?: string;
  downtimeMinutes?: number;
  downtimeReason?: { id: string; code: string; name: string };
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
  differentiateExtraHours: boolean;
  defaultShiftHours: number;
  extraHoursWarnThreshold: number;
  splitExtraHoursEarning: boolean;
  extraHoursEarningCode: string;
}

export interface PipExtraHoursEntry {
  id: string;
  companyId: string;
  locationId?: string;
  entryDate: string;
  shiftId: string;
  operatorId: string;
  sessionRef?: string;
  machineId: string;
  partId: string;
  slabConfigId: string;
  operationId?: string;
  extraHoursWorked: number;
  shiftHours: number;
  shiftTargetQty: number;
  hourlyRate: number;
  extraHoursTarget: number;
  qtyProduced: number;
  incentiveQty: number;
  slab1Rate: number;
  incentiveAmount: number;
  calcBreakdown?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  operator?: { id: string; employeeCode: string; firstName: string; lastName: string };
  slabConfig?: { id: string; machineId: string; partId: string; operationId: string };
}

export interface ExtraHoursResult {
  totalIncentive: number;
  extraHoursWorked: number;
  shiftHours: number;
  parts: Array<{
    partId: string;
    partNumber: string;
    partName: string;
    machineId: string;
    machineCode: string;
    qtyProduced: number;
    shiftTargetQty: number;
    slab1Rate: number;
    hourlyRate: number;
    extraHoursTarget: number;
    incentiveQty: number;
    incentiveAmount: number;
    breakdown: string;
  }>;
}

export interface SaveExtraHoursEntriesPayload {
  entryDate: string;
  shiftId: string;
  operatorId: string;
  sessionRef?: string;
  locationId?: string;
  extraHoursWorked: number;
  entries: Array<{
    machineId: string;
    partId: string;
    slabConfigId: string;
    operationId?: string;
    qtyProduced: number;
  }>;
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
  // Process Categories
  listProcessCategories: (params?: Record<string, unknown>) =>
    client.get('/production/pip/process-categories', { params }),
  createProcessCategory: (data: Record<string, unknown>) =>
    client.post('/production/pip/process-categories', data),
  updateProcessCategory: (id: string, data: Record<string, unknown>) =>
    client.patch(`/production/pip/process-categories/${id}`, data),
  deleteProcessCategory: (id: string) =>
    client.delete(`/production/pip/process-categories/${id}`),

  // Downtime Reasons
  listDowntimeReasons: (params?: Record<string, unknown>) =>
    client.get('/production/pip/downtime-reasons', { params }),
  createDowntimeReason: (data: Record<string, unknown>) =>
    client.post('/production/pip/downtime-reasons', data),
  updateDowntimeReason: (id: string, data: Record<string, unknown>) =>
    client.patch(`/production/pip/downtime-reasons/${id}`, data),
  deleteDowntimeReason: (id: string) =>
    client.delete(`/production/pip/downtime-reasons/${id}`),

  // Operations
  listOperations: (params?: Record<string, unknown>) =>
    client.get('/production/pip/operations', { params }),
  getOperation: (id: string) =>
    client.get(`/production/pip/operations/${id}`),
  createOperation: (data: Record<string, unknown>) =>
    client.post('/production/pip/operations', data),
  updateOperation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/production/pip/operations/${id}`, data),
  deleteOperation: (id: string) =>
    client.delete(`/production/pip/operations/${id}`),

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

  // Extra Hours Entries
  saveExtraHoursEntries: (data: SaveExtraHoursEntriesPayload) =>
    client.post('/production/pip/extra-hours-entries', data),
  listExtraHoursEntries: (params?: Record<string, unknown>) =>
    client.get('/production/pip/extra-hours-entries', { params }),
  deleteExtraHoursEntries: (sessionRef: string) =>
    client.delete(`/production/pip/extra-hours-entries/${sessionRef}`),

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
