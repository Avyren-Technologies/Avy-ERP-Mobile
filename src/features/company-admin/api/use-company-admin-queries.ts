import { useQuery } from '@tanstack/react-query';

import {
  companyAdminApi,
  type CompanyAdminListParams,
} from '@/lib/api/company-admin';

// --- Query keys ---

export const companyAdminKeys = {
  all: ['company-admin'] as const,
  profile: () => [...companyAdminKeys.all, 'profile'] as const,
  locations: () => [...companyAdminKeys.all, 'locations'] as const,
  location: (id: string) => [...companyAdminKeys.all, 'location', id] as const,
  shifts: () => [...companyAdminKeys.all, 'shifts'] as const,
  contacts: () => [...companyAdminKeys.all, 'contacts'] as const,
  noSeries: () => [...companyAdminKeys.all, 'no-series'] as const,
  iotReasons: () => [...companyAdminKeys.all, 'iot-reasons'] as const,
  controls: () => [...companyAdminKeys.all, 'controls'] as const,
  settings: () => [...companyAdminKeys.all, 'settings'] as const,
  users: (params?: CompanyAdminListParams) =>
    [...companyAdminKeys.all, 'users', params] as const,
  user: (id: string) => [...companyAdminKeys.all, 'user', id] as const,
  auditLogs: (params?: CompanyAdminListParams) =>
    [...companyAdminKeys.all, 'audit-logs', params] as const,
  activity: (limit?: number) =>
    [...companyAdminKeys.all, 'activity', limit] as const,
  rbacRoles: () => [...companyAdminKeys.all, 'rbac-roles'] as const,
  rbacReferenceRoles: () => [...companyAdminKeys.all, 'rbac-reference-roles'] as const,
  permissionCatalogue: () => [...companyAdminKeys.all, 'permission-catalogue'] as const,
  featureToggleCatalogue: () => [...companyAdminKeys.all, 'feature-toggle-catalogue'] as const,
  featureToggles: (userId?: string) => [...companyAdminKeys.all, 'feature-toggles', userId] as const,
  moduleCatalogue: () => [...companyAdminKeys.all, 'module-catalogue'] as const,
  subscription: () => [...companyAdminKeys.all, 'subscription'] as const,
  invoices: (params?: CompanyAdminListParams) =>
    [...companyAdminKeys.all, 'invoices', params] as const,
  invoiceDetail: (id: string) => [...companyAdminKeys.all, 'invoice', id] as const,
  payments: (params?: CompanyAdminListParams) =>
    [...companyAdminKeys.all, 'payments', params] as const,
  costBreakdown: () => [...companyAdminKeys.all, 'cost-breakdown'] as const,
  supportTickets: (params?: Record<string, unknown>) =>
    [...companyAdminKeys.all, 'support-tickets', params] as const,
  supportTicket: (id: string) =>
    [...companyAdminKeys.all, 'support-ticket', id] as const,
};

// --- Queries ---

/** Company profile (identity, statutory, fiscal, etc.) */
export function useCompanyProfile() {
  return useQuery({
    queryKey: companyAdminKeys.profile(),
    queryFn: () => companyAdminApi.getProfile(),
  });
}

/** All locations for the current company */
export function useCompanyLocations() {
  return useQuery({
    queryKey: companyAdminKeys.locations(),
    queryFn: () => companyAdminApi.listLocations(),
  });
}

/** Single location by ID */
export function useCompanyLocation(id: string) {
  return useQuery({
    queryKey: companyAdminKeys.location(id),
    queryFn: () => companyAdminApi.getLocation(id),
    enabled: !!id,
  });
}

/** All shifts for the current company */
export function useCompanyShifts() {
  return useQuery({
    queryKey: companyAdminKeys.shifts(),
    queryFn: () => companyAdminApi.listShifts(),
  });
}

/** All contacts for the current company */
export function useCompanyContacts() {
  return useQuery({
    queryKey: companyAdminKeys.contacts(),
    queryFn: () => companyAdminApi.listContacts(),
  });
}

/** All number series for the current company */
export function useCompanyNoSeries() {
  return useQuery({
    queryKey: companyAdminKeys.noSeries(),
    queryFn: () => companyAdminApi.listNoSeries(),
  });
}

/** All IOT reasons for the current company */
export function useCompanyIOTReasons() {
  return useQuery({
    queryKey: companyAdminKeys.iotReasons(),
    queryFn: () => companyAdminApi.listIOTReasons(),
  });
}

/** System controls for the current company */
export function useCompanyControls() {
  return useQuery({
    queryKey: companyAdminKeys.controls(),
    queryFn: () => companyAdminApi.getControls(),
  });
}

