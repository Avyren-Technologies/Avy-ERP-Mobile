import { useQuery } from '@tanstack/react-query';

import {
  performanceApi,
  type AppraisalCycleListParams,
  type GoalListParams,
  type AppraisalEntryListParams,
  type Feedback360ListParams,
  type SkillListParams,
  type SkillMappingListParams,
  type SuccessionPlanListParams,
} from '@/lib/api/performance';

// --- Query keys ---

export const performanceKeys = {
  all: ['performance'] as const,

  // Appraisal Cycles
  cycles: (params?: AppraisalCycleListParams) =>
    [...performanceKeys.all, 'cycles', params] as const,
  cycle: (id: string) =>
    [...performanceKeys.all, 'cycle', id] as const,

  // Goals
  goals: (params?: GoalListParams) =>
    [...performanceKeys.all, 'goals', params] as const,
  goal: (id: string) =>
    [...performanceKeys.all, 'goal', id] as const,
  departmentGoals: (departmentId: string) =>
    [...performanceKeys.all, 'department-goals', departmentId] as const,

  // Appraisal Entries
  entries: (params?: AppraisalEntryListParams) =>
    [...performanceKeys.all, 'entries', params] as const,
  entry: (id: string) =>
    [...performanceKeys.all, 'entry', id] as const,
  calibration: (cycleId: string) =>
    [...performanceKeys.all, 'calibration', cycleId] as const,

  // 360 Feedback
  feedback360List: (params?: Feedback360ListParams) =>
    [...performanceKeys.all, 'feedback-360', params] as const,
  feedback360: (id: string) =>
    [...performanceKeys.all, 'feedback-360-detail', id] as const,
  feedback360Report: (employeeId: string, cycleId: string) =>
    [...performanceKeys.all, 'feedback-360-report', employeeId, cycleId] as const,

  // Skills
  skills: (params?: SkillListParams) =>
    [...performanceKeys.all, 'skills', params] as const,
  skill: (id: string) =>
    [...performanceKeys.all, 'skill', id] as const,

  // Skill Mappings
  skillMappings: (params?: SkillMappingListParams) =>
    [...performanceKeys.all, 'skill-mappings', params] as const,
  skillGapAnalysis: (employeeId: string) =>
    [...performanceKeys.all, 'skill-gap-analysis', employeeId] as const,

  // Succession
  successionPlans: (params?: SuccessionPlanListParams) =>
    [...performanceKeys.all, 'succession-plans', params] as const,
  successionPlan: (id: string) =>
    [...performanceKeys.all, 'succession-plan', id] as const,
  nineBox: () =>
    [...performanceKeys.all, 'nine-box'] as const,
  benchStrength: () =>
    [...performanceKeys.all, 'bench-strength'] as const,

  // Dashboard
  dashboard: () =>
    [...performanceKeys.all, 'dashboard'] as const,
};

// --- Appraisal Cycle Queries ---

/** List appraisal cycles */
export function useAppraisalCycles(params?: AppraisalCycleListParams) {
  return useQuery({
    queryKey: performanceKeys.cycles(params),
    queryFn: () => performanceApi.listAppraisalCycles(params),
  });
}

/** Single appraisal cycle by ID */
export function useAppraisalCycle(id: string) {
  return useQuery({
    queryKey: performanceKeys.cycle(id),
    queryFn: () => performanceApi.getAppraisalCycle(id),
    enabled: !!id,
  });
}

// --- Goal Queries ---

/** List goals (KRA/OKR) */
export function useGoals(params?: GoalListParams) {
  return useQuery({
    queryKey: performanceKeys.goals(params),
    queryFn: () => performanceApi.listGoals(params),
  });
}

/** Single goal by ID */
export function useGoal(id: string) {
  return useQuery({
    queryKey: performanceKeys.goal(id),
    queryFn: () => performanceApi.getGoal(id),
    enabled: !!id,
  });
}

