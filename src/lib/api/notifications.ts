import { client } from '@/lib/api/client';

export interface NotificationPreferenceData {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  deviceStrategy: 'ALL' | 'LATEST_ONLY';
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface NotificationPreferencesResponse {
  preference: NotificationPreferenceData;
  companyMasters: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export const notificationApi = {
  listNotifications: (params?: { page?: number; limit?: number }) =>
    client.get('/notifications', { params }),

  getUnreadCount: () => client.get('/notifications/unread-count'),

  markAsRead: (id: string) => client.patch(`/notifications/${id}/read`),

  markAllAsRead: () => client.patch('/notifications/read-all'),

  archive: (id: string) => client.patch(`/notifications/${id}/archive`),

  getPreferences: () => client.get('/notifications/preferences'),

  updatePreferences: (data: Partial<NotificationPreferenceData>) =>
    client.patch('/notifications/preferences', data),

  getDeliveryEvents: (id: string) => client.get(`/notifications/${id}/events`),

  sendTestNotification: () => client.post('/notifications/test'),
};
