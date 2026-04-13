/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
  useDashboardStats,
  useDashboardToday,
} from '@/features/company-admin/api/use-visitor-queries';
import { VisitStatusBadge } from '@/features/company-admin/visitors/components/visit-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface StatCard {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  icon: string;
}

interface VisitItem {
  id: string;
  visitorName: string;
  visitorCompany: string;
  visitorType: string;
  hostName: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  expectedArrival: string | null;
  visitCode: string;
}

// ============ KPI CARD ============

function KPICard({ stat, index }: { readonly stat: StatCard; readonly index: number }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(index * 60)}
      style={[styles.kpiCard, { borderLeftColor: stat.color, borderLeftWidth: 3 }]}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: stat.bgColor }]}>
        {stat.icon === 'users' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'check-in' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'check-out' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'clock' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'calendar' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'alert' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        {stat.icon === 'shield' && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={stat.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-inter text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {stat.label}
        </Text>
        <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">{stat.value}</Text>
      </View>
    </Animated.View>
  );
}

// ============ VISIT ROW ============

function VisitRow({
  item,
  index,
  onPress,
  fmt,
}: {
  readonly item: VisitItem;
  readonly index: number;
  readonly onPress: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(200 + index * 60)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.visitCard, pressed && styles.visitCardPressed]}
      >
        <View style={styles.visitCardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
              {item.visitorName}
            </Text>
            {item.visitorCompany ? (
              <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                {item.visitorCompany}
              </Text>
            ) : null}
          </View>
          <VisitStatusBadge status={item.status} />
        </View>

        <View style={styles.visitCardMeta}>
          {item.visitorType ? (
            <View style={styles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.visitorType}</Text>
            </View>
          ) : null}
          {item.hostName ? (
            <View style={styles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Host: {item.hostName}</Text>
            </View>
          ) : null}
          {item.checkInTime ? (
            <View style={styles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.checkInTime)}</Text>
            </View>
          ) : item.expectedArrival ? (
            <View style={styles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Expected: {fmt.time(item.expectedArrival)}</Text>
            </View>
          ) : null}
          {item.visitCode ? (
            <View style={styles.metaChip}>
              <Text className="font-inter text-[10px] font-bold text-primary-600">{item.visitCode}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function VisitorDashboardScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();

  const { data: todayResponse, isLoading, error, refetch, isFetching } = useDashboardToday();
  const { data: statsResponse } = useDashboardStats();

  const statsRaw = (statsResponse as any)?.data ?? statsResponse ?? {};
  const todayRaw = (todayResponse as any)?.data ?? todayResponse ?? {};

  const kpiStats: StatCard[] = React.useMemo(() => [
    { label: 'Total Today', value: todayRaw.totalToday ?? statsRaw.totalToday ?? 0, color: colors.primary[600], bgColor: colors.primary[50], icon: 'users' },
    { label: 'Checked In', value: todayRaw.checkedIn ?? statsRaw.checkedIn ?? 0, color: colors.success[600], bgColor: colors.success[50], icon: 'check-in' },
    { label: 'Checked Out', value: todayRaw.checkedOut ?? statsRaw.checkedOut ?? 0, color: colors.neutral[600], bgColor: colors.neutral[100], icon: 'check-out' },
    { label: 'On Site Now', value: todayRaw.onSite ?? statsRaw.onSite ?? 0, color: colors.info[600], bgColor: colors.info[50], icon: 'clock' },
    { label: 'Pre-Registered', value: todayRaw.preRegistered ?? statsRaw.preRegistered ?? 0, color: colors.accent[600], bgColor: colors.accent[50], icon: 'calendar' },
    { label: 'Overdue', value: todayRaw.overdue ?? statsRaw.overdue ?? 0, color: colors.danger[600], bgColor: colors.danger[50], icon: 'alert' },
    { label: 'Watchlist Flags', value: todayRaw.watchlistFlags ?? statsRaw.watchlistFlags ?? 0, color: colors.warning[600], bgColor: colors.warning[50], icon: 'shield' },
  ], [todayRaw, statsRaw]);

  const visits: VisitItem[] = React.useMemo(() => {
    const raw = todayRaw.visits ?? todayRaw.recentVisits ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      visitorCompany: v.visitorCompany ?? v.visitor?.company ?? '',
      visitorType: v.visitorType?.name ?? v.typeName ?? '',
      hostName: v.hostName ?? v.host?.name ?? '',
      status: v.status ?? 'PRE_REGISTERED',
      checkInTime: v.checkInTime ?? null,
      checkOutTime: v.checkOutTime ?? null,
      expectedArrival: v.expectedArrival ?? v.scheduledTime ?? null,
      visitCode: v.visitCode ?? v.code ?? '',
    }));
  }, [todayRaw]);

  const handleNewWalkIn = () => {
    router.push('/company/visitors/gate-check-in' as any);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Visitor Management" onMenuPress={toggle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
        }
      >
        {/* KPI Grid */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.sectionWrap}>
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-3">Today&apos;s Overview</Text>
          <View style={s.kpiGrid}>
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              kpiStats.map((stat, idx) => (
                <KPICard key={stat.label} stat={stat} index={idx} />
              ))
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={s.sectionWrap}>
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Quick Actions</Text>
          <View style={s.quickActionsRow}>
            <Pressable style={s.quickAction} onPress={() => router.push('/company/visitors/gate-check-in' as any)}>
              <View style={[s.quickActionIcon, { backgroundColor: colors.success[50] }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text className="font-inter text-[11px] font-semibold text-primary-950 dark:text-white mt-1">Check In</Text>
            </Pressable>

            <Pressable style={s.quickAction} onPress={() => router.push('/company/visitors/pre-register' as any)}>
              <View style={[s.quickActionIcon, { backgroundColor: colors.info[50] }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6" stroke={colors.info[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text className="font-inter text-[11px] font-semibold text-primary-950 dark:text-white mt-1">Pre-Register</Text>
            </Pressable>

            <Pressable style={s.quickAction} onPress={() => router.push('/company/visitors/on-site' as any)}>
              <View style={[s.quickActionIcon, { backgroundColor: colors.primary[50] }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text className="font-inter text-[11px] font-semibold text-primary-950 dark:text-white mt-1">On-Site</Text>
            </Pressable>

            <Pressable style={s.quickAction} onPress={() => router.push('/company/visitors/emergency' as any)}>
              <View style={[s.quickActionIcon, { backgroundColor: colors.danger[50] }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text className="font-inter text-[11px] font-semibold text-primary-950 dark:text-white mt-1">Emergency</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Recent Visits */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={s.sectionWrap}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Recent Visits</Text>
            <Pressable onPress={() => router.push('/company/visitors/list' as any)}>
              <Text className="font-inter text-xs font-semibold text-primary-600">View All</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : error ? (
            <EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} />
          ) : visits.length === 0 ? (
            <EmptyState icon="inbox" title="No visits today" message="Pre-register a visitor or check in a walk-in to get started." />
          ) : (
            visits.slice(0, 10).map((visit, idx) => (
              <VisitRow
                key={visit.id}
                item={visit}
                index={idx}
                onPress={() => router.push(`/company/visitors/detail?id=${visit.id}` as any)}
                fmt={fmt}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>

      <FAB onPress={handleNewWalkIn} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 20 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  quickAction: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    width: '48%' as any,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visitCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  visitCardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
  visitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  visitCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});
