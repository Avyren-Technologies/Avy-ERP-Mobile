import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '@/lib/socket';
import { companyAdminKeys } from '@/features/company-admin/api/use-company-admin-queries';
import { platformSupportKeys } from '@/features/super-admin/api/use-support-queries';

export function useTicketSocket(ticketId?: string, companyId?: string, isAdmin = false) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const socket = connectSocket();

        if (ticketId) socket.emit('join-ticket', ticketId);
        if (companyId) socket.emit('join-company', companyId);
        if (isAdmin) socket.emit('join-admin');

        const handleMessage = (data: any) => {
            if (data.ticketId) {
                queryClient.invalidateQueries({ queryKey: companyAdminKeys.supportTicket(data.ticketId) });
                queryClient.invalidateQueries({ queryKey: platformSupportKeys.ticket(data.ticketId) });
            }
        };

        const handleStatusChanged = (data: any) => {
            queryClient.invalidateQueries({ queryKey: companyAdminKeys.supportTickets() });
            queryClient.invalidateQueries({ queryKey: platformSupportKeys.tickets() });
            queryClient.invalidateQueries({ queryKey: platformSupportKeys.stats() });
            if (data.ticketId) {
                queryClient.invalidateQueries({ queryKey: companyAdminKeys.supportTicket(data.ticketId) });
                queryClient.invalidateQueries({ queryKey: platformSupportKeys.ticket(data.ticketId) });
            }
        };

        const handleNewTicket = () => {
            queryClient.invalidateQueries({ queryKey: platformSupportKeys.tickets() });
            queryClient.invalidateQueries({ queryKey: platformSupportKeys.stats() });
            queryClient.invalidateQueries({ queryKey: companyAdminKeys.supportTickets() });
        };

        socket.on('ticket:message', handleMessage);
        socket.on('ticket:status-changed', handleStatusChanged);
        socket.on('ticket:new', handleNewTicket);
        socket.on('ticket:resolved', handleStatusChanged);
        socket.on('ticket:updated', handleStatusChanged);

        return () => {
            if (ticketId) socket.emit('leave-ticket', ticketId);
            socket.off('ticket:message', handleMessage);
            socket.off('ticket:status-changed', handleStatusChanged);
            socket.off('ticket:new', handleNewTicket);
            socket.off('ticket:resolved', handleStatusChanged);
            socket.off('ticket:updated', handleStatusChanged);
        };
    }, [ticketId, companyId, isAdmin, queryClient]);
}
