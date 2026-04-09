import { useQuery } from '@tanstack/react-query';

import { notificationKeys } from '@/features/notifications/notifications-sheet';
import { notificationApi } from '@/lib/api/notifications';

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    // Socket.io drives real-time updates via 'notification:new'. We keep a
    // long-interval fallback poll (5 min) to recover if the socket drops.
    refetchInterval: 300000,
  });
}
