import { client } from '@/lib/api/client';

// --- Types ---

export interface CompanyAdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'kn';
export type TimeFormat = 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR';
export type ShiftType = 'DAY' | 'NIGHT' | 'FLEXIBLE';
export type BreakType = 'FIXED' | 'FLEXIBLE';
export type DeviceType = 'BIOMETRIC' | 'MOBILE_GPS' | 'WEB_PORTAL' | 'SMART_CARD' | 'FACE_RECOGNITION';

export interface CompanySettings {
  id?: string;
  // Locale
  currency: CurrencyCode;
  language: LanguageCode;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormat;
  numberFormat: string;
  // Compliance
  indiaCompliance: boolean;
  gdprMode: boolean;
  auditTrail: boolean;
  // Integrations
  bankIntegration: boolean;
  razorpayEnabled: boolean;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  biometricIntegration: boolean;
  eSignIntegration: boolean;
}

export interface SystemControls {
  id?: string;
  // Module Enablement
  attendanceEnabled: boolean;
  leaveEnabled: boolean;
  payrollEnabled: boolean;
  essEnabled: boolean;
  performanceEnabled: boolean;
  recruitmentEnabled: boolean;
  trainingEnabled: boolean;
  mobileAppEnabled: boolean;
  aiChatbotEnabled: boolean;
  // Production
  ncEditMode: boolean;
  loadUnload: boolean;
  cycleTime: boolean;
  // Payroll
  payrollLock: boolean;
  backdatedEntryControl: boolean;
  // Leave
  leaveCarryForward: boolean;
  compOffEnabled: boolean;
  halfDayLeaveEnabled: boolean;
  // Security
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  passwordMinLength: number;
  passwordComplexity: boolean;
  accountLockThreshold: number;
  accountLockDurationMinutes: number;
  // Audit
  auditLogRetentionDays: number;
}

export interface ShiftBreak {
  id: string;
  shiftId: string;
  name: string;
  startTime?: string | null;
  duration: number;
  type: BreakType;
  isPaid: boolean;
}

export interface CreateShiftBreakPayload {
  name: string;
  type: BreakType;
  startTime?: string | null;
  duration: number;
  isPaid?: boolean;
}

