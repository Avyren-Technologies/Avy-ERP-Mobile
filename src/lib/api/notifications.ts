import { client } from '@/lib/api/client';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP';

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

export interface NotificationCategoryPreference {
  category: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationCategoryDef {
  code: string;
  label: string;
  description: string;
  locked?: boolean;
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
  categoryPreferences: NotificationCategoryPreference[];
  categoryCatalogue: NotificationCategoryDef[];
}

export interface NotificationListItem {
  id: string;
  title: string;
  body: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
}

/**
 * The mobile axios client strips the outer AxiosResponse wrapper in a response
 * interceptor (see src/lib/api/client.tsx), so callers receive the API
 * envelope `{ success, data, meta? }` directly. Methods here return `Promise<any>`
 * to match the existing client pattern; strongly-typed shapes are exposed via
 * the interfaces above so consumers can annotate their own usage site.
 */
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

  updateCategoryPreferences: (categoryPreferences: NotificationCategoryPreference[]) =>
    client.patch('/notifications/preferences/categories', { categoryPreferences }),

  getDeliveryEvents: (id: string) => client.get(`/notifications/${id}/events`),

  sendTestNotification: () => client.post('/notifications/test'),
};
