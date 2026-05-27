import { useQuery } from '@tanstack/react-query';

import { inventoryApi } from '@/lib/api/inventory';
import { inventoryKeys } from '@/features/inventory/api/inventory-keys';

// ── Config ──

export function useInventoryConfig() {
  return useQuery({
    queryKey: inventoryKeys.config(),
    queryFn: () => inventoryApi.getConfig(),
  });
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: inventoryKeys.onboardingStatus(),
    queryFn: () => inventoryApi.getOnboardingStatus(),
  });
}

// ── Warehouses ──

export function useWarehouses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.warehouses(params),
    queryFn: () => inventoryApi.listWarehouses(params),
    staleTime: Infinity,
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: inventoryKeys.warehouse(id),
    queryFn: () => inventoryApi.getWarehouse(id),
    enabled: !!id,
  });
}

// ── Zones ──

export function useZones(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.zones(params),
    queryFn: () => inventoryApi.listZones(params),
    staleTime: Infinity,
  });
}

// ── Bins ──

export function useBins(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.bins(params),
    queryFn: () => inventoryApi.listBins(params),
    staleTime: Infinity,
  });
}

// ── Item Stock Policies ──

export function useItemPolicies(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.itemPolicies(params),
    queryFn: () => inventoryApi.listItemPolicies(params),
  });
}

export function useItemPolicy(partId: string) {
  return useQuery({
    queryKey: inventoryKeys.itemPolicy(partId),
    queryFn: () => inventoryApi.getItemPolicy(partId),
    enabled: !!partId,
  });
}

// ── Reason Codes ──

export function useReasonCodes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.reasonCodes(params),
    queryFn: () => inventoryApi.listReasonCodes(params),
    staleTime: Infinity,
  });
}

// ── Approval Thresholds ──

export function useApprovalThresholds() {
  return useQuery({
    queryKey: inventoryKeys.approvalThresholds(),
    queryFn: () => inventoryApi.listApprovalThresholds(),
    staleTime: Infinity,
  });
}

// ── Handling Units ──

export function useHandlingUnits() {
  return useQuery({
    queryKey: inventoryKeys.handlingUnits(),
    queryFn: () => inventoryApi.listHandlingUnits(),
    staleTime: Infinity,
  });
}

// ── Stock Explorer ──

export function useStockOnHand(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stockOnHand(params),
    queryFn: () => inventoryApi.getStockOnHand(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNetAvailable(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.netAvailable(params),
    queryFn: () => inventoryApi.getNetAvailable(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockByStatus(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stockByStatus(params),
    queryFn: () => inventoryApi.getStockByStatus(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLotHistory(lotId: string) {
  return useQuery({
    queryKey: inventoryKeys.lotHistory(lotId),
    queryFn: () => inventoryApi.getLotHistory(lotId),
    enabled: !!lotId,
  });
}

export function useSerialHistory(serialId: string) {
  return useQuery({
    queryKey: inventoryKeys.serialHistory(serialId),
    queryFn: () => inventoryApi.getSerialHistory(serialId),
    enabled: !!serialId,
  });
}

export function useExpiryReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.expiryReport(params),
    queryFn: () => inventoryApi.getExpiryReport(params),
  });
}

export function useAgingReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.agingReport(params),
    queryFn: () => inventoryApi.getAgingReport(params),
  });
}

export function useMovementHistory(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.movementHistory(params),
    queryFn: () => inventoryApi.getMovementHistory(params),
  });
}

// ── Transactions ──

export function useGrns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.grns(params),
    queryFn: () => inventoryApi.listGrns(params),
  });
}

export function useGrn(id: string) {
  return useQuery({
    queryKey: inventoryKeys.grn(id),
    queryFn: () => inventoryApi.getGrn(id),
    enabled: !!id,
  });
}

export function useReceiveStock(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.receiveStock(params),
    queryFn: () => inventoryApi.listReceiveStock(params),
  });
}

export function usePendingPutaway(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.pendingPutaway(params),
    queryFn: () => inventoryApi.listPendingPutaway(params),
  });
}

export function useMoveStock(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.moveStock(params),
    queryFn: () => inventoryApi.listMoveStock(params),
  });
}

export function useReservations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.reservations(params),
    queryFn: () => inventoryApi.listReservations(params),
  });
}

export function useAdjustments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.adjustments(params),
    queryFn: () => inventoryApi.listAdjustments(params),
  });
}

export function useStatusChanges(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.statusChanges(params),
    queryFn: () => inventoryApi.listStatusChanges(params),
  });
}

export function usePickItems(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.pickItems(params),
    queryFn: () => inventoryApi.listPickItems(params),
  });
}

export function usePacks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.packs(params),
    queryFn: () => inventoryApi.listPacks(params),
  });
}

