import { useQuery } from '@tanstack/react-query';

import { auditApi, AuditLogParams } from '@/lib/api/audit';

export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.listAuditLogs(params),
  });
}

export function useAuditLogDetail(id: string) {
  return useQuery({
    queryKey: ['audit-log', id],
    queryFn: () => auditApi.getAuditLogById(id),
    enabled: !!id,
  });
}

export function useAuditFilterOptions() {
  return useQuery({
    queryKey: ['audit-log-filters'],
    queryFn: () => auditApi.getFilterOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEntityAuditLogs(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['audit-logs', 'entity', entityType, entityId],
    queryFn: () => auditApi.getEntityAuditLogs(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
}
