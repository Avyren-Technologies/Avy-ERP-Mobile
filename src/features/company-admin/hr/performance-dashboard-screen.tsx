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
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { usePerformanceDashboard } from '@/features/company-admin/api/use-performance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface DashboardData {
    activeCycles: number;
    totalEmployees: number;
    completedReviews: number;
    pendingReviews: number;
    averageRating: number;
    goalsOnTrack: number;
    totalGoals: number;
    feedbackPending: number;
    feedbackCompleted: number;
    skillGapCount: number;
    successionCoverage: number;
    recentActivity: {
        id: string;
        type: string;
        description: string;
        timestamp: string;
        actor: string;
    }[];
    ratingDistribution: {
        label: string;
        count: number;
        percentage: number;
    }[];
}

// ============ CONSTANTS ============

const ACTIVITY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    review: { icon: 'star', color: colors.warning[600], bg: colors.warning[50] },
    goal: { icon: 'target', color: colors.primary[600], bg: colors.primary[50] },
    feedback: { icon: 'message', color: colors.info[600], bg: colors.info[50] },
    cycle: { icon: 'calendar', color: colors.accent[600], bg: colors.accent[50] },
    skill: { icon: 'book', color: colors.success[600], bg: colors.success[50] },
    default: { icon: 'activity', color: colors.neutral[600], bg: colors.neutral[100] },
};

// ============ SHARED ATOMS ============

function KPICard({ title, value, subtitle, color, icon, index }: {
    title: string; value: string | number; subtitle?: string; color: string; icon: React.ReactNode; index: number;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 80)} style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
                    {icon}
                </View>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</Text>
                    <Text className="font-inter text-xl font-bold" style={{ color }}>{value}</Text>
                    {subtitle ? <Text className="font-inter text-[10px] text-neutral-400">{subtitle}</Text> : null}
                </View>
            </View>
        </Animated.View>
    );
}

function MetricProgressBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
    const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
    return (
        <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{label}</Text>
                <Text className="font-inter text-xs font-bold" style={{ color }}>{value}/{maxValue} ({pct.toFixed(0)}%)</Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

function RatingDistBar({ label, count, percentage, color }: { label: string; count: number; percentage: number; color: string }) {
    return (
        <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{label}</Text>
                <Text className="font-inter text-xs font-semibold" style={{ color }}>{count} ({percentage.toFixed(0)}%)</Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

function ActivityItem({ item, index }: { item: DashboardData['recentActivity'][0]; index: number }) {
    const activityType = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.default;
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(200 + index * 50)}>
            <View style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: activityType.bg }]}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path
                            d={item.type === 'review' ? 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z'
                                : item.type === 'goal' ? 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 110-4 2 2 0 010 4z'
                                : item.type === 'feedback' ? 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'
                                : item.type === 'cycle' ? 'M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z'
                                : 'M22 12h-4l-3 9L9 3l-3 9H2'}
                            stroke={activityType.color}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </View>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm text-primary-950 dark:text-white" numberOfLines={2}>{item.description}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {item.actor ? <Text className="font-inter text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{item.actor}</Text> : null}
                        {item.timestamp ? <Text className="font-inter text-[10px] text-neutral-400">{item.timestamp}</Text> : null}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PerformanceDashboardScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    const { data: response, isLoading, error, refetch, isFetching } = usePerformanceDashboard();

    const dashboard: DashboardData | null = React.useMemo(() => {
        const raw = (response as any)?.data ?? response;
        if (!raw) return null;
        return {
            activeCycles: raw.activeCycles ?? 0,
            totalEmployees: raw.totalEmployees ?? 0,
            completedReviews: raw.completedReviews ?? 0,
            pendingReviews: raw.pendingReviews ?? 0,
            averageRating: raw.averageRating ?? 0,
            goalsOnTrack: raw.goalsOnTrack ?? 0,
            totalGoals: raw.totalGoals ?? 0,
            feedbackPending: raw.feedbackPending ?? 0,
            feedbackCompleted: raw.feedbackCompleted ?? 0,
            skillGapCount: raw.skillGapCount ?? 0,
            successionCoverage: raw.successionCoverage ?? 0,
            recentActivity: Array.isArray(raw.recentActivity) ? raw.recentActivity.map((a: any) => ({
                id: a.id ?? String(Math.random()),
                type: a.type ?? 'default',
                description: a.description ?? '',
                timestamp: a.timestamp ?? '',
                actor: a.actor ?? '',
            })) : [],
            ratingDistribution: Array.isArray(raw.ratingDistribution) ? raw.ratingDistribution.map((r: any) => ({
                label: r.label ?? '',
                count: r.count ?? 0,
                percentage: r.percentage ?? 0,
            })) : [],
        };
    }, [response]);

    const DIST_COLORS = [colors.success[500], colors.primary[500], colors.info[500], colors.warning[500], colors.danger[500]];

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24, paddingHorizontal: 24 }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 24 }}>
                    <EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} />
                </View>
            );
        }
        if (!dashboard) {
            return (
                <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 24 }}>
                    <EmptyState icon="inbox" title="No data" message="Performance data will appear here once cycles are active." />
                </View>
            );
        }

        const totalReviews = dashboard.completedReviews + dashboard.pendingReviews;

        return (
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
                {/* KPI Cards */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Performance Dashboard</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">Overview of performance metrics</Text>
                </Animated.View>

                <View style={styles.kpiGrid}>
                    <KPICard
                        title="Active Cycles" value={dashboard.activeCycles}
                        color={colors.primary[600]} index={0}
                        icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    />
                    <KPICard
                        title="Avg Rating" value={dashboard.averageRating.toFixed(1)}
                        subtitle="out of 5.0" color={colors.warning[600]} index={1}
                        icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z" stroke={colors.warning[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    />
                    <KPICard
                        title="Reviews Done" value={dashboard.completedReviews}
                        subtitle={`of ${totalReviews} total`} color={colors.success[600]} index={2}
                        icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    />
                    <KPICard
                        title="Pending" value={dashboard.pendingReviews}
                        color={colors.danger[600]} index={3}
                        icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    />
                </View>

                {/* Key Metrics */}
                <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.metricsCard}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Key Metrics</Text>
                    <MetricProgressBar label="Review Completion" value={dashboard.completedReviews} maxValue={totalReviews} color={colors.success[500]} />
                    <MetricProgressBar label="Goals On Track" value={dashboard.goalsOnTrack} maxValue={dashboard.totalGoals} color={colors.primary[500]} />
                    <MetricProgressBar label="360 Feedback Done" value={dashboard.feedbackCompleted} maxValue={dashboard.feedbackCompleted + dashboard.feedbackPending} color={colors.info[500]} />
                    <View style={{ marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">Succession Coverage</Text>
                            <Text className="font-inter text-xs font-bold" style={{ color: colors.accent[600] }}>{dashboard.successionCoverage}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.min(dashboard.successionCoverage, 100)}%`, backgroundColor: colors.accent[500] }]} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[10px] text-neutral-400">Skill Gaps: {dashboard.skillGapCount}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">Total Employees: {dashboard.totalEmployees}</Text>
                    </View>
                </Animated.View>

                {/* Rating Distribution */}
                {dashboard.ratingDistribution.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.metricsCard}>
                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Rating Distribution</Text>
                        {dashboard.ratingDistribution.map((r, i) => (
                            <RatingDistBar key={i} label={r.label} count={r.count} percentage={r.percentage} color={DIST_COLORS[i % DIST_COLORS.length]} />
                        ))}
                    </Animated.View>
                )}

                {/* Recent Activity */}
                {dashboard.recentActivity.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(400)} style={{ marginTop: 4, marginBottom: 24 }}>
                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Recent Activity</Text>
                        {dashboard.recentActivity.map((item, index) => (
                            <ActivityItem key={item.id} item={item} index={index} />
                        ))}
                    </Animated.View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">Performance Dashboard</Text>
                </View>
            </LinearGradient>
            <FlashList
                data={[]}
                renderItem={() => null}
                ListHeaderComponent={renderContent}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    gradientHeader: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    kpiGrid: { marginTop: 16, gap: 10 },
    kpiCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    kpiIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    metricsCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 16, marginTop: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    progressTrack: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    activityRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    activityIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});
const styles = createStyles(false);
