import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { notificationApi } from '@/lib/api/notifications';

/**
 * Subscribes to the backend 'notification:new' Socket.io event after the user
 * signs in and invalidates the notification React Query cache so the bell
 * icon refreshes instantly. In dev builds, also shows a local notification
 * so foreground events are visible without needing real push delivery.
 *
 * Contract: the socket payload is a UI hint only — we always re-fetch via
 * React Query. Never append the payload directly.
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const status = useAuthStore.use.status();

  useEffect(() => {
    if (status !== 'signIn') return;

    const socket = connectSocket();

    const handler = async () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (__DEV__) {
        try {
          const fresh: any = await notificationApi.listNotifications({ limit: 1 });
          const latest =
            fresh?.data?.notifications?.[0] ??
            fresh?.data?.[0] ??
            fresh?.notifications?.[0];
          if (latest) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: latest.title,
                body: latest.body,
                data: { notificationId: latest.id, dev: true },
              },
              trigger: null,
            });
          }
        } catch {
          // non-fatal — dev helper only
        }
      }
    };

    socket.on('notification:new', handler);

    return () => {
      getSocket().off('notification:new', handler);
      disconnectSocket();
    };
  }, [status, queryClient]);
}
