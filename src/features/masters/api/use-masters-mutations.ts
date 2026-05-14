import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError, showSuccess } from '@/components/ui/utils';
import { partApi, machineApi } from '@/lib/api/masters';
import { mastersKeys } from '@/features/masters/api/use-masters-queries';

// ── Part CRUD ──────────────────────────────────────────────────────────

export function useCreatePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => partApi.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      const created = res?.data ?? res;
      const pn = created?.partNumber;
      showSuccess('Part Created', pn ? `Part ${pn} created successfully` : 'New part has been added successfully');
    },
    onError: showError,
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      partApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.part(variables.id) });
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Part updated', 'Changes have been saved successfully');
    },
    onError: showError,
  });
}

export function useDeletePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Part deleted');
    },
    onError: showError,
  });
}

// ── Part Category ──────────────────────────────────────────────────────

export function useCreatePartCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => partApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.partCategories() });
      showSuccess('Category created');
    },
    onError: showError,
  });
}

export function useUpdatePartCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      partApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.partCategories() });
      showSuccess('Category updated');
    },
    onError: showError,
  });
}

export function useDeletePartCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.partCategories() });
      showSuccess('Category deleted');
    },
    onError: showError,
  });
}

// ── Product Model ──────────────────────────────────────────────────────

export function useCreateProductModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => partApi.createProductModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.productModels() });
      showSuccess('Product model created');
    },
    onError: showError,
  });
}

export function useUpdateProductModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      partApi.updateProductModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.productModels() });
      showSuccess('Product model updated');
    },
    onError: showError,
  });
}

export function useDeleteProductModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partApi.deleteProductModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.productModels() });
      showSuccess('Product model deleted');
    },
    onError: showError,
  });
}

// ── Unit of Measure ────────────────────────────────────────────────────

export function useCreateUom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => partApi.createUom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.uoms() });
      showSuccess('Unit of measure created');
    },
    onError: showError,
  });
}

export function useUpdateUom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      partApi.updateUom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.uoms() });
      showSuccess('Unit of measure updated');
    },
    onError: showError,
  });
}

export function useDeleteUom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partApi.deleteUom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.uoms() });
      showSuccess('Unit of measure deleted');
    },
    onError: showError,
  });
}

// ── Machine CRUD ───────────────────────────────────────────────────────

export function useCreateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => machineApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine created', 'New machine has been added successfully');
    },
    onError: showError,
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      machineApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machine(variables.id) });
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine updated', 'Changes have been saved successfully');
    },
    onError: showError,
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine deleted');
    },
    onError: showError,
  });
}

// ── Machine Category ───────────────────────────────────────────────────

export function useCreateMachineCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => machineApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineCategories() });
      showSuccess('Machine category created');
    },
    onError: showError,
  });
}

export function useUpdateMachineCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      machineApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineCategories() });
      showSuccess('Machine category updated');
    },
    onError: showError,
  });
}

export function useDeleteMachineCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineCategories() });
      showSuccess('Machine category deleted');
    },
    onError: showError,
  });
}

// ── Machine Type ───────────────────────────────────────────────────────

export function useCreateMachineType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => machineApi.createType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineTypes() });
      showSuccess('Machine type created');
    },
    onError: showError,
  });
}

export function useUpdateMachineType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      machineApi.updateType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineTypes() });
      showSuccess('Machine type updated');
    },
    onError: showError,
  });
}

export function useDeleteMachineType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineApi.deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.machineTypes() });
      showSuccess('Machine type deleted');
    },
    onError: showError,
  });
}

// ── Machine Zone ───────────────────────────────────────────────────────

export function useCreateMachineZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => machineApi.createZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine zone created');
    },
    onError: showError,
  });
}

export function useUpdateMachineZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      machineApi.updateZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine zone updated');
    },
    onError: showError,
  });
}

export function useDeleteMachineZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machineApi.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mastersKeys.all });
      showSuccess('Machine zone deleted');
    },
    onError: showError,
  });
}
