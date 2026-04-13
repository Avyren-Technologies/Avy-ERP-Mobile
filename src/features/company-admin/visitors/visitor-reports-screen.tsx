/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
  useDailyLog,
  useOverstayReport,
  useReportSummary,
  useVisitorAnalytics,
} from '@/features/company-admin/api/use-visitor-queries';
import { VisitStatusBadge } from '@/features/company-admin/visitors/components/visit-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TABS ============

type TabKey = 'daily' | 'summary' | 'overstay' | 'analytics';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'daily', label: 'Daily Log' },
  { key: 'summary', label: 'Summary' },
  { key: 'overstay', label: 'Overstay' },
  { key: 'analytics', label: 'Analytics' },
];

// ============ DAILY LOG TAB ============

function DailyLogTab({ fmt }: { readonly fmt: ReturnType<typeof useCompanyFormatter> }) {
  const isDark = useIsDark();
  const { data: response, isLoading, error, refetch, isFetching } = useDailyLog();
  const insets = useSafeAreaInsets();

  const items = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      status: v.status ?? '',
      checkInTime: v.checkInTime ?? null,
      checkOutTime: v.checkOutTime ?? null,
      hostName: v.hostName ?? v.host?.name ?? '',
    }));
  }, [response]);

  const renderItem = ({ item, index }: { readonly item: any; readonly index: number }) => (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={tabCardStyles.card}>
        <View style={tabCardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
            {item.hostName ? <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Host: {item.hostName}</Text> : null}
          </View>
          <VisitStatusBadge status={item.status} />
        </View>
        <View style={tabCardStyles.cardMeta}>
          {item.checkInTime ? (
            <View style={tabCardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.checkInTime)}</Text>
            </View>
          ) : null}
          {item.checkOutTime ? (
            <View style={tabCardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {fmt.time(item.checkOutTime)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No entries" message="No visits recorded today." /></View>;
  };

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.id}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[{ paddingHorizontal: 24 }, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
    />
  );
}

// ============ SUMMARY TAB ============

function SummaryTab() {
  const isDark = useIsDark();
  const { data: response, isLoading, error, refetch, isFetching } = useReportSummary();
  const insets = useSafeAreaInsets();

  const summary = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? {};
    return {
      totalVisits: raw.totalVisits ?? 0,
      checkedIn: raw.checkedIn ?? 0,
      checkedOut: raw.checkedOut ?? 0,
      preRegistered: raw.preRegistered ?? 0,
      cancelled: raw.cancelled ?? 0,
      averageDuration: raw.averageDuration ?? 'N/A',
    };
  }, [response]);

  if (isLoading) return <View style={{ paddingTop: 24, paddingHorizontal: 24 }}><SkeletonCard /><SkeletonCard /></View>;
  if (error) return <View style={{ paddingTop: 40, alignItems: 'center', paddingHorizontal: 24 }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;

  const stats = [
    { label: 'Total Visits', value: summary.totalVisits, color: colors.primary[600] },
    { label: 'Checked In', value: summary.checkedIn, color: colors.success[600] },
    { label: 'Checked Out', value: summary.checkedOut, color: colors.neutral[500] },
    { label: 'Pre-Registered', value: summary.preRegistered, color: colors.info[600] },
    { label: 'Cancelled', value: summary.cancelled, color: colors.danger[500] },
    { label: 'Avg Duration', value: summary.averageDuration, color: colors.accent[600] },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}>
      <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}>
        {stats.map(stat => (
          <Animated.View key={stat.label} entering={FadeInUp.duration(350)} style={statStyles.statCard}>
            <Text className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{stat.label}</Text>
            <Text className="mt-2 font-inter text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ============ OVERSTAY TAB ============

function OverstayTab({ fmt }: { readonly fmt: ReturnType<typeof useCompanyFormatter> }) {
  const isDark = useIsDark();
  const { data: response, isLoading, error, refetch, isFetching } = useOverstayReport();
  const insets = useSafeAreaInsets();

  const items = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      hostName: v.hostName ?? v.host?.name ?? '',
      checkInTime: v.checkInTime ?? '',
      expectedDuration: v.expectedDuration ?? '',
      overstayMinutes: v.overstayMinutes ?? v.overstay ?? 0,
    }));
  }, [response]);

  const renderItem = ({ item, index }: { readonly item: any; readonly index: number }) => (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={[tabCardStyles.card, { borderLeftColor: colors.danger[500], borderLeftWidth: 3 }]}>
        <View style={tabCardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
            {item.hostName ? <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Host: {item.hostName}</Text> : null}
          </View>
          <View style={[tabCardStyles.metaChip, { backgroundColor: colors.danger[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-danger-700">+{item.overstayMinutes} min</Text>
          </View>
        </View>
        {item.checkInTime ? (
          <View style={tabCardStyles.cardMeta}>
            <View style={tabCardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.checkInTime)}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No overstays" message="All visitors are within their time limit." /></View>;
  };

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.id}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[{ paddingHorizontal: 24 }, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
    />
  );
}

// ============ ANALYTICS TAB ============

function AnalyticsTab() {
  const isDark = useIsDark();
  const { data: response, isLoading, error, refetch, isFetching } = useVisitorAnalytics();
  const insets = useSafeAreaInsets();

  const analytics = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? {};
    return {
      peakHour: raw.peakHour ?? 'N/A',
      topVisitorType: raw.topVisitorType ?? 'N/A',
      topHost: raw.topHost ?? 'N/A',
      busiestDay: raw.busiestDay ?? 'N/A',
      avgVisitsPerDay: raw.avgVisitsPerDay ?? 0,
      repeatVisitorRate: raw.repeatVisitorRate ?? 'N/A',
    };
  }, [response]);

  if (isLoading) return <View style={{ paddingTop: 24, paddingHorizontal: 24 }}><SkeletonCard /><SkeletonCard /></View>;
  if (error) return <View style={{ paddingTop: 40, alignItems: 'center', paddingHorizontal: 24 }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;

  const metrics = [
    { label: 'Peak Hour', value: analytics.peakHour, color: colors.primary[600] },
    { label: 'Top Visitor Type', value: analytics.topVisitorType, color: colors.accent[600] },
    { label: 'Top Host', value: analytics.topHost, color: colors.info[600] },
    { label: 'Busiest Day', value: analytics.busiestDay, color: colors.warning[600] },
    { label: 'Avg Visits/Day', value: analytics.avgVisitsPerDay, color: colors.success[600] },
    { label: 'Repeat Rate', value: analytics.repeatVisitorRate, color: colors.danger[500] },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}>
        {metrics.map(metric => (
          <Animated.View key={metric.label} entering={FadeInUp.duration(350)} style={statStyles.statCard}>
            <Text className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{metric.label}</Text>
            <Text className="mt-2 font-inter text-lg font-bold" style={{ color: metric.color }} numberOfLines={2}>{metric.value}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ============ MAIN COMPONENT ============

export function VisitorReportsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();

  const [activeTab, setActiveTab] = React.useState<TabKey>('daily');

  const renderTab = () => {
    switch (activeTab) {
      case 'daily': return <DailyLogTab fmt={fmt} />;
      case 'summary': return <SummaryTab />;
      case 'overstay': return <OverstayTab fmt={fmt} />;
      case 'analytics': return <AnalyticsTab />;
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Visitor Reports" onMenuPress={toggle} />

      <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
        <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Reports</Text>
        <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">Visitor data and insights</Text>

        {/* Tab Row */}
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[s.tab, activeTab === tab.key && s.tabActive]}>
              <Text className={`font-inter text-[11px] font-bold ${activeTab === tab.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  tabRow: { flexDirection: 'row', marginTop: 16, backgroundColor: isDark ? '#1A1730' : colors.neutral[100], borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary[600] },
});

const tabCardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});

const statStyles = StyleSheet.create({
  statCard: { width: '47%', backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
});
