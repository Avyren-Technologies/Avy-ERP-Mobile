import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { hrApi } from '@/lib/api/hr';
import { hrKeys } from '@/features/company-admin/api/use-hr-queries';
import { essKeys } from '@/features/company-admin/api/use-ess-queries';

// ── Bulk Import ──────────────────────────────────────────────────────

/** Validate an uploaded XLSX file before importing employees */
export function useBulkValidateEmployees() {
  return useMutation({
    mutationFn: ({
      fileUri,
      fileName,
      defaultPassword,
    }: {
      fileUri: string;
      fileName: string;
      defaultPassword: string;
    }) => {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: fileName || 'employees.xlsx',
      } as unknown as Blob);
      formData.append('defaultPassword', defaultPassword);
      return hrApi.bulkValidate(formData);
    },
    onError: showError,
  });
}

/** Import validated employee rows in bulk */
export function useBulkImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      defaultPassword,
    }: {
      rows: Record<string, unknown>[];
      defaultPassword: string;
    }) => hrApi.bulkImport(rows, defaultPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    },
    onError: showError,
  });
}

// ── Departments ───────────────────────────────────────────────────────

/** Create a new department */
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      hrApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.departments() });
    },
    onError: showError,
  });
}

/** Update an existing department */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateDepartment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.departments() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.department(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a department */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.departments() });
    },
    onError: showError,
  });
}

// ── Designations ──────────────────────────────────────────────────────

/** Create a new designation */
export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      hrApi.createDesignation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.designations() });
    },
    onError: showError,
  });
}

/** Update an existing designation */
export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateDesignation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.designations() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.designation(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a designation */
export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteDesignation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.designations() });
    },
    onError: showError,
  });
}

// ── Grades ────────────────────────────────────────────────────────────

/** Create a new grade */
export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => hrApi.createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.grades() });
    },
    onError: showError,
  });
}

/** Update an existing grade */
export function useUpdateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateGrade(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.grades() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.grade(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a grade */
export function useDeleteGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.grades() });
    },
    onError: showError,
  });
}

// ── Employee Types ────────────────────────────────────────────────────

/** Create a new employee type */
export function useCreateEmployeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      hrApi.createEmployeeType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employeeTypes() });
    },
    onError: showError,
  });
}

/** Update an existing employee type */
export function useUpdateEmployeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateEmployeeType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employeeTypes() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.employeeType(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete an employee type */
export function useDeleteEmployeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployeeType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employeeTypes() });
    },
    onError: showError,
  });
}

// ── Cost Centres ──────────────────────────────────────────────────────

/** Create a new cost centre */
export function useCreateCostCentre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      hrApi.createCostCentre(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.costCentres() });
    },
    onError: showError,
  });
}

/** Update an existing cost centre */
export function useUpdateCostCentre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateCostCentre(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.costCentres() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.costCentre(variables.id),
      });
    },
    onError: showError,
  });
}

/** Delete a cost centre */
export function useDeleteCostCentre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteCostCentre(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.costCentres() });
    },
    onError: showError,
  });
}

// ── Employees ─────────────────────────────────────────────────────────

/** Create a new employee (6-tab form data) */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      hrApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    },
    onError: showError,
  });
}

/** Update an existing employee */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrKeys.employee(variables.id) });
      // Sync: if the admin updated their own employee record, refresh the ESS profile
      queryClient.invalidateQueries({ queryKey: essKeys.myProfile() });
    },
    onError: showError,
  });
}

/** Update employee status (active, inactive, etc.) */
export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.updateEmployeeStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({
        queryKey: hrKeys.employee(variables.id),
      });
    },
    onError: showError,
  });
}

/** Soft-delete an employee */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    },
    onError: showError,
  });
}

// ── Nominees ──────────────────────────────────────────────────────────

/** Add a nominee to an employee */
export function useCreateNominee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: Record<string, unknown>;
    }) => hrApi.createNominee(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.nominees(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Update a nominee */
export function useUpdateNominee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      nomineeId,
      data,
    }: {
      employeeId: string;
      nomineeId: string;
      data: Record<string, unknown>;
    }) => hrApi.updateNominee(employeeId, nomineeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.nominees(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Delete a nominee */
export function useDeleteNominee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      nomineeId,
    }: {
      employeeId: string;
      nomineeId: string;
    }) => hrApi.deleteNominee(employeeId, nomineeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.nominees(variables.employeeId),
      });
    },
    onError: showError,
  });
}

// ── Education ─────────────────────────────────────────────────────────

/** Add an education record to an employee */
export function useCreateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: Record<string, unknown>;
    }) => hrApi.createEducation(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.education(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Update an education record */
export function useUpdateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      educationId,
      data,
    }: {
      employeeId: string;
      educationId: string;
      data: Record<string, unknown>;
    }) => hrApi.updateEducation(employeeId, educationId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.education(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Delete an education record */
export function useDeleteEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      educationId,
    }: {
      employeeId: string;
      educationId: string;
    }) => hrApi.deleteEducation(employeeId, educationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.education(variables.employeeId),
      });
    },
    onError: showError,
  });
}

// ── Previous Employment ───────────────────────────────────────────────

/** Add a previous employment record */
export function useCreatePrevEmployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: Record<string, unknown>;
    }) => hrApi.createPrevEmployment(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.prevEmployment(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Update a previous employment record */
export function useUpdatePrevEmployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      prevEmploymentId,
      data,
    }: {
      employeeId: string;
      prevEmploymentId: string;
      data: Record<string, unknown>;
    }) => hrApi.updatePrevEmployment(employeeId, prevEmploymentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.prevEmployment(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Delete a previous employment record */
export function useDeletePrevEmployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      prevEmploymentId,
    }: {
      employeeId: string;
      prevEmploymentId: string;
    }) => hrApi.deletePrevEmployment(employeeId, prevEmploymentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.prevEmployment(variables.employeeId),
      });
    },
    onError: showError,
  });
}

// ── Documents ─────────────────────────────────────────────────────────

/** Create a document record for an employee (after R2 upload) */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: { documentType: string; fileUrl: string; fileName?: string; documentNumber?: string; expiryDate?: string };
    }) => hrApi.uploadDocument(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.documents(variables.employeeId),
      });
    },
    onError: showError,
  });
}

/** Delete a document */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      documentId,
    }: {
      employeeId: string;
      documentId: string;
    }) => hrApi.deleteDocument(employeeId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hrKeys.documents(variables.employeeId),
      });
    },
    onError: showError,
  });
}

// ── Probation ────────────────────────────────────────────────────────

/** Submit a probation review for an employee */
export function useSubmitProbationReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrApi.submitProbationReview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.probationDue() });
      queryClient.invalidateQueries({ queryKey: hrKeys.employee(variables.id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
    },
    onError: showError,
  });
}
