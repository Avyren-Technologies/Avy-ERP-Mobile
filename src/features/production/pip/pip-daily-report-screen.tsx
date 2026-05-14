/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import { usePipDailyEntrySummary } from '@/features/production/pip/api/use-pip-queries';

// ============ TYPES ============

interface OperatorSummary {
  operatorId: string;
  operatorName: string;
  partsWorked: number;
  totalProduced: number;
  totalTarget: number;
  achievementPct: number;
  incentiveAmount: number;
  status: string;
}

// ============ HELPERS ============

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStatusBadge(pct: number): { label: string; bg: string; text: string } {
  if (pct >= 100) return { label: 'Above Target', bg: colors.success[50], text: colors.success[700] };
  if (pct >= 80) return { label: 'Near Target', bg: colors.warning[50], text: colors.warning[700] };
  return { label: 'Below Target', bg: colors.danger[50], text: colors.danger[700] };
}

// ============ DATE NAVIGATION ============

function DateNav({
  date,
  onPrev,
  onNext,
  isDark,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  isDark: boolean;
}) {
  return (
    <View style={[dateStyles.container, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
      <Pressable onPress={onPrev} style={dateStyles.arrowBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M15 18l-6-6 6-6" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={dateStyles.dateCenter}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
            stroke={colors.primary[500]}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text className="ml-2 font-inter text-sm font-semibold text-primary-950 dark:text-white">
          {date}
        </Text>
      </View>
      <Pressable onPress={onNext} style={dateStyles.arrowBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M9 18l6-6-6-6" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

// ============ METRIC CARD ============

function MetricCard({
  label,
  value,
  color,
  isDark,
}: {
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        metricStyles.card,
        { backgroundColor: isDark ? '#1A1730' : `${color}08` },
      ]}
    >
      <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text
        className="font-inter text-lg font-bold"
        style={{ color }}
      >
        {value}
      </Text>
    </View>
  );
}

// ============ OPERATOR CARD ============

function OperatorCard({
  item,
  index,
  isDark,
}: {
  item: OperatorSummary;
  index: number;
  isDark: boolean;
}) {
  const badge = getStatusBadge(item.achievementPct);
  const pct = Math.min(Number(item.achievementPct ?? 0), 100);

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 40)}>
      <View
        style={[
          opStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        <View style={opStyles.header}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
              {item.operatorName}
            </Text>
            <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
              {item.partsWorked} part(s) worked
            </Text>
          </View>
          <View style={[opStyles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: badge.text }}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={opStyles.progressSection}>
          <View style={[opStyles.progressBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
            <View
              style={[
                opStyles.progressFill,
                {
                  width: `${pct}%`,
                  backgroundColor: Number(item.achievementPct ?? 0) >= 100
                    ? colors.success[500]
                    : Number(item.achievementPct ?? 0) >= 80
                      ? colors.warning[500]
                      : colors.danger[500],
                },
              ]}
            />
          </View>
          <Text className="mt-1 font-inter text-[11px] font-bold text-primary-950 dark:text-white">
            {Number(item.achievementPct ?? 0).toFixed(0)}%
          </Text>
        </View>

        {/* Bottom row */}
        <View style={opStyles.bottomRow}>
          <View style={opStyles.statItem}>
            <Text className="font-inter text-[10px] text-neutral-500">Produced</Text>
            <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
              {item.totalProduced}
            </Text>
          </View>
          <View style={opStyles.statItem}>
            <Text className="font-inter text-[10px] text-neutral-500">Target</Text>
            <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
              {item.totalTarget}
            </Text>
          </View>
          <View style={opStyles.statItem}>
            <Text className="font-inter text-[10px] text-neutral-500">Incentive</Text>
            <Text className="font-inter text-xs font-bold text-success-700">
              Rs {Number(item.incentiveAmount ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function PipDailyReportScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const dateStr = formatDate(selectedDate);

  const { data: summaryRaw, isLoading, error, refetch, isFetching } = usePipDailyEntrySummary({ date: dateStr });

  const summary = React.useMemo(() => {
    const d = (summaryRaw as any)?.data ?? summaryRaw;
    return d ?? {};
  }, [summaryRaw]);

  const operators: OperatorSummary[] = React.useMemo(() => {
    const raw = summary?.operators ?? summary?.operatorSummaries ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((op: any) => ({
      operatorId: op.operatorId ?? '',
      operatorName:
        op.operatorName ?? (`${op.firstName ?? ''} ${op.lastName ?? ''}`.trim() || 'Unknown'),
      partsWorked: op.partsWorked ?? op.partCount ?? 0,
      totalProduced: op.totalProduced ?? op.totalQty ?? 0,
      totalTarget: op.totalTarget ?? op.totalTargetQty ?? 0,
      achievementPct: op.achievementPct ?? op.avgAchievement ?? 0,
      incentiveAmount: op.incentiveAmount ?? op.totalIncentive ?? 0,
      status: op.status ?? 'SUBMITTED',
    }));
  }, [summary]);

  const metrics = React.useMemo(() => {
    const totalProduction = operators.reduce((s, o) => s + o.totalProduced, 0);
    const avgAchievement = operators.length > 0
      ? operators.reduce((s, o) => s + o.achievementPct, 0) / operators.length
      : 0;
    const belowTarget = operators.filter((o) => o.achievementPct < 100).length;
    return {
      totalProduction,
      operatorCount: operators.length,
      avgAchievement: avgAchievement.toFixed(1),
      belowTarget,
    };
  }, [operators]);

  const changeDate = (delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  };

  const handleExport = async () => {
    const lines = ['Daily Production Report', `Date: ${dateStr}`, '', 'Operator, Produced, Target, Achievement%, Incentive'];
    operators.forEach((op) => {
      lines.push(`${op.operatorName}, ${op.totalProduced}, ${op.totalTarget}, ${Number(op.achievementPct ?? 0).toFixed(1)}%, Rs ${Number(op.incentiveAmount ?? 0).toFixed(2)}`);
    });
    try {
      await Share.share({ message: lines.join('\n'), title: `Production Report ${dateStr}` });
    } catch {
      // Ignored
    }
  };

  const renderHeader = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <AppTopHeader
          title="Daily Report"
          subtitle={dateStr}
          onMenuPress={toggle}
          rightSlot={
            <Pressable onPress={handleExport} hitSlop={8}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                  stroke={colors.white}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          }
        />
      </Animated.View>

      <View style={styles.controlSection}>
        <DateNav
          date={dateStr}
          onPrev={() => changeDate(-1)}
          onNext={() => changeDate(1)}
          isDark={isDark}
        />
      </View>

      {/* Metrics Grid */}
      <Animated.View entering={FadeIn.duration(400).delay(100)}>
        <View style={styles.metricsGrid}>
          <MetricCard label="Total Production" value={String(metrics.totalProduction)} color={colors.primary[600]} isDark={isDark} />
          <MetricCard label="Operators Logged" value={String(metrics.operatorCount)} color={colors.accent[600]} isDark={isDark} />
          <MetricCard label="Avg Achievement" value={`${metrics.avgAchievement}%`} color={colors.success[600]} isDark={isDark} />
          <MetricCard label="Below Target" value={String(metrics.belowTarget)} color={colors.danger[600]} isDark={isDark} />
        </View>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
          Operator Performance
        </Text>
        <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
          {operators.length} operator(s)
        </Text>
      </View>
    </>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={{ paddingTop: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="error"
          title="Failed to load report"
          message="Check your connection and try again."
          action={{ label: 'Retry', onPress: () => refetch() }}
        />
      );
    }
    return (
      <EmptyState
        icon="inbox"
        title="No entries for this date"
        message="No production entries have been recorded for the selected date."
      />
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <FlashList
        data={operators}
        renderItem={({ item, index }) => (
          <OperatorCard item={item} index={index} isDark={isDark} />
        )}
        keyExtractor={(item) => item.operatorId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={140}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      />
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
    controlSection: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 8,
    },
    listContent: {
      paddingHorizontal: 24,
    },
  });

const dateStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const metricStyles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
});

const opStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
});
