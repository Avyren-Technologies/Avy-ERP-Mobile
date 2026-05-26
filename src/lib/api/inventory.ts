import { client } from '@/lib/api/client';

export const inventoryApi = {
  // ── Config ──
  getConfig: () => client.get('/inventory/config'),
  updateConfig: (data: Record<string, unknown>) => client.patch('/inventory/config', data),
  getOnboardingStatus: () => client.get('/inventory/config/onboarding'),
  completeOnboardingStep: (step: number) => client.patch(`/inventory/config/onboarding/${step}`),

  // ── Warehouses ──
  listWarehouses: (params?: Record<string, unknown>) => client.get('/inventory/warehouses', { params }),
  getWarehouse: (id: string) => client.get(`/inventory/warehouses/${id}`),
  createWarehouse: (data: Record<string, unknown>) => client.post('/inventory/warehouses', data),
  updateWarehouse: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => client.delete(`/inventory/warehouses/${id}`),

  // ── Zones ──
  listZones: (params?: Record<string, unknown>) => client.get('/inventory/zones', { params }),
  createZone: (data: Record<string, unknown>) => client.post('/inventory/zones', data),
  updateZone: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/zones/${id}`, data),
  deleteZone: (id: string) => client.delete(`/inventory/zones/${id}`),

  // ── Bins ──
  listBins: (params?: Record<string, unknown>) => client.get('/inventory/bins', { params }),
  createBin: (data: Record<string, unknown>) => client.post('/inventory/bins', data),
  updateBin: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/bins/${id}`, data),
  deleteBin: (id: string) => client.delete(`/inventory/bins/${id}`),

  // ── Item Stock Policies ──
  listItemPolicies: (params?: Record<string, unknown>) => client.get('/inventory/item-policies', { params }),
  getItemPolicy: (partId: string) => client.get(`/inventory/item-policies/${partId}`),
  upsertItemPolicy: (data: Record<string, unknown>) => client.post('/inventory/item-policies', data),

  // ── Reason Codes ──
  listReasonCodes: (params?: Record<string, unknown>) => client.get('/inventory/reason-codes', { params }),
  createReasonCode: (data: Record<string, unknown>) => client.post('/inventory/reason-codes', data),
  updateReasonCode: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/reason-codes/${id}`, data),
  deleteReasonCode: (id: string) => client.delete(`/inventory/reason-codes/${id}`),

  // ── Approval Thresholds ──
  listApprovalThresholds: (params?: Record<string, unknown>) => client.get('/inventory/approval-thresholds', { params }),
  createApprovalThreshold: (data: Record<string, unknown>) => client.post('/inventory/approval-thresholds', data),
  updateApprovalThreshold: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/approval-thresholds/${id}`, data),
  deleteApprovalThreshold: (id: string) => client.delete(`/inventory/approval-thresholds/${id}`),

  // ── Handling Units ──
  listHandlingUnits: (params?: Record<string, unknown>) => client.get('/inventory/handling-units', { params }),
  createHandlingUnit: (data: Record<string, unknown>) => client.post('/inventory/handling-units', data),
  updateHandlingUnit: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/handling-units/${id}`, data),
  deleteHandlingUnit: (id: string) => client.delete(`/inventory/handling-units/${id}`),

  // ── Transactions ──
  createReceiveStock: (data: Record<string, unknown>) => client.post('/inventory/transactions/receive-stock', data),
  listReceiveStock: (params?: Record<string, unknown>) => client.get('/inventory/transactions/receive-stock', { params }),
  getReceiveStock: (id: string) => client.get(`/inventory/transactions/receive-stock/${id}`),

  createGrn: (data: Record<string, unknown>) => client.post('/inventory/transactions/grn', data),
  listGrns: (params?: Record<string, unknown>) => client.get('/inventory/transactions/grn', { params }),
  getGrn: (id: string) => client.get(`/inventory/transactions/grn/${id}`),

  confirmPutaway: (data: Record<string, unknown>) => client.post('/inventory/transactions/put-away', data),
  listPendingPutaway: (params?: Record<string, unknown>) => client.get('/inventory/transactions/put-away/pending', { params }),

  createMoveStock: (data: Record<string, unknown>) => client.post('/inventory/transactions/move-stock', data),
  confirmMoveReceipt: (id: string) => client.post(`/inventory/transactions/move-stock/${id}/confirm-receipt`),
  listMoveStock: (params?: Record<string, unknown>) => client.get('/inventory/transactions/move-stock', { params }),

  createReserveStock: (data: Record<string, unknown>) => client.post('/inventory/transactions/reserve-stock', data),
  releaseReservation: (id: string) => client.post(`/inventory/transactions/reserve-stock/${id}/release`),
  listReservations: (params?: Record<string, unknown>) => client.get('/inventory/transactions/reserve-stock', { params }),

  createAdjustStock: (data: Record<string, unknown>) => client.post('/inventory/transactions/adjust-stock', data),
  createOpeningBalance: (data: Record<string, unknown>) => client.post('/inventory/transactions/adjust-stock/opening-balance', data),
  listAdjustments: (params?: Record<string, unknown>) => client.get('/inventory/transactions/adjust-stock', { params }),

  createChangeStatus: (data: Record<string, unknown>) => client.post('/inventory/transactions/change-status', data),
  listStatusChanges: (params?: Record<string, unknown>) => client.get('/inventory/transactions/change-status', { params }),

  createPickItems: (data: Record<string, unknown>) => client.post('/inventory/transactions/pick-items', data),
  confirmPick: (id: string, data: Record<string, unknown>) => client.post(`/inventory/transactions/pick-items/${id}/confirm`, data),
  listPickItems: (params?: Record<string, unknown>) => client.get('/inventory/transactions/pick-items', { params }),

  createPack: (data: Record<string, unknown>) => client.post('/inventory/transactions/pack', data),
  listPacks: (params?: Record<string, unknown>) => client.get('/inventory/transactions/pack', { params }),

  createDispatch: (data: Record<string, unknown>) => client.post('/inventory/transactions/dispatch', data),
  listDispatches: (params?: Record<string, unknown>) => client.get('/inventory/transactions/dispatch', { params }),
  getDispatch: (id: string) => client.get(`/inventory/transactions/dispatch/${id}`),

  createCustomerReturn: (data: Record<string, unknown>) => client.post('/inventory/transactions/customer-return', data),
  inspectReturn: (id: string, data: Record<string, unknown>) => client.post(`/inventory/transactions/customer-return/${id}/inspect`, data),
  listCustomerReturns: (params?: Record<string, unknown>) => client.get('/inventory/transactions/customer-return', { params }),

  createVendorReturn: (data: Record<string, unknown>) => client.post('/inventory/transactions/vendor-return', data),
  listVendorReturns: (params?: Record<string, unknown>) => client.get('/inventory/transactions/vendor-return', { params }),

  // ── Stock Explorer ──
  getStockOnHand: (params?: Record<string, unknown>) => client.get('/inventory/stock/on-hand', { params }),
  getNetAvailable: (params?: Record<string, unknown>) => client.get('/inventory/stock/net-available', { params }),
  getStockByStatus: (params?: Record<string, unknown>) => client.get('/inventory/stock/by-status', { params }),
  getLotHistory: (lotId: string) => client.get(`/inventory/stock/lot/${lotId}`),
  getSerialHistory: (serialId: string) => client.get(`/inventory/stock/serial/${serialId}`),
  getExpiryReport: (params?: Record<string, unknown>) => client.get('/inventory/stock/expiry-report', { params }),
  getAgingReport: (params?: Record<string, unknown>) => client.get('/inventory/stock/aging-report', { params }),
  getMovementHistory: (params?: Record<string, unknown>) => client.get('/inventory/stock/movement-history', { params }),

  // ── Counts ──
  createCount: (data: Record<string, unknown>) => client.post('/inventory/counts', data),
  listCounts: (params?: Record<string, unknown>) => client.get('/inventory/counts', { params }),
  getCount: (id: string) => client.get(`/inventory/counts/${id}`),
  enterCount: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/counts/${id}/enter`, data),
  submitCount: (id: string) => client.patch(`/inventory/counts/${id}/submit`),
  approveCount: (id: string, data?: Record<string, unknown>) => client.patch(`/inventory/counts/${id}/approve`, data),

  // ── Approvals ──
  listPendingApprovals: () => client.get('/inventory/approvals/pending'),
  approveTransaction: (id: string) => client.patch(`/inventory/approvals/${id}/approve`),
  rejectTransaction: (id: string, data: Record<string, unknown>) => client.patch(`/inventory/approvals/${id}/reject`, data),
  getApprovalHistory: (params?: Record<string, unknown>) => client.get('/inventory/approvals/history', { params }),

  // ── Dashboard ──
  getDashboard: () => client.get('/inventory/dashboard'),
  getActivitySummary: (params?: Record<string, unknown>) => client.get('/inventory/dashboard/activity-summary', { params }),

  // ── Reports ──
  getTransactionRegister: (params?: Record<string, unknown>) => client.get('/inventory/reports/transaction-register', { params }),
  getCountVariance: (params?: Record<string, unknown>) => client.get('/inventory/reports/count-variance', { params }),
  getAdjustmentRegister: (params?: Record<string, unknown>) => client.get('/inventory/reports/adjustment-register', { params }),
  getTransferLog: (params?: Record<string, unknown>) => client.get('/inventory/reports/transfer-log', { params }),
};
