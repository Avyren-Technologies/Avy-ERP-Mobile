import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { platformUsersApi } from '@/lib/api/platform-users';
import type {
  PlatformUserListParams,
  CreatePlatformUserPayload,
  UpdatePlatformUserPayload,
} from '@/lib/api/platform-users';

// --- Query keys ---

export const platformUserKeys = {
  all: ['platform-users'] as const,
  lists: () => [...platformUserKeys.all, 'list'] as const,
  list: (params: PlatformUserListParams) => [...platformUserKeys.lists(), params] as const,
  details: () => [...platformUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...platformUserKeys.details(), id] as const,
  stats: () => [...platformUserKeys.all, 'stats'] as const,
  companies: () => [...platformUserKeys.all, 'companies'] as const,
};

// --- Queries ---

export function usePlatformUsers(params: PlatformUserListParams = {}) {
  return useQuery({
    queryKey: platformUserKeys.list(params),
    queryFn: () => platformUsersApi.listUsers(params),
  });
}

export function usePlatformUser(id: string) {
  return useQuery({
    queryKey: platformUserKeys.detail(id),
    queryFn: () => platformUsersApi.getUserById(id),
    enabled: !!id,
  });
}

export function usePlatformUserStats() {
  return useQuery({
    queryKey: platformUserKeys.stats(),
    queryFn: () => platformUsersApi.getStats(),
    staleTime: 30_000,
  });
}

export function usePlatformCompanies() {
  return useQuery({
    queryKey: platformUserKeys.companies(),
    queryFn: () => platformUsersApi.listCompanies(),
    staleTime: 5 * 60_000,
  });
}

// --- Mutations ---

export function useCreatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlatformUserPayload) => platformUsersApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      qc.invalidateQueries({ queryKey: platformUserKeys.stats() });
    },
  });
}

export function useUpdatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlatformUserPayload }) =>
      platformUsersApi.updateUser(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: platformUserKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
    },
  });
}

export function useResetPlatformUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      platformUsersApi.resetPassword(id, password),
  });
}

export function useUpdatePlatformUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      platformUsersApi.updateStatus(id, isActive),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: platformUserKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      qc.invalidateQueries({ queryKey: platformUserKeys.stats() });
    },
  });
}

export function useDeletePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformUsersApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      qc.invalidateQueries({ queryKey: platformUserKeys.stats() });
    },
  });
}
