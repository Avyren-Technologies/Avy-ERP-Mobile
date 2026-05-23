import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useReliabilityMetrics } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Filter Chip ── */

function FilterChip({ label, active, onPress, isDark }: { label: string; active: boolean; onPress: () => void; isDark: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                chipStyles.chip,
                {
                    backgroundColor: active ? colors.primary[600] : isDark ? '#1A1730' : colors.white,
                    borderColor: active ? colors.primary[600] : isDark ? colors.primary[900] : colors.neutral[200],
                },
            ]}
        >
            <Text
                className="font-inter text-[11px] font-bold"
                style={{ color: active ? colors.white : isDark ? colors.neutral[400] : colors.neutral[600] }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/* ── Summary Card ── */

function SummaryCard({ label, value, color, isDark }: { label: string; value: string; color: string; isDark: boolean }) {
    return (
        <View style={[summaryStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{label}</Text>
            <Text className="font-inter text-lg font-bold" style={{ color }}>{value}</Text>
        </View>
    );
}

/* ── Asset Reliability Item ── */

function ReliabilityItem({ item, isDark, fmt }: { item: any; isDark: boolean; fmt: any }) {
    const flagged = item.flaggedForReplacement;
    const availColor = Number(item.availability ?? 0) >= 90
        ? colors.success[600]
        : Number(item.availability ?? 0) >= 70
            ? colors.warning[600]
            : colors.danger[600];

    return (
        <View
            style={[
                itemStyles.card,
                {
                    backgroundColor: flagged ? (isDark ? '#2D1520' : '#FFF5F5') : isDark ? '#1A1730' : colors.white,
                    borderColor: flagged ? colors.danger[300] : isDark ? colors.primary[900] : colors.neutral[100],
                },
            ]}
        >
            <View style={itemStyles.header}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                        {item.assetName ?? 'Unknown'}
                    </Text>
                    <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                        {item.assetClass ?? '-'} {item.criticality ? `\u2022 ${item.criticality}` : ''}
                    </Text>
                </View>
                {flagged && (
                    <View style={[itemStyles.replaceBadge]}>
                        <Text className="font-inter text-[9px] font-bold" style={{ color: colors.danger[700] }}>
                            REPLACE
                        </Text>
                    </View>
                )}
            </View>

            <View style={itemStyles.metricsRow}>
                <View style={itemStyles.metric}>
                    <Text className="font-inter text-[10px] text-neutral-400">MTBF</Text>
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.success[600] }}>
                        {Number(item.mtbf ?? 0).toFixed(0)}h
                    </Text>
                </View>
                <View style={[itemStyles.metricDivider, { backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} />
                <View style={itemStyles.metric}>
                    <Text className="font-inter text-[10px] text-neutral-400">MTTR</Text>
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.warning[600] }}>
                        {Number(item.mttr ?? 0).toFixed(1)}h
                    </Text>
                </View>
                <View style={[itemStyles.metricDivider, { backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} />
                <View style={itemStyles.metric}>
                    <Text className="font-inter text-[10px] text-neutral-400">Availability</Text>
                    <Text className="font-inter text-sm font-bold" style={{ color: availColor }}>
                        {Number(item.availability ?? 0).toFixed(1)}%
                    </Text>
                </View>
                <View style={[itemStyles.metricDivider, { backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} />
                <View style={itemStyles.metric}>
                    <Text className="font-inter text-[10px] text-neutral-400">Failures</Text>
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.danger[600] }}>
                        {item.failureCount ?? 0}
                    </Text>
                </View>
            </View>

            {item.lastFailure && (
                <Text className="font-inter text-[10px] text-neutral-400 mt-1">
                    Last failure: {fmt.date(item.lastFailure)}
                </Text>
            )}
        </View>
    );
}

/* ── Main Screen ── */

export function ReliabilityScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const [criticality, setCriticality] = React.useState('ALL');

    const { data, isLoading, isFetching, refetch } = useReliabilityMetrics(
        criticality !== 'ALL' ? { criticality } : undefined,
    );
    const items: any[] = (data as any)?.data ?? [];

    // Summary
    const summary = React.useMemo(() => {
        if (items.length === 0) return { avgMTBF: '0', avgMTTR: '0', avgAvail: '0', replaceCount: 0 };
        const avgMTBF = items.reduce((s: number, i: any) => s + Number(i.mtbf ?? 0), 0) / items.length;
        const avgMTTR = items.reduce((s: number, i: any) => s + Number(i.mttr ?? 0), 0) / items.length;
        const avgAvail = items.reduce((s: number, i: any) => s + Number(i.availability ?? 0), 0) / items.length;
        const replaceCount = items.filter((i: any) => i.flaggedForReplacement).length;
        return { avgMTBF: avgMTBF.toFixed(0), avgMTTR: avgMTTR.toFixed(1), avgAvail: avgAvail.toFixed(1), replaceCount };
    }, [items]);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Reliability" subtitle="Asset MTBF, MTTR & Availability" onMenuPress={toggle} />
            </Animated.View>

            {isLoading ? (
                <View style={{ padding: 24, gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            ) : (
                <FlashList
                    data={items}
                    keyExtractor={(item: any, idx: number) => item.assetId ?? String(idx)}

                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} />}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                    ListHeaderComponent={
                        <View style={{ gap: 16, paddingTop: 16, paddingBottom: 8 }}>
                            {/* Summary */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <SummaryCard label="Avg MTBF" value={`${summary.avgMTBF}h`} color={colors.success[600]} isDark={isDark} />
                                <SummaryCard label="Avg MTTR" value={`${summary.avgMTTR}h`} color={colors.warning[600]} isDark={isDark} />
                                <SummaryCard label="Avg Avail" value={`${summary.avgAvail}%`} color={colors.primary[600]} isDark={isDark} />
                            </View>

                            {/* Filters */}
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((c) => (
                                    <FilterChip key={c} label={c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()} active={criticality === c} onPress={() => setCriticality(c)} isDark={isDark} />
                                ))}
                            </View>
                        </View>
                    }
                    renderItem={({ item }: { item: any }) => (
                        <View style={{ marginBottom: 10 }}>
                            <ReliabilityItem item={item} isDark={isDark} fmt={fmt} />
                        </View>
                    )}
                    ListEmptyComponent={<EmptyState icon="list" title="No Data" message="Reliability metrics will appear once breakdown data is available." />}
                />
            )}
        </View>
    );
}

/* ── Styles ── */

const chipStyles = StyleSheet.create({
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
});

const summaryStyles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        gap: 2,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
});

const itemStyles = StyleSheet.create({
    card: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    replaceBadge: {
        backgroundColor: colors.danger[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metric: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    metricDivider: {
        width: 1,
        height: 28,
    },
});
