/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useFiscalYearKpis,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useCreatePayrollRun,
    useDeletePayrollRun,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { useConfigurationStatus } from '@/features/company-admin/api/use-payroll-phases-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type StatusFilter = 'all' | 'draft' | 'in_progress' | 'completed' | 'upcoming' | 'cancelled' | 'archived';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all',         label: 'All' },
    { id: 'draft',       label: 'Draft' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed',   label: 'Completed' },
    { id: 'upcoming',    label: 'Upcoming' },
    { id: 'cancelled',   label: 'Cancelled' },
    { id: 'archived',    label: 'Archived' },
];

const STATUS_STEP_MAP: Record<string, number> = {
    draft: 0, attendance_locked: 1, exceptions_reviewed: 2, computed: 3,
    statutory_done: 4, approved: 5, disbursed: 6, archived: 6,
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'warning' | 'accent' | 'danger' | 'emerald' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        emerald: { bg: '#ECFDF5',          fg: '#059669' },
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

function StatusPill({ status }: { status: string }) {
    const s = (status ?? '').toLowerCase();
    const isCompleted = ['disbursed', 'archived'].includes(s);
    const isInProgress = ['attendance_locked', 'exceptions_reviewed', 'computed', 'statutory_done', 'approved'].includes(s);
    const isDraft = s === 'draft';
    const map: { bg: string; fg: string; label: string } = isCompleted
        ? { bg: colors.success[50], fg: colors.success[700], label: 'Completed' }
        : isInProgress
            ? { bg: colors.warning[50], fg: colors.warning[700], label: 'In Progress' }
            : isDraft
                ? { bg: colors.accent[50], fg: colors.accent[700], label: 'Draft' }
                : { bg: colors.neutral[100], fg: colors.neutral[600], label: s.replace(/_/g, ' ') || 'Unknown' };
    return (
        <View style={[styles.pill, { backgroundColor: map.bg }]}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: map.fg }}>{map.label}</Text>
        </View>
    );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
    return (
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }]} />
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* New Run modal                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function NewRunModal({
    visible, onClose, onSubmit, isPending,
}: { visible: boolean; onClose: () => void; onSubmit: (m: number, y: number) => void; isPending: boolean }) {
    const [month, setMonth] = React.useState(new Date().getMonth() + 1);
    const [year, setYear] = React.useState(new Date().getFullYear());
    const [monthOpen, setMonthOpen] = React.useState(false);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text className="font-inter text-[15px] font-bold text-neutral-900">New Payroll Run</Text>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                        </Pressable>
                    </View>

                    <View style={{ padding: 16, gap: 12 }}>
                        <View>
                            <Text className="mb-1.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Month</Text>
                            <Pressable onPress={() => setMonthOpen(o => !o)} style={styles.selectField}>
                                <Text className="font-inter text-[13px] text-neutral-900">{MONTHS[month - 1]}</Text>
                                <Text style={{ color: colors.neutral[500] }}>{monthOpen ? '▲' : '▼'}</Text>
                            </Pressable>
                            {monthOpen && (
                                <View style={styles.selectMenu}>
                                    <ScrollView style={{ maxHeight: 200 }}>
                                        {MONTHS.map((m, i) => (
                                            <Pressable key={m} onPress={() => { setMonth(i + 1); setMonthOpen(false); }}
                                                style={styles.selectOption}>
                                                <Text className="font-inter text-[13px] text-neutral-800">{m}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View>
                            <Text className="mb-1.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Year</Text>
                            <TextInput
                                value={String(year)}
                                onChangeText={(t) => setYear(Number(t) || year)}
                                keyboardType="number-pad"
                                style={styles.textInput}
                            />
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <Pressable onPress={onClose} style={[styles.modalBtn, styles.modalBtnSecondary]}>
                            <Text className="font-inter text-[13px] font-bold text-neutral-700">Cancel</Text>
                        </Pressable>
                        <Pressable disabled={isPending} onPress={() => onSubmit(month, year)} style={[styles.modalBtn, styles.modalBtnPrimary, isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">{isPending ? 'Creating…' : 'Create Run'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Phase A Guard                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function PayrollPhaseGuardMobile({ completed, total }: { completed: number; total: number }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const remaining = total - completed;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Payroll Runs" onMenuPress={toggle} subtitle="Phase A pending" />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}>
                <View style={styles.guardCard}>
                    <View style={styles.guardHeader}>
                        <View style={styles.guardIcon}><Text style={{ fontSize: 18 }}>🔒</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[15px] font-bold text-neutral-900">Configuration required</Text>
                            <Text className="font-inter text-[12.5px] text-neutral-600">Complete Phase A before processing payroll runs.</Text>
                        </View>
                    </View>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text className="font-inter text-[11px] font-semibold text-neutral-600">Phase A progress</Text>
                            <Text className="font-inter text-[11px] font-bold text-neutral-900">{completed}/{total}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary[600] }]} />
                        </View>
                        <Text className="mt-3 font-inter text-[12px] text-neutral-600">{remaining} step{remaining === 1 ? '' : 's'} remaining.</Text>
                        <Pressable onPress={() => router.push('/company/hr/payroll-config-prerequisites' as any)}
                            style={[styles.guardBtnPrimary, { marginTop: 14 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">Open Phase A  ›</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push('/company/hr/payroll-pre-run' as any)} style={[styles.guardBtnSecondary, { marginTop: 8 }]}>
                            <Text className="font-inter text-[13px] font-bold text-primary-700">Open Phase B</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PayrollRunScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const { toggle } = useSidebar();

    const [activeTab, setActiveTab] = React.useState<StatusFilter>('all');
    const [search, setSearch] = React.useState('');
    const [showNewRun, setShowNewRun] = React.useState(false);

    const configStatusQuery = useConfigurationStatus();
    const configStatus: any = (configStatusQuery.data as any) ?? null;
    const phaseAComplete = configStatus ? configStatus.completedCount >= configStatus.totalCount : true;

    const { data: runsResp, isLoading: runsLoading, isRefetching, refetch } = usePayrollRuns({ limit: 20 });
    const runs: any[] = React.useMemo(() => {
        const r: any = runsResp;
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.data)) return r.data;
        return [];
    }, [runsResp]);

    const { data: kpisResp } = useFiscalYearKpis();
    const kpis: any = (kpisResp as any) ?? null;

    const createMutation = useCreatePayrollRun();
    const deleteMutation = useDeletePayrollRun();
    const confirmModal = useConfirmModal();

    const filtered = React.useMemo(() => {
        return runs.filter((r) => {
            if (search) {
                const q = search.toLowerCase();
                const label = `${MONTHS[(r.month ?? 1) - 1]} ${r.year}`.toLowerCase();
                if (!label.includes(q) && !(r.status ?? '').toLowerCase().includes(q)) return false;
            }
            const s = (r.status ?? '').toLowerCase();
            if (activeTab === 'all') return true;
            if (activeTab === 'draft') return s === 'draft';
            if (activeTab === 'in_progress') return ['attendance_locked', 'exceptions_reviewed', 'computed', 'statutory_done', 'approved'].includes(s);
            if (activeTab === 'completed') return ['disbursed', 'archived'].includes(s);
            if (activeTab === 'upcoming') {
                const now = new Date();
                const runDate = new Date(r.year, (r.month ?? 1) - 1, 1);
                return s === 'draft' && runDate > now;
            }
            if (activeTab === 'archived') return s === 'archived';
            return true;
        });
    }, [runs, search, activeTab]);

    if (configStatusQuery.isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Payroll Runs" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </View>
            </View>
        );
    }

    if (configStatus && !phaseAComplete) {
        return <PayrollPhaseGuardMobile completed={configStatus.completedCount} total={configStatus.totalCount} />;
    }

    const handleCreate = async (month: number, year: number) => {
        try {
            const result: any = await createMutation.mutateAsync({ month, year });
            const newId = result?.id ?? result?.data?.id;
            setShowNewRun(false);
            if (newId) router.push({ pathname: '/company/hr/payroll-c-step-1' as any, params: { runId: newId } });
        } catch (e) {
            // toast handled by global error
        }
    };

    const handleDelete = (run: any) => {
        confirmModal.show({
            title: 'Delete Payroll Run?',
            message: `Delete the payroll run for ${MONTHS[(run.month ?? 1) - 1]} ${run.year}? This cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: () => deleteMutation.mutate(run.id),
        });
    };

    const vsLastFY = kpis?.vsLastFYPct ?? 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Payroll Runs" onMenuPress={toggle} subtitle="Create, manage & track" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* KPI grid */}
                <View style={styles.kpiGrid}>
                    <StatTile label="Total Runs"  value={kpis?.totalRuns ?? '—'}   sub={kpis?.fiscalYear ?? ''}        tint="primary" />
                    <StatTile label="Completed"   value={kpis?.completed ?? '—'}   sub={kpis ? `${kpis.completedPct}%` : ''} tint="success" />
                    <StatTile label="In Progress" value={kpis?.inProgress ?? '—'}  sub={kpis ? `${kpis.inProgressPct}%` : ''} tint="warning" />
                    <StatTile label="Upcoming"    value={kpis?.upcoming ?? '—'}    sub={kpis ? `${kpis.upcomingPct}%` : ''}  tint="accent" />
                    <StatTile label="Cancelled"   value={kpis?.cancelled ?? '—'}   sub={kpis ? `${kpis.cancelledPct}%` : ''} tint="danger" />
                    <StatTile label="Net Pay (FY)"
                        value={`₹${formatCompact(kpis?.netPayDisbursed ?? 0)}`}
                        sub={kpis ? `vs Last FY ${vsLastFY >= 0 ? '+' : ''}${vsLastFY}%` : ''}
                        tint="emerald" />
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Pressable onPress={() => setShowNewRun(true)} style={[styles.actionBtn, { flex: 1.5 }]}>
                        <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        <Text className="font-inter text-[13px] font-bold text-white">+ New Payroll Run</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 1 }]}>
                        <Text className="font-inter text-[13px] font-bold text-primary-700">↑ Import</Text>
                    </Pressable>
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 8 }}>
                    {STATUS_TABS.map(t => (
                        <Pressable key={t.id} onPress={() => setActiveTab(t.id)}
                            style={[styles.tab, activeTab === t.id && styles.tabActive]}>
                            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Search */}
                <View style={styles.searchBox}>
                    <Text style={{ color: colors.neutral[400], marginRight: 6 }}>🔍</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search by run name or period…"
                        placeholderTextColor={colors.neutral[400]}
                        style={styles.searchInput}
                    />
                </View>

                {/* Run cards */}
                {runsLoading ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={{ marginTop: 24 }}>
                        <EmptyState
                            icon="inbox"
                            title="No payroll runs found"
                            message={search ? `Nothing matches "${search}".` : 'Tap "New Payroll Run" to create your first one.'}
                            action={{ label: '+ New Payroll Run', onPress: () => setShowNewRun(true) }}
                        />
                    </View>
                ) : (
                    <View style={{ marginTop: 12, gap: 10 }}>
                        {filtered.map((r, idx) => {
                            const monthLabel = MONTHS[(r.month ?? 1) - 1];
                            const monthShort = monthLabel?.slice(0, 3).toUpperCase();
                            const s = (r.status ?? '').toLowerCase();
                            const completedStep = STATUS_STEP_MAP[s] ?? 0;
                            const pct = Math.round((completedStep / 6) * 100);
                            const isCompleted = ['disbursed', 'archived'].includes(s);
                            const isCancelled = s === 'cancelled';
                            const progressColor = isCompleted ? colors.success[500] : isCancelled ? colors.neutral[400] : colors.warning[500];
                            const monthStart = new Date(r.year, (r.month ?? 1) - 1, 1).toISOString();
                            const monthEnd = new Date(r.year, r.month ?? 1, 0).toISOString();

                            return (
                                <Animated.View key={r.id} entering={FadeInDown.delay(idx * 40).duration(280)}>
                                    <Pressable
                                        onPress={() => router.push({ pathname: '/company/hr/payroll-c-step-1' as any, params: { runId: r.id } })}
                                        style={({ pressed }) => [styles.runCard, pressed && { backgroundColor: colors.neutral[50] }]}
                                        onLongPress={() => handleDelete(r)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <View style={styles.monthChip}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '800', color: colors.primary[600], letterSpacing: 0.6 }}>{monthShort}</Text>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: colors.primary[700] }}>{r.year}</Text>
                                            </View>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Text className="font-inter text-[13.5px] font-bold text-neutral-900" numberOfLines={1}>
                                                    {monthLabel} {r.year} Payroll
                                                </Text>
                                                <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>
                                                    {fmt.date(monthStart)} – {fmt.date(monthEnd)}
                                                </Text>
                                            </View>
                                            <StatusPill status={s || 'draft'} />
                                        </View>

                                        <View style={styles.runMetricsRow}>
                                            <Metric label="Employees" value={r.employeeCount ?? 0} />
                                            <Metric label="Net Pay" value={r.totalNet || r.totalNetPay ? `₹${formatCompact(Number(r.totalNet ?? r.totalNetPay))}` : '—'} accent={colors.neutral[900]} />
                                            <Metric label="Progress" value={`${pct}%`} accent={progressColor} />
                                        </View>

                                        <View style={{ marginTop: 6 }}>
                                            <ProgressBar percent={pct} color={progressColor} />
                                            <Text className="mt-1 font-inter text-[10px] text-neutral-500">
                                                {isCompleted ? `Completed`
                                                    : isCancelled ? 'Cancelled'
                                                    : completedStep === 0 ? 'Not Started'
                                                    : `Step ${completedStep} of 6`}
                                            </Text>
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Sticky bottom action */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <Pressable onPress={() => setShowNewRun(true)} style={styles.fab}>
                    <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Text className="font-inter text-[13px] font-bold text-white">+ New Payroll Run</Text>
                </Pressable>
            </View>

            <NewRunModal
                visible={showNewRun}
                onClose={() => setShowNewRun(false)}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
            />
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Helpers + Atoms                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

function formatCompact(n: number): string {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString('en-IN');
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: accent ?? colors.neutral[800] }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: {
        width: '48%',
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    actionBtn: {
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    actionBtnSecondary: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    tabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    tabLabel: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.neutral[600] },
    tabLabelActive: { color: colors.white },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.neutral[800] },
    runCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    monthChip: {
        width: 48, height: 48,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    runMetricsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    progressTrack: {
        height: 5,
        borderRadius: 999,
        backgroundColor: colors.neutral[100],
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 999 },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1,
        borderTopColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingTop: 12,
        alignItems: 'center',
    },
    fab: {
        height: 46,
        width: '100%',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    modalActions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    modalBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    modalBtnSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    modalBtnPrimary: { backgroundColor: colors.primary[600] },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    selectMenu: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
    },
    selectOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    textInput: {
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'Inter',
        fontSize: 13,
        color: colors.neutral[900],
    },
    guardCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.warning[200],
        overflow: 'hidden',
    },
    guardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        backgroundColor: colors.warning[50],
        borderBottomWidth: 1,
        borderBottomColor: colors.warning[200],
    },
    guardIcon: {
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: colors.warning[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    guardBtnPrimary: {
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    guardBtnSecondary: {
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
});

export default PayrollRunScreen;