export function useDispatches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.dispatches(params),
    queryFn: () => inventoryApi.listDispatches(params),
  });
}

export function useDispatch(id: string) {
  return useQuery({
    queryKey: inventoryKeys.dispatch(id),
    queryFn: () => inventoryApi.getDispatch(id),
    enabled: !!id,
  });
}

export function useCustomerReturns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.customerReturns(params),
    queryFn: () => inventoryApi.listCustomerReturns(params),
  });
}

export function useVendorReturns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.vendorReturns(params),
    queryFn: () => inventoryApi.listVendorReturns(params),
  });
}

// ── Counts ──

export function useCounts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.counts(params),
    queryFn: () => inventoryApi.listCounts(params),
  });
}

export function useCount(id: string) {
  return useQuery({
    queryKey: inventoryKeys.count(id),
    queryFn: () => inventoryApi.getCount(id),
    enabled: !!id,
  });
}

// ── Approvals ──

export function usePendingApprovals() {
  return useQuery({
    queryKey: inventoryKeys.pendingApprovals(),
    queryFn: () => inventoryApi.listPendingApprovals(),
  });
}

export function useApprovalHistory(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.approvalHistory(params),
    queryFn: () => inventoryApi.getApprovalHistory(params),
  });
}

// ── Dashboard ──

export function useInventoryDashboard() {
  return useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: () => inventoryApi.getDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivitySummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.activitySummary(params),
    queryFn: () => inventoryApi.getActivitySummary(params),
  });
}

// ── Production ──

export function useIssueToProduction(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.issueToProduction(params),
    queryFn: () => inventoryApi.listIssueToProduction(params),
  });
}

export function useIssueToProductionDetail(id: string) {
  return useQuery({
    queryKey: inventoryKeys.issueToProductionDetail(id),
    queryFn: () => inventoryApi.getIssueToProduction(id),
    enabled: !!id,
  });
}

export function useIssuesByWorkOrder(workOrderId: string) {
  return useQuery({
    queryKey: inventoryKeys.issuesByWorkOrder(workOrderId),
    queryFn: () => inventoryApi.getIssuesByWorkOrder(workOrderId),
    enabled: !!workOrderId,
  });
}

export function useFgReceipts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.fgReceipts(params),
    queryFn: () => inventoryApi.listFgReceipts(params),
  });
}

export function useFgReceipt(id: string) {
  return useQuery({
    queryKey: inventoryKeys.fgReceipt(id),
    queryFn: () => inventoryApi.getFgReceipt(id),
    enabled: !!id,
  });
}

export function useMaterialReturns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.materialReturns(params),
    queryFn: () => inventoryApi.listMaterialReturns(params),
  });
}

export function useProductionScraps(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.productionScraps(params),
    queryFn: () => inventoryApi.listProductionScraps(params),
  });
}

export function useScrapCategories(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.scrapCategories(params),
    queryFn: () => inventoryApi.listScrapCategories(params),
  });
}

export function useWoReconciliation(workOrderId: string) {
  return useQuery({
    queryKey: inventoryKeys.woReconciliation(workOrderId),
    queryFn: () => inventoryApi.getWoReconciliation(workOrderId),
    enabled: !!workOrderId,
  });
}

export function useWipStock(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.wipStock(params),
    queryFn: () => inventoryApi.getWipStock(params),
  });
}

// ── Putaway Rules ──

export function usePutawayRules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.putawayRules(params),
    queryFn: () => inventoryApi.listPutawayRules(params),
  });
}

// ── Pallets ──

export function usePallets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.pallets(params),
    queryFn: () => inventoryApi.listPallets(params),
  });
}

export function usePallet(id: string) {
  return useQuery({
    queryKey: inventoryKeys.pallet(id),
    queryFn: () => inventoryApi.getPallet(id),
    enabled: !!id,
  });
}

// ── Staging ──

export function useStagingInbound(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stagingInbound(params),
    queryFn: () => inventoryApi.getStagingInbound(params),
  });
}

export function useStagingOutbound(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stagingOutbound(params),
    queryFn: () => inventoryApi.getStagingOutbound(params),
  });
}

// ── Tool Life Policies ──

export function useToolLifePolicies(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolLifePolicies(params),
    queryFn: () => inventoryApi.listToolLifePolicies(params),
    staleTime: Infinity,
  });
}

export function useToolLifePolicy(partId: string) {
  return useQuery({
    queryKey: inventoryKeys.toolLifePolicy(partId),
    queryFn: () => inventoryApi.getToolLifePolicy(partId),
    enabled: !!partId,
  });
}

// ── Tools at Machine ──

export function useToolsAtMachine(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolsAtMachine(params),
    queryFn: () => inventoryApi.getToolsAtMachine(params),
  });
}

// ── Reconditioning ──

export function useReconditioning(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.reconditioning(params),
    queryFn: () => inventoryApi.listReconditioning(params),
  });
}

