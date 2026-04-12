import { BarChart3, Calendar, Clock, Database, Users } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

type IconType = 'chart' | 'users' | 'calendar' | 'clock' | 'database';

interface ZeroDataStateProps {
  icon?: IconType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const ICONS: Record<IconType, React.ComponentType<{ size: number; color: string }>> = {
  chart: BarChart3,
  users: Users,
  calendar: Calendar,
  clock: Clock,
  database: Database,
};

export function ZeroDataState({
  icon = 'chart',
  title,
  message,
  action,
}: ZeroDataStateProps) {
  const IconComponent = ICONS[icon] ?? BarChart3;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Icon circle */}
      <View style={styles.iconCircle}>
        <IconComponent size={40} color={colors.neutral[300]} />
      </View>

      <Text className="font-inter text-[16px] font-semibold text-neutral-600 dark:text-neutral-400" style={styles.title}>
        {title}
      </Text>

      {message && (
        <Text className="font-inter text-[14px] text-neutral-400" style={styles.message}>
          {message}
        </Text>
      )}

      {action && (
        <Pressable onPress={action.onPress} style={styles.actionButton}>
          <Text className="font-inter text-[14px] font-semibold text-white">
            {action.label}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: colors.primary[400],
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    shadowColor: colors.primary[600],
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});
