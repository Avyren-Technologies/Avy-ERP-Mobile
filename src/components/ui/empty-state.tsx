import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import colors from '@/components/ui/colors';

interface EmptyStateProps {
  icon?: 'search' | 'list' | 'error' | 'inbox';
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

function EmptyIcon({ type }: { type: string }) {
  const color = colors.neutral[300];
  if (type === 'search') {
    return (
      <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
        <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
        <Line x1={16.5} y1={16.5} x2={21} y2={21} stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  if (type === 'error') {
    return (
      <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={10} stroke={colors.danger[300]} strokeWidth={2} />
        <Line x1={12} y1={8} x2={12} y2={12} stroke={colors.danger[300]} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={12} cy={16} r={1} fill={colors.danger[300]} />
      </Svg>
    );
  }
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8l4-4h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke={color} strokeWidth={2} />
      <Path d="M3 8h6l2 3h2l2-3h6" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EmptyState({ icon = 'list', title, message, action }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <EmptyIcon type={icon} />
      <Text className="font-inter" style={styles.title}>{title}</Text>
      {message && <Text className="font-inter" style={styles.message}>{message}</Text>}
      {action && (
        <Pressable onPress={action.onPress} style={styles.actionButton}>
          <Text className="font-inter" style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral[600], textAlign: 'center' },
  message: { fontSize: 14, color: colors.neutral[400], textAlign: 'center', maxWidth: 280 },
  actionButton: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary[600], borderRadius: 8 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
