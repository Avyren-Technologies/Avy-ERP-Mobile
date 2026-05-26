/**
 * Inventory module — testIDs and navigation routes.
 *
 * IMPORTANT: These testIDs must match the testID props in the actual
 * React Native components. Add testID props to components as you write tests.
 *
 * Convention: inv-<screen>-<element>
 */
export const INV_TEST_IDS = {
  // Dashboard
  dashboard: {
    root: 'inv-dashboard-root',
    kpiPendingTasks: 'inv-dashboard-kpi-pending',
    kpiStockRisks: 'inv-dashboard-kpi-risks',
    kpiActivity: 'inv-dashboard-kpi-activity',
  },

  // Stock Explorer
  stockExplorer: {
    root: 'inv-stock-explorer-root',
    searchInput: 'inv-stock-search',
    filterWarehouse: 'inv-stock-filter-warehouse',
    list: 'inv-stock-list',
  },

  // GRN
  grnList: {
    root: 'inv-grn-list-root',
    searchInput: 'inv-grn-search',
    addButton: 'inv-grn-add-btn',
    list: 'inv-grn-list',
  },
  grnDetail: {
    root: 'inv-grn-detail-root',
    statusBadge: 'inv-grn-status',
    lineItems: 'inv-grn-line-items',
  },

  // Receive Stock
  receiveStock: {
    root: 'inv-receive-root',
    addButton: 'inv-receive-add-btn',
    list: 'inv-receive-list',
  },

  // Put Away
  putAway: {
    root: 'inv-putaway-root',
    taskList: 'inv-putaway-tasks',
    confirmBtn: 'inv-putaway-confirm-btn',
  },

  // Transfer
  transfer: {
    root: 'inv-transfer-root',
    addButton: 'inv-transfer-add-btn',
    list: 'inv-transfer-list',
    confirmReceiptBtn: 'inv-transfer-confirm-btn',
  },

  // Adjustments
  adjustments: {
    root: 'inv-adjust-root',
    addButton: 'inv-adjust-add-btn',
    list: 'inv-adjust-list',
  },

  // Pick Items
  pickItems: {
    root: 'inv-pick-root',
    addButton: 'inv-pick-add-btn',
    list: 'inv-pick-list',
    confirmBtn: 'inv-pick-confirm-btn',
  },

  // Dispatch
  dispatch: {
    root: 'inv-dispatch-root',
    addButton: 'inv-dispatch-add-btn',
    list: 'inv-dispatch-list',
  },

  // Customer Returns
  customerReturn: {
    root: 'inv-return-root',
    addButton: 'inv-return-add-btn',
    list: 'inv-return-list',
    inspectBtn: 'inv-return-inspect-btn',
  },

  // Counts
  countList: {
    root: 'inv-count-list-root',
    addButton: 'inv-count-add-btn',
    list: 'inv-count-list',
  },
  countDetail: {
    root: 'inv-count-detail-root',
    submitBtn: 'inv-count-submit-btn',
    approveBtn: 'inv-count-approve-btn',
  },

  // Approvals
  approvals: {
    root: 'inv-approvals-root',
    list: 'inv-approvals-list',
    approveBtn: 'inv-approval-approve-btn',
    rejectBtn: 'inv-approval-reject-btn',
  },

  // Reports
  reports: {
    root: 'inv-reports-root',
    tabTransactions: 'inv-reports-tab-transactions',
    tabVariance: 'inv-reports-tab-variance',
  },

  // Config
  config: {
    root: 'inv-config-root',
    saveBtn: 'inv-config-save-btn',
  },

  // Phase 2 — Production
  issueToProduction: {
    root: 'inv-prod-issue-root',
    addButton: 'inv-prod-issue-add-btn',
    list: 'inv-prod-issue-list',
  },
  fgReceipt: {
    root: 'inv-fg-receipt-root',
    addButton: 'inv-fg-receipt-add-btn',
    list: 'inv-fg-receipt-list',
  },
  materialReturn: {
    root: 'inv-mat-return-root',
    addButton: 'inv-mat-return-add-btn',
    conditionUnused: 'inv-mat-return-condition-unused',
    conditionPartial: 'inv-mat-return-condition-partial',
    conditionContaminated: 'inv-mat-return-condition-contaminated',
  },
  productionScrap: {
    root: 'inv-prod-scrap-root',
    addButton: 'inv-prod-scrap-add-btn',
  },
  woReconciliation: {
    root: 'inv-wo-recon-root',
    generateBtn: 'inv-wo-recon-generate-btn',
  },
};

/**
 * Expo Router paths for inventory screens.
 * Used with device.openURL() or navigation.
 */
export const INV_ROUTES = {
  dashboard: '/inventory',
  stockExplorer: '/inventory/stock',
  receive: '/inventory/receive',
  grn: '/inventory/grn',
  putAway: '/inventory/put-away',
  transfer: '/inventory/transfer',
  adjustments: '/inventory/adjustments',
  issue: '/inventory/issue',
  dispatch: '/inventory/dispatch',
  returns: '/inventory/returns',
  counts: '/inventory/counts',
  countsNew: '/inventory/counts/new',
  approvals: '/inventory/approvals',
  reports: '/inventory/reports',
  config: '/inventory/config',
  // Phase 2
  productionIssue: '/inventory/production/issue',
  fgReceipt: '/inventory/production/fg-receipt',
  materialReturn: '/inventory/production/material-return',
  productionScrap: '/inventory/production/scrap',
  woReconciliation: '/inventory/production/reconciliation',
};
