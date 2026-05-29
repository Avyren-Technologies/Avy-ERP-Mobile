/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { dashboardHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
  useAssets,
  useWorkRequests,
  useManagerDashboard,
  usePlannerDashboard,
  useFinanceDashboard,
} from '@/features/maintenance/api/use-maintenance-queries';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ STAT CARD ============

function StatCard({
  title,
  value,
  icon,
  color,
  index,
  isDark,
  onPress,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  index: number;
  isDark: boolean;
  onPress?: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100 + index * 80)}
      style={statStyles.wrapper}
    >
      <Pressable
        onPress={onPress}
        style={[
          statStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.neutral[100],
          },
        ]}
      >
        <View style={[statStyles.iconWrap, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
          {value}
        </Text>
        <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ============ QUICK ACTION ============

function QuickAction({
  label,
  icon,
  onPress,
  isDark,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        quickStyles.action,
        { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] },
      ]}
    >
      <View style={[quickStyles.iconCircle, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
        {icon}
      </View>
      <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ============ WR ITEM ============

function WRItem({ item, index, isDark }: { item: any; index: number; isDark: boolean }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(300 + index * 60)}>
      <View
        style={[
          wrStyles.row,
          { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] },
        ]}
      >
        <View style={wrStyles.left}>
          <View style={[wrStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-info-700">
              {item.wrNumber ?? 'WR'}
            </Text>
          </View>
          <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
            {item.summary ?? item.description ?? 'Work Request'}
          </Text>
          <Text className="font-inter text-[11px] text-neutral-400" numberOfLines={1}>
            {item.asset?.name ?? 'Unknown Asset'}
          </Text>
        </View>
        <View style={wrStyles.right}>
          <PriorityBadge priority={item.priority ?? 'MEDIUM'} />
          <View style={[wrStyles.statusBadge, { backgroundColor: getWRStatusColor(item.status).bg }]}>
            <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: getWRStatusColor(item.status).text }}>
              {(item.status ?? 'OPEN').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function getWRStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'OPEN': return { bg: colors.info[50], text: colors.info[700] };
    case 'TRIAGED': return { bg: colors.warning[50], text: colors.warning[700] };
    case 'APPROVED': return { bg: colors.success[50], text: colors.success[700] };
    case 'REJECTED': return { bg: colors.danger[50], text: colors.danger[700] };
    case 'CONVERTED': return { bg: colors.accent[50], text: colors.accent[700] };
    case 'CANCELLED': return { bg: colors.neutral[100], text: colors.neutral[600] };
    default: return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

// ============ CRITICALITY BAR ============

function CriticalityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text className="font-inter text-xs font-medium text-neutral-600 dark:text-neutral-400" style={{ width: 60 }}>
        {label}
      </Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white" style={{ width: 30, textAlign: 'right' }}>
        {count}
      </Text>
    </View>
  );
}

// ============ MAIN ============

export function MaintenanceDashboardScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();

  // Fetch summary data
  const { data: assetsRes, isLoading: assetsLoading, refetch: refetchAssets, isFetching: assetsFetching } = useAssets({ limit: 1 });
  const { data: wrRes, isLoading: wrLoading, refetch: refetchWR, isFetching: wrFetching } = useWorkRequests({ limit: 5 });

  useFocusEffect(
    React.useCallback(() => {
      refetchAssets();
      refetchWR();
    }, [refetchAssets, refetchWR])
  );

  const totalAssets = (assetsRes as any)?.meta?.total ?? 0;
  const recentWRs: any[] = (wrRes as any)?.data ?? [];
  const totalWRs = (wrRes as any)?.meta?.total ?? 0;

  // Count open WRs (OPEN or TRIAGED)
  const openWRCount = recentWRs.filter((wr: any) => wr.status === 'OPEN' || wr.status === 'TRIAGED').length;

  const isLoading = assetsLoading || wrLoading;
  const isFetching = assetsFetching || wrFetching;

  const handleRefresh = () => {
    refetchAssets();
    refetchWR();
  };

  // Criticality counts from assets response (approximate from available data)
  const allAssets: any[] = (assetsRes as any)?.data ?? [];
  const critCounts = React.useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const a of allAssets) {
      const c = a.criticality as keyof typeof counts;
      if (c && counts[c] !== undefined) counts[c]++;
    }
    return counts;
  }, [allAssets]);

  // Role-based dashboards
  const managerDash = useManagerDashboard();
  const plannerDash = usePlannerDashboard();
  const financeDash = useFinanceDashboard();
  const mgrData: any = (managerDash.data as any)?.data ?? {};
  const plnData: any = (plannerDash.data as any)?.data ?? {};
  const finData: any = (financeDash.data as any)?.data ?? {};

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppTopHeader
            title="Maintenance"
            subtitle="Asset & Work Management"
            onMenuPress={toggle}
            rightSlot={<HelpDrawer help={dashboardHelp} />}
          />
        </Animated.View>

        {isLoading ? (
          <View style={styles.content}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.content}>
            {/* Stat Cards Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Assets"
                value={totalAssets}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                color={colors.primary[500]}
                index={0}
                isDark={isDark}
                onPress={() => router.push('/maintenance/assets')}
              />
              <StatCard
                title="Open Work Requests"
                value={openWRCount}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={colors.warning[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                color={colors.warning[500]}
                index={1}
                isDark={isDark}
                onPress={() => router.push('/maintenance/work-requests')}
              />
              <StatCard
                title="Active Work Orders"
                value={0}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={colors.info[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                color={colors.info[500]}
                index={2}
                isDark={isDark}
              />
              <StatCard
                title="PM Due / Overdue"
                value={0}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                color={colors.danger[500]}
                index={3}
                isDark={isDark}
              />
            </View>

            {/* Quick Actions */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">
                Quick Actions
              </Text>
              <View style={styles.quickRow}>
                <QuickAction
                  label="Scan Asset"
                  icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Rect x={3} y={3} width={18} height={18} rx={2} stroke={colors.primary[500]} strokeWidth="1.8" fill="none" /><Path d="M7 12h10M12 7v10" stroke={colors.primary[500]} strokeWidth="1.8" strokeLinecap="round" /></Svg>}
                  onPress={() => router.push('/maintenance/scan-asset')}
                  isDark={isDark}
                />
                <QuickAction
                  label="Raise Request"
                  icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[500]} strokeWidth="2" strokeLinecap="round" /></Svg>}
                  onPress={() => router.push('/maintenance/work-request-create')}
                  isDark={isDark}
                />
                <QuickAction
                  label="View Assets"
                  icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                  onPress={() => router.push('/maintenance/assets')}
                  isDark={isDark}
                />
              </View>
            </Animated.View>

            {/* Recent Work Requests */}
            <Animated.View entering={FadeInDown.duration(400).delay(280)}>
              <View style={styles.sectionHeader}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                  Recent Work Requests
                </Text>
                {totalWRs > 5 ? (
                  <Pressable onPress={() => router.push('/maintenance/work-requests')}>
                    <Text className="font-inter text-xs font-semibold text-primary-600">
                      View All ({totalWRs})
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                {recentWRs.length > 0 ? (
                  recentWRs.map((wr: any, idx: number) => (
                    <WRItem key={wr.id} item={wr} index={idx} isDark={isDark} />
                  ))
                ) : (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text className="font-inter text-sm text-neutral-400">
                      No work requests yet
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Assets by Criticality */}
            <Animated.View entering={FadeInDown.duration(400).delay(360)}>
              <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">
                Assets by Criticality
              </Text>
              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <CriticalityBar label="Critical" count={critCounts.CRITICAL} total={totalAssets} color={colors.danger[500]} />
                <CriticalityBar label="High" count={critCounts.HIGH} total={totalAssets} color={colors.warning[500]} />
                <CriticalityBar label="Medium" count={critCounts.MEDIUM} total={totalAssets} color={colors.warning[300]} />
                <CriticalityBar label="Low" count={critCounts.LOW} total={totalAssets} color={colors.success[500]} />
              </View>
            </Animated.View>

            {/* Insights Widgets */}
            <Animated.View entering={FadeInDown.duration(400).delay(440)}>
              <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">
                Insights
              </Text>

              {/* PM & Planner Widget */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100], marginBottom: 12 }]}>
                <WidgetRow label="PM Due This Week" value={String(plnData.pmDueThisWeek ?? 0)} />
                <WidgetRow label="Overdue PMs" value={String(plnData.overduePMs ?? 0)} color={Number(plnData.overduePMs ?? 0) > 0 ? colors.danger[600] : colors.success[600]} />
                <WidgetRow label="Parts Ready" value={`${Number(plnData.partsReadyPct ?? 0).toFixed(0)}%`} />
                <WidgetRow label="Available Technicians" value={String(plnData.availableTechnicians ?? 0)} />
              </View>

              {/* Cost Widget */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100], marginBottom: 12 }]}>
                <WidgetRow label="YTD Cost" value={`$${Number(finData.ytdCost ?? 0).toLocaleString()}`} color={colors.primary[700]} />
                <WidgetRow label="Parts Cost" value={`$${Number(finData.partsCost ?? 0).toLocaleString()}`} />
                <WidgetRow label="Labour Cost" value={`$${Number(finData.labourCost ?? 0).toLocaleString()}`} />
              </View>

              {/* Quick Links */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <Pressable onPress={() => router.push('/maintenance/analytics')} style={linkStyles.row}>
                  <Text className="font-inter text-xs font-semibold text-primary-600">Analytics Dashboard</Text>
                  <Text className="font-inter text-xs text-primary-400">&rarr;</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/maintenance/reliability')} style={linkStyles.row}>
                  <Text className="font-inter text-xs font-semibold text-primary-600">Reliability Metrics</Text>
                  <Text className="font-inter text-xs text-primary-400">&rarr;</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/maintenance/reports')} style={linkStyles.row}>
                  <Text className="font-inter text-xs font-semibold text-primary-600">Reports Center</Text>
                  <Text className="font-inter text-xs text-primary-400">&rarr;</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============ WIDGET ROW ============

function WidgetRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="font-inter text-xs font-bold" style={{ color: color ?? colors.primary[700] }}>{value}</Text>
    </View>
  );
}

const linkStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
      gap: 24,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      shadowColor: colors.primary[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  });

const statStyles = StyleSheet.create({
  wrapper: {
    width: '48%',
    flexGrow: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});

const quickStyles = StyleSheet.create({
  action: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const wrStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
});

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
