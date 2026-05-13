/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { HamburgerButton } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import { useAuthStore, getDisplayName } from '@/features/auth/use-auth-store';
import {
  usePipDashboard,
  usePipDailyEntrySummary,
} from '@/features/production/pip/api/use-pip-queries';
import type { PipDashboardMetrics } from '@/lib/api/pip';

// ============ HELPERS ============

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============ METRIC CARD ============

function MetricCard({
  label,
  value,
  icon,
  color,
  isDark,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        metricStyles.card,
        {
          backgroundColor: isDark ? '#1A1730' : colors.white,
          borderColor: isDark ? colors.primary[900] : `${color}20`,
        },
      ]}
    >
      <View style={[metricStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text className="mt-2 font-inter text-lg font-bold text-primary-950 dark:text-white">
        {value}
      </Text>
      <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
    </View>
  );
}

// ============ QUICK ACCESS TILE ============

function QuickTile({
  title,
  icon,
  color,
  onPress,
  isDark,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        tileStyles.tile,
        {
          backgroundColor: isDark ? '#1A1730' : colors.white,
          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <View style={[tileStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text className="mt-2 text-center font-inter text-xs font-semibold text-primary-950 dark:text-white">
        {title}
      </Text>
    </Pressable>
  );
}

// ============ MAIN COMPONENT ============

export function PipDashboardScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();
  const user = useAuthStore.use.user();

  const todayStr = formatDate(new Date());
  const greeting = getGreeting();
  const displayName = getDisplayName(user);

  // Data
  const { data: dashRaw, isLoading, error, refetch, isFetching } = usePipDashboard();
  const metrics: PipDashboardMetrics | null = React.useMemo(() => {
    const d = (dashRaw as any)?.data ?? dashRaw;
    return d as PipDashboardMetrics | null;
  }, [dashRaw]);

  const { data: todaySummaryRaw } = usePipDailyEntrySummary({ date: todayStr });
  const todayOperators = React.useMemo(() => {
    const d = (todaySummaryRaw as any)?.data ?? todaySummaryRaw;
    const ops = d?.operators ?? d?.operatorSummaries ?? [];
    return Array.isArray(ops) ? ops : [];
  }, [todaySummaryRaw]);

  const navigate = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerRow}>
            <HamburgerButton onPress={toggle} />
            <View style={{ flex: 1 }} />
            <Pressable
              style={({ pressed }) => [
                styles.newEntryHeaderBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => navigate('/(app)/pip-daily-entry')}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
              <Text className="ml-1 font-inter text-xs font-bold text-white">
                New Entry
              </Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(400)} style={styles.greetingSection}>
            <Text className="font-inter text-2xl font-bold text-white">
              {greeting},
            </Text>
            <Text className="font-inter text-xl font-semibold text-white/90">
              {displayName}
            </Text>
            <Text className="mt-1 font-inter text-[11px] text-white/70">
              Production Incentive Plan
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Loading */}
          {isLoading && (
            <View style={{ marginTop: 8 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {/* Error */}
          {error && !isLoading && (
            <EmptyState
              icon="error"
              title="Failed to load dashboard"
              message="Check your connection and try again."
              action={{ label: 'Retry', onPress: () => refetch() }}
            />
          )}

          {/* Metrics */}
          {metrics && !isLoading && (
            <>
              <Animated.View entering={FadeInUp.duration(400).delay(50)}>
                <View style={styles.metricsGrid}>
                  <MetricCard
                    label="Parts Configured"
                    value={String(metrics.partCount)}
                    icon={
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.primary[600]}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="Machines"
                    value={String(metrics.machineCount)}
                    icon={
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={colors.accent[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.accent[600]}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="Slab Configs"
                    value={String(metrics.slabConfigCount)}
                    icon={
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4" stroke={colors.success[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke={colors.success[600]} strokeWidth="1.5" fill="none" />
                      </Svg>
                    }
                    color={colors.success[600]}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="Today's Incentive"
                    value={`Rs ${metrics.todayIncentive.toFixed(0)}`}
                    icon={
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={colors.info[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.info[600]}
                    isDark={isDark}
                  />
                </View>
              </Animated.View>

              {/* Today's Production Summary */}
              <Animated.View entering={FadeInUp.duration(400).delay(150)}>
                <View style={styles.sectionHeader}>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Today&apos;s Production
                  </Text>
                  <Pressable onPress={() => navigate('/(app)/pip-daily-report')}>
                    <Text className="font-inter text-xs font-semibold text-primary-600">
                      View Report
                    </Text>
                  </Pressable>
                </View>

                {todayOperators.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">
                      No production entries recorded today.
                    </Text>
                  </View>
                ) : (
                  todayOperators.slice(0, 5).map((op: any, idx: number) => {
                    const pct = op.achievementPct ?? op.avgAchievement ?? 0;
                    const pctColor = pct >= 100 ? colors.success[500] : pct >= 80 ? colors.warning[500] : colors.danger[500];

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.opCard,
                          {
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
                            {op.operatorName ?? `${op.firstName ?? ''} ${op.lastName ?? ''}`.trim() || 'Unknown'}
                          </Text>
                          <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {op.partsWorked ?? op.partCount ?? 0} part(s) | Rs {(op.incentiveAmount ?? op.totalIncentive ?? 0).toFixed(2)}
                          </Text>
                        </View>
                        <Text className="font-inter text-sm font-bold" style={{ color: pctColor }}>
                          {pct.toFixed(0)}%
                        </Text>
                      </View>
                    );
                  })
                )}
              </Animated.View>

              {/* Quick Access */}
              <Animated.View entering={FadeInUp.duration(400).delay(250)}>
                <Text className="mb-3 mt-6 font-inter text-sm font-bold text-primary-950 dark:text-white">
                  Quick Access
                </Text>
                <View style={styles.tilesGrid}>
                  <QuickTile
                    title="Part Master"
                    icon={
                      <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.primary[600]}
                    onPress={() => navigate('/(app)/part-master')}
                    isDark={isDark}
                  />
                  <QuickTile
                    title="Slab Config"
                    icon={
                      <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4" stroke={colors.success[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke={colors.success[600]} strokeWidth="1.5" fill="none" />
                      </Svg>
                    }
                    color={colors.success[600]}
                    onPress={() => navigate('/(app)/pip-slab-config')}
                    isDark={isDark}
                  />
                  <QuickTile
                    title="Daily Entry"
                    icon={
                      <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.accent[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.accent[600]}
                    onPress={() => navigate('/(app)/pip-daily-entry')}
                    isDark={isDark}
                  />
                  <QuickTile
                    title="Reports"
                    icon={
                      <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M18 20V10M12 20V4M6 20v-6" stroke={colors.info[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                    color={colors.info[600]}
                    onPress={() => navigate('/(app)/pip-daily-report')}
                    isDark={isDark}
                  />
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    headerGradient: {
      paddingHorizontal: 24,
      paddingBottom: 28,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
    },
    headerDecor1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
      position: 'absolute',
      bottom: -20,
      left: -20,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    newEntryHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    greetingSection: {
      marginTop: 16,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 10,
    },
    emptyCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
    },
    opCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 8,
    },
    tilesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
  });

const metricStyles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const tileStyles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
