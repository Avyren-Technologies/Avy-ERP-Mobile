import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supportApi } from '@/lib/api/support';
import { platformSupportKeys } from './use-support-queries';

/** Reply to a support ticket (as platform admin) */
export function useReplySupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      supportApi.replyToTicket(id, { body }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: platformSupportKeys.ticket(vars.id) });
    },
  });
}

/** Update support ticket status */
export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      supportApi.updateTicketStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformSupportKeys.tickets() });
    },
  });
}

/** Approve a module change request */
export function useApproveModuleChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportApi.approveModuleChange(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformSupportKeys.tickets() });
      qc.invalidateQueries({ queryKey: platformSupportKeys.stats() });
    },
  });
}

/** Reject a module change request */
export function useRejectModuleChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      supportApi.rejectModuleChange(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformSupportKeys.tickets() });
      qc.invalidateQueries({ queryKey: platformSupportKeys.stats() });
    },
  });
}
