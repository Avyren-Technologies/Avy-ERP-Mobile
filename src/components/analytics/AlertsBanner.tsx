import { AlertTriangle, Bell, Info, X, XCircle } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  createdAt?: string;
}

interface AlertsBannerProps {
  alerts: AlertItem[];
  onDismiss?: (id: string) => void;
  onPress?: (alert: AlertItem) => void;
}

const SEVERITY_CONFIG: Record<
  string,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  critical: {
    bg: colors.danger[50],
    border: colors.danger[300],
    icon: 'x-circle',
    iconColor: colors.danger[600],
  },
  high: {
    bg: colors.danger[50],
    border: colors.danger[200],
    icon: 'alert-triangle',
    iconColor: colors.danger[500],
  },
  medium: {
    bg: colors.warning[50],
    border: colors.warning[200],
    icon: 'alert-triangle',
    iconColor: colors.warning[600],
  },
  low: {
    bg: colors.info[50],
    border: colors.info[200],
    icon: 'info',
    iconColor: colors.info[600],
  },
  info: {
    bg: colors.primary[50],
    border: colors.primary[200],
    icon: 'bell',
    iconColor: colors.primary[500],
  },
};

function AlertIcon({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const iconProps = { size: 18, color: config.iconColor };

  switch (severity) {
    case 'critical':
      return <XCircle {...iconProps} />;
    case 'high':
    case 'medium':
      return <AlertTriangle {...iconProps} />;
    case 'low':
      return <Info {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

export function AlertsBanner({ alerts, onDismiss, onPress }: AlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Bell size={16} color={colors.danger[500]} />
        <Text className="font-inter text-[14px] font-bold text-neutral-800">
          Active Alerts
        </Text>
        <View style={styles.countBadge}>
          <Text className="font-inter text-[11px] font-bold text-white">
            {alerts.length}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {alerts.map((alert, index) => {
          const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;

          return (
            <Animated.View
              key={alert.id}
              entering={FadeInDown.delay(index * 60).duration(300)}
              exiting={FadeOutRight.duration(200)}
            >
              <Pressable
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: config.bg,
                    borderColor: config.border,
                  },
                ]}
                onPress={() => onPress?.(alert)}
              >
                <View style={styles.alertHeader}>
                  <AlertIcon severity={alert.severity} />
                  <Text
                    className="font-inter text-[13px] font-semibold text-neutral-800"
                    style={styles.alertTitle}
                    numberOfLines={1}
                  >
                    {alert.title}
                  </Text>
                  {onDismiss && (
                    <Pressable
                      onPress={() => onDismiss(alert.id)}
                      style={styles.dismissButton}
                      hitSlop={8}
                    >
                      <X size={14} color={colors.neutral[400]} />
                    </Pressable>
                  )}
                </View>
                <Text
                  className="font-inter text-[12px] text-neutral-600"
                  numberOfLines={2}
                >
                  {alert.message}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    backgroundColor: colors.danger[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  alertCard: {
    width: 260,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    flex: 1,
  },
  dismissButton: {
    padding: 2,
  },
});
