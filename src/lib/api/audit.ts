import { client } from '@/lib/api/client';

export interface AuditLogParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const auditApi = {
  listAuditLogs: (params: AuditLogParams = {}) =>
    client.get('/platform/audit-logs', { params }),

  getAuditLogById: (id: string) =>
    client.get(`/platform/audit-logs/${id}`),

  getFilterOptions: () =>
    client.get('/platform/audit-logs/filters'),

  getEntityAuditLogs: (entityType: string, entityId: string) =>
    client.get(`/platform/audit-logs/entity/${entityType}/${entityId}`),

  // Tenant-scoped audit logs (company-admin)
  listTenantAuditLogs: (params: AuditLogParams = {}) =>
    client.get('/company/audit-logs', { params }),

  getTenantFilterOptions: () =>
    client.get('/company/audit-logs/filters'),
};
