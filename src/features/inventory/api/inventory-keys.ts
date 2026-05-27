export const inventoryKeys = {
  all: ['inventory'] as const,

  // Config
  config: () => [...inventoryKeys.all, 'config'] as const,
  onboardingStatus: () => [...inventoryKeys.all, 'onboarding-status'] as const,

  // Masters
  warehouses: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'warehouses', params] as const)
      : ([...inventoryKeys.all, 'warehouses'] as const),
  warehouse: (id: string) => [...inventoryKeys.all, 'warehouse', id] as const,
  zones: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'zones', params] as const)
      : ([...inventoryKeys.all, 'zones'] as const),
  bins: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'bins', params] as const)
      : ([...inventoryKeys.all, 'bins'] as const),
  itemPolicies: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'item-policies', params] as const)
      : ([...inventoryKeys.all, 'item-policies'] as const),
  itemPolicy: (partId: string) => [...inventoryKeys.all, 'item-policy', partId] as const,
  reasonCodes: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'reason-codes', params] as const)
      : ([...inventoryKeys.all, 'reason-codes'] as const),
  approvalThresholds: () => [...inventoryKeys.all, 'approval-thresholds'] as const,
  handlingUnits: () => [...inventoryKeys.all, 'handling-units'] as const,

  // Stock
  stockOnHand: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'stock-on-hand', params] as const)
      : ([...inventoryKeys.all, 'stock-on-hand'] as const),
  netAvailable: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'net-available', params] as const)
      : ([...inventoryKeys.all, 'net-available'] as const),
  stockByStatus: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'stock-by-status', params] as const)
      : ([...inventoryKeys.all, 'stock-by-status'] as const),
  lotHistory: (lotId: string) => [...inventoryKeys.all, 'lot-history', lotId] as const,
  serialHistory: (serialId: string) => [...inventoryKeys.all, 'serial-history', serialId] as const,
  expiryReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'expiry-report', params] as const)
      : ([...inventoryKeys.all, 'expiry-report'] as const),
  agingReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'aging-report', params] as const)
      : ([...inventoryKeys.all, 'aging-report'] as const),
  movementHistory: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'movement-history', params] as const)
      : ([...inventoryKeys.all, 'movement-history'] as const),

  // Transactions
  grns: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'grns', params] as const)
      : ([...inventoryKeys.all, 'grns'] as const),
  grn: (id: string) => [...inventoryKeys.all, 'grn', id] as const,
  receiveStock: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'receive-stock', params] as const)
      : ([...inventoryKeys.all, 'receive-stock'] as const),
  pendingPutaway: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'pending-putaway', params] as const)
      : ([...inventoryKeys.all, 'pending-putaway'] as const),
  moveStock: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'move-stock', params] as const)
      : ([...inventoryKeys.all, 'move-stock'] as const),
  reservations: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'reservations', params] as const)
      : ([...inventoryKeys.all, 'reservations'] as const),
  adjustments: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'adjustments', params] as const)
      : ([...inventoryKeys.all, 'adjustments'] as const),
  statusChanges: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'status-changes', params] as const)
      : ([...inventoryKeys.all, 'status-changes'] as const),
  pickItems: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'pick-items', params] as const)
      : ([...inventoryKeys.all, 'pick-items'] as const),
  packs: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'packs', params] as const)
      : ([...inventoryKeys.all, 'packs'] as const),
  dispatches: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'dispatches', params] as const)
      : ([...inventoryKeys.all, 'dispatches'] as const),
  dispatch: (id: string) => [...inventoryKeys.all, 'dispatch', id] as const,
  customerReturns: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'customer-returns', params] as const)
      : ([...inventoryKeys.all, 'customer-returns'] as const),
  vendorReturns: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'vendor-returns', params] as const)
      : ([...inventoryKeys.all, 'vendor-returns'] as const),

  // Counts
  counts: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'counts', params] as const)
      : ([...inventoryKeys.all, 'counts'] as const),
  count: (id: string) => [...inventoryKeys.all, 'count', id] as const,

  // Approvals
  pendingApprovals: () => [...inventoryKeys.all, 'pending-approvals'] as const,
  approvalHistory: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'approval-history', params] as const)
      : ([...inventoryKeys.all, 'approval-history'] as const),

  // Dashboard
  dashboard: () => [...inventoryKeys.all, 'dashboard'] as const,
  activitySummary: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'activity-summary', params] as const)
      : ([...inventoryKeys.all, 'activity-summary'] as const),

  // Production
  issueToProduction: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'issue-to-production', params] as const)
      : ([...inventoryKeys.all, 'issue-to-production'] as const),
  issueToProductionDetail: (id: string) => [...inventoryKeys.all, 'issue-to-production-detail', id] as const,
  issuesByWorkOrder: (workOrderId: string) => [...inventoryKeys.all, 'issues-by-wo', workOrderId] as const,
  fgReceipts: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'fg-receipts', params] as const)
      : ([...inventoryKeys.all, 'fg-receipts'] as const),
  fgReceipt: (id: string) => [...inventoryKeys.all, 'fg-receipt', id] as const,
  materialReturns: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'material-returns', params] as const)
      : ([...inventoryKeys.all, 'material-returns'] as const),
  productionScraps: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'production-scraps', params] as const)
      : ([...inventoryKeys.all, 'production-scraps'] as const),
  scrapCategories: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'scrap-categories', params] as const)
      : ([...inventoryKeys.all, 'scrap-categories'] as const),
  woReconciliation: (workOrderId: string) => [...inventoryKeys.all, 'wo-reconciliation', workOrderId] as const,
  wipStock: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'wip-stock', params] as const)
      : ([...inventoryKeys.all, 'wip-stock'] as const),

  // Putaway Rules
  putawayRules: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'putaway-rules', params] as const)
      : ([...inventoryKeys.all, 'putaway-rules'] as const),

  // Pallets
  pallets: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'pallets', params] as const)
      : ([...inventoryKeys.all, 'pallets'] as const),
  pallet: (id: string) => [...inventoryKeys.all, 'pallet', id] as const,

  // Staging
  stagingInbound: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'staging-inbound', params] as const)
      : ([...inventoryKeys.all, 'staging-inbound'] as const),
  stagingOutbound: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'staging-outbound', params] as const)
      : ([...inventoryKeys.all, 'staging-outbound'] as const),
  stagingArea: (warehouseId: string) => [...inventoryKeys.all, 'staging-area', warehouseId] as const,

  // Tool Life Policies
  toolLifePolicies: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tool-life-policies', params] as const)
      : ([...inventoryKeys.all, 'tool-life-policies'] as const),
  toolLifePolicy: (partId: string) => [...inventoryKeys.all, 'tool-life-policy', partId] as const,

  // Tool at Machine
  toolsAtMachine: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tools-at-machine', params] as const)
      : ([...inventoryKeys.all, 'tools-at-machine'] as const),

  // Reconditioning
  reconditioning: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'reconditioning', params] as const)
      : ([...inventoryKeys.all, 'reconditioning'] as const),
  overdueReconditioning: () => [...inventoryKeys.all, 'reconditioning-overdue'] as const,

  // Tool Reports
  toolStatusReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tool-status-report', params] as const)
      : ([...inventoryKeys.all, 'tool-status-report'] as const),
  toolsAtMachineReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tools-at-machine-report', params] as const)
      : ([...inventoryKeys.all, 'tools-at-machine-report'] as const),
  toolConsumptionReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tool-consumption-report', params] as const)
      : ([...inventoryKeys.all, 'tool-consumption-report'] as const),
  reconditioningRegister: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'reconditioning-register', params] as const)
      : ([...inventoryKeys.all, 'reconditioning-register'] as const),
  toolBreakageReport: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'tool-breakage-report', params] as const)
      : ([...inventoryKeys.all, 'tool-breakage-report'] as const),

  // Industry Templates
  industryTemplates: () => [...inventoryKeys.all, 'industry-templates'] as const,
  industryTemplate: (id: string) => [...inventoryKeys.all, 'industry-template', id] as const,
  activeFieldConfig: () => [...inventoryKeys.all, 'active-field-config'] as const,

  // Compliance Documents
  complianceDocuments: (params?: Record<string, unknown>) =>
    params
      ? ([...inventoryKeys.all, 'compliance-documents', params] as const)
      : ([...inventoryKeys.all, 'compliance-documents'] as const),
  complianceDocument: (id: string) => [...inventoryKeys.all, 'compliance-document', id] as const,
  complianceByLot: (lotId: string) => [...inventoryKeys.all, 'compliance-by-lot', lotId] as const,
  complianceByPart: (partId: string) => [...inventoryKeys.all, 'compliance-by-part', partId] as const,
};
