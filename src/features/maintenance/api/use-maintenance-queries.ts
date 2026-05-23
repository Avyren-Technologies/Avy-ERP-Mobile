import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';

export const maintenanceKeys = {
    all: ['maintenance'] as const,

    // Config
    config: () => [...maintenanceKeys.all, 'config'] as const,

    // Failure codes
    failureCodeSets: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'failure-code-sets', params] as const
        : [...maintenanceKeys.all, 'failure-code-sets'] as const,
    failureCodeSet: (id: string) => [...maintenanceKeys.all, 'failure-code-set', id] as const,
    failureModes: (setId: string) => [...maintenanceKeys.all, 'failure-modes', setId] as const,
    failureCauses: (modeId: string) => [...maintenanceKeys.all, 'failure-causes', modeId] as const,
    actionCodes: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'action-codes', params] as const
        : [...maintenanceKeys.all, 'action-codes'] as const,

    // Strategies
    strategies: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'strategies', params] as const
        : [...maintenanceKeys.all, 'strategies'] as const,
    strategy: (id: string) => [...maintenanceKeys.all, 'strategy', id] as const,

    // Job Plans
    jobPlans: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'job-plans', params] as const
        : [...maintenanceKeys.all, 'job-plans'] as const,
    jobPlan: (id: string) => [...maintenanceKeys.all, 'job-plan', id] as const,

    // Checklist Templates
    checklistTemplates: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'checklist-templates', params] as const
        : [...maintenanceKeys.all, 'checklist-templates'] as const,
    checklistTemplate: (id: string) => [...maintenanceKeys.all, 'checklist-template', id] as const,

    // Assets
    assets: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'assets', params] as const
        : [...maintenanceKeys.all, 'assets'] as const,
    asset: (id: string) => [...maintenanceKeys.all, 'asset', id] as const,
    assetHierarchy: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'asset-hierarchy', params] as const
        : [...maintenanceKeys.all, 'asset-hierarchy'] as const,
    assetHistory: (id: string) => [...maintenanceKeys.all, 'asset-history', id] as const,
    assetCategories: () => [...maintenanceKeys.all, 'asset-categories'] as const,
    assetSubCategories: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'asset-sub-categories', params] as const
        : [...maintenanceKeys.all, 'asset-sub-categories'] as const,
    assetTypes: () => [...maintenanceKeys.all, 'asset-types'] as const,
    assetMeters: (assetId: string) => [...maintenanceKeys.all, 'asset-meters', assetId] as const,
    meterReadings: (assetId: string, meterId: string) => [...maintenanceKeys.all, 'meter-readings', assetId, meterId] as const,

    // Work Requests
    workRequests: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'work-requests', params] as const
        : [...maintenanceKeys.all, 'work-requests'] as const,
    workRequest: (id: string) => [...maintenanceKeys.all, 'work-request', id] as const,

    // Work Orders
    workOrders: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'work-orders', params] as const
        : [...maintenanceKeys.all, 'work-orders'] as const,
    workOrder: (id: string) => [...maintenanceKeys.all, 'work-order', id] as const,
    woBoard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'wo-board', params] as const
        : [...maintenanceKeys.all, 'wo-board'] as const,

    // PM Schedules
    pmSchedules: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'pm-schedules', params] as const
        : [...maintenanceKeys.all, 'pm-schedules'] as const,
    pmSchedule: (id: string) => [...maintenanceKeys.all, 'pm-schedule', id] as const,
    pmCalendar: (params: Record<string, unknown>) => [...maintenanceKeys.all, 'pm-calendar', params] as const,
    overduePMs: () => [...maintenanceKeys.all, 'overdue-pms'] as const,
    dueTodayPMs: () => [...maintenanceKeys.all, 'due-today-pms'] as const,

    // Breakdowns
    breakdowns: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'breakdowns', params] as const
        : [...maintenanceKeys.all, 'breakdowns'] as const,
    breakdown: (id: string) => [...maintenanceKeys.all, 'breakdown', id] as const,
    recurringFailures: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'recurring-failures', params] as const
        : [...maintenanceKeys.all, 'recurring-failures'] as const,

    // Downtime
    downtimeList: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'downtime', params] as const
        : [...maintenanceKeys.all, 'downtime'] as const,
    assetDowntime: (assetId: string, params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'asset-downtime', assetId, params] as const
        : [...maintenanceKeys.all, 'asset-downtime', assetId] as const,
    oeeFeed: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'oee-feed', params] as const
        : [...maintenanceKeys.all, 'oee-feed'] as const,

    // Contracts
    contracts: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'contracts', params] as const
        : [...maintenanceKeys.all, 'contracts'] as const,
    contract: (id: string) => [...maintenanceKeys.all, 'contract', id] as const,
    expiringContracts: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'expiring-contracts', params] as const
        : [...maintenanceKeys.all, 'expiring-contracts'] as const,
    contractUtilisation: (id: string) => [...maintenanceKeys.all, 'contract-utilisation', id] as const,

    // Spare Parts
    spareKit: (jobPlanId: string) => [...maintenanceKeys.all, 'spare-kit', jobPlanId] as const,
    stockoutAlerts: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'stockout-alerts', params] as const
        : [...maintenanceKeys.all, 'stockout-alerts'] as const,

    // PTW
    ptwList: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'ptw', params] as const
        : [...maintenanceKeys.all, 'ptw'] as const,
    ptw: (id: string) => [...maintenanceKeys.all, 'ptw-detail', id] as const,

    // Shutdowns
    shutdowns: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'shutdowns', params] as const
        : [...maintenanceKeys.all, 'shutdowns'] as const,
    shutdown: (id: string) => [...maintenanceKeys.all, 'shutdown', id] as const,
    shutdownProgress: (id: string) => [...maintenanceKeys.all, 'shutdown-progress', id] as const,

    // Dashboards
    managerDashboard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'dashboard-manager', params] as const
        : [...maintenanceKeys.all, 'dashboard-manager'] as const,
    plannerDashboard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'dashboard-planner', params] as const
        : [...maintenanceKeys.all, 'dashboard-planner'] as const,
    technicianDashboard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'dashboard-technician', params] as const
        : [...maintenanceKeys.all, 'dashboard-technician'] as const,
    plantHeadDashboard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'dashboard-plant-head', params] as const
        : [...maintenanceKeys.all, 'dashboard-plant-head'] as const,
    financeDashboard: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'dashboard-finance', params] as const
        : [...maintenanceKeys.all, 'dashboard-finance'] as const,

    // Reports
    reportPMDueOverdue: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-pm-due-overdue', params] as const
        : [...maintenanceKeys.all, 'report-pm-due-overdue'] as const,
    reportOpenBreakdowns: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-open-breakdowns', params] as const
        : [...maintenanceKeys.all, 'report-open-breakdowns'] as const,
    reportTechnicianWorkload: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-technician-workload', params] as const
        : [...maintenanceKeys.all, 'report-technician-workload'] as const,
    reportVendorSLA: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-vendor-sla', params] as const
        : [...maintenanceKeys.all, 'report-vendor-sla'] as const,
    reportPartsAvailability: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-parts-availability', params] as const
        : [...maintenanceKeys.all, 'report-parts-availability'] as const,
    reportAssetMovement: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-asset-movement', params] as const
        : [...maintenanceKeys.all, 'report-asset-movement'] as const,
    reportShutdownProgress: (shutdownId: string) => [...maintenanceKeys.all, 'report-shutdown-progress', shutdownId] as const,
    reportAvailabilityTrend: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-availability-trend', params] as const
        : [...maintenanceKeys.all, 'report-availability-trend'] as const,
    reportRecurringFailures: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-recurring-failures', params] as const
        : [...maintenanceKeys.all, 'report-recurring-failures'] as const,
    reportPlannedVsUnplanned: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-planned-vs-unplanned', params] as const
        : [...maintenanceKeys.all, 'report-planned-vs-unplanned'] as const,
    reportCostBreakdown: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-cost-breakdown', params] as const
        : [...maintenanceKeys.all, 'report-cost-breakdown'] as const,
    reportCalibrationDue: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-calibration-due', params] as const
        : [...maintenanceKeys.all, 'report-calibration-due'] as const,
    reportStatutoryDueOverdue: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-statutory-due-overdue', params] as const
        : [...maintenanceKeys.all, 'report-statutory-due-overdue'] as const,
    reportClosureEvidenceMissing: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-closure-evidence-missing', params] as const
        : [...maintenanceKeys.all, 'report-closure-evidence-missing'] as const,
    reportApprovalAuditTrail: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-approval-audit-trail', params] as const
        : [...maintenanceKeys.all, 'report-approval-audit-trail'] as const,
    reportRepairVsReplace: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-repair-vs-replace', params] as const
        : [...maintenanceKeys.all, 'report-repair-vs-replace'] as const,
    reportWarrantyAMCRecovery: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-warranty-amc-recovery', params] as const
        : [...maintenanceKeys.all, 'report-warranty-amc-recovery'] as const,
    reportPTWCompliance: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'report-ptw-compliance', params] as const
        : [...maintenanceKeys.all, 'report-ptw-compliance'] as const,

    // Analytics / Reliability
    availabilityTrend: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'availability-trend', params] as const
        : [...maintenanceKeys.all, 'availability-trend'] as const,
    costAnalytics: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'cost-analytics', params] as const
        : [...maintenanceKeys.all, 'cost-analytics'] as const,
    plannedVsUnplanned: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'planned-vs-unplanned', params] as const
        : [...maintenanceKeys.all, 'planned-vs-unplanned'] as const,
    reliabilityMetrics: (params?: Record<string, unknown>) => params
        ? [...maintenanceKeys.all, 'reliability-metrics', params] as const
        : [...maintenanceKeys.all, 'reliability-metrics'] as const,
};

