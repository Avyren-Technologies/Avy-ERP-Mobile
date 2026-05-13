import { useQuery } from '@tanstack/react-query';

import { partApi, machineApi } from '@/lib/api/masters';

// --- Query keys ---

export const mastersKeys = {
  all: ['masters'] as const,
  // Parts
  parts: (params?: Record<string, unknown>) =>
    params ? ([...mastersKeys.all, 'parts', params] as const) : ([...mastersKeys.all, 'parts'] as const),
  part: (id: string) => [...mastersKeys.all, 'part', id] as const,
  partCategories: () => [...mastersKeys.all, 'part-categories'] as const,
  productModels: () => [...mastersKeys.all, 'product-models'] as const,
  uoms: () => [...mastersKeys.all, 'uoms'] as const,
  // Machines
  machines: (params?: Record<string, unknown>) =>
    params ? ([...mastersKeys.all, 'machines', params] as const) : ([...mastersKeys.all, 'machines'] as const),
  machine: (id: string) => [...mastersKeys.all, 'machine', id] as const,
  machineCategories: () => [...mastersKeys.all, 'machine-categories'] as const,
  machineTypes: () => [...mastersKeys.all, 'machine-types'] as const,
  machineZones: (params?: Record<string, unknown>) =>
    params ? ([...mastersKeys.all, 'machine-zones', params] as const) : ([...mastersKeys.all, 'machine-zones'] as const),
};

// --- Part hooks ---

export function useParts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: mastersKeys.parts(params),
    queryFn: () => partApi.list(params),
  });
}

export function usePart(id: string) {
  return useQuery({
    queryKey: mastersKeys.part(id),
    queryFn: () => partApi.get(id),
    enabled: !!id,
  });
}

export function usePartCategories() {
  return useQuery({
    queryKey: mastersKeys.partCategories(),
    queryFn: () => partApi.listCategories(),
  });
}

export function useProductModels() {
  return useQuery({
    queryKey: mastersKeys.productModels(),
    queryFn: () => partApi.listProductModels(),
  });
}

export function useUoms() {
  return useQuery({
    queryKey: mastersKeys.uoms(),
    queryFn: () => partApi.listUoms(),
  });
}

// --- Machine hooks ---

export function useMachines(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: mastersKeys.machines(params),
    queryFn: () => machineApi.list(params),
  });
}

export function useMachine(id: string) {
  return useQuery({
    queryKey: mastersKeys.machine(id),
    queryFn: () => machineApi.get(id),
    enabled: !!id,
  });
}

export function useMachineCategories() {
  return useQuery({
    queryKey: mastersKeys.machineCategories(),
    queryFn: () => machineApi.listCategories(),
  });
}

export function useMachineTypes() {
  return useQuery({
    queryKey: mastersKeys.machineTypes(),
    queryFn: () => machineApi.listTypes(),
  });
}

export function useMachineZones(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: mastersKeys.machineZones(params),
    queryFn: () => machineApi.listZones(params),
  });
}
