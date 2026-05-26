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
  });
}

// ── Bins ──

export function useBins(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.bins(params),
    queryFn: () => inventoryApi.listBins(params),
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
  });
}

// ── Approval Thresholds ──

export function useApprovalThresholds() {
  return useQuery({
    queryKey: inventoryKeys.approvalThresholds(),
    queryFn: () => inventoryApi.listApprovalThresholds(),
  });
}

// ── Handling Units ──

export function useHandlingUnits() {
  return useQuery({
    queryKey: inventoryKeys.handlingUnits(),
    queryFn: () => inventoryApi.listHandlingUnits(),
  });
}

// ── Stock Explorer ──

export function useStockOnHand(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stockOnHand(params),
    queryFn: () => inventoryApi.getStockOnHand(params),
  });
}

export function useNetAvailable(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.netAvailable(params),
    queryFn: () => inventoryApi.getNetAvailable(params),
  });
}

export function useStockByStatus(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: inventoryKeys.stockByStatus(params),
    queryFn: () => inventoryApi.getStockByStatus(params),
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
