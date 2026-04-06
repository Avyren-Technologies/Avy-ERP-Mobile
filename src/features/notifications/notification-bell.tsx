import { Bell } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

interface NotificationBellProps {
  onPress: () => void;
  unreadCount: number;
  /** Icon color — defaults to white (for gradient headers) */
  iconColor?: string;
}

export function NotificationBell({ onPress, unreadCount, iconColor = '#ffffff' }: NotificationBellProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.6 }]}
    >
      <Bell size={22} color={iconColor} strokeWidth={1.8} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text className="font-inter text-[10px]" style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger[500],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
    lineHeight: 14,
  },
});
