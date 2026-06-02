/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePayrollRun, usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';
import { useResolveException, useReviewExceptions } from '@/features/company-admin/api/use-payroll-run-mutations';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low' | 'resolved';

interface ExceptionItem {
    employeeId: string;
    employeeName: string;
    department: string | null;
    type: string;
    category: 'info' | 'warning' | 'critical';
    priority: Priority;
    description: string;
    impactAmount: number | null;
    resolved: boolean;
    resolvedAction: 'RESOLVE' | 'SKIP' | null;
    resolvedNote: string | null;
}

const TABS: { id: PriorityFilter; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'high',     label: 'High' },
    { id: 'medium',   label: 'Medium' },
    { id: 'low',      label: 'Low' },
    { id: 'resolved', label: 'Resolved' },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'danger' | 'warning' | 'info' | 'success' | 'accent' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
    } as const;
    const t = tintMap[tint];
    return (
        <View style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[18px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

function PriorityChip({ priority }: { priority: Priority }) {
    const map = {
        HIGH:   { bg: colors.danger[50],  fg: colors.danger[700],  label: 'High' },
        MEDIUM: { bg: colors.warning[50], fg: colors.warning[700], label: 'Medium' },
        LOW:    { bg: colors.info[50],    fg: colors.info[700],    label: 'Low' },
    } as const;
    const t = map[priority] ?? map.LOW;
    return (
        <View style={[styles.pill, { backgroundColor: t.bg }]}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: t.fg }}>{t.label}</Text>
        </View>
    );
}