/** Department cascade goals */
export function useDepartmentGoals(departmentId: string) {
  return useQuery({
    queryKey: performanceKeys.departmentGoals(departmentId),
    queryFn: () => performanceApi.getDepartmentGoals(departmentId),
    enabled: !!departmentId,
  });
}

// --- Appraisal Entry Queries ---

/** List appraisal entries with optional filters */
export function useAppraisalEntries(params?: AppraisalEntryListParams) {
  return useQuery({
    queryKey: performanceKeys.entries(params),
    queryFn: () => performanceApi.listAppraisalEntries(params),
  });
}

/** Single appraisal entry by ID */
export function useAppraisalEntry(id: string) {
  return useQuery({
    queryKey: performanceKeys.entry(id),
    queryFn: () => performanceApi.getAppraisalEntry(id),
    enabled: !!id,
  });
}

/** Calibration / bell curve data for a cycle */
export function useCalibrationData(cycleId: string) {
  return useQuery({
    queryKey: performanceKeys.calibration(cycleId),
    queryFn: () => performanceApi.getCalibrationData(cycleId),
    enabled: !!cycleId,
  });
}

// --- 360 Feedback Queries ---

/** List 360 feedback entries */
export function useFeedback360List(params?: Feedback360ListParams) {
  return useQuery({
    queryKey: performanceKeys.feedback360List(params),
    queryFn: () => performanceApi.listFeedback360(params),
  });
}

/** Single 360 feedback by ID */
export function useFeedback360(id: string) {
  return useQuery({
    queryKey: performanceKeys.feedback360(id),
    queryFn: () => performanceApi.getFeedback360(id),
    enabled: !!id,
  });
}

/** Aggregated 360 feedback report */
export function useFeedback360Report(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: performanceKeys.feedback360Report(employeeId, cycleId),
    queryFn: () => performanceApi.getFeedback360Report(employeeId, cycleId),
    enabled: !!employeeId && !!cycleId,
  });
}

// --- Skill Queries ---

/** List skills */
export function useSkills(params?: SkillListParams) {
  return useQuery({
    queryKey: performanceKeys.skills(params),
    queryFn: () => performanceApi.listSkills(params),
  });
}

/** Single skill by ID */
export function useSkill(id: string) {
  return useQuery({
    queryKey: performanceKeys.skill(id),
    queryFn: () => performanceApi.getSkill(id),
    enabled: !!id,
  });
}

/** List skill mappings */
export function useSkillMappings(params?: SkillMappingListParams) {
  return useQuery({
    queryKey: performanceKeys.skillMappings(params),
    queryFn: () => performanceApi.listSkillMappings(params),
  });
}

/** Skill gap analysis for an employee */
export function useSkillGapAnalysis(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.skillGapAnalysis(employeeId),
    queryFn: () => performanceApi.getSkillGapAnalysis(employeeId),
    enabled: !!employeeId,
  });
}

// --- Succession Queries ---

/** List succession plans */
export function useSuccessionPlans(params?: SuccessionPlanListParams) {
  return useQuery({
    queryKey: performanceKeys.successionPlans(params),
    queryFn: () => performanceApi.listSuccessionPlans(params),
  });
}

/** Single succession plan by ID */
export function useSuccessionPlan(id: string) {
  return useQuery({
    queryKey: performanceKeys.successionPlan(id),
    queryFn: () => performanceApi.getSuccessionPlan(id),
    enabled: !!id,
  });
}

/** 9-box grid data */
export function useNineBoxData() {
  return useQuery({
    queryKey: performanceKeys.nineBox(),
    queryFn: () => performanceApi.getNineBoxData(),
  });
}

/** Bench strength / coverage stats */
export function useBenchStrength() {
  return useQuery({
    queryKey: performanceKeys.benchStrength(),
    queryFn: () => performanceApi.getBenchStrength(),
  });
}

// --- Performance Dashboard ---

/** Performance dashboard summary */
export function usePerformanceDashboard() {
  return useQuery({
    queryKey: performanceKeys.dashboard(),
    queryFn: () => performanceApi.getPerformanceDashboard(),
  });
}
