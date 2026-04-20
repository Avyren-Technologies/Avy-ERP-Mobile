import { client } from '@/lib/api/client';

// --- Types ---

export type PunchMode = 'FIRST_LAST' | 'EVERY_PAIR' | 'SHIFT_BASED';
export type DeductionType = 'NONE' | 'HALF_DAY_AFTER_LIMIT' | 'PERCENTAGE';
export type RoundingStrategy = 'NONE' | 'NEAREST_15' | 'NEAREST_30' | 'FLOOR_15' | 'CEIL_15';
export type PunchRounding = 'NONE' | 'NEAREST_5' | 'NEAREST_15';
export type RoundingDirection = 'NEAREST' | 'UP' | 'DOWN';
export type OTCalculationBasis = 'AFTER_SHIFT' | 'TOTAL_HOURS';
export type OvertimeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'COMP_OFF_ACCRUED';
export type GeofenceEnforcementMode = 'OFF' | 'WARN' | 'STRICT';
export type OTMultiplierSource = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | 'NIGHT_SHIFT';
export type AttendanceMode = 'SHIFT_STRICT' | 'SHIFT_RELAXED' | 'FULLY_FLEXIBLE';
export type LeaveCheckInMode = 'STRICT' | 'ALLOW_WITHIN_WINDOW' | 'ALLOW_TILL_SHIFT_END' | 'FULLY_FLEXIBLE';
export type ShiftMappingStrategy = 'BEST_FIT_HOURS';
export type ReviewFlag = 'MISSING_PUNCH' | 'AUTO_MAPPED' | 'WORKED_ON_LEAVE' | 'LATE_BEYOND_THRESHOLD' | 'MULTIPLE_SHIFT_ANOMALY' | 'OT_ANOMALY';

export interface AttendanceRule {
  id?: string;
  // Time & Boundary
  dayBoundaryTime: string;
  // Grace & Tolerance
  gracePeriodMinutes: number;
  earlyExitToleranceMinutes: number;
  maxLateCheckInMinutes: number;
  // Day Thresholds
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  // Late Tracking
  lateArrivalsAllowedPerMonth: number;
  // Deduction Rules
  lopAutoDeduct: boolean;
  lateDeductionType: DeductionType;
  lateDeductionValue: number | null;
  earlyExitDeductionType: DeductionType;
  earlyExitDeductionValue: number | null;
  // Punch Interpretation
  punchMode: PunchMode;
  // Auto-Processing
  autoMarkAbsentIfNoPunch: boolean;
  autoHalfDayEnabled: boolean;
  autoAbsentAfterDays: number;
  regularizationWindowDays: number;
  // Rounding
  workingHoursRounding: RoundingStrategy;
  punchTimeRounding: PunchRounding;
  punchTimeRoundingDirection: RoundingDirection;
  // Exception Handling
  ignoreLateOnLeaveDay: boolean;
  ignoreLateOnHoliday: boolean;
  ignoreLateOnWeekOff: boolean;
  // Capture
  selfieRequired: boolean;
  gpsRequired: boolean;
  geofenceEnforcementMode: GeofenceEnforcementMode;
  missingPunchAlert: boolean;
  // Attendance Mode & Flexibility
  attendanceMode: AttendanceMode;
  leaveCheckInMode: LeaveCheckInMode;
  leaveAutoAdjustmentEnabled: boolean;
  // Multiple Shifts
  multipleShiftsPerDayEnabled: boolean;
  minGapBetweenShiftsMinutes: number | null;
  maxShiftsPerDay: number | null;
  // Auto Shift Mapping
  autoShiftMappingEnabled: boolean;
  shiftMappingStrategy: ShiftMappingStrategy;
  minShiftMatchPercentage: number;
  // Weekly Review
  weeklyReviewEnabled: boolean;
  weeklyReviewRemindersEnabled: boolean;
}

export interface OvertimeRule {
  id?: string;
  // Eligibility
  eligibleTypeIds: string[] | null;
  // Calculation
  calculationBasis: OTCalculationBasis;
  thresholdMinutes: number;
  minimumOtMinutes: number;
  includeBreaksInOT: boolean;
  // Rate Multipliers
  weekdayMultiplier: number;
  weekendMultiplier: number | null;
  holidayMultiplier: number | null;
  nightShiftMultiplier: number | null;
  // Caps
  dailyCapHours: number | null;
  weeklyCapHours: number | null;
  monthlyCapHours: number | null;
  enforceCaps: boolean;
  maxContinuousOtHours: number | null;
  // Approval & Payroll
  approvalRequired: boolean;
  autoIncludePayroll: boolean;
  // Comp-Off
  compOffEnabled: boolean;
  compOffExpiryDays: number | null;
  // Rounding
  roundingStrategy: RoundingStrategy;
}