export function useOverdueReconditioning() {
  return useQuery({
    queryKey: inventoryKeys.overdueReconditioning(),
    queryFn: () => inventoryApi.getOverdueReconditioning(),
  });
}

// ── Tool Reports ──

export function useToolStatusReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolStatusReport(params),
    queryFn: () => inventoryApi.getToolStatusReport(params),
  });
}

export function useToolsAtMachineReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolsAtMachineReport(params),
    queryFn: () => inventoryApi.getToolsAtMachineReport(params),
  });
}

export function useToolConsumptionReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolConsumptionReport(params),
    queryFn: () => inventoryApi.getToolConsumptionReport(params),
  });
}

export function useReconditioningRegister(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.reconditioningRegister(params),
    queryFn: () => inventoryApi.getReconditioningRegister(params),
  });
}

export function useToolBreakageReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.toolBreakageReport(params),
    queryFn: () => inventoryApi.getToolBreakageReport(params),
  });
}

// ── Industry Templates ──

export function useIndustryTemplates() {
  return useQuery({
    queryKey: inventoryKeys.industryTemplates(),
    queryFn: () => inventoryApi.listIndustryTemplates(),
    staleTime: Infinity,
  });
}

export function useIndustryTemplate(id: string) {
  return useQuery({
    queryKey: inventoryKeys.industryTemplate(id),
    queryFn: () => inventoryApi.getIndustryTemplate(id),
    enabled: !!id,
  });
}

export function useActiveFieldConfig() {
  return useQuery({
    queryKey: inventoryKeys.activeFieldConfig(),
    queryFn: () => inventoryApi.getActiveFieldConfig(),
  });
}

// ── Compliance Documents ──

export function useComplianceDocuments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.complianceDocuments(params),
    queryFn: () => inventoryApi.listComplianceDocuments(params),
  });
}

export function useComplianceDocument(id: string) {
  return useQuery({
    queryKey: inventoryKeys.complianceDocument(id),
    queryFn: () => inventoryApi.getComplianceDocument(id),
    enabled: !!id,
  });
}

export function useComplianceByLot(lotId: string) {
  return useQuery({
    queryKey: inventoryKeys.complianceByLot(lotId),
    queryFn: () => inventoryApi.getComplianceByLot(lotId),
    enabled: !!lotId,
  });
}

export function useComplianceByPart(partId: string) {
  return useQuery({
    queryKey: inventoryKeys.complianceByPart(partId),
    queryFn: () => inventoryApi.getComplianceByPart(partId),
    enabled: !!partId,
  });
}

// ── Analytics ──

export function useDailyAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.dailyAnalytics(params),
    queryFn: () => inventoryApi.getDailyAnalytics(params),
  });
}

export function useKpiSnapshots(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.kpiSnapshots(params),
    queryFn: () => inventoryApi.getKpiSnapshots(params),
  });
}

export function useCurrentKpis() {
  return useQuery({
    queryKey: inventoryKeys.currentKpis(),
    queryFn: () => inventoryApi.getCurrentKpis(),
  });
}

export function useStockValueByWarehouse() {
  return useQuery({
    queryKey: inventoryKeys.stockValueByWarehouse(),
    queryFn: () => inventoryApi.getStockValueByWarehouse(),
  });
}

export function useTrendData(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.trendData(params),
    queryFn: () => inventoryApi.getTrendData(params),
  });
}

// ── Search ──

export function useGlobalSearch(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.globalSearch(params),
    queryFn: () => inventoryApi.globalSearch(params),
    enabled: !!(params as any)?.q && (params as any).q.length >= 2,
  });
}

// ── Import ──

export function useImportJobs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.importJobs(params),
    queryFn: () => inventoryApi.listImportJobs(params),
  });
}

export function useImportJob(jobId: string) {
  return useQuery({
    queryKey: inventoryKeys.importJob(jobId),
    queryFn: () => inventoryApi.getImportJob(jobId),
    enabled: !!jobId,
  });
}

// ── Export ──

export function useExportTemplates() {
  return useQuery({
    queryKey: inventoryKeys.exportTemplates(),
    queryFn: () => inventoryApi.getExportTemplates(),
    staleTime: Infinity,
  });
}

// ── Saved Filters ──

export function useSavedFilters(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.savedFilters(params),
    queryFn: () => inventoryApi.listSavedFilters(params),
  });
}

// ── Sync ──

export function useSyncConflicts() {
  return useQuery({
    queryKey: inventoryKeys.syncConflicts(),
    queryFn: () => inventoryApi.getSyncConflicts(),
  });
}

export function useSyncStats() {
  return useQuery({
    queryKey: inventoryKeys.syncStats(),
    queryFn: () => inventoryApi.getSyncStats(),
  });
}
