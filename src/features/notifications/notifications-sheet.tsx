/* eslint-disable better-tailwindcss/no-unknown-classes */
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { DateTime } from 'luxon';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useUnreadNotificationCount } from '@/features/notifications/use-notification-count';
import { notificationApi } from '@/lib/api/notifications';

// ── Query key factory ──

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  list: (params?: { page?: number; limit?: number }) =>
    params
      ? ([...notificationKeys.all, 'list', params] as const)
      : ([...notificationKeys.all, 'list'] as const),
};

// ── Time formatting ──

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return DateTime.fromISO(dateStr).toFormat('dd/MM/yyyy');
}

// ── Type badge colors ──

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  info: { bg: colors.info[100], text: colors.info[700] },
  success: { bg: colors.success[100], text: colors.success[700] },
  warning: { bg: colors.warning[100], text: colors.warning[700] },
  danger: { bg: colors.danger[100], text: colors.danger[700] },
};

// ── Notification item ──

interface NotificationItemData {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

function NotificationItem({
  item,
  onMarkRead,
}: {
  item: NotificationItemData;
  onMarkRead: (id: string) => void;
}) {
  const typeStyle = TYPE_STYLES[item.type] ?? TYPE_STYLES.info;
  const isUnread = !item.readAt;

  return (
    <Pressable
      onPress={() => { if (isUnread) onMarkRead(item.id); }}
      style={({ pressed }) => [
        styles.itemRow,
        isUnread && styles.itemUnread,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.typeIndicator, { backgroundColor: typeStyle.bg }]}>
        <Text className="font-inter text-[10px] font-bold" style={{ color: typeStyle.text }}>
          {item.type === 'success' ? '✓' : item.type === 'warning' ? '!' : item.type === 'danger' ? '!!' : 'i'}
        </Text>
      </View>
      <View style={styles.itemContent}>
        <Text
          className={`font-inter text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}
          style={{ color: isUnread ? colors.neutral[900] : colors.neutral[600] }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          className="font-inter text-xs"
          style={{ color: colors.neutral[400], marginTop: 2, lineHeight: 16 }}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text className="font-inter text-[10px] font-medium" style={{ color: colors.neutral[300], marginTop: 4 }}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

// ── Sheet handle ──

export interface NotificationsSheetHandle {
  open: () => void;
  close: () => void;
}

// ── Main sheet component ──

export const NotificationsSheet = forwardRef<NotificationsSheetHandle>(
  function NotificationsSheet(_props, ref) {
    const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
    const queryClient = useQueryClient();
    const snapPoints = useMemo(() => ['60%', '90%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
    }));

    const { data: notifData, isLoading, refetch } = useQuery({
      queryKey: notificationKeys.list({ limit: 30 }),
      queryFn: () => notificationApi.listNotifications({ limit: 30 }),
    });

    const { data: unreadData } = useUnreadNotificationCount();

    const markAsReadMutation = useMutation({
      mutationFn: (id: string) => notificationApi.markAsRead(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      },
    });

    const markAllReadMutation = useMutation({
      mutationFn: () => notificationApi.markAllAsRead(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      },
    });

    const notifications: NotificationItemData[] = notifData?.data ?? [];
    const unreadCount: number = unreadData?.data?.count ?? 0;

    const handleMarkRead = useCallback((id: string) => {
      markAsReadMutation.mutate(id);
    }, [markAsReadMutation]);

    const renderItem = useCallback(({ item }: { item: NotificationItemData }) => (
      <NotificationItem item={item} onMarkRead={handleMarkRead} />
    ), [handleMarkRead]);

    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />,
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text className="font-inter text-base font-bold" style={{ color: colors.neutral[900] }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text className="font-inter text-[10px] font-bold" style={{ color: colors.primary[700] }}>
                  {unreadCount} new
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[600] }}>
                Mark all read
              </Text>
            </Pressable>
          )}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={notifications}
            keyExtractor={(item: NotificationItemData) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => refetch()}
                tintColor={colors.primary[500]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400] }}>
                  No notifications yet
                </Text>
                <Text className="font-inter text-xs" style={{ color: colors.neutral[300], marginTop: 4, textAlign: 'center' }}>
                  You are all caught up. New alerts will show here.
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetModal>
    );
  },
);

// ── Styles ──

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.neutral[300],
    width: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  itemUnread: {
    backgroundColor: colors.primary[50] + '40', // 25% opacity
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginTop: 6,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
});