// ── Config ──

export function useMaintenanceConfig() {
    return useQuery({
        queryKey: maintenanceKeys.config(),
        queryFn: () => maintenanceApi.getConfig(),
    });
}

// ── Failure Code Sets ──

export function useFailureCodeSets(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.failureCodeSets(params),
        queryFn: () => maintenanceApi.listFailureCodeSets(params),
    });
}

export function useFailureCodeSet(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.failureCodeSet(id),
        queryFn: () => maintenanceApi.getFailureCodeSet(id),
        enabled: !!id,
    });
}

// ── Failure Modes ──

export function useFailureModes(setId: string) {
    return useQuery({
        queryKey: maintenanceKeys.failureModes(setId),
        queryFn: () => maintenanceApi.listFailureModes(setId),
        enabled: !!setId,
    });
}

// ── Failure Causes ──

export function useFailureCauses(modeId: string) {
    return useQuery({
        queryKey: maintenanceKeys.failureCauses(modeId),
        queryFn: () => maintenanceApi.listFailureCauses(modeId),
        enabled: !!modeId,
    });
}

// ── Action Codes ──

export function useActionCodes(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.actionCodes(params),
        queryFn: () => maintenanceApi.listActionCodes(params),
    });
}

// ── Strategies ──

export function useStrategies(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.strategies(params),
        queryFn: () => maintenanceApi.listStrategies(params),
    });
}

