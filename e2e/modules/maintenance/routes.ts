/**
 * Maintenance module — testIDs and navigation routes.
 *
 * IMPORTANT: These testIDs must match the testID props in the actual
 * React Native components. Add testID props to components as you write tests.
 *
 * Convention: maint-<screen>-<element>
 */
export const MAINT_TEST_IDS = {
  // Dashboard
  dashboard: {
    root: 'maint-dashboard-root',
    statsCard: 'maint-dashboard-stats',
  },

  // Asset Register
  assetList: {
    root: 'maint-asset-list-root',
    searchInput: 'maint-asset-search',
    addButton: 'maint-asset-add-btn',
    list: 'maint-asset-list',
  },

  // Work Orders
  workOrderList: {
    root: 'maint-wo-list-root',
    searchInput: 'maint-wo-search',
    statusFilter: 'maint-wo-status-filter',
    list: 'maint-wo-list',
  },
  workOrderDetail: {
    root: 'maint-wo-detail-root',
    approveBtn: 'maint-wo-detail-approve-btn',
    assignBtn: 'maint-wo-detail-assign-btn',
    startBtn: 'maint-wo-detail-start-btn',
    holdBtn: 'maint-wo-detail-hold-btn',
    completeBtn: 'maint-wo-detail-complete-btn',
    closeBtn: 'maint-wo-detail-close-btn',
    cancelBtn: 'maint-wo-detail-cancel-btn',
    statusBadge: 'maint-wo-detail-status',
    tabOverview: 'maint-wo-tab-overview',
    tabChecklist: 'maint-wo-tab-checklist',
    tabParts: 'maint-wo-tab-parts',
    tabLabour: 'maint-wo-tab-labour',
  },

  // Work Requests
  workRequestList: {
    root: 'maint-wr-list-root',
    searchInput: 'maint-wr-search',
    newButton: 'maint-wr-new-btn',
  },
  workRequestCreate: {
    assetPicker: 'maint-wr-create-asset',
    typeSelect: 'maint-wr-create-type',
    prioritySelect: 'maint-wr-create-priority',
    description: 'maint-wr-create-description',
    submitBtn: 'maint-wr-create-submit',
  },

  // Breakdown
  breakdownLog: {
    root: 'maint-breakdown-root',
    assetPicker: 'maint-breakdown-asset',
    description: 'maint-breakdown-description',
    submitBtn: 'maint-breakdown-submit',
  },
};

/**
 * Expo Router paths for maintenance screens.
 * Used with device.openURL() or navigation.
 */
export const MAINT_ROUTES = {
  dashboard: '/maintenance/dashboard',
  assets: '/maintenance/assets',
  workOrders: '/maintenance/work-orders',
  workOrderDetail: (id: string) => `/maintenance/work-order-detail?id=${id}`,
  workRequests: '/maintenance/work-requests',
  workRequestCreate: '/maintenance/work-request-create',
  breakdownLog: '/maintenance/breakdown-log',
  pmSchedules: '/maintenance/pm-schedules',
  config: '/maintenance/config',
};
