/* eslint-disable unicorn/prefer-node-protocol */
import { Buffer } from 'buffer';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

/** Page size for employee pickers (assign modals, async lists). */
export const EMPLOYEE_PICKER_PAGE_SIZE = 25;

import {
  hrApi,
  type DepartmentListParams,
  type DesignationListParams,
  type EmployeeDropdownListParams,
  type EmployeeListParams,
  type HrListParams,
} from '@/lib/api/hr';

/** Page size for the standardised paginated employee dropdown picker. */
export const EMPLOYEE_DROPDOWN_PAGE_SIZE = 50;

type EmployeeDropdownQueryParams = Omit<EmployeeDropdownListParams, 'page' | 'limit'>;

// --- Query keys ---

export const hrKeys = {
  all: ['hr'] as const,

  // Departments
  departments: (params?: DepartmentListParams) =>
    [...hrKeys.all, 'departments', params] as const,
  department: (id: string) => [...hrKeys.all, 'department', id] as const,

  // Designations
  designations: (params?: DesignationListParams) =>
    [...hrKeys.all, 'designations', params] as const,
  designation: (id: string) => [...hrKeys.all, 'designation', id] as const,

  // Grades
  grades: (params?: HrListParams) =>
    [...hrKeys.all, 'grades', params] as const,
  grade: (id: string) => [...hrKeys.all, 'grade', id] as const,

  // Employee Types
  employeeTypes: (params?: HrListParams) =>
    [...hrKeys.all, 'employee-types', params] as const,
  employeeType: (id: string) =>
    [...hrKeys.all, 'employee-type', id] as const,

  // Cost Centres
  costCentres: (params?: HrListParams) =>
    [...hrKeys.all, 'cost-centres', params] as const,
  costCentre: (id: string) => [...hrKeys.all, 'cost-centre', id] as const,

  // Employees
  employees: (params?: EmployeeListParams) =>
    [...hrKeys.all, 'employees', params] as const,
  employee: (id: string) => [...hrKeys.all, 'employee', id] as const,

  /**
   * Paginated employee dropdown picker key.
   * Returns prefix-only when no params are provided to avoid trailing
   * `undefined` (which breaks `queryClient.invalidateQueries` matching).
   */
  employeesDropdown: (params?: EmployeeDropdownQueryParams) => {
    const hasParams =
      !!params &&
      (params.search !== undefined ||
        params.status !== undefined ||
        params.departmentId !== undefined ||
        params.locationId !== undefined);
    return hasParams
      ? ([...hrKeys.all, 'employees-dropdown', params] as const)
      : ([...hrKeys.all, 'employees-dropdown'] as const);
  },

  // Employee Sub-resources
  nominees: (employeeId: string) =>
    [...hrKeys.all, 'employee', employeeId, 'nominees'] as const,
  education: (employeeId: string) =>
    [...hrKeys.all, 'employee', employeeId, 'education'] as const,
  prevEmployment: (employeeId: string) =>
    [...hrKeys.all, 'employee', employeeId, 'previous-employment'] as const,
  documents: (employeeId: string) =>
    [...hrKeys.all, 'employee', employeeId, 'documents'] as const,
  timeline: (employeeId: string) =>
    [...hrKeys.all, 'employee', employeeId, 'timeline'] as const,

  // Probation
  probationDue: () => [...hrKeys.all, 'probation-due'] as const,

  // Org Chart
  orgChart: () => [...hrKeys.all, 'org-chart'] as const,
};

// --- Department Queries ---

/** List departments with optional search / status filter */
export function useDepartments(params?: DepartmentListParams) {
  return useQuery({
    queryKey: hrKeys.departments(params),
    queryFn: () => hrApi.listDepartments(params),
  });
}

/** Single department by ID */
export function useDepartment(id: string) {
  return useQuery({
    queryKey: hrKeys.department(id),
    queryFn: () => hrApi.getDepartment(id),
    enabled: !!id,
  });
}

// --- Designation Queries ---

/** List designations with optional search / status / departmentId filter */
export function useDesignations(params?: DesignationListParams) {
  return useQuery({
    queryKey: hrKeys.designations(params),
    queryFn: () => hrApi.listDesignations(params),
  });
}

/** Single designation by ID */
export function useDesignation(id: string) {
  return useQuery({
    queryKey: hrKeys.designation(id),
    queryFn: () => hrApi.getDesignation(id),
    enabled: !!id,
  });
}

// --- Grade Queries ---

/** List grades */
export function useGrades(params?: HrListParams) {
  return useQuery({
    queryKey: hrKeys.grades(params),
    queryFn: () => hrApi.listGrades(params),
  });
}

/** Single grade by ID */
export function useGrade(id: string) {
  return useQuery({
    queryKey: hrKeys.grade(id),
    queryFn: () => hrApi.getGrade(id),
    enabled: !!id,
  });
}

// --- Employee Type Queries ---

/** List employee types */
export function useEmployeeTypes(params?: HrListParams) {
  return useQuery({
    queryKey: hrKeys.employeeTypes(params),
    queryFn: () => hrApi.listEmployeeTypes(params),
  });
}

