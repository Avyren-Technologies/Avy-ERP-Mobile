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