export function useStrategy(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.strategy(id),
        queryFn: () => maintenanceApi.getStrategy(id),
        enabled: !!id,
    });
}

// ── Job Plans ──

export function useJobPlans(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.jobPlans(params),
        queryFn: () => maintenanceApi.listJobPlans(params),
    });
}

export function useJobPlan(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.jobPlan(id),
        queryFn: () => maintenanceApi.getJobPlan(id),
        enabled: !!id,
    });
}

// ── Checklist Templates ──

export function useChecklistTemplates(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.checklistTemplates(params),
        queryFn: () => maintenanceApi.listChecklistTemplates(params),
    });
}

export function useChecklistTemplate(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.checklistTemplate(id),
        queryFn: () => maintenanceApi.getChecklistTemplate(id),
        enabled: !!id,
    });
}

// ── Assets ──

export function useAssets(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.assets(params),
        queryFn: () => maintenanceApi.listAssets(params),
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.asset(id),
        queryFn: () => maintenanceApi.getAsset(id),
        enabled: !!id,
    });
}

export function useAssetHierarchy(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.assetHierarchy(params),
        queryFn: () => maintenanceApi.getAssetHierarchy(params),
    });
}

export function useAssetHistory(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.assetHistory(id),
        queryFn: () => maintenanceApi.getAssetHistory(id),
        enabled: !!id,
    });
}

// ── Asset Categories / Sub-Categories / Types ──

export function useAssetCategories() {
    return useQuery({
        queryKey: maintenanceKeys.assetCategories(),
        queryFn: () => maintenanceApi.listAssetCategories(),
    });
}

export function useAssetSubCategories(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.assetSubCategories(params),
        queryFn: () => maintenanceApi.listAssetSubCategories(params),
    });
}

export function useAssetTypes() {
    return useQuery({
        queryKey: maintenanceKeys.assetTypes(),
        queryFn: () => maintenanceApi.listAssetTypes(),
    });
}

// ── Meters & Readings ──

export function useAssetMeters(assetId: string) {
    return useQuery({
        queryKey: maintenanceKeys.assetMeters(assetId),
        queryFn: () => maintenanceApi.listMeters(assetId),
        enabled: !!assetId,
    });
}

export function useMeterReadings(assetId: string, meterId: string) {
    return useQuery({
        queryKey: maintenanceKeys.meterReadings(assetId, meterId),
        queryFn: () => maintenanceApi.getReadingHistory(assetId, meterId),
        enabled: !!assetId && !!meterId,
    });
}

// ── Work Requests ──