export interface CompanyShift {
  id: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  isCrossDay: boolean;
  breaks?: ShiftBreak[];
  gracePeriodMinutes?: number | null;
  earlyExitToleranceMinutes?: number | null;
  halfDayThresholdHours?: number | null;
  fullDayThresholdHours?: number | null;
  maxLateCheckInMinutes?: number | null;
  minWorkingHoursForOT?: number | null;
  requireSelfie?: boolean | null;
  requireGPS?: boolean | null;
  allowedSources?: DeviceType[];
  noShuffle: boolean;
  autoClockOutMinutes?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftPayload {
  name: string;
  shiftType?: ShiftType;
  startTime: string;
  endTime: string;
  isCrossDay?: boolean;
  gracePeriodMinutes?: number | null;
  earlyExitToleranceMinutes?: number | null;
  halfDayThresholdHours?: number | null;
  fullDayThresholdHours?: number | null;
  maxLateCheckInMinutes?: number | null;
  minWorkingHoursForOT?: number | null;
  requireSelfie?: boolean | null;
  requireGPS?: boolean | null;
  allowedSources?: DeviceType[];
  noShuffle?: boolean;
  autoClockOutMinutes?: number | null;
}

// --- API Service ---

/**
 * Company-admin API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const companyAdminApi = {
  // ── Profile ──────────────────────────────────────────────────────────
  getProfile: () => client.get('/company/profile'),

  updateProfileSection: (sectionKey: string, data: Record<string, unknown>) =>
    client.patch(`/company/profile/sections/${sectionKey}`, data),

  // ── Locations (NO create — provisioned by super-admin) ───────────────
  listLocations: () => client.get('/company/locations'),

  getLocation: (id: string) => client.get(`/company/locations/${id}`),

  updateLocation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/locations/${id}`, data),

  deleteLocation: (id: string) => client.delete(`/company/locations/${id}`),

  // ── Shifts (full CRUD) ──────────────────────────────────────────────
  listShifts: () => client.get('/company/shifts'),

  createShift: (data: CreateShiftPayload) =>
    client.post('/company/shifts', data),

  updateShift: (id: string, data: Partial<CreateShiftPayload>) =>
    client.patch(`/company/shifts/${id}`, data),

  deleteShift: (id: string) => client.delete(`/company/shifts/${id}`),

  // ── Shift Breaks ────────────────────────────────────────────────────
  getShiftBreaks: (shiftId: string) =>
    client.get(`/company/shifts/${shiftId}/breaks`),

  createShiftBreak: (shiftId: string, data: CreateShiftBreakPayload) =>
    client.post(`/company/shifts/${shiftId}/breaks`, data),

  updateShiftBreak: (shiftId: string, breakId: string, data: Partial<CreateShiftBreakPayload>) =>
    client.patch(`/company/shifts/${shiftId}/breaks/${breakId}`, data),

  deleteShiftBreak: (shiftId: string, breakId: string) =>
    client.delete(`/company/shifts/${shiftId}/breaks/${breakId}`),

  // ── Contacts (full CRUD) ────────────────────────────────────────────
  listContacts: () => client.get('/company/contacts'),

  createContact: (data: Record<string, unknown>) =>
    client.post('/company/contacts', data),

  updateContact: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/contacts/${id}`, data),

  deleteContact: (id: string) => client.delete(`/company/contacts/${id}`),

  // ── No Series (full CRUD) ──────────────────────────────────────────
  getLinkedScreens: () => client.get('/company/no-series/linked-screens'),

  listNoSeries: () => client.get('/company/no-series'),

  createNoSeries: (data: Record<string, unknown>) =>
    client.post('/company/no-series', data),

  updateNoSeries: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/no-series/${id}`, data),

  deleteNoSeries: (id: string) => client.delete(`/company/no-series/${id}`),

  // ── IOT Reasons (full CRUD) ────────────────────────────────────────
  listIOTReasons: () => client.get('/company/iot-reasons'),

  createIOTReason: (data: Record<string, unknown>) =>
    client.post('/company/iot-reasons', data),

  updateIOTReason: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/iot-reasons/${id}`, data),

  deleteIOTReason: (id: string) => client.delete(`/company/iot-reasons/${id}`),

  // ── Controls ───────────────────────────────────────────────────────
  getControls: () => client.get('/company/controls'),

  updateControls: (data: Partial<SystemControls>) =>
    client.patch('/company/controls', data),

  // ── Settings ───────────────────────────────────────────────────────
  getSettings: () => client.get('/company/settings'),

  updateSettings: (data: Partial<CompanySettings>) =>
    client.patch('/company/settings', data),

  // ── Users ──────────────────────────────────────────────────────────
  listUsers: (params?: CompanyAdminListParams) =>
    client.get('/company/users', { params }),

  getUser: (id: string) => client.get(`/company/users/${id}`),

  createUser: (data: Record<string, unknown>) =>
    client.post('/company/users', data),

  updateUser: (id: string, data: Record<string, unknown>) =>
    client.patch(`/company/users/${id}`, data),

  updateUserStatus: (id: string, data: { isActive: boolean }) =>
    client.patch(`/company/users/${id}/status`, data),

  // ── Audit Logs (tenant-scoped) ─────────────────────────────────────
  listAuditLogs: (params?: CompanyAdminListParams) =>
    client.get('/company/audit-logs', { params }),

  // ── Dashboard (company-admin specific) ─────────────────────────────
  getActivity: (limit?: number) =>
    client.get('/dashboard/company-activity', { params: { limit } }),

  // ── Module Catalogue ──────────────────────────────────────────────
  getModuleCatalogue: () => client.get('/modules/catalogue'),

  // ── Billing ──────────────────────────────────────────────────────
  getMySubscription: () => client.get('/company/billing/subscription'),

  getMyInvoices: (params?: CompanyAdminListParams) =>
    client.get('/company/billing/invoices', { params }),

  getMyInvoiceDetail: (id: string) =>
    client.get(`/company/billing/invoices/${id}`),

  getMyPayments: (params?: CompanyAdminListParams) =>
    client.get('/company/billing/payments', { params }),

  getMyCostBreakdown: () => client.get('/company/billing/cost-breakdown'),

  // ── RBAC (roles & permissions) ────────────────────────────────────
  listRoles: () => client.get('/rbac/roles'),

  listReferenceRoles: () => client.get('/rbac/reference-roles'),

  createRole: (data: Record<string, unknown>) =>
    client.post('/rbac/roles', data),

  updateRole: (id: string, data: Record<string, unknown>) =>
    client.patch(`/rbac/roles/${id}`, data),

  deleteRole: (id: string) => client.delete(`/rbac/roles/${id}`),

  /** Fetch permission catalogue (modules + actions) */
  getPermissionCatalogue: () => client.get('/rbac/permissions'),

  // ── Support Tickets ─────────────────────────────────────────────────
  createSupportTicket: (data: { subject: string; category?: string; priority?: string; message: string; metadata?: Record<string, unknown> }) =>
    client.post('/company/support/tickets', data),

  listSupportTickets: (params?: { status?: string; category?: string; search?: string; page?: number; limit?: number }) =>
    client.get('/company/support/tickets', { params }),

  getSupportTicket: (id: string) =>
    client.get(`/company/support/tickets/${id}`),

  sendSupportMessage: (id: string, data: { body: string }) =>
    client.post(`/company/support/tickets/${id}/messages`, data),

  closeSupportTicket: (id: string) =>
    client.patch(`/company/support/tickets/${id}/close`),

  // ── Module CRUD ─────────────────────────────────────────────────────
  addLocationModules: (locationId: string, data: { moduleIds: string[] }) =>
    client.post(`/company/locations/${locationId}/modules`, data),

  removeLocationModule: (locationId: string, moduleId: string) =>
    client.delete(`/company/locations/${locationId}/modules/${moduleId}`),

  // ── Navigation Manifest ──
  getNavigationManifest: () => client.get('/rbac/navigation-manifest'),
};
