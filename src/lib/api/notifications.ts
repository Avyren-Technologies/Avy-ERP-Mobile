import { client } from '@/lib/api/client';

export const notificationApi = {
  listNotifications: (params?: { page?: number; limit?: number }) =>
    client.get('/notifications', { params }),

  getUnreadCount: () =>
    client.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    client.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    client.patch('/notifications/read-all'),
};