export function useWorkRequests(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.workRequests(params),
        queryFn: () => maintenanceApi.listWorkRequests(params),
    });
}

export function useWorkRequest(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.workRequest(id),
        queryFn: () => maintenanceApi.getWorkRequest(id),
        enabled: !!id,
    });
}

// ── Work Orders ──

export function useWorkOrders(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.workOrders(params),
        queryFn: () => maintenanceApi.listWorkOrders(params),
    });
}

export function useWorkOrder(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.workOrder(id),
        queryFn: () => maintenanceApi.getWorkOrder(id),
        enabled: !!id,
    });
}

export function useWOBoard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.woBoard(params),
        queryFn: () => maintenanceApi.getWOBoard(params),
    });
}

// ── PM Schedules ──

export function usePMSchedules(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.pmSchedules(params),
        queryFn: () => maintenanceApi.listPMSchedules(params),
    });
}

export function usePMSchedule(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.pmSchedule(id),
        queryFn: () => maintenanceApi.getPMSchedule(id),
        enabled: !!id,
    });
}

export function usePMCalendar(params: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.pmCalendar(params),
        queryFn: () => maintenanceApi.getPMCalendar(params),
        enabled: !!params.startDate && !!params.endDate,
    });
}

export function useOverduePMs() {
    return useQuery({
        queryKey: maintenanceKeys.overduePMs(),
        queryFn: () => maintenanceApi.getOverduePMs(),
    });
}

export function useDueTodayPMs() {
    return useQuery({
        queryKey: maintenanceKeys.dueTodayPMs(),
        queryFn: () => maintenanceApi.getDueTodayPMs(),
    });
}

// ── Breakdowns ──

export function useBreakdowns(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.breakdowns(params),
        queryFn: () => maintenanceApi.listBreakdowns(params),
    });
}

export function useBreakdown(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.breakdown(id),
        queryFn: () => maintenanceApi.getBreakdown(id),
        enabled: !!id,
    });
}

export function useRecurringFailures(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.recurringFailures(params),
        queryFn: () => maintenanceApi.getRecurringFailures(params),
    });
}

// ── Downtime ──

export function useDowntimeList(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.downtimeList(params),
        queryFn: () => maintenanceApi.listDowntime(params),
    });
}

export function useAssetDowntime(assetId: string, params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.assetDowntime(assetId, params),
        queryFn: () => maintenanceApi.getAssetDowntime(assetId, params),
        enabled: !!assetId,
    });
}

export function useOEEFeed(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.oeeFeed(params),
        queryFn: () => maintenanceApi.getOEEFeed(params),
    });
}

// ── Contracts ──

export function useContracts(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.contracts(params),
        queryFn: () => maintenanceApi.listContracts(params),
    });
}

export function useContract(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.contract(id),
        queryFn: () => maintenanceApi.getContract(id),
        enabled: !!id,
    });
}

export function useExpiringContracts(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.expiringContracts(params),
        queryFn: () => maintenanceApi.getExpiringContracts(params),
    });
}

export function useContractUtilisation(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.contractUtilisation(id),
        queryFn: () => maintenanceApi.getContractUtilisation(id),
        enabled: !!id,
    });
}

// ── Spare Parts ──

export function useSpareKit(jobPlanId: string) {
    return useQuery({
        queryKey: maintenanceKeys.spareKit(jobPlanId),
        queryFn: () => maintenanceApi.checkSpareKit(jobPlanId),
        enabled: !!jobPlanId,
    });
}

export function useStockoutAlerts(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.stockoutAlerts(params),
        queryFn: () => maintenanceApi.getStockoutAlerts(params),
    });
}

// ── PTW ──

export function usePTWList(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.ptwList(params),
        queryFn: () => maintenanceApi.listPTW(params),
    });
}

export function usePTW(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.ptw(id),
        queryFn: () => maintenanceApi.getPTW(id),
        enabled: !!id,
    });
}

// ── Shutdowns ──

export function useShutdowns(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.shutdowns(params),
        queryFn: () => maintenanceApi.listShutdowns(params),
    });
}

export function useShutdown(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.shutdown(id),
        queryFn: () => maintenanceApi.getShutdown(id),
        enabled: !!id,
    });
}

export function useShutdownProgress(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.shutdownProgress(id),
        queryFn: () => maintenanceApi.getShutdownProgress(id),
        enabled: !!id,
    });
}

// ── Dashboards ──

export function useManagerDashboard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.managerDashboard(params),
        queryFn: () => maintenanceApi.getManagerDashboard(params),
    });
}

export function usePlannerDashboard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.plannerDashboard(params),
        queryFn: () => maintenanceApi.getPlannerDashboard(params),
    });
}