/** Single employee type by ID */
export function useEmployeeType(id: string) {
  return useQuery({
    queryKey: hrKeys.employeeType(id),
    queryFn: () => hrApi.getEmployeeType(id),
    enabled: !!id,
  });
}

// --- Cost Centre Queries ---

/** List cost centres */
export function useCostCentres(params?: HrListParams) {
  return useQuery({
    queryKey: hrKeys.costCentres(params),
    queryFn: () => hrApi.listCostCentres(params),
  });
}

/** Single cost centre by ID */
export function useCostCentre(id: string) {
  return useQuery({
    queryKey: hrKeys.costCentre(id),
    queryFn: () => hrApi.getCostCentre(id),
    enabled: !!id,
  });
}

// --- Employee Queries ---

/** List employees with optional filters (search, department, location, status, type, pagination) */
export function useEmployees(params?: EmployeeListParams) {
  return useQuery({
    queryKey: hrKeys.employees(params),
    queryFn: () => hrApi.listEmployees(params),
  });
}

/** Infinite employee list for pickers — scroll/search loads additional pages. */
export function useEmployeesInfinite(search: string, enabled = true) {
  const trimmed = search.trim();
  return useInfiniteQuery({
    queryKey: [...hrKeys.all, 'employees-infinite', trimmed] as const,
    queryFn: ({ pageParam }) =>
      hrApi.listEmployees({
        page: pageParam,
        limit: EMPLOYEE_PICKER_PAGE_SIZE,
        search: trimmed || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = (lastPage as { meta?: { page: number; totalPages: number } })?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
    enabled,
  });
}

/**
 * Standardised paginated employee picker source.
 *
 * Backed by `GET /hr/employees/dropdown` with `limit=50`. Supports search,
 * status (`ACTIVE` | `ALL`), department, and location filtering. The
 * underlying `useInfiniteQuery` exposes `fetchNextPage` / `hasNextPage`
 * so consumers can drive `FlatList.onEndReached` for lazy pagination.
 */
export function useEmployeesDropdown(
  params: {
    search?: string;
    status?: 'ACTIVE' | 'ALL';
    departmentId?: string;
    locationId?: string;
  } = {},
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: hrKeys.employeesDropdown(params),
    queryFn: ({ pageParam = 1 }) =>
      hrApi.listEmployeesDropdown({
        ...params,
        page: pageParam,
        limit: EMPLOYEE_DROPDOWN_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    staleTime: 60 * 1000,
    enabled,
  });
}

/** Single employee full profile by ID */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () => hrApi.getEmployee(id),
    enabled: !!id,
  });
}

// --- Employee Sub-resource Queries ---

/** List nominees for an employee */
export function useEmployeeNominees(employeeId: string) {
  return useQuery({
    queryKey: hrKeys.nominees(employeeId),
    queryFn: () => hrApi.listNominees(employeeId),
    enabled: !!employeeId,
  });
}

/** List education records for an employee */
export function useEmployeeEducation(employeeId: string) {
  return useQuery({
    queryKey: hrKeys.education(employeeId),
    queryFn: () => hrApi.listEducation(employeeId),
    enabled: !!employeeId,
  });
}

/** List previous employment records for an employee */
export function useEmployeePrevEmployment(employeeId: string) {
  return useQuery({
    queryKey: hrKeys.prevEmployment(employeeId),
    queryFn: () => hrApi.listPrevEmployment(employeeId),
    enabled: !!employeeId,
  });
}

/** List documents for an employee */
export function useEmployeeDocuments(employeeId: string) {
  return useQuery({
    queryKey: hrKeys.documents(employeeId),
    queryFn: () => hrApi.listDocuments(employeeId),
    enabled: !!employeeId,
  });
}

/** Get timeline events for an employee */
export function useEmployeeTimeline(employeeId: string) {
  return useQuery({
    queryKey: hrKeys.timeline(employeeId),
    queryFn: () => hrApi.getTimeline(employeeId),
    enabled: !!employeeId,
  });
}

// --- Probation Queries ---

/** List employees with probation reviews due */
export function useProbationDue() {
  return useQuery({
    queryKey: hrKeys.probationDue(),
    queryFn: () => hrApi.listProbationDue(),
  });
}

// --- Org Chart Queries ---

/** Get the organisation chart */
export function useOrgChart() {
  return useQuery({
    queryKey: hrKeys.orgChart(),
    queryFn: () => hrApi.getOrgChart(),
  });
}

// --- Bulk Import Helpers ---

/** Download the bulk employee import XLSX template and share it via the OS share sheet */
export async function downloadBulkEmployeeTemplate() {
  const data = await hrApi.bulkDownloadTemplate();
  const base64 = Buffer.from(data as unknown as ArrayBuffer).toString('base64');
  const file = new File(Paths.document, 'Employee_Import_Template.xlsx');
  file.create();
  file.write(base64, { encoding: 'base64' });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Save Employee Import Template',
  });
}