export interface OvertimeRequest {
  id: string;
  attendanceRecordId: string;
  companyId: string;
  employeeId: string;
  date: string;
  requestedHours: number;
  appliedMultiplier: number;
  multiplierSource: OTMultiplierSource;
  calculatedAmount: number | null;
  status: OvertimeRequestStatus;
  requestedBy: string;
  approvedBy: string | null;
  approvalNotes: string | null;
  approvedAt: string | null;
  compOffGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  departmentId?: string;
}

export interface AttendanceOverrideListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface HolidayListParams {
  page?: number;
  limit?: number;
  year?: number;
  type?: string;
}

export interface RosterListParams {
  page?: number;
  limit?: number;
}

export interface OvertimeRequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
}

// --- API Service ---

/**
 * Attendance API service -- attendance records, rules, holidays, rosters, overtime.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const getWeeklyReview = (params: { weekStart: string; weekEnd: string; departmentId?: string; flag?: ReviewFlag; page?: number; limit?: number }) =>
  client.get('/hr/attendance/weekly-review', { params }).then(r => r.data);

export const getWeeklyReviewSummary = (params: { weekStart: string; weekEnd: string }) =>
  client.get('/hr/attendance/weekly-review/summary', { params }).then(r => r.data);

export const remapShift = (id: string, data: { shiftId: string }) =>
  client.patch(`/hr/attendance/weekly-review/${id}/remap-shift`, data).then(r => r.data);

export const editPunches = (id: string, data: { punchIn?: string; punchOut?: string; reason: string }) =>
  client.patch(`/hr/attendance/weekly-review/${id}/edit-punches`, data).then(r => r.data);

export const markReviewed = (data: { recordIds: string[] }) =>
  client.patch('/hr/attendance/weekly-review/mark-reviewed', data).then(r => r.data);

export const attendanceApi = {
  // ── Attendance Records ─────────────────────────────────────────────
  listRecords: (params?: AttendanceListParams) =>
    client.get('/hr/attendance', { params }),

  getRecord: (id: string) => client.get(`/hr/attendance/${id}`),

  createRecord: (data: Record<string, unknown>) =>
    client.post('/hr/attendance', data),

  updateRecord: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/attendance/${id}`, data),

  // ── Attendance Summary / Dashboard ─────────────────────────────────
  getSummary: () => client.get('/hr/attendance/summary'),

  // ── Attendance Rules ───────────────────────────────────────────────
  getRules: () => client.get('/hr/attendance/rules'),

  updateRules: (data: Partial<AttendanceRule>) =>
    client.patch('/hr/attendance/rules', data),

  // ── Attendance Overrides ───────────────────────────────────────────
  listOverrides: (params?: AttendanceOverrideListParams) =>
    client.get('/hr/attendance/overrides', { params }),

  createOverride: (data: Record<string, unknown>) =>
    client.post('/hr/attendance/overrides', data),

  updateOverride: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/attendance/overrides/${id}`, data),

  // ── Holiday Calendar ───────────────────────────────────────────────
  listHolidays: (params?: HolidayListParams) =>
    client.get('/hr/holidays', { params }),

  createHoliday: (data: Record<string, unknown>) =>
    client.post('/hr/holidays', data),

  updateHoliday: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/holidays/${id}`, data),

  deleteHoliday: (id: string) =>
    client.delete(`/hr/holidays/${id}`),

  cloneHolidays: (data: Record<string, unknown>) =>
    client.post('/hr/holidays/clone', data),

  // ── Rosters ────────────────────────────────────────────────────────
  listRosters: (params?: RosterListParams) =>
    client.get('/hr/rosters', { params }),

  createRoster: (data: Record<string, unknown>) =>
    client.post('/hr/rosters', data),

  updateRoster: (id: string, data: Record<string, unknown>) =>
    client.patch(`/hr/rosters/${id}`, data),

  deleteRoster: (id: string) =>
    client.delete(`/hr/rosters/${id}`),

  // ── Overtime Rules ─────────────────────────────────────────────────
  getOvertimeRules: () => client.get('/hr/overtime-rules'),

  updateOvertimeRules: (data: Partial<OvertimeRule>) =>
    client.patch('/hr/overtime-rules', data),

  // ── Overtime Requests ──────────────────────────────────────────────
  getOvertimeRequests: (params?: OvertimeRequestListParams) =>
    client.get('/hr/overtime-requests', { params }),

  approveOvertimeRequest: (id: string, data?: { approvalNotes?: string }) =>
    client.patch(`/hr/overtime-requests/${id}/approve`, data),

  rejectOvertimeRequest: (id: string, data?: { approvalNotes?: string }) =>
    client.patch(`/hr/overtime-requests/${id}/reject`, data),
};
