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
};
