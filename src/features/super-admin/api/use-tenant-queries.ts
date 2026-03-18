import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { tenantApi } from '@/lib/api/tenant';

// --- Query keys ---

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (params: any) => [...tenantKeys.lists(), params] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

// --- Queries ---

/** Paginated company list with optional search / status filter */
export function useTenantList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: () => tenantApi.listCompanies(params),
  });
}

/** Full company detail by ID */
export function useTenantDetail(companyId: string) {
  return useQuery({
    queryKey: tenantKeys.detail(companyId),
    queryFn: () => tenantApi.getCompanyDetail(companyId),
    enabled: !!companyId,
  });
}

// --- Mutations ---

/** Onboard a new tenant (wizard submit) */
export function useOnboardTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => tenantApi.onboard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

/** Update a single section of a company */
export function useUpdateCompanySection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      sectionKey,
      data,
    }: {
      companyId: string;
      sectionKey: string;
      data: any;
    }) => tenantApi.updateSection(companyId, sectionKey, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(variables.companyId) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

/** Change company status (Draft, Pilot, Active, Inactive) */
export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, status }: { companyId: string; status: string }) =>
      tenantApi.updateStatus(companyId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(variables.companyId) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

/** Delete a company */
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => tenantApi.deleteCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}
