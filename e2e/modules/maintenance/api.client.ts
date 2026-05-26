import { BaseApiClient } from '../../shared/helpers/api-client';

/**
 * Maintenance module API client for Detox E2E tests.
 */
export class MaintenanceApiClient extends BaseApiClient {
  // ── Assets ─────────────────────────────
  async listAssets(params?: Record<string, string>) {
    return this.get('/maintenance/assets', params);
  }

  async createAsset(data: Record<string, unknown>) {
    return this.post('/maintenance/assets', data);
  }

  async getAsset(id: string) {
    return this.get(`/maintenance/assets/${id}`);
  }

  // ── Work Orders ────────────────────────
  async listWorkOrders(params?: Record<string, string>) {
    return this.get('/maintenance/work-orders', params);
  }

  async createWorkOrder(data: Record<string, unknown>) {
    return this.post('/maintenance/work-orders', data);
  }

  async getWorkOrder(id: string) {
    return this.get(`/maintenance/work-orders/${id}`);
  }

  async approveWorkOrder(id: string, data?: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/approve`, data);
  }

  async assignWorkOrder(id: string, data: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/assign`, data);
  }

  async acknowledgeWorkOrder(id: string) {
    return this.post(`/maintenance/work-orders/${id}/acknowledge`);
  }

  async startWorkOrder(id: string) {
    return this.post(`/maintenance/work-orders/${id}/start`);
  }

  async holdWorkOrder(id: string, data: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/hold`, data);
  }

  async resumeWorkOrder(id: string) {
    return this.post(`/maintenance/work-orders/${id}/resume`);
  }

  async completeWorkOrder(id: string, data?: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/complete`, data);
  }

  async closeWorkOrder(id: string, data?: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/close`, data);
  }

  async cancelWorkOrder(id: string, data?: Record<string, unknown>) {
    return this.post(`/maintenance/work-orders/${id}/cancel`, data);
  }

  // ── Work Requests ──────────────────────
  async listWorkRequests(params?: Record<string, string>) {
    return this.get('/maintenance/work-requests', params);
  }

  async createWorkRequest(data: Record<string, unknown>) {
    return this.post('/maintenance/work-requests', data);
  }

  // ── Config ─────────────────────────────
  async getMaintenanceConfig() {
    return this.get('/maintenance/config');
  }

  async getDashboard(role = 'manager') {
    return this.get(`/maintenance/dashboard/${role}`);
  }
}
