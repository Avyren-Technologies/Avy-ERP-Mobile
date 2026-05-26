import { BaseApiClient } from '../../shared/helpers/api-client';

/**
 * Inventory module API client for Detox E2E tests.
 */
export class InventoryMobileApiClient extends BaseApiClient {
  // ── Warehouses ────────────────────────
  async listWarehouses() {
    return this.get('/inventory/warehouses');
  }

  async createWarehouse(data: Record<string, unknown>) {
    return this.post('/inventory/warehouses', data);
  }

  // ── Transactions ──────────────────────
  async listGrns() {
    return this.get('/inventory/transactions/grn');
  }

  async getStockOnHand() {
    return this.get('/inventory/stock/on-hand');
  }

  // ── Dashboard ─────────────────────────
  async getDashboard() {
    return this.get('/inventory/dashboard');
  }

  // ── Counts ────────────────────────────
  async listCounts() {
    return this.get('/inventory/counts');
  }

  // ── Approvals ─────────────────────────
  async listPendingApprovals() {
    return this.get('/inventory/approvals/pending');
  }

  // ── Production ────────────────────────
  async listIssueToProduction() {
    return this.get('/inventory/transactions/issue-to-production');
  }

  async listScrapCategories() {
    return this.get('/inventory/scrap-categories');
  }

  // ── Seed Data ─────────────────────────
  async seedInventoryData() {
    const screens = [
      { code: 'TXN', linkedScreen: 'Inventory Transaction', prefix: 'TXN-' },
      { code: 'GRN', linkedScreen: 'Goods Receipt Note', prefix: 'GRN-' },
      { code: 'DSP', linkedScreen: 'Dispatch Note', prefix: 'DSP-' },
      { code: 'CNT', linkedScreen: 'Stock Count', prefix: 'CNT-' },
    ];
    for (const s of screens) {
      try {
        await this.post('/company/no-series', { ...s, startNumber: 1, numberCount: 5 });
      } catch {
        // Series may already exist
      }
    }

    const wh = await this.listWarehouses();
    if (wh?.data?.length > 0) return { warehouseId: wh.data[0].id };

    const res = await this.createWarehouse({ code: 'WH-E2E', name: 'E2E Warehouse' });
    return { warehouseId: res?.data?.id };
  }
}
