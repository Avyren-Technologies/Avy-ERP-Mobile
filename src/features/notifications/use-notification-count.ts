import { useQuery } from '@tanstack/react-query';

import { notificationKeys } from '@/features/notifications/notifications-sheet';
import { notificationApi } from '@/lib/api/notifications';

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}