/** Company settings */
export function useCompanySettings() {
  return useQuery({
    queryKey: companyAdminKeys.settings(),
    queryFn: () => companyAdminApi.getSettings(),
  });
}

/** Paginated user list with optional search / role filter */
export function useCompanyUsers(params?: CompanyAdminListParams) {
  return useQuery({
    queryKey: companyAdminKeys.users(params),
    queryFn: () => companyAdminApi.listUsers(params),
  });
}

/** Single user by ID */
export function useCompanyUser(id: string) {
  return useQuery({
    queryKey: companyAdminKeys.user(id),
    queryFn: () => companyAdminApi.getUser(id),
    enabled: !!id,
  });
}

/** Tenant-scoped audit logs with optional filters */
export function useCompanyAuditLogs(params?: CompanyAdminListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: companyAdminKeys.auditLogs(params),
    queryFn: () => companyAdminApi.listAuditLogs(params),
    enabled: options?.enabled,
  });
}

/** Company-admin activity feed */
export function useCompanyActivity(limit?: number) {
  return useQuery({
    queryKey: companyAdminKeys.activity(limit),
    queryFn: () => companyAdminApi.getActivity(limit),
    refetchInterval: 30_000,
  });
}

// --- RBAC ---

/** All RBAC roles */
export function useRbacRoles() {
  return useQuery({
    queryKey: companyAdminKeys.rbacRoles(),
    queryFn: () => companyAdminApi.listRoles(),
  });
}

/** Reference / template roles */
export function useRbacReferenceRoles() {
  return useQuery({
    queryKey: companyAdminKeys.rbacReferenceRoles(),
    queryFn: () => companyAdminApi.listReferenceRoles(),
  });
}

/** Permission catalogue (modules + actions from backend) */
export function usePermissionCatalogue() {
  return useQuery({
    queryKey: companyAdminKeys.permissionCatalogue(),
    queryFn: () => companyAdminApi.getPermissionCatalogue(),
  });
}

// --- Feature Toggles ---

/** Feature toggle catalogue (all available features) */
export function useFeatureToggleCatalogue() {
  return useQuery({
    queryKey: companyAdminKeys.featureToggleCatalogue(),
    queryFn: () => companyAdminApi.getFeatureToggleCatalogue(),
  });
}

/** Feature toggles for a specific user or all */
export function useFeatureToggles(userId?: string) {
  return useQuery({
    queryKey: companyAdminKeys.featureToggles(userId),
    queryFn: () => companyAdminApi.getFeatureToggles(userId),
  });
}

// --- Module Catalogue ---

/** Available modules catalogue */
export function useModuleCatalogue() {
  return useQuery({
    queryKey: companyAdminKeys.moduleCatalogue(),
    queryFn: () => companyAdminApi.getModuleCatalogue(),
  });
}

// --- Billing ---

/** Company subscription details */
export function useMySubscription() {
  return useQuery({
    queryKey: companyAdminKeys.subscription(),
    queryFn: () => companyAdminApi.getMySubscription(),
  });
}

/** Company invoices with optional filters */
export function useMyInvoices(params?: CompanyAdminListParams) {
  return useQuery({
    queryKey: companyAdminKeys.invoices(params),
    queryFn: () => companyAdminApi.getMyInvoices(params),
  });
}

/** Single invoice detail */
export function useMyInvoiceDetail(id: string) {
  return useQuery({
    queryKey: companyAdminKeys.invoiceDetail(id),
    queryFn: () => companyAdminApi.getMyInvoiceDetail(id),
    enabled: !!id,
  });
}

/** Company payments with optional filters */
export function useMyPayments(params?: CompanyAdminListParams) {
  return useQuery({
    queryKey: companyAdminKeys.payments(params),
    queryFn: () => companyAdminApi.getMyPayments(params),
  });
}

/** Cost breakdown by module */
export function useMyCostBreakdown() {
  return useQuery({
    queryKey: companyAdminKeys.costBreakdown(),
    queryFn: () => companyAdminApi.getMyCostBreakdown(),
  });
}

// --- Support Tickets ---

/** Company support tickets with optional filters */
export function useSupportTickets(params?: { status?: string; category?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: companyAdminKeys.supportTickets(params),
    queryFn: () => companyAdminApi.listSupportTickets(params),
  });
}

/** Single support ticket by ID (auto-refreshes every 10s) */
export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: companyAdminKeys.supportTicket(id),
    queryFn: () => companyAdminApi.getSupportTicket(id),
    enabled: !!id,
    refetchInterval: 10000,
  });
}
