import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal as RNModal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useShutdown, useShutdownProgress, useWorkOrders } from '@/features/maintenance/api/use-maintenance-queries';
import { useApproveShutdown, useStartShutdown, useCompleteShutdown, useUpdateShutdown, useDeleteShutdown, useAddShutdownWOs, useRemoveShutdownWO } from '@/features/maintenance/api/use-maintenance-mutations';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { DatePickerField } from '@/components/ui/date-picker';

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

    const { data, isLoading, refetch: refetchShutdown } = useShutdown(id ?? '');
    const shutdown: any = (data as any)?.data ?? {};

    const { data: progressData, refetch: refetchProgress } = useShutdownProgress(id ?? '');
    const progress: any = (progressData as any)?.data ?? {};

    const { data: locationsRaw } = useCompanyLocations();
    const locations = React.useMemo(() => {
        const raw = (locationsRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [locationsRaw]);

    const locationName = shutdown.location?.name ?? locations.find((l: any) => l.id === shutdown.locationId)?.name ?? '---';

    useFocusEffect(
        React.useCallback(() => {
            refetchShutdown();
            refetchProgress();
        }, [refetchShutdown, refetchProgress]),
    );

    const [activeTab, setActiveTab] = React.useState<'overview' | 'work-orders' | 'progress'>('overview');

    const approveMutation = useApproveShutdown();
    const startMutation = useStartShutdown();
    const completeMutation = useCompleteShutdown();
    const updateMutation = useUpdateShutdown();
    const deleteMutation = useDeleteShutdown();
    const addWOMutation = useAddShutdownWOs();
    const removeWOMutation = useRemoveShutdownWO();

    const [editVisible, setEditVisible] = React.useState(false);
    const [showAddWO, setShowAddWO] = React.useState(false);
    const [woSearch, setWoSearch] = React.useState('');

    const handleRemoveWO = (woId: string) => {
        const { Alert } = require('react-native');
        Alert.alert(
            'Remove Work Order',
            'Are you sure you want to unlink this work order from the shutdown event?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeWOMutation.mutateAsync({ id: id ?? '', woId });
                            showSuccess('Work order unlinked.');
                        } catch (err: any) {
                            showErrorMessage(err?.message || 'Failed to remove work order');
                        }
                    },
                },
            ],
        );
    };

    const handleDelete = () => {
        const { Alert } = require('react-native');
        Alert.alert(
            'Delete Shutdown',
            'Are you sure you want to delete this shutdown event? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMutation.mutateAsync(id ?? '');
                            showSuccess('Shutdown deleted.');
                            router.back();
                        } catch (err: any) {
                            showErrorMessage(err?.message || 'Failed to delete shutdown');
                        }
                    },
                },
            ],
        );
    };

    const isPending = approveMutation.isPending || startMutation.isPending || completeMutation.isPending;

    const shutdownWOs: any[] = shutdown.workOrders ?? shutdown.shutdownWorkOrders ?? [];
    const typeCfg = TYPE_CONFIG[shutdown.eventType] ?? TYPE_CONFIG.PLANNED_OVERHAUL;
    const statusCfg = STATUS_CONFIG[(shutdown.status ?? '').toUpperCase()] ?? STATUS_CONFIG.DRAFT;
    const status = (shutdown.status ?? '').toUpperCase();
    const isEditable = status !== 'COMPLETED' && status !== 'CANCELLED';
    const estimatedCostVal = shutdown.estimatedCost != null ? Number(shutdown.estimatedCost) : progress.estimatedCost != null ? Number(progress.estimatedCost) : null;
    const actualCostVal = shutdown.actualCost != null ? Number(shutdown.actualCost) : progress.actualCost != null ? Number(progress.actualCost) : null;

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

            {/* ── FIXED HEADER (never scrolls) ── */}
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.fixedHeader, { paddingTop: insets.top + 12, backgroundColor: isDark ? 'rgba(15,13,26,0.97)' : 'rgba(255,255,255,0.97)', borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                {/* Back ← | Edit → */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Pressable onPress={() => router.back()} style={{ paddingVertical: 8, paddingRight: 16 }} hitSlop={10}>
                        <Text className="font-inter text-sm font-bold text-primary-600">← Back</Text>
                    </Pressable>
                    {['DRAFT', 'APPROVED'].includes((shutdown.status ?? '').toUpperCase()) && (
                        <Pressable
                            onPress={() => setEditVisible(true)}
                            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: isDark ? colors.primary[950] : colors.white }}
                        >
                            <Text className="font-inter text-xs font-bold text-primary-600">✏️ Edit</Text>
                        </Pressable>
                    )}
                </View>

                {/* Title + badges */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 12 }}>
                    <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white" style={{ flex: 1 }} numberOfLines={1}>
                        {shutdown.name ?? 'Shutdown Detail'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, marginBottom: 12 }}>
                    <View style={[styles.badge, { backgroundColor: typeCfg.bgColor }]}>
                        <Text className="font-inter" style={[styles.badgeText, { color: typeCfg.textColor }]}>{typeCfg.label}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusCfg.bgColor }]}>
                        <Text className="font-inter" style={[styles.badgeText, { color: statusCfg.textColor }]}>{statusCfg.label}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {tabs.map((tab) => (
                        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                            <Text className="font-inter" style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'work-orders' ? 'Work Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
                        </Pressable>
                    ))}
                </View>
            </Animated.View>

            {/* ── SCROLLABLE CONTENT ── */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: insets.bottom + 60 }} showsVerticalScrollIndicator={false}>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.cardsRow}>
                            {[
                                { label: 'Location', value: locationName },
                                { label: 'Line', value: shutdown.lineWorkCenter ?? '---' },
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
                                { label: 'Budget', value: estimatedCostVal != null ? estimatedCostVal.toLocaleString() : '---' },
                                { label: 'Actual', value: actualCostVal != null ? actualCostVal.toLocaleString() : '---' },
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
                        {isEditable && (
                            <Pressable
                                onPress={() => setShowAddWO(true)}
                                style={({ pressed }) => [
                                    styles.actionBtn,
                                    {
                                        backgroundColor: colors.primary[600],
                                        marginBottom: 16,
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: 8,
                                    },
                                    pressed && { opacity: 0.9 },
                                ]}
                            >
                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M12 5v14M5 12h14" />
                                </Svg>
                                <Text className="font-inter text-sm font-bold text-white">Add Work Orders</Text>
                            </Pressable>
                        )}
                        {shutdownWOs.length === 0 ? (
                            <EmptyState icon="search" title="No work orders" message="Work orders will appear here when linked." />
                        ) : (
                            shutdownWOs.map((wo: any, idx: number) => {
                                const woItem = wo.workOrder ?? wo;
                                return (
                                    <Pressable key={woItem.id} onPress={() => router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: woItem.id } })} style={[styles.woCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text className="font-inter text-sm font-bold text-primary-600">{woItem.woNumber ?? '---'}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={[styles.badge, { backgroundColor: woItem.status === 'COMPLETED' || woItem.status === 'CLOSED' ? colors.success[50] : woItem.status === 'IN_PROGRESS' ? colors.warning[50] : colors.neutral[100] }]}>
                                                    <Text className="font-inter" style={[styles.badgeText, { color: woItem.status === 'COMPLETED' || woItem.status === 'CLOSED' ? colors.success[700] : woItem.status === 'IN_PROGRESS' ? colors.warning[700] : colors.neutral[600] }]}>{woItem.status}</Text>
                                                </View>
                                                {isEditable && (
                                                    <Pressable
                                                        onPress={() => handleRemoveWO(woItem.id)}
                                                        style={{ padding: 4 }}
                                                        hitSlop={8}
                                                    >
                                                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.danger[500]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                            <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                                        </Svg>
                                                    </Pressable>
                                                )}
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
                                    {estimatedCostVal != null ? estimatedCostVal.toLocaleString() : '---'}
                                </Text>
                            </View>
                            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">Actual Cost</Text>
                                <Text className="font-inter text-lg font-bold" style={{ marginTop: 4, color: actualCostVal != null && estimatedCostVal != null && actualCostVal > estimatedCostVal ? colors.danger[600] : colors.success[600] }}>
                                    {actualCostVal != null ? actualCostVal.toLocaleString() : '---'}
                                </Text>
                            </View>
                        </Animated.View>
                    </>
                )}

                {/* Action buttons */}
                <Animated.View entering={FadeInUp.duration(400).delay(400)} style={{ marginTop: 20, gap: 10 }}>
                    {(shutdown.status ?? '').toUpperCase() === 'DRAFT' && (
                        <Pressable onPress={() => handleAction('approve')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.info[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Approve Shutdown</Text>
                        </Pressable>
                    )}
                    {(shutdown.status ?? '').toUpperCase() === 'APPROVED' && (
                        <Pressable onPress={() => handleAction('start')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.warning[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Start Shutdown</Text>
                        </Pressable>
                    )}
                    {(shutdown.status ?? '').toUpperCase() === 'IN_PROGRESS' && (
                        <Pressable onPress={() => handleAction('complete')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Complete Shutdown</Text>
                        </Pressable>
                    )}
                    {(['IN_PROGRESS', 'APPROVED'].includes((shutdown.status ?? '').toUpperCase())) && (
                        <Pressable onPress={() => router.push({ pathname: '/maintenance/shutdown-progress' as any, params: { id: id ?? '' } })} style={[styles.actionBtn, { backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: colors.primary[200] }]}>
                            <Text className="font-inter text-sm font-bold text-primary-600">View Progress Dashboard</Text>
                        </Pressable>
                    )}

                    {/* ── Danger Zone: Delete (DRAFT only) ── */}
                    {(shutdown.status ?? '').toUpperCase() === 'DRAFT' && (
                        <>
                            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200] }} />
                            <View style={[styles.dangerCard, { backgroundColor: isDark ? '#1C0A0A' : colors.danger[50], borderColor: isDark ? colors.danger[900] : colors.danger[200] }]}>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-xs font-bold text-danger-700 dark:text-danger-400">Delete Shutdown</Text>
                                    <Text className="font-inter text-[11px] text-danger-500 dark:text-danger-400" style={{ marginTop: 2 }}>Only DRAFT shutdowns can be deleted. This is permanent.</Text>
                                </View>
                                <Pressable
                                    onPress={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    style={[styles.dangerBtn, { backgroundColor: colors.danger[600] }, deleteMutation.isPending && { opacity: 0.5 }]}
                                >
                                    <Text className="font-inter text-xs font-bold text-white">🗑 Delete</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Edit Sheet */}
            <EditShutdownSheet
                visible={editVisible}
                onClose={() => setEditVisible(false)}
                shutdown={shutdown}
                isDark={isDark}
                updateMutation={updateMutation}
                id={id ?? ''}
            />

            {/* Add Work Order Sheet */}
            <AddWorkOrderSheet
                visible={showAddWO}
                onClose={() => setShowAddWO(false)}
                isDark={isDark}
                id={id ?? ''}
                addWOMutation={addWOMutation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    fixedHeader: { paddingHorizontal: 24, paddingBottom: 0, borderBottomWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 3 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    tabRow: { flexDirection: 'row', marginTop: 4, gap: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
    tab: { paddingHorizontal: 16, paddingVertical: 10 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[600] },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.neutral[500] },
    tabTextActive: { color: colors.primary[700] },
    cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    infoCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    section: { borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    woCard: { borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    dangerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4 },
    dangerBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
});

/* ── Edit Shutdown Sheet ── */

const EVENT_TYPE_OPTIONS = [
    { value: 'PLANNED_OVERHAUL', label: 'Planned Overhaul' },
    { value: 'STATUTORY_INSPECTION', label: 'Statutory Inspection' },
    { value: 'CORRECTIVE_MAJOR', label: 'Corrective Major' },
    { value: 'COMMISSIONING', label: 'Commissioning' },
];

function EditShutdownSheet({
    visible,
    onClose,
    shutdown,
    isDark,
    updateMutation,
    id,
}: {
    visible: boolean;
    onClose: () => void;
    shutdown: any;
    isDark: boolean;
    updateMutation: any;
    id: string;
}) {
    const insets = useSafeAreaInsets();

    const { data: locationsRaw } = useCompanyLocations();
    const locations = React.useMemo(() => {
        const raw = (locationsRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw.map((l: any) => ({ value: l.id ?? '', label: l.name ?? '' })) : [];
    }, [locationsRaw]);

    const [name, setName] = React.useState('');
    const [eventType, setEventType] = React.useState('PLANNED_OVERHAUL');
    const [plannedStart, setPlannedStart] = React.useState('');
    const [plannedEnd, setPlannedEnd] = React.useState('');
    const [estimatedCost, setEstimatedCost] = React.useState('');
    const [locationId, setLocationId] = React.useState('');
    const [lineWorkCenter, setLineWorkCenter] = React.useState('');
    const [actualCost, setActualCost] = React.useState('');
    const [openTypeDropdown, setOpenTypeDropdown] = React.useState(false);
    const [openLocationDropdown, setOpenLocationDropdown] = React.useState(false);

    React.useEffect(() => {
        if (visible && shutdown?.id) {
            setName(shutdown.name ?? '');
            setEventType(shutdown.eventType ?? 'PLANNED_OVERHAUL');
            setPlannedStart(shutdown.plannedStart ? shutdown.plannedStart.slice(0, 10) : '');
            setPlannedEnd(shutdown.plannedEnd ? shutdown.plannedEnd.slice(0, 10) : '');
            setEstimatedCost(shutdown.estimatedCost != null ? String(shutdown.estimatedCost) : '');
            setLocationId(shutdown.locationId ?? '');
            setLineWorkCenter(shutdown.lineWorkCenter ?? '');
            setActualCost(shutdown.actualCost != null ? String(shutdown.actualCost) : '');
            setOpenTypeDropdown(false);
            setOpenLocationDropdown(false);
        }
    }, [visible, shutdown]);

    const handleSave = async () => {
        if (!id || !name.trim()) return;
        try {
            await updateMutation.mutateAsync({
                id,
                data: {
                    name: name.trim(),
                    eventType,
                    plannedStart: plannedStart || undefined,
                    plannedEnd: plannedEnd || undefined,
                    estimatedCost: estimatedCost !== '' ? Number(estimatedCost) : undefined,
                    locationId: locationId || undefined,
                    lineWorkCenter: lineWorkCenter.trim() || undefined,
                    actualCost: actualCost !== '' ? Number(actualCost) : undefined,
                },
            });
            showSuccess('Shutdown updated successfully.');
            onClose();
        } catch (err: any) {
            showErrorMessage(err?.message || 'Failed to update shutdown');
        }
    };

    const inputStyle = [
        editStyles.input,
        {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            color: isDark ? colors.white : colors.primary[950],
        },
    ];

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={[editStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white, flex: 1 }]}>
                    {/* Header */}
                    <View style={[editStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Edit Shutdown Event</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
                        {/* Name */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Event Name *</Text>
                            <TextInput value={name} onChangeText={setName} placeholder="Event name..." placeholderTextColor={colors.neutral[400]} style={inputStyle} />
                        </View>

                        {/* Event Type Dropdown */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Event Type</Text>
                            <Pressable
                                onPress={() => setOpenTypeDropdown(!openTypeDropdown)}
                                style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, openTypeDropdown && { borderColor: colors.primary[400] }]}
                            >
                                <Text className="font-inter text-sm text-primary-950 dark:text-white">{EVENT_TYPE_OPTIONS.find((o) => o.value === eventType)?.label ?? 'Select...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d={openTypeDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                            {openTypeDropdown && (
                                <View style={[editStyles.dropdown, { backgroundColor: isDark ? '#1E1B4B' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                                        {EVENT_TYPE_OPTIONS.map((opt) => (
                                            <Pressable
                                                key={opt.value}
                                                onPress={() => { setEventType(opt.value); setOpenTypeDropdown(false); }}
                                                style={[editStyles.dropdownItem, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }, opt.value === eventType && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}
                                            >
                                                <Text className={`font-inter text-sm ${opt.value === eventType ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Location picker */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Location</Text>
                            <Pressable
                                onPress={() => {
                                    setOpenLocationDropdown(!openLocationDropdown);
                                    setOpenTypeDropdown(false);
                                }}
                                style={[
                                    inputStyle,
                                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                                    openLocationDropdown && { borderColor: colors.primary[400] }
                                ]}
                            >
                                <Text className="font-inter text-sm text-primary-950 dark:text-white">
                                    {locations.find((o) => o.value === locationId)?.label ?? 'Select location...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path
                                        d={openLocationDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                            {openLocationDropdown && (
                                <View style={[editStyles.dropdown, { backgroundColor: isDark ? '#1E1B4B' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                                        {locations.length === 0 ? (
                                            <View style={editStyles.dropdownItem}>
                                                <Text className="font-inter text-sm text-neutral-400">No locations available</Text>
                                            </View>
                                        ) : (
                                            locations.map((opt) => (
                                                <Pressable
                                                    key={opt.value}
                                                    onPress={() => {
                                                        setLocationId(opt.value);
                                                        setOpenLocationDropdown(false);
                                                    }}
                                                    style={[
                                                        editStyles.dropdownItem,
                                                        { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                                        opt.value === locationId && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }
                                                    ]}
                                                >
                                                    <Text className={`font-inter text-sm ${opt.value === locationId ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Production Line */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Production Line</Text>
                            <TextInput
                                value={lineWorkCenter}
                                onChangeText={setLineWorkCenter}
                                placeholder="e.g., Line 1, Packaging"
                                placeholderTextColor={colors.neutral[400]}
                                style={inputStyle}
                            />
                        </View>

                        {/* Actual Cost */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Actual Cost</Text>
                            <TextInput
                                value={actualCost}
                                onChangeText={setActualCost}
                                placeholder="0.00"
                                placeholderTextColor={colors.neutral[400]}
                                keyboardType="numeric"
                                style={inputStyle}
                            />
                        </View>

                        {/* Dates side by side */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <DatePickerField
                                    label="Planned Start"
                                    value={plannedStart}
                                    onChange={setPlannedStart}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <DatePickerField
                                    label="Planned End"
                                    value={plannedEnd}
                                    onChange={setPlannedEnd}
                                />
                            </View>
                        </View>

                        {/* Estimated Budget */}
                        <View style={editStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Estimated Budget</Text>
                            <TextInput value={estimatedCost} onChangeText={setEstimatedCost} placeholder="0.00" placeholderTextColor={colors.neutral[400]} keyboardType="numeric" style={inputStyle} />
                        </View>
                    </ScrollView>

                    {/* Save Footer */}
                    <View style={[editStyles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable
                            style={({ pressed }) => [editStyles.saveBtn, { backgroundColor: colors.primary[600] }, pressed && { opacity: 0.85 }, (updateMutation.isPending || !name.trim()) && { opacity: 0.5 }]}
                            onPress={handleSave}
                            disabled={updateMutation.isPending || !name.trim()}
                        >
                            {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Save Changes</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

const editStyles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    field: { marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    dropdown: { borderRadius: 12, borderWidth: 1, padding: 8, marginTop: 4 },
    dropdownItem: { padding: 12, borderBottomWidth: 1 },
    footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    saveBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
});

/* ── Add Work Order Sheet ── */

function AddWorkOrderSheet({
    visible,
    onClose,
    isDark,
    id,
    addWOMutation,
}: {
    visible: boolean;
    onClose: () => void;
    isDark: boolean;
    id: string;
    addWOMutation: any;
}) {
    const insets = useSafeAreaInsets();
    const [search, setSearch] = React.useState('');
    const { data: woData, isLoading } = useWorkOrders({ search: search || undefined, limit: 20 });
    const searchWOs: any[] = (woData as any)?.data ?? [];

    const handleAddWO = async (woId: string) => {
        try {
            await addWOMutation.mutateAsync({ id, data: { workOrderIds: [woId] } });
            showSuccess('Work order linked successfully.');
            onClose();
            setSearch('');
        } catch (err: any) {
            showErrorMessage(err?.message || 'Failed to link work order');
        }
    };

    const inputStyle = [
        editStyles.input,
        {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            color: isDark ? colors.white : colors.primary[950],
        },
    ];

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={[editStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white, flex: 1 }]}>
                    {/* Header */}
                    <View style={[editStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Add Work Orders</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    {/* Search Input */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search work orders by number or asset..."
                            placeholderTextColor={colors.neutral[400]}
                            style={inputStyle}
                        />
                    </View>

                    {/* Search Results */}
                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator color={colors.primary[600]} size="large" />
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
                            {searchWOs.length === 0 ? (
                                <Text className="font-inter text-sm text-neutral-400 text-center" style={{ marginTop: 40 }}>
                                    No work orders found.
                                </Text>
                            ) : (
                                searchWOs.map((wo: any) => (
                                    <Pressable
                                        key={wo.id}
                                        onPress={() => handleAddWO(wo.id)}
                                        style={({ pressed }) => [
                                            {
                                                padding: 14,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
                                                backgroundColor: isDark ? '#1E1B4B' : colors.white,
                                                marginBottom: 10,
                                            },
                                            pressed && { opacity: 0.7 },
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                                {wo.woNumber}
                                            </Text>
                                            <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }, { backgroundColor: colors.neutral[100] }]}>
                                                <Text className="font-inter" style={[{ fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }, { color: colors.neutral[600] }]}>
                                                    {wo.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="font-inter text-xs text-neutral-500" style={{ marginTop: 4 }}>
                                            {wo.asset?.name ?? 'No Asset'} | {wo.woType ?? 'Unknown Type'}
                                        </Text>
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