function PriorityDonut({ high, medium, low }: { high: number; medium: number; low: number }) {
    const total = high + medium + low;
    const safe = total || 1;
    const size = 130;
    const sw = 11;
    const radius = (size - sw) / 2;
    const circ = 2 * Math.PI * radius;
    const highLen = (high / safe) * circ;
    const medLen = (medium / safe) * circ;
    const lowLen = (low / safe) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={sw} fill="none" />
                {total > 0 && (
                    <>
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.danger[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${highLen} ${circ - highLen}`} strokeDashoffset={0} />
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.warning[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${medLen} ${circ - medLen}`} strokeDashoffset={-highLen} />
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.info[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${lowLen} ${circ - lowLen}`} strokeDashoffset={-highLen - medLen} />
                    </>
                )}
            </Svg>
            <Text className="font-inter text-[22px] font-extrabold text-neutral-900">{total}</Text>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total</Text>
        </View>
    );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <View style={{ marginVertical: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text className="font-inter text-[12px] text-neutral-700">{label}</Text>
                <Text className="font-inter text-[12px] font-bold text-neutral-900">{value} <Text style={{ color: colors.neutral[500], fontWeight: '400' }}>({pct.toFixed(1)}%)</Text></Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep2Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    const [activeTab, setActiveTab] = React.useState<PriorityFilter>('all');
    const [search, setSearch] = React.useState('');

    /* Resolve runId */
    const { data: runsResp } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);
    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const preExec = runsList.find(r => ['ATTENDANCE_LOCKED', 'EXCEPTIONS_REVIEWED', 'COMPUTED', 'STATUTORY_DONE'].includes(r.status));
        if (preExec) return preExec.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp, isLoading, isRefetching, refetch } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const resolveMutation = useResolveException();
    const reviewMutation = useReviewExceptions();
    const confirmModal = useConfirmModal();

    const exceptions: (ExceptionItem & { _idx: number })[] = React.useMemo(() => {
        const arr = (runDetail?.exceptions as ExceptionItem[]) ?? [];
        return arr.map((e, i) => ({ ...e, _idx: i }));
    }, [runDetail]);

    const counts = React.useMemo(() => {
        const c = { total: exceptions.length, high: 0, medium: 0, low: 0, accepted: 0, overridden: 0, resolved: 0, pending: 0 };
        exceptions.forEach(e => {
            if (e.priority === 'HIGH') c.high++;
            else if (e.priority === 'MEDIUM') c.medium++;
            else c.low++;
            if (e.resolved) {
                if (e.resolvedNote?.toLowerCase().includes('accept')) c.accepted++;
                else if (e.resolvedNote?.toLowerCase().includes('override')) c.overridden++;
                else c.resolved++;
            } else c.pending++;
        });
        return c;
    }, [exceptions]);

    const filtered = React.useMemo(() => {
        return exceptions.filter(e => {
            if (search) {
                const q = search.toLowerCase();
                if (!(e.employeeName ?? '').toLowerCase().includes(q) &&
                    !(e.type ?? '').toLowerCase().includes(q) &&
                    !(e.description ?? '').toLowerCase().includes(q)) return false;
            }
            if (activeTab === 'all') return true;
            if (activeTab === 'resolved') return e.resolved;
            if (activeTab === 'high') return e.priority === 'HIGH';
            if (activeTab === 'medium') return e.priority === 'MEDIUM';
            if (activeTab === 'low') return e.priority === 'LOW';
            return true;
        });
    }, [exceptions, search, activeTab]);

    const isReviewed = runDetail?.status && !['DRAFT', 'ATTENDANCE_LOCKED'].includes(runDetail.status);
    const hasUnresolvedHigh = counts.high > 0 && exceptions.some(e => e.priority === 'HIGH' && !e.resolved);
    const allResolved = counts.pending === 0;

    const handleResolve = (idx: number, action: 'ACCEPT' | 'OVERRIDE' | 'RESOLVE') => {
        if (!inferredRunId) return;
        const noteMap = { ACCEPT: 'Accepted system value', OVERRIDE: 'Manual override', RESOLVE: 'Marked resolved' };
        resolveMutation.mutate(
            { runId: inferredRunId, exceptionIndex: idx, action: 'RESOLVE', note: noteMap[action] },
            { onSuccess: () => refetch() },
        );
    };

    const handleProceed = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Mark Exceptions Reviewed?',
            message: 'Confirm that all exceptions have been reviewed before proceeding to compute salaries.',
            confirmText: 'Mark Reviewed',
            onConfirm: () => {
                reviewMutation.mutate(inferredRunId, {
                    onSuccess: () => {
                        refetch();
                        router.push({ pathname: '/company/hr/payroll-c-step-3' as any, params: { runId: inferredRunId } });
                    },
                });
            },
        });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 2 — Review Exceptions" onMenuPress={toggle} />
                <EmptyState
                    icon="inbox"
                    title="No payroll run found"
                    message="Create a payroll run before reviewing exceptions."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }}
                />
            </View>
        );
    }

    if (isLoading || !runDetail) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 2 — Review Exceptions" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 2 — Review Exceptions" onMenuPress={toggle} subtitle="Phase C · Core Execution" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Step header */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 2 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Review Exceptions</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        The system has detected exceptions based on data validation rules.
                        Accept, override or mark resolved.
                    </Text>
                </Animated.View>

                {/* KPI grid */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total" value={counts.total} tint="primary" />
                    <StatTile label="High" value={counts.high} tint="danger" />
                    <StatTile label="Medium" value={counts.medium} tint="warning" />
                    <StatTile label="Low" value={counts.low} tint="info" />
                    <StatTile label="Accepted" value={counts.accepted} tint="success" />
                    <StatTile label="Overridden" value={counts.overridden} tint="accent" />
                </View>

                {/* Donut + Status bars */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Exceptions by Priority</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <PriorityDonut high={counts.high} medium={counts.medium} low={counts.low} />
                        <View style={{ flex: 1, gap: 8 }}>
                            <LegendRow color={colors.danger[500]} label="High" value={counts.high} />
                            <LegendRow color={colors.warning[500]} label="Medium" value={counts.medium} />
                            <LegendRow color={colors.info[500]} label="Low" value={counts.low} />
                        </View>
                    </View>
                </View>

                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Exception Status</Text>
                    <StatusBar label="Accepted" value={counts.accepted} total={counts.total} color={colors.success[500]} />
                    <StatusBar label="Overridden" value={counts.overridden} total={counts.total} color={colors.accent[500]} />
                    <StatusBar label="Resolved" value={counts.resolved} total={counts.total} color={colors.success[500]} />
                    <StatusBar label="Pending" value={counts.pending} total={counts.total} color={colors.neutral[400]} />
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, gap: 8 }}>
                    {TABS.map(t => (
                        <Pressable key={t.id} onPress={() => setActiveTab(t.id)}
                            style={[styles.tab, activeTab === t.id && styles.tabActive]}>
                            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Search */}
                <View style={[styles.searchBox, { marginTop: 4 }]}>
                    <Text style={{ color: colors.neutral[400], marginRight: 6 }}>🔍</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search exceptions…"
                        placeholderTextColor={colors.neutral[400]}
                        style={styles.searchInput}
                    />
                </View>

                {/* Exceptions list */}
                <View style={{ marginTop: 12, gap: 10 }}>
                    {filtered.length === 0 ? (
                        <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 24 }]}>
                            <Text style={{ fontSize: 32, marginBottom: 6 }}>{exceptions.length === 0 ? '✅' : '🔎'}</Text>
                            <Text className="font-inter text-[13px] text-neutral-500">
                                {exceptions.length === 0 ? 'No exceptions detected.' : 'No matches in current filter.'}
                            </Text>
                        </View>
                    ) : filtered.map((exc) => {
                        const impact = Number(exc.impactAmount ?? 0);
                        const impactColor = impact < 0 ? colors.danger[700] : impact > 0 ? colors.success[700] : colors.neutral[500];
                        const impactSign = impact === 0 ? '—' : impact < 0 ? `-₹${Math.abs(impact).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `+₹${impact.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                        return (
                            <View key={exc._idx} style={[styles.excCard, exc.resolved && { backgroundColor: colors.success[50] + '60' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-[13.5px] font-bold text-neutral-900" numberOfLines={1}>{exc.employeeName ?? '—'}</Text>
                                        <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>{humanType(exc.type)}{exc.department ? ` · ${exc.department}` : ''}</Text>
                                    </View>
                                    <PriorityChip priority={exc.priority} />
                                </View>

                                <Text className="mt-2 font-inter text-[12px] leading-[16px] text-neutral-600">{exc.description}</Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                    <View>
                                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Impact</Text>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: impactColor }}>{impactSign}</Text>
                                    </View>
                                    {!exc.resolved && (
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <Pressable onPress={() => handleResolve(exc._idx, 'ACCEPT')} style={[styles.actionBtnSm, { backgroundColor: colors.success[50] }]}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.success[700] }}>Accept</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleResolve(exc._idx, 'OVERRIDE')} style={[styles.actionBtnSm, { backgroundColor: colors.warning[50] }]}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.warning[700] }}>Override</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleResolve(exc._idx, 'RESOLVE')} style={[styles.actionBtnSm, { backgroundColor: colors.primary[50] }]}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.primary[700] }}>Resolve</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                    {exc.resolved && (
                                        <View style={[styles.pill, { backgroundColor: colors.success[50] }]}>
                                            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.success[700] }}>
                                                ✓ {exc.resolvedNote ?? 'Resolved'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Alert */}
                {hasUnresolvedHigh && (
                    <View style={[styles.alertBanner, { marginTop: 16 }]}>
                        <Text style={{ color: colors.warning[700], fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12.5px] font-semibold text-warning-700">
                                {counts.high} high priority exception(s) must be resolved before proceeding.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-[11px] text-neutral-500">
                        {counts.total} total · {counts.pending} pending
                    </Text>
                </View>
                <Pressable
                    onPress={handleProceed}
                    disabled={!allResolved || hasUnresolvedHigh || reviewMutation.isPending || isReviewed}
                    style={[styles.lockBtn, (!allResolved || hasUnresolvedHigh || isReviewed) && { opacity: 0.5 }]}
                >
                    {isReviewed ? (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.success[100] }]} />
                    ) : (
                        <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    )}
                    <Text className="font-inter text-[13px] font-bold" style={{ color: isReviewed ? colors.success[700] : colors.white }}>
                        {isReviewed ? '✓ Reviewed' : 'Next: Compute Salaries  ›'}
                    </Text>
                </Pressable>
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function humanType(t: string): string {
    if (!t) return '—';
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
                <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            </View>
            <Text className="font-inter text-[13px] font-bold text-neutral-900">{value}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    tab: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200],
    },
    tabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    tabLabel: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.neutral[600] },
    tabLabelActive: { color: colors.white },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.white, borderRadius: 12,
        paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: colors.neutral[200],
    },
    searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.neutral[800] },
    excCard: {
        backgroundColor: colors.white, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: colors.neutral[200],
    },
    actionBtnSm: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
    progressTrack: { height: 5, borderRadius: 999, backgroundColor: colors.neutral[100], overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    alertBanner: {
        backgroundColor: colors.warning[50], borderRadius: 14, padding: 12,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: colors.warning[200],
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    lockBtn: {
        borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
        overflow: 'hidden', minWidth: 200,
        alignItems: 'center', justifyContent: 'center',
    },
});

export default PhaseCStep2Screen;
