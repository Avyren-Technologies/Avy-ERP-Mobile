import { client } from '@/lib/api/client';

export const maintenanceApi = {
    // ── Config ──
    getConfig: () => client.get('/maintenance/config'),
    updateConfig: (data: any) => client.patch('/maintenance/config', data),

    // ── Failure Code Sets ──
    listFailureCodeSets: (params?: any) => client.get('/maintenance/failure-code-sets', { params }),
    getFailureCodeSet: (id: string) => client.get(`/maintenance/failure-code-sets/${id}`),
    createFailureCodeSet: (data: any) => client.post('/maintenance/failure-code-sets', data),
    updateFailureCodeSet: (id: string, data: any) => client.patch(`/maintenance/failure-code-sets/${id}`, data),
    deleteFailureCodeSet: (id: string) => client.delete(`/maintenance/failure-code-sets/${id}`),

    // ── Failure Modes ──
    listFailureModes: (setId: string) => client.get(`/maintenance/failure-code-sets/${setId}/modes`),
    createFailureMode: (setId: string, data: any) => client.post(`/maintenance/failure-code-sets/${setId}/modes`, data),
    updateFailureMode: (setId: string, id: string, data: any) => client.patch(`/maintenance/failure-code-sets/${setId}/modes/${id}`, data),
    deleteFailureMode: (setId: string, id: string) => client.delete(`/maintenance/failure-code-sets/${setId}/modes/${id}`),

    // ── Failure Causes ──
    listFailureCauses: (modeId: string) => client.get(`/maintenance/failure-modes/${modeId}/causes`),
    createFailureCause: (modeId: string, data: any) => client.post(`/maintenance/failure-modes/${modeId}/causes`, data),
    updateFailureCause: (modeId: string, id: string, data: any) => client.patch(`/maintenance/failure-modes/${modeId}/causes/${id}`, data),
    deleteFailureCause: (modeId: string, id: string) => client.delete(`/maintenance/failure-modes/${modeId}/causes/${id}`),

    // ── Action Codes ──
    listActionCodes: (params?: any) => client.get('/maintenance/action-codes', { params }),
    createActionCode: (data: any) => client.post('/maintenance/action-codes', data),
    updateActionCode: (id: string, data: any) => client.patch(`/maintenance/action-codes/${id}`, data),
    deleteActionCode: (id: string) => client.delete(`/maintenance/action-codes/${id}`),

    // ── Strategies ──
    listStrategies: (params?: any) => client.get('/maintenance/strategies', { params }),
    getStrategy: (id: string) => client.get(`/maintenance/strategies/${id}`),
    createStrategy: (data: any) => client.post('/maintenance/strategies', data),
    updateStrategy: (id: string, data: any) => client.patch(`/maintenance/strategies/${id}`, data),
    deleteStrategy: (id: string) => client.delete(`/maintenance/strategies/${id}`),

    // ── Job Plans ──
    listJobPlans: (params?: any) => client.get('/maintenance/job-plans', { params }),
    getJobPlan: (id: string) => client.get(`/maintenance/job-plans/${id}`),
    createJobPlan: (data: any) => client.post('/maintenance/job-plans', data),
    updateJobPlan: (id: string, data: any) => client.patch(`/maintenance/job-plans/${id}`, data),
    deleteJobPlan: (id: string) => client.delete(`/maintenance/job-plans/${id}`),

    // ── Checklist Templates ──
    listChecklistTemplates: (params?: any) => client.get('/maintenance/checklist-templates', { params }),
    getChecklistTemplate: (id: string) => client.get(`/maintenance/checklist-templates/${id}`),
    createChecklistTemplate: (data: any) => client.post('/maintenance/checklist-templates', data),
    updateChecklistTemplate: (id: string, data: any) => client.patch(`/maintenance/checklist-templates/${id}`, data),
    deleteChecklistTemplate: (id: string) => client.delete(`/maintenance/checklist-templates/${id}`),

    // ── Assets ──
    listAssets: (params?: any) => client.get('/maintenance/assets', { params }),
    getAsset: (id: string) => client.get(`/maintenance/assets/${id}`),
    createAsset: (data: any) => client.post('/maintenance/assets', data),
    updateAsset: (id: string, data: any) => client.patch(`/maintenance/assets/${id}`, data),
    deleteAsset: (id: string) => client.delete(`/maintenance/assets/${id}`),
    transferAsset: (id: string, data: any) => client.post(`/maintenance/assets/${id}/transfer`, data),
    getAssetHierarchy: (params?: any) => client.get('/maintenance/assets/hierarchy', { params }),
    getAssetHistory: (id: string, params?: any) => client.get(`/maintenance/assets/${id}/history`, { params }),
    syncMachines: () => client.post('/maintenance/assets/sync-machines'),

    // ── Asset Categories / Sub-Categories / Types ──
    listAssetCategories: () => client.get('/maintenance/assets/categories/list'),
    createAssetCategory: (data: any) => client.post('/maintenance/assets/categories', data),
    updateAssetCategory: (id: string, data: any) => client.patch(`/maintenance/assets/categories/${id}`, data),
    deleteAssetCategory: (id: string) => client.delete(`/maintenance/assets/categories/${id}`),

    listAssetSubCategories: (params?: any) => client.get('/maintenance/assets/sub-categories/list', { params }),
    createAssetSubCategory: (data: any) => client.post('/maintenance/assets/sub-categories', data),
    updateAssetSubCategory: (id: string, data: any) => client.patch(`/maintenance/assets/sub-categories/${id}`, data),
    deleteAssetSubCategory: (id: string) => client.delete(`/maintenance/assets/sub-categories/${id}`),

    listAssetTypes: () => client.get('/maintenance/assets/types/list'),
    createAssetType: (data: any) => client.post('/maintenance/assets/types', data),
    updateAssetType: (id: string, data: any) => client.patch(`/maintenance/assets/types/${id}`, data),
    deleteAssetType: (id: string) => client.delete(`/maintenance/assets/types/${id}`),

    // ── Meters & Readings ──
    listMeters: (assetId: string) => client.get(`/maintenance/assets/${assetId}/meters`),
    addMeter: (assetId: string, data: any) => client.post(`/maintenance/assets/${assetId}/meters`, data),
    updateMeter: (assetId: string, meterId: string, data: any) => client.patch(`/maintenance/assets/${assetId}/meters/${meterId}`, data),
    deleteMeter: (assetId: string, meterId: string) => client.delete(`/maintenance/assets/${assetId}/meters/${meterId}`),
    logReading: (assetId: string, meterId: string, data: any) => client.post(`/maintenance/assets/${assetId}/meters/${meterId}/readings`, data),
    getReadingHistory: (assetId: string, meterId: string, params?: any) => client.get(`/maintenance/assets/${assetId}/meters/${meterId}/readings`, { params }),

    // ── Tags ──
    linkTag: (assetId: string, data: any) => client.post(`/maintenance/assets/${assetId}/tags`, data),
    lookupByTag: (tagCode: string) => client.get(`/maintenance/assets/tags/${tagCode}`),
    deactivateTag: (assetId: string, tagId: string) => client.delete(`/maintenance/assets/${assetId}/tags/${tagId}`),
    batchGenerateTags: (data: any) => client.post('/maintenance/assets/tags/batch-generate', data),

    // ── Work Requests ──
    listWorkRequests: (params?: any) => client.get('/maintenance/work-requests', { params }),
    getWorkRequest: (id: string) => client.get(`/maintenance/work-requests/${id}`),
    createWorkRequest: (data: any) => client.post('/maintenance/work-requests', data),
    updateWorkRequest: (id: string, data: any) => client.patch(`/maintenance/work-requests/${id}`, data),
    triageWorkRequest: (id: string, data: any) => client.post(`/maintenance/work-requests/${id}/triage`, data),
    approveWorkRequest: (id: string) => client.post(`/maintenance/work-requests/${id}/approve`),
    rejectWorkRequest: (id: string, data: any) => client.post(`/maintenance/work-requests/${id}/reject`, data),
    convertWorkRequest: (id: string) => client.post(`/maintenance/work-requests/${id}/convert`),
    cancelWorkRequest: (id: string) => client.post(`/maintenance/work-requests/${id}/cancel`),
    checkDuplicateWR: (params: any) => client.get('/maintenance/work-requests/duplicate-check', { params }),

    // ── Work Orders ──
    listWorkOrders: (params?: any) => client.get('/maintenance/work-orders', { params }),
    getWorkOrder: (id: string) => client.get(`/maintenance/work-orders/${id}`),
    createWorkOrder: (data: any) => client.post('/maintenance/work-orders', data),
    updateWorkOrder: (id: string, data: any) => client.patch(`/maintenance/work-orders/${id}`, data),
    assignWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/assign`, data),
    acknowledgeWorkOrder: (id: string) => client.post(`/maintenance/work-orders/${id}/acknowledge`),
    declineWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/decline`, data),
    startWorkOrder: (id: string) => client.post(`/maintenance/work-orders/${id}/start`),
    holdWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/hold`, data),
    resumeWorkOrder: (id: string) => client.post(`/maintenance/work-orders/${id}/resume`),
    completeWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/complete`, data),
    qaReleaseWorkOrder: (id: string) => client.post(`/maintenance/work-orders/${id}/qa-release`),
    closeWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/close`, data),
    rejectWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/reject`, data),
    cancelWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/cancel`, data),
    reopenWorkOrder: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/reopen`, data),
    submitChecklist: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/checklist`, data),
    addWOParts: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/parts`, data),
    returnWOPart: (id: string, partId: string, data: any) => client.post(`/maintenance/work-orders/${id}/parts/${partId}/return`, data),
    logWOLabour: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/labour`, data),
    addWOEvidence: (id: string, data: any) => client.post(`/maintenance/work-orders/${id}/evidence`, data),
    getWOBoard: (params?: any) => client.get('/maintenance/work-orders/board', { params }),

    // ── PM Schedules ──
    listPMSchedules: (params?: any) => client.get('/maintenance/pm-schedules', { params }),
    getPMSchedule: (id: string) => client.get(`/maintenance/pm-schedules/${id}`),
    createPMSchedule: (data: any) => client.post('/maintenance/pm-schedules', data),
    updatePMSchedule: (id: string, data: any) => client.patch(`/maintenance/pm-schedules/${id}`, data),
    deletePMSchedule: (id: string) => client.delete(`/maintenance/pm-schedules/${id}`),
    reschedulePM: (id: string, data: any) => client.post(`/maintenance/pm-schedules/${id}/reschedule`, data),
    skipPM: (id: string, data: any) => client.post(`/maintenance/pm-schedules/${id}/skip`, data),
    generateWOFromPM: (id: string) => client.post(`/maintenance/pm-schedules/${id}/generate-wo`),
    getPMCalendar: (params: any) => client.get('/maintenance/pm-schedules/calendar', { params }),
    getOverduePMs: () => client.get('/maintenance/pm-schedules/overdue'),
    getDueTodayPMs: () => client.get('/maintenance/pm-schedules/due-today'),

    // ── Breakdowns ──
    logBreakdown: (data: any) => client.post('/maintenance/breakdowns', data),
    listBreakdowns: (params?: any) => client.get('/maintenance/breakdowns', { params }),
    getBreakdown: (id: string) => client.get(`/maintenance/breakdowns/${id}`),
    assignBreakdown: (id: string, data: any) => client.post(`/maintenance/breakdowns/${id}/assign`, data),
    resolveBreakdown: (id: string, data: any) => client.post(`/maintenance/breakdowns/${id}/resolve`, data),
    getRecurringFailures: (params?: any) => client.get('/maintenance/breakdowns/recurring', { params }),

    // ── Downtime ──
    createDowntime: (data: any) => client.post('/maintenance/downtime', data),
    updateDowntime: (id: string, data: any) => client.patch(`/maintenance/downtime/${id}`, data),
    listDowntime: (params?: any) => client.get('/maintenance/downtime', { params }),
    getAssetDowntime: (assetId: string, params?: any) => client.get(`/maintenance/downtime/asset/${assetId}`, { params }),
    getOEEFeed: (params?: any) => client.get('/maintenance/downtime/oee-feed', { params }),

    // ── Contracts ──
    listContracts: (params?: any) => client.get('/maintenance/contracts', { params }),
    getContract: (id: string) => client.get(`/maintenance/contracts/${id}`),
    createContract: (data: any) => client.post('/maintenance/contracts', data),
    updateContract: (id: string, data: any) => client.patch(`/maintenance/contracts/${id}`, data),
    deleteContract: (id: string) => client.delete(`/maintenance/contracts/${id}`),
    addContractAsset: (id: string, data: any) => client.post(`/maintenance/contracts/${id}/assets`, data),
    removeContractAsset: (id: string, assetId: string) => client.delete(`/maintenance/contracts/${id}/assets/${assetId}`),
    logContractVisit: (id: string, data: any) => client.post(`/maintenance/contracts/${id}/visits`, data),
    getExpiringContracts: (params?: any) => client.get('/maintenance/contracts/expiring', { params }),
    getContractUtilisation: (id: string) => client.get(`/maintenance/contracts/${id}/utilisation`),

    // ── Spare Parts ──
    reserveParts: (woId: string, data: any) => client.post(`/maintenance/work-orders/${woId}/parts/reserve`, data),
    issueParts: (woId: string, data: any) => client.post(`/maintenance/work-orders/${woId}/parts/issue`, data),
    checkSpareKit: (jobPlanId: string) => client.get(`/maintenance/spare-parts/kit/${jobPlanId}`),
    getStockoutAlerts: (params?: any) => client.get('/maintenance/spare-parts/stockout-alerts', { params }),

    // ── Permit to Work (PTW) ──
    listPTW: (params?: any) => client.get('/maintenance/ptw', { params }),
    getPTW: (id: string) => client.get(`/maintenance/ptw/${id}`),
    createPTW: (data: any) => client.post('/maintenance/ptw', data),
    updatePTW: (id: string, data: any) => client.patch(`/maintenance/ptw/${id}`, data),
    reviewPTW: (id: string) => client.post(`/maintenance/ptw/${id}/review`),
    issuePTW: (id: string) => client.post(`/maintenance/ptw/${id}/issue`),
    closePTW: (id: string) => client.post(`/maintenance/ptw/${id}/close`),
    revokePTW: (id: string, data: any) => client.post(`/maintenance/ptw/${id}/revoke`, data),
    deletePTW: (id: string) => client.delete(`/maintenance/ptw/${id}`),

    // ── Shutdown Events ──
    listShutdowns: (params?: any) => client.get('/maintenance/shutdown', { params }),
    getShutdown: (id: string) => client.get(`/maintenance/shutdown/${id}`),
    createShutdown: (data: any) => client.post('/maintenance/shutdown', data),
    updateShutdown: (id: string, data: any) => client.patch(`/maintenance/shutdown/${id}`, data),
    deleteShutdown: (id: string) => client.delete(`/maintenance/shutdown/${id}`),
    approveShutdown: (id: string) => client.post(`/maintenance/shutdown/${id}/approve`),
    addShutdownWOs: (id: string, data: any) => client.post(`/maintenance/shutdown/${id}/add-work-orders`, data),
    removeShutdownWO: (id: string, woId: string) => client.delete(`/maintenance/shutdown/${id}/work-orders/${woId}`),
    startShutdown: (id: string) => client.post(`/maintenance/shutdown/${id}/start`),
    completeShutdown: (id: string) => client.post(`/maintenance/shutdown/${id}/complete`),
    getShutdownProgress: (id: string) => client.get(`/maintenance/shutdown/${id}/progress`),

    // ── Dashboards ──
    getManagerDashboard: (params?: any) => client.get('/maintenance/dashboard/manager', { params }),
    getPlannerDashboard: (params?: any) => client.get('/maintenance/dashboard/planner', { params }),
    getTechnicianDashboard: (params?: any) => client.get('/maintenance/dashboard/technician', { params }),
    getPlantHeadDashboard: (params?: any) => client.get('/maintenance/dashboard/plant-head', { params }),
    getFinanceDashboard: (params?: any) => client.get('/maintenance/dashboard/finance', { params }),

    // ── Reports ──
    getReportPMDueOverdue: (params?: any) => client.get('/maintenance/reports/pm-due-overdue', { params }),
    getReportOpenBreakdowns: (params?: any) => client.get('/maintenance/reports/open-breakdowns', { params }),
    getReportTechnicianWorkload: (params?: any) => client.get('/maintenance/reports/technician-workload', { params }),
    getReportVendorSLA: (params?: any) => client.get('/maintenance/reports/vendor-sla', { params }),
    getReportPartsAvailability: (params?: any) => client.get('/maintenance/reports/parts-availability', { params }),
    getReportAssetMovement: (params?: any) => client.get('/maintenance/reports/asset-movement', { params }),
    getReportShutdownProgress: (shutdownId: string) => client.get(`/maintenance/reports/shutdown-progress/${shutdownId}`),
    getReportAvailabilityTrend: (params?: any) => client.get('/maintenance/reports/availability-trend', { params }),
    getReportRecurringFailures: (params?: any) => client.get('/maintenance/reports/recurring-failures', { params }),
    getReportPlannedVsUnplanned: (params?: any) => client.get('/maintenance/reports/planned-vs-unplanned', { params }),
    getReportCostBreakdown: (params?: any) => client.get('/maintenance/reports/cost-breakdown', { params }),
    getReportCalibrationDue: (params?: any) => client.get('/maintenance/reports/calibration-due', { params }),
    getReportStatutoryDueOverdue: (params?: any) => client.get('/maintenance/reports/statutory-due-overdue', { params }),
    getReportClosureEvidenceMissing: (params?: any) => client.get('/maintenance/reports/closure-evidence-missing', { params }),
    getReportApprovalAuditTrail: (params?: any) => client.get('/maintenance/reports/approval-audit-trail', { params }),
    getReportRepairVsReplace: (params?: any) => client.get('/maintenance/reports/repair-vs-replace', { params }),
    getReportWarrantyAMCRecovery: (params?: any) => client.get('/maintenance/reports/warranty-amc-recovery', { params }),
    getReportPTWCompliance: (params?: any) => client.get('/maintenance/reports/ptw-compliance', { params }),

    // ── Analytics / Reliability (reuses reports endpoints) ──
    getAvailabilityTrend: (params?: any) => client.get('/maintenance/reports/availability-trend', { params }),
    getCostAnalytics: (params?: any) => client.get('/maintenance/reports/cost-breakdown', { params }),
    getPlannedVsUnplanned: (params?: any) => client.get('/maintenance/reports/planned-vs-unplanned', { params }),
    getReliabilityMetrics: (params?: any) => client.get('/maintenance/reports/repair-vs-replace', { params }),
};
