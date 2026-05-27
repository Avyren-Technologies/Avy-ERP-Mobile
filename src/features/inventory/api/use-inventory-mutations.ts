import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError, showSuccess } from '@/components/ui/utils';
import { inventoryApi } from '@/lib/api/inventory';
import { inventoryKeys } from '@/features/inventory/api/inventory-keys';

// ── Helper ──

function invalidateStockQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: inventoryKeys.stockOnHand() });
  qc.invalidateQueries({ queryKey: inventoryKeys.netAvailable() });
  qc.invalidateQueries({ queryKey: inventoryKeys.stockByStatus() });
  qc.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
}

// ── Config ──

export function useUpdateInventoryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.config() });
      showSuccess('Configuration updated');
    },
    onError: showError,
  });
}

// ── Warehouses ──

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createWarehouse(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
      showSuccess('Warehouse created');
    },
    onError: showError,
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateWarehouse(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouse(variables.id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
      showSuccess('Warehouse updated');
    },
    onError: showError,
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteWarehouse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
      showSuccess('Warehouse deleted');
    },
    onError: showError,
  });
}

// ── Zones ──

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createZone(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.zones() });
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
      showSuccess('Zone created');
    },
    onError: showError,
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateZone(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.zones() });
      showSuccess('Zone updated');
    },
    onError: showError,
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.zones() });
      qc.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
      showSuccess('Zone deleted');
    },
    onError: showError,
  });
}

// ── Bins ──

export function useCreateBin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createBin(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.bins() });
      qc.invalidateQueries({ queryKey: inventoryKeys.zones() });
      showSuccess('Bin created');
    },
    onError: showError,
  });
}

export function useUpdateBin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateBin(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.bins() });
      showSuccess('Bin updated');
    },
    onError: showError,
  });
}

export function useDeleteBin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteBin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.bins() });
      qc.invalidateQueries({ queryKey: inventoryKeys.zones() });
      showSuccess('Bin deleted');
    },
    onError: showError,
  });
}

// ── Item Policies ──

export function useUpsertItemPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.upsertItemPolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.itemPolicies() });
      showSuccess('Item policy saved');
    },
    onError: showError,
  });
}

// ── Reason Codes ──

export function useCreateReasonCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createReasonCode(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reasonCodes() });
      showSuccess('Reason code created');
    },
    onError: showError,
  });
}

export function useUpdateReasonCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateReasonCode(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reasonCodes() });
      showSuccess('Reason code updated');
    },
    onError: showError,
  });
}

export function useDeleteReasonCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteReasonCode(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reasonCodes() });
      showSuccess('Reason code deleted');
    },
    onError: showError,
  });
}

// ── Approval Thresholds ──

export function useCreateApprovalThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createApprovalThreshold(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.approvalThresholds() });
      showSuccess('Approval threshold created');
    },
    onError: showError,
  });
}

export function useUpdateApprovalThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateApprovalThreshold(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.approvalThresholds() });
      showSuccess('Approval threshold updated');
    },
    onError: showError,
  });
}

export function useDeleteApprovalThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteApprovalThreshold(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.approvalThresholds() });
      showSuccess('Approval threshold deleted');
    },
    onError: showError,
  });
}

// ── Handling Units ──

export function useCreateHandlingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createHandlingUnit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.handlingUnits() });
      showSuccess('Handling unit created');
    },
    onError: showError,
  });
}

export function useUpdateHandlingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updateHandlingUnit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.handlingUnits() });
      showSuccess('Handling unit updated');
    },
    onError: showError,
  });
}

export function useDeleteHandlingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteHandlingUnit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.handlingUnits() });
      showSuccess('Handling unit deleted');
    },
    onError: showError,
  });
}

// ── Transactions: Receive Stock ──

export function useCreateReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createReceiveStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.receiveStock() });
      invalidateStockQueries(qc);
      showSuccess('Stock received');
    },
    onError: showError,
  });
}

// ── Transactions: GRN ──