export function useTechnicianDashboard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.technicianDashboard(params),
        queryFn: () => maintenanceApi.getTechnicianDashboard(params),
    });
}

export function usePlantHeadDashboard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.plantHeadDashboard(params),
        queryFn: () => maintenanceApi.getPlantHeadDashboard(params),
    });
}

export function useFinanceDashboard(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.financeDashboard(params),
        queryFn: () => maintenanceApi.getFinanceDashboard(params),
    });
}

// ── Reports ──

export function useReportPMDueOverdue(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportPMDueOverdue(params),
        queryFn: () => maintenanceApi.getReportPMDueOverdue(params),
        enabled: false,
    });
}

export function useReportOpenBreakdowns(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportOpenBreakdowns(params),
        queryFn: () => maintenanceApi.getReportOpenBreakdowns(params),
        enabled: false,
    });
}

export function useReportTechnicianWorkload(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportTechnicianWorkload(params),
        queryFn: () => maintenanceApi.getReportTechnicianWorkload(params),
        enabled: false,
    });
}

export function useReportVendorSLA(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportVendorSLA(params),
        queryFn: () => maintenanceApi.getReportVendorSLA(params),
        enabled: false,
    });
}

export function useReportPartsAvailability(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportPartsAvailability(params),
        queryFn: () => maintenanceApi.getReportPartsAvailability(params),
        enabled: false,
    });
}

export function useReportAssetMovement(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportAssetMovement(params),
        queryFn: () => maintenanceApi.getReportAssetMovement(params),
        enabled: false,
    });
}

export function useReportShutdownProgress(shutdownId: string) {
    return useQuery({
        queryKey: maintenanceKeys.reportShutdownProgress(shutdownId),
        queryFn: () => maintenanceApi.getReportShutdownProgress(shutdownId),
        enabled: !!shutdownId,
    });
}

export function useReportAvailabilityTrend(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportAvailabilityTrend(params),
        queryFn: () => maintenanceApi.getReportAvailabilityTrend(params),
        enabled: false,
    });
}

export function useReportRecurringFailures(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportRecurringFailures(params),
        queryFn: () => maintenanceApi.getReportRecurringFailures(params),
        enabled: false,
    });
}

export function useReportPlannedVsUnplanned(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportPlannedVsUnplanned(params),
        queryFn: () => maintenanceApi.getReportPlannedVsUnplanned(params),
        enabled: false,
    });
}

export function useReportCostBreakdown(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportCostBreakdown(params),
        queryFn: () => maintenanceApi.getReportCostBreakdown(params),
        enabled: false,
    });
}

export function useReportCalibrationDue(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportCalibrationDue(params),
        queryFn: () => maintenanceApi.getReportCalibrationDue(params),
        enabled: false,
    });
}

export function useReportStatutoryDueOverdue(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportStatutoryDueOverdue(params),
        queryFn: () => maintenanceApi.getReportStatutoryDueOverdue(params),
        enabled: false,
    });
}

export function useReportClosureEvidenceMissing(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportClosureEvidenceMissing(params),
        queryFn: () => maintenanceApi.getReportClosureEvidenceMissing(params),
        enabled: false,
    });
}

export function useReportApprovalAuditTrail(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportApprovalAuditTrail(params),
        queryFn: () => maintenanceApi.getReportApprovalAuditTrail(params),
        enabled: false,
    });
}

export function useReportRepairVsReplace(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportRepairVsReplace(params),
        queryFn: () => maintenanceApi.getReportRepairVsReplace(params),
        enabled: false,
    });
}

export function useReportWarrantyAMCRecovery(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportWarrantyAMCRecovery(params),
        queryFn: () => maintenanceApi.getReportWarrantyAMCRecovery(params),
        enabled: false,
    });
}

export function useReportPTWCompliance(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reportPTWCompliance(params),
        queryFn: () => maintenanceApi.getReportPTWCompliance(params),
        enabled: false,
    });
}

// ── Analytics / Reliability ──

export function useAvailabilityTrend(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.availabilityTrend(params),
        queryFn: () => maintenanceApi.getAvailabilityTrend(params),
    });
}

export function useCostAnalytics(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.costAnalytics(params),
        queryFn: () => maintenanceApi.getCostAnalytics(params),
    });
}

export function usePlannedVsUnplanned(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.plannedVsUnplanned(params),
        queryFn: () => maintenanceApi.getPlannedVsUnplanned(params),
    });
}

export function useReliabilityMetrics(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: maintenanceKeys.reliabilityMetrics(params),
        queryFn: () => maintenanceApi.getReliabilityMetrics(params),
    });
}
