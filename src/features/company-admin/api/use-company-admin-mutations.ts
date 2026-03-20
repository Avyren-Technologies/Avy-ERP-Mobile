import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { companyAdminApi } from '@/lib/api/company-admin';
import { companyAdminKeys } from '@/features/company-admin/api/use-company-admin-queries';

// ── Profile ────────────────────────────────────────────────────────────

/** Update a single section of the company profile */
export function useUpdateProfileSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionKey,
      data,
    }: {
      sectionKey: string;
      data: Record<string, unknown>;
    }) => companyAdminApi.updateProfileSection(sectionKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.profile() });
    },
    onError: showError,
  });
}

// ── Locations (NO create) ──────────────────────────────────────────────

/** Update an existing location */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateLocation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.locations() });
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.location(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a location */
export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.locations() });
    },
    onError: showError,
  });
}

// ── Shifts ─────────────────────────────────────────────────────────────

/** Create a new shift */
export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.shifts() });
    },
    onError: showError,
  });
}

/** Update an existing shift */
export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.shifts() });
    },
    onError: showError,
  });
}

/** Delete a shift */
export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.shifts() });
    },
    onError: showError,
  });
}

// ── Contacts ───────────────────────────────────────────────────────────

/** Create a new contact */
export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.contacts() });
    },
    onError: showError,
  });
}

/** Update an existing contact */
export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.contacts() });
    },
    onError: showError,
  });
}

/** Delete a contact */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.contacts() });
    },
    onError: showError,
  });
}

// ── No Series ──────────────────────────────────────────────────────────

/** Create a new number series */
export function useCreateNoSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createNoSeries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.noSeries() });
    },
    onError: showError,
  });
}

/** Update an existing number series */
export function useUpdateNoSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateNoSeries(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.noSeries() });
    },
    onError: showError,
  });
}

/** Delete a number series */
export function useDeleteNoSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteNoSeries(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.noSeries() });
    },
    onError: showError,
  });
}

// ── IOT Reasons ────────────────────────────────────────────────────────

/** Create a new IOT reason */
export function useCreateIOTReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createIOTReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.iotReasons(),
      });
    },
    onError: showError,
  });
}

/** Update an existing IOT reason */
export function useUpdateIOTReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateIOTReason(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.iotReasons(),
      });
    },
    onError: showError,
  });
}

/** Delete an IOT reason */
export function useDeleteIOTReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteIOTReason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.iotReasons(),
      });
    },
    onError: showError,
  });
}

// ── Controls ───────────────────────────────────────────────────────────

/** Update system controls */
export function useUpdateControls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.updateControls(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.controls(),
      });
    },
    onError: showError,
  });
}

// ── Settings ───────────────────────────────────────────────────────────

/** Update company settings */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.settings(),
      });
    },
    onError: showError,
  });
}

// ── Users ──────────────────────────────────────────────────────────────

/** Create a new user */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.users() });
    },
    onError: showError,
  });
}

/** Update an existing user */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.users() });
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.user(variables.id),
      });
    },
    onError: showError,
  });
}

/** Toggle user active / inactive status */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isActive: boolean } }) =>
      companyAdminApi.updateUserStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.users() });
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.user(variables.id),
      });
    },
    onError: showError,
  });
}

// ── RBAC (roles) ────────────────────────────────────────────────────

/** Create a new RBAC role */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyAdminApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.rbacRoles() });
    },
    onError: showError,
  });
}

/** Update an existing RBAC role */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companyAdminApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.rbacRoles() });
    },
    onError: showError,
  });
}

/** Delete an RBAC role */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyAdminApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyAdminKeys.rbacRoles() });
    },
    onError: showError,
  });
}