export function useCreateGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createGrn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.grns() });
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingPutaway() });
      invalidateStockQueries(qc);
      showSuccess('GRN created');
    },
    onError: showError,
  });
}

// ── Transactions: Put-Away ──

export function useConfirmPutaway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.confirmPutaway(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingPutaway() });
      invalidateStockQueries(qc);
      showSuccess('Put-away confirmed');
    },
    onError: showError,
  });
}

// ── Transactions: Move Stock ──

export function useCreateMoveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createMoveStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.moveStock() });
      invalidateStockQueries(qc);
      showSuccess('Stock move initiated');
    },
    onError: showError,
  });
}

export function useConfirmMoveReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.confirmMoveReceipt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.moveStock() });
      invalidateStockQueries(qc);
      showSuccess('Move receipt confirmed');
    },
    onError: showError,
  });
}

// ── Transactions: Adjust Stock ──

export function useCreateAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createAdjustStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingApprovals() });
      invalidateStockQueries(qc);
      showSuccess('Stock adjustment created');
    },
    onError: showError,
  });
}

export function useCreateOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createOpeningBalance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
      invalidateStockQueries(qc);
      showSuccess('Opening balance posted');
    },
    onError: showError,
  });
}

// ── Transactions: Pick Items ──

export function useCreatePickItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createPickItems(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pickItems() });
      invalidateStockQueries(qc);
      showSuccess('Pick list created');
    },
    onError: showError,
  });
}

export function useConfirmPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.confirmPick(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pickItems() });
      invalidateStockQueries(qc);
      showSuccess('Pick confirmed');
    },
    onError: showError,
  });
}

// ── Transactions: Dispatch ──

export function useCreateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createDispatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.dispatches() });
      invalidateStockQueries(qc);
      showSuccess('Dispatch created');
    },
    onError: showError,
  });
}

// ── Transactions: Customer Return ──

export function useCreateCustomerReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createCustomerReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.customerReturns() });
      invalidateStockQueries(qc);
      showSuccess('Customer return logged');
    },
    onError: showError,
  });
}

export function useInspectReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.inspectReturn(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.customerReturns() });
      invalidateStockQueries(qc);
      showSuccess('Return inspection completed');
    },
    onError: showError,
  });
}

// ── Transactions: Vendor Return ──

export function useCreateVendorReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createVendorReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.vendorReturns() });
      invalidateStockQueries(qc);
      showSuccess('Vendor return created');
    },
    onError: showError,
  });
}

// ── Counts ──

export function useCreateCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createCount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.counts() });
      showSuccess('Count created');
    },
    onError: showError,
  });
}

export function useEnterCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.enterCount(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.count(variables.id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.counts() });
      showSuccess('Count entries saved');
    },
    onError: showError,
  });
}

export function useSubmitCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.submitCount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.counts() });
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingApprovals() });
      showSuccess('Count submitted for approval');
    },
    onError: showError,
  });
}

export function useApproveCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      inventoryApi.approveCount(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.count(variables.id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.counts() });
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingApprovals() });
      invalidateStockQueries(qc);
      showSuccess('Count approved');
    },
    onError: showError,
  });
}

// ── Approvals ──

export function useApproveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.approveTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingApprovals() });
      qc.invalidateQueries({ queryKey: inventoryKeys.approvalHistory() });
      invalidateStockQueries(qc);
      showSuccess('Transaction approved');
    },
    onError: showError,
  });
}

export function useRejectTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.rejectTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pendingApprovals() });
      qc.invalidateQueries({ queryKey: inventoryKeys.approvalHistory() });
      showSuccess('Transaction rejected');
    },
    onError: showError,
  });
}

// ── Production: Issue to Production ──

export function useCreateIssueToProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createIssueToProduction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.issueToProduction() });
      invalidateStockQueries(qc);
      qc.invalidateQueries({ queryKey: inventoryKeys.wipStock() });
      showSuccess('Material issued to production');
    },
    onError: showError,
  });
}

