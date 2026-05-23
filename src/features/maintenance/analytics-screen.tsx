import { LinearGradient } from 'expo-linear-gradient';
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

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useAvailabilityTrend,
    useCostAnalytics,
    usePlannedVsUnplanned,
    useReliabilityMetrics,
} from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Tab Config ── */

const TABS = ['Availability', 'Cost', 'Planned vs Unplanned', 'MTBF/MTTR'] as const;
type TabKey = (typeof TABS)[number];

/* ── Tab Chip ── */

function TabChip({ label, active, onPress, isDark }: { label: string; active: boolean; onPress: () => void; isDark: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                tabStyles.chip,
                {
                    backgroundColor: active ? colors.primary[600] : isDark ? '#1A1730' : colors.white,
                    borderColor: active ? colors.primary[600] : isDark ? colors.primary[900] : colors.neutral[200],
                },
            ]}
        >
            <Text
                className="font-inter text-xs font-bold"
                style={{ color: active ? colors.white : isDark ? colors.neutral[400] : colors.neutral[600] }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/* ── Data Row ── */

function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <View style={rowStyles.row}>
            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ flex: 1 }}>{label}</Text>
            <Text className="font-inter text-xs font-bold" style={{ color: valueColor ?? colors.primary[700] }}>{value}</Text>
        </View>
    );
}

/* ── Progress Bar ── */

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <View style={barStyles.track}>
            <View style={[barStyles.fill, { width: `${Math.max(Math.min(value, 100), 1)}%`, backgroundColor: color }]} />
        </View>
    );
}

/* ── Availability Tab ── */

function AvailabilityTab({ isDark }: { isDark: boolean }) {
    const { data, isLoading } = useAvailabilityTrend();
    const raw = (data as any)?.data;
    const items: any[] = Array.isArray(raw) ? raw : [];

    if (isLoading) return <SkeletonCard />;
    if (items.length === 0) return <EmptyState icon="list" title="No Data" message="Availability data will appear once downtime is recorded." />;

    return (
        <View style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
            {items.map((item: any, idx: number) => (
                <View key={idx} style={cardStyles.itemRow}>
                    <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" style={{ width: 70 }}>{item.period ?? `M${idx + 1}`}</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                        <ProgressBar value={Number(item.availability ?? 0)} color={Number(item.availability ?? 0) >= 90 ? colors.success[500] : Number(item.availability ?? 0) >= 70 ? colors.warning[500] : colors.danger[500]} />
                    </View>
                    <Text className="font-inter text-xs font-bold" style={{ width: 45, textAlign: 'right', color: colors.primary[700] }}>{Number(item.availability ?? 0).toFixed(1)}%</Text>
                </View>
            ))}
        </View>
    );
}

/* ── Cost Tab ── */

function CostTab({ isDark }: { isDark: boolean }) {
    const { data, isLoading } = useCostAnalytics();
    const raw = (data as any)?.data;
    const items: any[] = Array.isArray(raw) ? raw : [];

    if (isLoading) return <SkeletonCard />;
    if (items.length === 0) return <EmptyState icon="list" title="No Data" message="Cost data will appear once work orders with costs are recorded." />;

    const totalCost = items.reduce((s: number, i: any) => s + Number(i.totalCost ?? 0), 0);

    return (
        <View style={{ gap: 12 }}>
            <View style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100], padding: 16 }]}>
                <Text className="font-inter text-xs text-neutral-500">Total Cost</Text>
                <Text className="font-inter text-xl font-bold text-primary-700 dark:text-primary-400">${totalCost.toLocaleString()}</Text>
            </View>
            <View style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                {items.map((item: any, idx: number) => (
                    <View key={idx}>
                        <DataRow label={item.assetClass ?? item.category ?? 'Uncategorized'} value={`$${Number(item.totalCost ?? 0).toLocaleString()}`} />
                        {idx < items.length - 1 && <View style={{ height: 1, backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }} />}
                    </View>
                ))}
            </View>
        </View>
    );
}

/* ── Planned vs Unplanned Tab ── */

