import { useQuery } from '@tanstack/react-query';

import {
  hrApi,
  type DepartmentListParams,
  type DesignationListParams,
  type EmployeeListParams,
  type HrListParams,
} from '@/lib/api/hr';

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