// ── Production: FG Receipt ──

export function useCreateFgReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createFgReceipt(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.fgReceipts() });
      invalidateStockQueries(qc);
      qc.invalidateQueries({ queryKey: inventoryKeys.wipStock() });
      showSuccess('FG receipt recorded');
    },
    onError: showError,
  });
}

// ── Production: Material Return ──

export function useCreateMaterialReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createMaterialReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.materialReturns() });
      invalidateStockQueries(qc);
      qc.invalidateQueries({ queryKey: inventoryKeys.wipStock() });
      showSuccess('Material returned from production');
    },
    onError: showError,
  });
}

// ── Production: Production Scrap ──

export function useCreateProductionScrap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createProductionScrap(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.productionScraps() });
      invalidateStockQueries(qc);
      qc.invalidateQueries({ queryKey: inventoryKeys.wipStock() });
      showSuccess('Production scrap logged');
    },
    onError: showError,
  });
}

// ── WO Reconciliation ──

export function useGenerateWoReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => inventoryApi.generateWoReconciliation(workOrderId),
    onSuccess: (_: any, workOrderId: string) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.woReconciliation(workOrderId) });
      showSuccess('Reconciliation generated');
    },
    onError: showError,
  });
}

// ── Helper for tool-affecting mutations ──

function invalidateToolQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: inventoryKeys.stockOnHand() });
  qc.invalidateQueries({ queryKey: inventoryKeys.toolsAtMachine() });
  qc.invalidateQueries({ queryKey: inventoryKeys.toolStatusReport() });
  qc.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
}

// ── Putaway Rules ──

export function useCreatePutawayRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createPutawayRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.putawayRules() });
      showSuccess('Putaway rule created');
    },
    onError: showError,
  });
}

export function useUpdatePutawayRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.updatePutawayRule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.putawayRules() });
      showSuccess('Putaway rule updated');
    },
    onError: showError,
  });
}

export function useDeletePutawayRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deletePutawayRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.putawayRules() });
      showSuccess('Putaway rule deleted');
    },
    onError: showError,
  });
}

export function useSuggestBin() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.suggestBin(data),
    onError: showError,
  });
}

// ── Pallets ──

export function useCreatePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createPallet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pallets() });
      showSuccess('Pallet created');
    },
    onError: showError,
  });
}

export function useAddPalletItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.addPalletItems(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pallet(variables.id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.pallets() });
      showSuccess('Items added to pallet');
    },
    onError: showError,
  });
}

export function useClosePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.closePallet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.pallets() });
      showSuccess('Pallet closed');
    },
    onError: showError,
  });
}

// ── Tool Life Policies ──

export function useUpsertToolLifePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.upsertToolLifePolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.toolLifePolicies() });
      showSuccess('Tool life policy saved');
    },
    onError: showError,
  });
}

// ── Tool Issue ──

export function useCreateToolIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createToolIssue(data),
    onSuccess: () => {
      invalidateToolQueries(qc);
      showSuccess('Tool issued to machine');
    },
    onError: showError,
  });
}

// ── Tool Return ──

export function useCreateToolReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createToolReturn(data),
    onSuccess: () => {
      invalidateToolQueries(qc);
      qc.invalidateQueries({ queryKey: inventoryKeys.reconditioning() });
      showSuccess('Tool returned from machine');
    },
    onError: showError,
  });
}

// ── Reconditioning ──

export function useInitiateReconditioning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.initiateReconditioning(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reconditioning() });
      invalidateToolQueries(qc);
      showSuccess('Reconditioning initiated');
    },
    onError: showError,
  });
}

export function useCompleteReconditioning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.completeReconditioning(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reconditioning() });
      qc.invalidateQueries({ queryKey: inventoryKeys.overdueReconditioning() });
      invalidateToolQueries(qc);
      showSuccess('Reconditioning completed');
    },
    onError: showError,
  });
}
