import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useShutdown, useShutdownProgress } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── WO status colors ── */

const WO_STATUS_COLORS: Record<string, string> = {
    DRAFT: colors.neutral[300],
    PLANNED: colors.info[400],
    APPROVED: colors.info[500],
    ASSIGNED: '#6366F1',
    ACKNOWLEDGED: '#6366F1',
    IN_PROGRESS: colors.warning[400],
    ON_HOLD: '#F59E0B',
    COMPLETED: colors.success[400],
    AWAITING_QA: '#8B5CF6',
    CLOSED: colors.neutral[400],
    REJECTED: colors.danger[400],
    CANCELLED: colors.danger[300],
};

/* ── Screen ── */

export function ShutdownProgressScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data, isLoading } = useShutdown(id ?? '');
    const shutdown: any = (data as any)?.data ?? {};

    const { data: progressData, isLoading: progressLoading } = useShutdownProgress(id ?? '');
    const progress: any = (progressData as any)?.data ?? {};

    const shutdownWOs: any[] = shutdown.workOrders ?? shutdown.shutdownWorkOrders ?? [];

    // Calculate stats
    const statusCounts: Record<string, number> = {};
    shutdownWOs.forEach((wo: any) => {
        const s = (wo.workOrder ?? wo).status ?? 'UNKNOWN';
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    });

    const total = shutdownWOs.length || 1;
    const completedCount = (statusCounts['COMPLETED'] ?? 0) + (statusCounts['CLOSED'] ?? 0);
    const completionPct = progress.completionPct ?? Math.round((completedCount / total) * 100);
    const budget = shutdown.estimatedBudget ? Number(shutdown.estimatedBudget) : 0;
    const actual = shutdown.actualCost ? Number(shutdown.actualCost) : progress.actualCost ? Number(progress.actualCost) : 0;
    const budgetPct = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;

    if (isLoading || progressLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
                        <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                    </Pressable>
                    <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white" style={{ marginTop: 8 }}>
                        Progress - {shutdown.name ?? 'Shutdown'}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-500" style={{ marginTop: 4 }}>
                        {shutdown.plannedStart ? fmt.date(shutdown.plannedStart) : '---'} - {shutdown.plannedEnd ? fmt.date(shutdown.plannedEnd) : '---'}
                    </Text>
                </Animated.View>

                {/* Completion Ring */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white, alignItems: 'center' }]}>
                    <View style={{ width: 120, height: 120, marginBottom: 12 }}>
                        <View style={styles.ringContainer}>
                            <View style={[styles.ringOuter, { borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                                <View style={[styles.ringProgress, { borderColor: colors.primary[600], borderTopColor: 'transparent', borderRightColor: completionPct >= 50 ? colors.primary[600] : 'transparent', borderBottomColor: completionPct >= 75 ? colors.primary[600] : 'transparent', transform: [{ rotate: `${(completionPct / 100) * 360}deg` }] }]} />
                            </View>
                            <View style={styles.ringCenter}>
                                <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">{completionPct}%</Text>
                            </View>
                        </View>
                    </View>
                    <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">Overall Completion</Text>
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 4 }}>{completedCount} / {shutdownWOs.length} work orders done</Text>
                </Animated.View>

                {/* WO Status Breakdown */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 14 }}>WO Status Breakdown</Text>
                    {Object.entries(statusCounts).sort(([, a], [, b]) => b - a).map(([s, count]) => (
                        <View key={s} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{s.replace(/_/g, ' ')}</Text>
                                <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">{count} ({Math.round((count / total) * 100)}%)</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 4 }}>
                                <View style={{ height: 8, borderRadius: 4, backgroundColor: WO_STATUS_COLORS[s] ?? colors.neutral[400], width: `${(count / total) * 100}%` }} />
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {/* Budget vs Actual */}
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 14 }}>Budget vs Actual Cost</Text>
                    <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text className="font-inter text-xs text-neutral-500">Budget</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{budget ? budget.toLocaleString() : '---'}</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 4 }}>
                            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.primary[500], width: '100%' }} />
                        </View>
                    </View>
                    <View style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text className="font-inter text-xs text-neutral-500">Actual</Text>
                            <Text className="font-inter text-sm font-bold" style={{ color: budgetPct > 100 ? colors.danger[600] : colors.success[600] }}>{actual ? actual.toLocaleString() : '---'}</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 4 }}>
                            <View style={{ height: 8, borderRadius: 4, backgroundColor: budgetPct > 100 ? colors.danger[500] : colors.success[500], width: `${Math.min(budgetPct, 100)}%` }} />
                        </View>
                    </View>
                    {budgetPct > 100 && (
                        <Text className="font-inter text-xs font-medium text-danger-600" style={{ marginTop: 4 }}>Over budget by {budgetPct - 100}%</Text>
                    )}
                </Animated.View>

                {/* Timeline */}
                <Animated.View entering={FadeInUp.duration(400).delay(400)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 12 }}>Timeline</Text>
                    {[
                        { label: 'Planned Start', value: shutdown.plannedStart ? fmt.date(shutdown.plannedStart) : '---' },
                        { label: 'Planned End', value: shutdown.plannedEnd ? fmt.date(shutdown.plannedEnd) : '---' },
                        ...(shutdown.actualStart ? [{ label: 'Actual Start', value: fmt.date(shutdown.actualStart) }] : []),
                        ...(shutdown.actualEnd ? [{ label: 'Actual End', value: fmt.date(shutdown.actualEnd) }] : []),
                    ].map((row) => (
                        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text className="font-inter text-xs text-neutral-500">{row.label}</Text>
                            <Text className="font-inter text-xs font-medium text-neutral-700 dark:text-neutral-300">{row.value}</Text>
                        </View>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    section: { borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    ringContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    ringOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 10, position: 'absolute' },
    ringProgress: { width: 120, height: 120, borderRadius: 60, borderWidth: 10, position: 'absolute' },
    ringCenter: { alignItems: 'center', justifyContent: 'center' },
});