function PlannedVsUnplannedTab({ isDark }: { isDark: boolean }) {
    const { data, isLoading } = usePlannedVsUnplanned();
    const raw = (data as any)?.data;
    const items: any[] = Array.isArray(raw) ? raw : [];

    if (isLoading) return <SkeletonCard />;
    if (items.length === 0) return <EmptyState icon="list" title="No Data" message="Data will appear once PM and breakdown work orders are logged." />;

    return (
        <View style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
            {items.map((item: any, idx: number) => {
                const planned = Number(item.plannedCount ?? 0);
                const unplanned = Number(item.unplannedCount ?? 0);
                const total = planned + unplanned;
                const pct = total > 0 ? (planned / total) * 100 : 0;
                return (
                    <View key={idx} style={cardStyles.itemRow}>
                        <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" style={{ width: 60 }}>{item.period ?? `M${idx + 1}`}</Text>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ width: `${pct}%`, backgroundColor: colors.success[500], height: 8 }} />
                                <View style={{ width: `${100 - pct}%`, backgroundColor: colors.danger[400], height: 8 }} />
                            </View>
                        </View>
                        <Text className="font-inter text-[10px] font-bold text-success-600" style={{ width: 25, textAlign: 'right' }}>{planned}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">/</Text>
                        <Text className="font-inter text-[10px] font-bold text-danger-600" style={{ width: 25 }}>{unplanned}</Text>
                    </View>
                );
            })}
        </View>
    );
}

/* ── MTBF/MTTR Tab ── */

function MTBFMTTRTab({ isDark }: { isDark: boolean }) {
    const { data, isLoading } = useReliabilityMetrics();
    const raw = (data as any)?.data;
    const items: any[] = Array.isArray(raw) ? raw : [];

    if (isLoading) return <SkeletonCard />;
    if (items.length === 0) return <EmptyState icon="list" title="No Data" message="Reliability metrics will appear once breakdown data is available." />;

    return (
        <View style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
            {/* Header */}
            <View style={[cardStyles.itemRow, { borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200], paddingBottom: 8 }]}>
                <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ flex: 2 }}>ASSET</Text>
                <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 55, textAlign: 'right' }}>MTBF</Text>
                <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 55, textAlign: 'right' }}>MTTR</Text>
                <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 45, textAlign: 'right' }}>AVAIL</Text>
            </View>
            {items.map((item: any, idx: number) => (
                <View key={idx} style={cardStyles.itemRow}>
                    <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" style={{ flex: 2 }} numberOfLines={1}>{item.assetName ?? 'Unknown'}</Text>
                    <Text className="font-inter text-xs font-bold text-success-600" style={{ width: 55, textAlign: 'right' }}>{Number(item.mtbf ?? 0).toFixed(0)}</Text>
                    <Text className="font-inter text-xs font-bold text-warning-600" style={{ width: 55, textAlign: 'right' }}>{Number(item.mttr ?? 0).toFixed(1)}</Text>
                    <Text className="font-inter text-xs font-bold" style={{ width: 45, textAlign: 'right', color: Number(item.availability ?? 0) >= 90 ? colors.success[600] : Number(item.availability ?? 0) >= 70 ? colors.warning[600] : colors.danger[600] }}>
                        {Number(item.availability ?? 0).toFixed(0)}%
                    </Text>
                </View>
            ))}
        </View>
    );
}

/* ── Main Screen ── */

export function AnalyticsScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [activeTab, setActiveTab] = React.useState<TabKey>('Availability');
    const [refreshing, setRefreshing] = React.useState(false);

    const availQ = useAvailabilityTrend();
    const costQ = useCostAnalytics();
    const pvuQ = usePlannedVsUnplanned();
    const relQ = useReliabilityMetrics();

    const handleRefresh = () => {
        setRefreshing(true);
        Promise.all([availQ.refetch(), costQ.refetch(), pvuQ.refetch(), relQ.refetch()]).finally(() => setRefreshing(false));
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary[500]} />}
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    <AppTopHeader title="Analytics" subtitle="Performance & Cost Insights" onMenuPress={toggle} />
                </Animated.View>

                <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
                    {/* Tab Bar */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {TABS.map((tab) => (
                            <TabChip key={tab} label={tab} active={activeTab === tab} onPress={() => setActiveTab(tab)} isDark={isDark} />
                        ))}
                    </ScrollView>

                    {/* Tab Content */}
                    <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                        {activeTab === 'Availability' && <AvailabilityTab isDark={isDark} />}
                        {activeTab === 'Cost' && <CostTab isDark={isDark} />}
                        {activeTab === 'Planned vs Unplanned' && <PlannedVsUnplannedTab isDark={isDark} />}
                        {activeTab === 'MTBF/MTTR' && <MTBFMTTRTab isDark={isDark} />}
                    </Animated.View>
                </View>
            </ScrollView>
        </View>
    );
}

/* ── Styles ── */

const tabStyles = StyleSheet.create({
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
});

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
});

const barStyles = StyleSheet.create({
    track: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
    },
    fill: {
        height: 6,
        borderRadius: 3,
    },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
});
