import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useShutdown, useShutdownProgress } from '@/features/maintenance/api/use-maintenance-queries';
import { useApproveShutdown, useStartShutdown, useCompleteShutdown } from '@/features/maintenance/api/use-maintenance-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Status configs ── */

const TYPE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    PLANNED_OVERHAUL: { label: 'Planned Overhaul', bgColor: colors.info[50], textColor: colors.info[700] },
    STATUTORY_INSPECTION: { label: 'Statutory Inspection', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    CORRECTIVE_MAJOR: { label: 'Corrective Major', bgColor: colors.danger[50], textColor: colors.danger[700] },
    COMMISSIONING: { label: 'Commissioning', bgColor: '#ECFDF5', textColor: '#059669' },
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    DRAFT: { label: 'Draft', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    APPROVED: { label: 'Approved', bgColor: colors.info[50], textColor: colors.info[700] },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700] },
    COMPLETED: { label: 'Completed', bgColor: colors.success[50], textColor: colors.success[700] },
    CANCELLED: { label: 'Cancelled', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

/* ── Screen ── */

export function ShutdownDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data, isLoading } = useShutdown(id ?? '');
    const shutdown: any = (data as any)?.data ?? {};

    const { data: progressData } = useShutdownProgress(id ?? '');
    const progress: any = (progressData as any)?.data ?? {};

    const [activeTab, setActiveTab] = React.useState<'overview' | 'work-orders' | 'progress'>('overview');

    const approveMutation = useApproveShutdown();
    const startMutation = useStartShutdown();
    const completeMutation = useCompleteShutdown();

    const isPending = approveMutation.isPending || startMutation.isPending || completeMutation.isPending;

    const shutdownWOs: any[] = shutdown.workOrders ?? shutdown.shutdownWorkOrders ?? [];
    const typeCfg = TYPE_CONFIG[shutdown.eventType] ?? TYPE_CONFIG.PLANNED_OVERHAUL;
    const statusCfg = STATUS_CONFIG[shutdown.status] ?? STATUS_CONFIG.DRAFT;

    const completedCount = shutdownWOs.filter((w: any) => {
        const s = (w.workOrder ?? w).status;
        return s === 'COMPLETED' || s === 'CLOSED';
    }).length;
    const completionPct = progress.completionPct ?? (shutdownWOs.length > 0 ? Math.round((completedCount / shutdownWOs.length) * 100) : 0);

    const handleAction = async (action: 'approve' | 'start' | 'complete') => {
        if (!id) return;
        try {
            if (action === 'approve') await approveMutation.mutateAsync({ id });
            else if (action === 'start') await startMutation.mutateAsync({ id });
            else await completeMutation.mutateAsync({ id });
        } catch (_err) { /* mutation handles */ }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    const tabs = ['overview', 'work-orders', 'progress'] as const;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
                        <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                    </Pressable>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white" style={{ marginTop: 8 }}>
                        {shutdown.name ?? 'Shutdown Detail'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <View style={[styles.badge, { backgroundColor: typeCfg.bgColor }]}>
                            <Text className="font-inter" style={[styles.badgeText, { color: typeCfg.textColor }]}>{typeCfg.label}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: statusCfg.bgColor }]}>
                            <Text className="font-inter" style={[styles.badgeText, { color: statusCfg.textColor }]}>{statusCfg.label}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Tabs */}
                <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.tabRow}>
                    {tabs.map((tab) => (
                        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                            <Text className="font-inter" style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'work-orders' ? 'Work Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.cardsRow}>
                            {[
                                { label: 'Location', value: shutdown.location?.name ?? '---' },
                                { label: 'Line', value: shutdown.productionLine?.name ?? '---' },
                                { label: 'Start', value: shutdown.plannedStart ? fmt.date(shutdown.plannedStart) : '---' },
                                { label: 'End', value: shutdown.plannedEnd ? fmt.date(shutdown.plannedEnd) : '---' },
                            ].map((c) => (
                                <View key={c.label} style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">{c.label}</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 4 }}>{c.value}</Text>
                                </View>
                            ))}
                        </Animated.View>

                        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.cardsRow}>
                            {[
                                { label: 'Work Orders', value: String(shutdownWOs.length) },
                                { label: 'Completion', value: `${completionPct}%` },
                                { label: 'Budget', value: shutdown.estimatedBudget ? Number(shutdown.estimatedBudget).toLocaleString() : '---' },
                                { label: 'Actual', value: shutdown.actualCost ? Number(shutdown.actualCost).toLocaleString() : '---' },
                            ].map((c) => (
                                <View key={c.label} style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">{c.label}</Text>
                                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white" style={{ marginTop: 4 }}>{c.value}</Text>
                                </View>
                            ))}
                        </Animated.View>

                        {shutdown.description ? (
                            <Animated.View entering={FadeInUp.duration(400).delay(250)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 6 }}>Description</Text>
                                <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300">{shutdown.description}</Text>
                            </Animated.View>
                        ) : null}
                    </>
                )}

                {/* Work Orders Tab */}
                {activeTab === 'work-orders' && (
                    <Animated.View entering={FadeInUp.duration(400).delay(150)}>
                        {shutdownWOs.length === 0 ? (
                            <EmptyState icon="search" title="No work orders" message="Work orders will appear here when linked." />
                        ) : (
                            shutdownWOs.map((wo: any, idx: number) => {
                                const woItem = wo.workOrder ?? wo;
                                return (
                                    <Pressable key={woItem.id} onPress={() => router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: woItem.id } })} style={[styles.woCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text className="font-inter text-sm font-bold text-primary-600">{woItem.woNumber ?? '---'}</Text>
                                            <View style={[styles.badge, { backgroundColor: woItem.status === 'COMPLETED' || woItem.status === 'CLOSED' ? colors.success[50] : woItem.status === 'IN_PROGRESS' ? colors.warning[50] : colors.neutral[100] }]}>
                                                <Text className="font-inter" style={[styles.badgeText, { color: woItem.status === 'COMPLETED' || woItem.status === 'CLOSED' ? colors.success[700] : woItem.status === 'IN_PROGRESS' ? colors.warning[700] : colors.neutral[600] }]}>{woItem.status}</Text>
                                            </View>
                                        </View>
                                        <Text className="font-inter text-xs text-neutral-500" style={{ marginTop: 4 }}>{woItem.asset?.name ?? '---'} | {woItem.woType ?? '---'}</Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </Animated.View>
                )}

                {/* Progress Tab */}
                {activeTab === 'progress' && (
                    <>
                        {/* Completion bar */}
                        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Overall Completion</Text>
                                <Text className="font-inter text-2xl font-bold text-primary-600">{completionPct}%</Text>
                            </View>
                            <View style={{ height: 10, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 5 }}>
                                <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.primary[600], width: `${completionPct}%` }} />
                            </View>
                            <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 6 }}>{completedCount} / {shutdownWOs.length} work orders completed</Text>
                        </Animated.View>

                        {/* WO Status breakdown */}
                        <Animated.View entering={FadeInUp.duration(400).delay(250)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 12 }}>WO Status Breakdown</Text>
                            {(() => {
                                const counts: Record<string, number> = {};
                                shutdownWOs.forEach((wo: any) => {
                                    const s = (wo.workOrder ?? wo).status ?? 'UNKNOWN';
                                    counts[s] = (counts[s] ?? 0) + 1;
                                });
                                const total = shutdownWOs.length || 1;
                                return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([s, count]) => (
                                    <View key={s} style={{ marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{s.replace(/_/g, ' ')}</Text>
                                            <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">{count}</Text>
                                        </View>
                                        <View style={{ height: 6, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 3 }}>
                                            <View style={{ height: 6, borderRadius: 3, backgroundColor: s === 'COMPLETED' || s === 'CLOSED' ? colors.success[500] : s === 'IN_PROGRESS' ? colors.warning[500] : colors.info[400], width: `${(count / total) * 100}%` }} />
                                        </View>
                                    </View>
                                ));
                            })()}
                        </Animated.View>

                        {/* Budget vs Actual */}
                        <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.cardsRow}>
                            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">Budget</Text>
                                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white" style={{ marginTop: 4 }}>
                                    {shutdown.estimatedBudget ? Number(shutdown.estimatedBudget).toLocaleString() : '---'}
                                </Text>
                            </View>
                            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">Actual Cost</Text>
                                <Text className="font-inter text-lg font-bold" style={{ marginTop: 4, color: shutdown.actualCost && shutdown.estimatedBudget && Number(shutdown.actualCost) > Number(shutdown.estimatedBudget) ? colors.danger[600] : colors.success[600] }}>
                                    {shutdown.actualCost ? Number(shutdown.actualCost).toLocaleString() : '---'}
                                </Text>
                            </View>
                        </Animated.View>
                    </>
                )}

                {/* Action buttons */}
                <Animated.View entering={FadeInUp.duration(400).delay(400)} style={{ marginTop: 20, gap: 10 }}>
                    {shutdown.status === 'DRAFT' && (
                        <Pressable onPress={() => handleAction('approve')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.info[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Approve Shutdown</Text>
                        </Pressable>
                    )}
                    {shutdown.status === 'APPROVED' && (
                        <Pressable onPress={() => handleAction('start')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.warning[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Start Shutdown</Text>
                        </Pressable>
                    )}
                    {shutdown.status === 'IN_PROGRESS' && (
                        <Pressable onPress={() => handleAction('complete')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Complete Shutdown</Text>
                        </Pressable>
                    )}
                    {(shutdown.status === 'IN_PROGRESS' || shutdown.status === 'APPROVED') && (
                        <Pressable onPress={() => router.push({ pathname: '/maintenance/shutdown-progress' as any, params: { id: id ?? '' } })} style={[styles.actionBtn, { backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: colors.primary[200] }]}>
                            <Text className="font-inter text-sm font-bold text-primary-600">View Progress Dashboard</Text>
                        </Pressable>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    tabRow: { flexDirection: 'row', marginTop: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
    tab: { paddingHorizontal: 16, paddingVertical: 10 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[600] },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.neutral[500] },
    tabTextActive: { color: colors.primary[700] },
    cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    infoCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    section: { borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    woCard: { borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
