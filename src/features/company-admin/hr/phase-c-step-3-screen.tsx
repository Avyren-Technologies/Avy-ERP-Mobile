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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useComputeSummary,
    usePayrollEntries,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useComputeSalaries,
    useResetToCompute,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import {
    RowIssueSheet,
    type RowIssueSheetHandle,
} from '@/features/company-admin/hr/payroll-wizard-modals';

const formatINR = (v: unknown): string => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatINRCompact = (v: unknown): string => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'danger' | 'warning' | 'accent' | 'info' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
    } as const;
    const t = tintMap[tint];
    return (
        <View style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[16px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

function BreakdownRow({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    return (
        <View style={{ marginVertical: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text className="font-inter text-[12px] text-neutral-700" numberOfLines={1}>{label}</Text>
                <Text className="font-inter text-[12px] font-bold text-neutral-900" style={{ fontFamily: 'Inter' }}>{formatINR(amount)}</Text>
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

export function PhaseCStep3Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    const [tab, setTab] = React.useState<'all' | 'exceptions'>('all');
    const [search, setSearch] = React.useState('');

    const rowIssueRef = React.useRef<RowIssueSheetHandle>(null);

    /* Resolve runId */
    const { data: runsResp } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);
    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const target = runsList.find(r => ['EXCEPTIONS_REVIEWED', 'COMPUTED', 'STATUTORY_DONE'].includes(r.status));
        if (target) return target.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: summaryResp, isLoading: summaryLoading, isRefetching, refetch: refetchSummary } = useComputeSummary(inferredRunId);
    const summary: any = (summaryResp as any)?.data ?? null;

    const { data: entriesResp, refetch: refetchEntries } = usePayrollEntries(inferredRunId);
    const entries: any[] = React.useMemo(() => {
        const env: any = entriesResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [entriesResp]);

    const computeMutation = useComputeSalaries();
    const resetMutation = useResetToCompute();
    const confirmModal = useConfirmModal();

    const totalGross         = Number(summary?.totalGross ?? runDetail?.totalGross ?? 0);
    const totalDeductions    = Number(summary?.totalDeductions ?? runDetail?.totalDeductions ?? 0);
    const totalNet           = Number(summary?.totalNet ?? runDetail?.totalNet ?? 0);
    const totalEmployerCost  = Number(summary?.totalEmployerCost ?? runDetail?.totalEmployerCost ?? 0);

    const earningsBreakdown: Record<string, number> = summary?.earningsBreakdown ?? {};
    const deductionsBreakdown: Record<string, number> = summary?.deductionsBreakdown ?? {};
    const topEarnings = Object.entries(earningsBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topDeductions = Object.entries(deductionsBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);

    const exceptionRows: any[] = summary?.computeExceptions ?? [];
    const exceptionCount = exceptionRows.length;

    const employeeRows: any[] = React.useMemo(() => {
        if (summary?.employeeRows && Array.isArray(summary.employeeRows)) return summary.employeeRows;
        return entries.map((e) => ({
            employeeId: e.employeeId,
            employeeName: `${e.employee?.firstName ?? ''} ${e.employee?.lastName ?? ''}`.trim() || e.employeeCode || '—',
            department: e.employee?.department?.name ?? null,
            grossEarnings: Number(e.grossEarnings ?? 0),
            totalDeductions: Number(e.totalDeductions ?? 0),
            netPay: Number(e.netPay ?? 0),
            isException: !!e.isException,
            employeeCode: e.employee?.employeeId ?? e.employeeCode ?? '—',
        }));
    }, [summary, entries]);

    const filtered = React.useMemo(() => {
        return employeeRows.filter((r) => {
            if (search) {
                const q = search.toLowerCase();
                if (!(r.employeeName ?? '').toLowerCase().includes(q) &&
                    !(r.employeeCode ?? '').toLowerCase().includes(q) &&
                    !(r.department ?? '').toLowerCase().includes(q)) return false;
            }
            if (tab === 'exceptions') return !!r.isException;
            return true;
        });
    }, [employeeRows, search, tab]);

    const isComputed = runDetail?.status && !['DRAFT', 'ATTENDANCE_LOCKED', 'EXCEPTIONS_REVIEWED'].includes(runDetail.status);
    const employeeCount = employeeRows.length;
    const avgNetPay = employeeCount > 0 ? totalNet / employeeCount : 0;

    const handleCompute = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Compute Salaries?',
            message: 'Compute gross, deductions and net pay for all employees. You can reset and recompute if needed.',
            confirmText: 'Compute',
            onConfirm: () => {
                computeMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchEntries(); },
                });
            },
        });
    };

    const handleReset = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Reset Computation?',
            message: 'This will return the run to "Exceptions Reviewed" so you can recompute salaries.',
            confirmText: 'Reset',
            onConfirm: () => {
                resetMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchEntries(); },
                });
            },
        });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 3 — Compute Salaries" onMenuPress={toggle} />
                <EmptyState
                    icon="inbox"
                    title="No payroll run found"
                    message="Create a payroll run before computing salaries."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }}
                />
            </View>
        );
    }

    if (summaryLoading && !summary) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 3 — Compute Salaries" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 3 — Compute Salaries" onMenuPress={toggle} subtitle="Phase C · Core Execution" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchSummary(); refetchEntries(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Step header */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 3 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Compute Salaries</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Preview gross, deductions and net pay for every active employee. Re-run if you update inputs upstream.
                    </Text>
                </Animated.View>

                {/* KPI tiles */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Gross" value={formatINRCompact(totalGross)} sub={formatINR(totalGross)} tint="primary" />
                    <StatTile label="Deductions"  value={formatINRCompact(totalDeductions)} sub={formatINR(totalDeductions)} tint="danger" />
                    <StatTile label="Net Pay"      value={formatINRCompact(totalNet)} sub={formatINR(totalNet)} tint="success" />
                    <StatTile label="Employer Cost" value={formatINRCompact(totalEmployerCost)} sub={formatINR(totalEmployerCost)} tint="accent" />
                    <StatTile label="Employees"   value={String(employeeCount)} sub={`Avg ${formatINRCompact(avgNetPay)}`} tint="info" />
                    <StatTile label="Compute Issues" value={String(exceptionCount)} sub={exceptionCount > 0 ? 'Review' : 'Clean'} tint={exceptionCount > 0 ? 'warning' : 'success'} />
                </View>

                {/* Earnings breakdown */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Top Earnings</Text>
                    {topEarnings.length === 0 ? (
                        <Text className="font-inter text-[12px] text-neutral-500">No data yet.</Text>
                    ) : topEarnings.map(([k, v]) => (
                        <BreakdownRow key={k} label={k} amount={v} total={totalGross} color={colors.success[500]} />
                    ))}
                </View>

                {/* Deductions breakdown */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Top Deductions</Text>
                    {topDeductions.length === 0 ? (
                        <Text className="font-inter text-[12px] text-neutral-500">No data yet.</Text>
                    ) : topDeductions.map(([k, v]) => (
                        <BreakdownRow key={k} label={k} amount={v} total={totalDeductions} color={colors.danger[500]} />
                    ))}
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, gap: 8 }}>
                    {(['all', 'exceptions'] as const).map(t => (
                        <Pressable key={t} onPress={() => setTab(t)}
                            style={[styles.tab, tab === t && styles.tabActive]}>
                            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                                {t === 'all' ? `All (${employeeRows.length})` : `Issues (${exceptionCount})`}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Search */}
                <View style={[styles.searchBox, { marginTop: 4 }]}>
                    <Text style={{ color: colors.neutral[400], marginRight: 6 }}>🔍</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search employees…"
                        placeholderTextColor={colors.neutral[400]}
                        style={styles.searchInput}
                    />
                </View>

                {/* Employee cards */}
                <View style={{ marginTop: 12, gap: 10 }}>
                    {filtered.length === 0 ? (
                        <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 24 }]}>
                            <Text style={{ fontSize: 32, marginBottom: 6 }}>{employeeRows.length === 0 ? '⚙️' : '🔎'}</Text>
                            <Text className="font-inter text-[13px] text-neutral-500">
                                {employeeRows.length === 0 ? 'No computed entries yet. Tap "Compute Salaries" to generate.' : 'No matches in current filter.'}
                            </Text>
                        </View>
                    ) : filtered.map((r, i) => (
                        <View key={r.employeeId ?? i} style={[styles.empCard, r.isException && { backgroundColor: colors.warning[50] + '40' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text className="font-inter text-[13.5px] font-bold text-neutral-900" numberOfLines={1}>{r.employeeName}</Text>
                                    <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>{r.employeeCode}{r.department ? ` · ${r.department}` : ''}</Text>
                                </View>
                                {r.isException && (
                                    <View style={[styles.pill, { backgroundColor: colors.warning[50] }]}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.warning[700] }}>⚠ Issue</Text>
                                    </View>
                                )}
                                <Pressable
                                    onPress={() => {
                                        const matched = exceptionRows.find((ex: any) =>
                                            ex.employeeId === r.employeeId
                                            || ex.employeeCode === r.employeeCode
                                            || ex.employee === r.employeeName,
                                        );
                                        rowIssueRef.current?.present({
                                            employeeName: r.employeeName,
                                            employeeCode: r.employeeCode,
                                            department: r.department ?? null,
                                            exceptionType: matched?.type ?? matched?.exceptionType ?? (r.isException ? 'Computation Exception' : 'Entry Details'),
                                            severity: matched?.severity ?? (r.isException ? 'HIGH' : 'LOW'),
                                            note: matched?.message ?? matched?.note ?? r.exceptionNote ?? (r.isException ? 'Computation flagged this employee. Review the variance against last period.' : 'No issues detected. View shows computed values for reference.'),
                                            suggestedResolution: matched?.suggestion ?? matched?.resolution ?? (r.isException ? 'Review attendance, salary structure and pay-period inputs; re-run computation after corrections.' : undefined),
                                            grossEarnings: Number(r.grossEarnings ?? 0),
                                            totalDeductions: Number(r.totalDeductions ?? 0),
                                            netPay: Number(r.netPay ?? 0),
                                        });
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.eyeBtn}
                                >
                                    <Text style={{ fontSize: 16, color: colors.primary[600] }}>👁</Text>
                                </Pressable>
                            </View>
                            <View style={styles.empMetricsRow}>
                                <Metric label="Gross" value={formatINR(r.grossEarnings)} accent={colors.neutral[800]} />
                                <Metric label="Deductions" value={`-${formatINR(r.totalDeductions)}`} accent={colors.danger[700]} />
                                <Metric label="Net" value={formatINR(r.netPay)} accent={colors.success[700]} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                {isComputed ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Salaries computed</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">{formatINR(totalNet)} net · {employeeCount} employees</Text>
                        </View>
                        <Pressable onPress={handleReset} disabled={resetMutation.isPending}
                            style={[styles.lockBtn, { backgroundColor: colors.warning[50], borderWidth: 1, borderColor: colors.warning[300], opacity: resetMutation.isPending ? 0.5 : 1 }]}>
                            <Text className="font-inter text-[13px] font-bold" style={{ color: colors.warning[700] }}>↺ Reset</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push({ pathname: '/company/hr/payroll-c-step-1' as any, params: { runId: inferredRunId } })}
                            style={styles.lockBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">Next  ›</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[11px] text-neutral-500">{employeeCount} employees · preview</Text>
                        </View>
                        <Pressable onPress={handleCompute} disabled={computeMutation.isPending} style={[styles.lockBtn, computeMutation.isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {computeMutation.isPending ? 'Computing…' : '🧮 Compute Salaries'}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
            <RowIssueSheet ref={rowIssueRef} />
        </View>
    );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: accent }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    progressTrack: { height: 5, borderRadius: 999, backgroundColor: colors.neutral[100], overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
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
    empCard: {
        backgroundColor: colors.white, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: colors.neutral[200],
    },
    empMetricsRow: {
        flexDirection: 'row', gap: 8,
        paddingTop: 8, marginTop: 8,
        borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    lockBtn: {
        borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
        overflow: 'hidden', minWidth: 110,
        alignItems: 'center', justifyContent: 'center',
    },
    eyeBtn: {
        width: 30, height: 30,
        borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
});

export default PhaseCStep3Screen;
