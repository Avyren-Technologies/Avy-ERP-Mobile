import { client } from './client';

export const supportApi = {
  listTickets: (params?: { status?: string; category?: string; search?: string; page?: number; limit?: number }) =>
    client.get('/platform/support/tickets', { params }),

  getTicket: (id: string) =>
    client.get(`/platform/support/tickets/${id}`),

  replyToTicket: (id: string, data: { body: string }) =>
    client.post(`/platform/support/tickets/${id}/messages`, data),

  updateTicketStatus: (id: string, data: { status: string }) =>
    client.patch(`/platform/support/tickets/${id}/status`, data),

  approveModuleChange: (id: string) =>
    client.post(`/platform/support/tickets/${id}/approve-module`),

  rejectModuleChange: (id: string, data: { reason: string }) =>
    client.post(`/platform/support/tickets/${id}/reject-module`, data),

  getStats: () =>
    client.get('/platform/support/stats'),
};
