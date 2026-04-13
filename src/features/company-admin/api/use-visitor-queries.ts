import { useQuery } from '@tanstack/react-query';

import { visitorsApi } from '@/lib/api/visitors';

// --- Query keys ---

export const visitorKeys = {
  all: ['visitors'] as const,

  // Visits
  visits: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'visits', params] as const,
  visit: (id: string) => [...visitorKeys.all, 'visit', id] as const,

  // Visitor Types
  types: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'types', params] as const,

  // Gates
  gates: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'gates', params] as const,

  // Dashboard
  dashboardToday: () => [...visitorKeys.all, 'dashboard-today'] as const,
  onSite: () => [...visitorKeys.all, 'on-site'] as const,
  stats: () => [...visitorKeys.all, 'stats'] as const,

  // Config
  config: () => [...visitorKeys.all, 'config'] as const,

  // Watchlist
  watchlist: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'watchlist', params] as const,

  // Recurring Passes
  recurringPasses: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'recurring-passes', params] as const,

  // Emergency
  musterList: () => [...visitorKeys.all, 'muster-list'] as const,

  // Group Visits
  groupVisits: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'group-visits', params] as const,

  // Vehicle & Material Passes
  vehiclePasses: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'vehicle-passes', params] as const,
  materialPasses: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'material-passes', params] as const,

  // Denied Entries
  deniedEntries: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'denied-entries', params] as const,

  // Reports
  dailyLog: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'daily-log', params] as const,
  reportSummary: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'report-summary', params] as const,
  overstayReport: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'overstay-report', params] as const,
  visitorAnalytics: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'visitor-analytics', params] as const,

  // Visit History
  visitHistory: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'visit-history', params] as const,

  // Safety Inductions
  safetyInductions: (params?: Record<string, unknown>) =>
    [...visitorKeys.all, 'safety-inductions', params] as const,
};

// --- Visit Queries ---

/** List visits with optional search / status / date filters */
export function useVisits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.visits(params),
    queryFn: () => visitorsApi.listVisits(params),
  });
}

/** Single visit by ID */
export function useVisit(id: string) {
  return useQuery({
    queryKey: visitorKeys.visit(id),
    queryFn: () => visitorsApi.getVisit(id),
    enabled: !!id,
  });
}

// --- Visitor Type Queries ---

/** List visitor types */
export function useVisitorTypes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.types(params),
    queryFn: () => visitorsApi.listVisitorTypes(params),
  });
}

// --- Gate Queries ---

/** List gates */
export function useGates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.gates(params),
    queryFn: () => visitorsApi.listGates(params),
  });
}

// --- Dashboard Queries ---

/** Today's dashboard data (visits, counts, stats) */
export function useDashboardToday(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.dashboardToday(),
    queryFn: () => visitorsApi.getDashboardToday(params),
  });
}

/** Currently on-site visitors */
export function useOnSiteVisitors() {
  return useQuery({
    queryKey: visitorKeys.onSite(),
    queryFn: () => visitorsApi.getOnSiteVisitors(),
  });
}

/** Dashboard aggregate stats */
export function useDashboardStats() {
  return useQuery({
    queryKey: visitorKeys.stats(),
    queryFn: () => visitorsApi.getDashboardStats(),
  });
}

// --- Watchlist Queries ---

/** List watchlist / blocklist entries */
export function useWatchlist(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.watchlist(params),
    queryFn: () => visitorsApi.listWatchlist(params),
  });
}

// --- Recurring Pass Queries ---

/** List recurring passes */
export function useRecurringPasses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.recurringPasses(params),
    queryFn: () => visitorsApi.listRecurringPasses(params),
  });
}

// --- Emergency Queries ---

/** Get emergency muster list */
export function useMusterList() {
  return useQuery({
    queryKey: visitorKeys.musterList(),
    queryFn: () => visitorsApi.getMusterList(),
  });
}

// --- Group Visit Queries ---

/** List group visits */
export function useGroupVisits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.groupVisits(params),
    queryFn: () => visitorsApi.listGroupVisits(params),
  });
}

// --- Vehicle & Material Pass Queries ---

/** List vehicle passes */
export function useVehiclePasses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.vehiclePasses(params),
    queryFn: () => visitorsApi.listVehiclePasses(params),
  });
}

/** List material passes */
export function useMaterialPasses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.materialPasses(params),
    queryFn: () => visitorsApi.listMaterialPasses(params),
  });
}

// --- Denied Entry Queries ---

/** List denied entries (read-only) */
export function useDeniedEntries(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.deniedEntries(params),
    queryFn: () => visitorsApi.listDeniedEntries(params),
  });
}

// --- Report Queries ---

/** Daily visitor log */
export function useDailyLog(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.dailyLog(params),
    queryFn: () => visitorsApi.getDailyLog(params),
  });
}

/** Report summary */
export function useReportSummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.reportSummary(params),
    queryFn: () => visitorsApi.getReportSummary(params),
  });
}

/** Overstay report */
export function useOverstayReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.overstayReport(params),
    queryFn: () => visitorsApi.getOverstayReport(params),
  });
}

/** Visitor analytics */
export function useVisitorAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.visitorAnalytics(params),
    queryFn: () => visitorsApi.getVisitorAnalytics(params),
  });
}

// --- Visit History Queries ---

/** List historical visits */
export function useVisitHistory(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.visitHistory(params),
    queryFn: () => visitorsApi.listVisitHistory(params),
  });
}

// --- Safety Induction Queries ---

/** List safety inductions */
export function useSafetyInductions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: visitorKeys.safetyInductions(params),
    queryFn: () => visitorsApi.listSafetyInductions(params),
  });
}

// --- Config Queries ---

/** Get VMS configuration */
export function useVMSConfig() {
  return useQuery({
    queryKey: visitorKeys.config(),
    queryFn: () => visitorsApi.getVMSConfig(),
  });
}
