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

  // Phase 3 — Warehouse Advanced
  putawayRules: {
    root: 'inv-putaway-rules-root',
    addButton: 'inv-putaway-rules-add-btn',
    list: 'inv-putaway-rules-list',
  },
  pallets: {
    root: 'inv-pallets-root',
    addButton: 'inv-pallets-add-btn',
    list: 'inv-pallets-list',
  },
  staging: {
    root: 'inv-staging-root',
    tabInbound: 'inv-staging-tab-inbound',
    tabOutbound: 'inv-staging-tab-outbound',
  },
  warehouseScan: {
    root: 'inv-scan-root',
    putawayScan: 'inv-scan-putaway',
    pickScan: 'inv-scan-pick',
    countScan: 'inv-scan-count',
    dispatchScan: 'inv-scan-dispatch',
    barcodeInput: 'inv-scan-barcode-input',
    scanButton: 'inv-scan-btn',
  },

  // Phase 3 — Tool Room
  toolLifePolicies: {
    root: 'inv-tool-policies-root',
    list: 'inv-tool-policies-list',
    upsertBtn: 'inv-tool-policies-upsert-btn',
  },
  toolIssue: {
    root: 'inv-tool-issue-root',
    addButton: 'inv-tool-issue-add-btn',
    machineSelect: 'inv-tool-issue-machine',
  },
  toolReturn: {
    root: 'inv-tool-return-root',
    addButton: 'inv-tool-return-add-btn',
    outcomeSelect: 'inv-tool-return-outcome',
  },
  reconditioning: {
    root: 'inv-reconditioning-root',
    list: 'inv-reconditioning-list',
    initiateBtn: 'inv-reconditioning-initiate-btn',
    completeBtn: 'inv-reconditioning-complete-btn',
  },
  toolReports: {
    root: 'inv-tool-reports-root',
    tabStatus: 'inv-tool-reports-tab-status',
    tabAtMachine: 'inv-tool-reports-tab-at-machine',
    tabConsumption: 'inv-tool-reports-tab-consumption',
    tabReconditioning: 'inv-tool-reports-tab-reconditioning',
    tabBreakage: 'inv-tool-reports-tab-breakage',
  },

  // Phase 4 — Industry Templates & Compliance
  industryTemplates: {
    root: 'inv-industry-templates-root',
    list: 'inv-industry-templates-list',
    templateCard: 'inv-industry-template-card',
    activateBtn: 'inv-industry-template-activate-btn',
    cloneBtn: 'inv-industry-template-clone-btn',
  },
  complianceDocs: {
    root: 'inv-compliance-docs-root',
    list: 'inv-compliance-docs-list',
    addButton: 'inv-compliance-docs-add-btn',
    deleteBtn: 'inv-compliance-docs-delete-btn',
  },

  // Phase 6 — Offline Sync
  sync: {
    statusIndicator: 'inv-sync-status',
    conflictsScreen: 'inv-sync-conflicts-root',
    conflictCard: 'inv-sync-conflict-card',
    resolveServerBtn: 'inv-sync-resolve-server',
    resolveOfflineBtn: 'inv-sync-resolve-offline',
    backBtn: 'inv-sync-back-btn',
  },

  // Phase 5 — Analytics, Search, Import/Export
  analytics: {
    root: 'inv-analytics-root',
    kpiTurnover: 'inv-analytics-kpi-turnover',
    kpiFillRate: 'inv-analytics-kpi-fill-rate',
    kpiAccuracy: 'inv-analytics-kpi-accuracy',
    trendChart: 'inv-analytics-trend-chart',
  },
  stockValue: {
    root: 'inv-stock-value-root',
    warehouseList: 'inv-stock-value-warehouse-list',
    totalValue: 'inv-stock-value-total',
  },
  search: {
    root: 'inv-search-root',
    searchInput: 'inv-search-input',
    entityFilter: 'inv-search-entity-filter',
    resultsList: 'inv-search-results-list',
  },
  importData: {
    root: 'inv-import-root',
    uploadBtn: 'inv-import-upload-btn',
    previewTable: 'inv-import-preview-table',
    commitBtn: 'inv-import-commit-btn',
    jobsList: 'inv-import-jobs-list',
  },
  exportData: {
    root: 'inv-export-root',
    templateSelect: 'inv-export-template-select',
    exportBtn: 'inv-export-btn',
  },
  savedFilters: {
    root: 'inv-saved-filters-root',
    list: 'inv-saved-filters-list',
    saveBtn: 'inv-saved-filters-save-btn',
    deleteBtn: 'inv-saved-filters-delete-btn',
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
  // Phase 3 — Warehouse Advanced
  putawayRules: '/inventory/warehouse/putaway-rules',
  pallets: '/inventory/warehouse/pallets',
  staging: '/inventory/warehouse/staging',
  putawayScan: '/inventory/warehouse/scan/putaway',
  pickScan: '/inventory/warehouse/scan/pick',
  countScan: '/inventory/warehouse/scan/count',
  dispatchScan: '/inventory/warehouse/scan/dispatch',
  // Phase 3 — Tool Room
  toolLifePolicies: '/inventory/tool-room/policies',
  toolIssue: '/inventory/tool-room/issue',
  toolReturn: '/inventory/tool-room/return',
  reconditioning: '/inventory/tool-room/reconditioning',
  toolReports: '/inventory/tool-room/reports',
  toolReportsAtMachine: '/inventory/tool-room/reports/at-machine',
  // Phase 4 — Industry Templates & Compliance
  industry: '/inventory/industry',
  // Phase 5 — Analytics, Search, Import/Export
  analytics: '/inventory/analytics',
  analyticsStockValue: '/inventory/analytics-stock-value',
  search: '/inventory/search',
  importData: '/inventory/import',
  exportData: '/inventory/export',
  // Phase 6 — Offline Sync
  syncConflicts: '/inventory/sync-conflicts',
};
