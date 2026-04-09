import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { connectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { notificationApi } from '@/lib/api/notifications';

/**
 * Subscribes to the backend 'notification:new' Socket.io event after the user
 * signs in and invalidates the notification React Query cache so the bell
 * icon refreshes instantly.
 *
 * Contract:
 *   - The socket is a *shared singleton* owned by the app, not by this hook.
 *     We only unsubscribe on unmount; we never disconnect the socket here.
 *     Sign-out is responsible for disconnect (see use-auth-store signOut()).
 *   - The payload is a UI hint only — we always re-fetch via React Query.
 *   - Scoped invalidation: only invalidates unread-count and list keys so
 *     preferences don't refetch on every bell ping.
 *   - Dev-only local notification echo is gated on __DEV__ AND
 *     !Device.isDevice so it never runs on a real device (where real FCM
 *     delivery would duplicate it).
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const status = useAuthStore.use.status();

  // Stable ref so the off() call in cleanup matches the exact handler
  // we registered, even across React re-renders.
  const handlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (status !== 'signIn') return;

    const socket = connectSocket();

    const handler = async () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });

      // Dev-only local notification echo, only on simulator/emulator where
      // real FCM is not delivered. On physical devices the real push would
      // duplicate this.
      if (__DEV__ && !Device.isDevice) {
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

    handlerRef.current = handler;
    socket.on('notification:new', handler);

    return () => {
      const captured = handlerRef.current;
      if (captured) {
        getSocket().off('notification:new', captured);
      }
      // DO NOT call disconnectSocket() — other features (tickets, chat)
      // share the same singleton.
    };
  }, [status, queryClient]);
}
