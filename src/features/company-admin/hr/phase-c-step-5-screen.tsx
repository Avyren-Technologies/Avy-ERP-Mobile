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
    useApprovalSummary,
    useStatutorySummary,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useApproveRun,
    useSaveApprovalNotes,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { useAuthStore, getDisplayName } from '@/features/auth/use-auth-store';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

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
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'emerald' | 'violet' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        emerald: { bg: '#ECFDF5',          fg: '#059669' },
        violet:  { bg: '#F5F3FF',          fg: '#7C3AED' },
    } as const;
    const t = tintMap[tint];
    return (
        <View style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[15px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

function SummaryRow({ label, amount, employees, total, isTotal, tone = 'neutral' }: { label: string; amount: number; employees: number; total: number; isTotal?: boolean; tone?: 'neutral' | 'success' | 'danger' | 'primary' }) {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const tintMap = {
        neutral: { bg: 'transparent',     fg: colors.neutral[700] },
        success: { bg: colors.success[50] + '60', fg: colors.success[900] },
        danger:  { bg: colors.danger[50] + '60',  fg: colors.danger[900] },
        primary: { bg: colors.primary[50] + '60', fg: colors.primary[900] },
    } as const;
    const t = tintMap[tone];
    return (
        <View style={[styles.summaryRow, { backgroundColor: t.bg }]}>
            <View style={{ flex: 2, minWidth: 0 }}>
                <Text className="font-inter" style={{ fontSize: 12.5, fontWeight: isTotal ? '800' : '500', color: t.fg }} numberOfLines={1}>{label}</Text>
            </View>
            <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: isTotal ? '800' : '600', color: t.fg }}>{formatINR(amount)}</Text>
            </View>
            <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: t.fg }}>{employees}</Text>
            </View>
            <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: t.fg }}>{pct.toFixed(1)}%</Text>
            </View>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep5Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const authUser = useAuthStore.use.user();
    const authUserName = getDisplayName(authUser);
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    /* Resolve runId */
    const { data: runsResp } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);
    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const t = runsList.find(r => ['STATUTORY_DONE', 'APPROVED'].includes(r.status));
        if (t) return t.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp, refetch: refetchRun } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: approvalResp, isLoading, isRefetching, refetch: refetchApproval } = useApprovalSummary(inferredRunId);
    const approval: any = (approvalResp as any)?.data ?? null;

    const { data: statutoryResp, refetch: refetchStatutory } = useStatutorySummary(inferredRunId);
    const statutory: any = (statutoryResp as any)?.data ?? null;

    const approveMutation = useApproveRun();
    const saveNotesMutation = useSaveApprovalNotes();
    const confirmModal = useConfirmModal();

    const [notes, setNotes] = React.useState<string>(runDetail?.approvalNotes ?? '');
    React.useEffect(() => {
        if (typeof runDetail?.approvalNotes === 'string') setNotes(runDetail.approvalNotes);
    }, [runDetail?.approvalNotes]);

    const isApproved = runDetail?.status && ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);

    const summary = approval?.current ?? approval?.summary ?? null;
    const employees       = Number(summary?.employees ?? runDetail?.employeeCount ?? 0);
    const totalGross      = Number(summary?.grossPay ?? runDetail?.totalGross ?? 0);
    const totalDeductions = Number(summary?.totalDeductions ?? runDetail?.totalDeductions ?? 0);
    const totalNet        = Number(summary?.netPay ?? runDetail?.totalNet ?? 0);
    const employerCost    = Number(summary?.employerCost ?? runDetail?.totalEmployerCost ?? 0);
    const totalPayable    = totalNet + employerCost;

    const earningsBreakdown: Record<string, number> = approval?.earningsBreakdown ?? {};
    const deductionsBreakdown: Record<string, number> = approval?.deductionsBreakdown ?? {};

    const workflow: any[] = (runDetail?.metadata?.approvalWorkflow as any[]) ?? [];
    const approvers = workflow.length > 0 ? workflow : [
        { role: 'Finance Manager', name: authUserName || '—', status: isApproved ? 'APPROVED' : 'PENDING', when: isApproved ? new Date().toISOString() : null },
        { role: 'CFO', name: '—', status: 'PENDING', when: null },
    ];

    const handleSaveDraft = () => {
        if (!inferredRunId) return;
        saveNotesMutation.mutate({ runId: inferredRunId, notes }, {
            onSuccess: () => { refetchRun(); },
        });
    };

    const handleApprove = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Approve Payroll?',
            message: 'Once approved, the payroll will be disbursed and cannot be changed. Proceed?',
            confirmText: 'Approve',
            onConfirm: () => {
                const fire = () => approveMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchRun(); refetchApproval(); refetchStatutory(); },
                });
                if (notes.trim() && notes !== (runDetail?.approvalNotes ?? '')) {
                    saveNotesMutation.mutate({ runId: inferredRunId, notes }, { onSuccess: fire });
                } else {
                    fire();
                }
            },
        });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 5 — Approval" onMenuPress={toggle} />
                <EmptyState icon="inbox" title="No payroll run found"
                    message="Create a payroll run before approving."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }} />
            </View>
        );
    }

    if (isLoading && !approval) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 5 — Approval" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 5 — Approval" onMenuPress={toggle} subtitle="Phase C · Core Execution" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchRun(); refetchApproval(); refetchStatutory(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 5 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Approval</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Review the complete payroll summary, statutory amounts and bank disbursement totals.
                        Submit for approval to Finance Manager, then CFO.
                    </Text>
                </Animated.View>

                {/* Warning */}
                {!isApproved && (
                    <View style={[styles.alertBanner, { marginTop: 12 }]}>
                        <Text style={{ color: colors.warning[700], fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <Text className="font-inter text-[12.5px] text-warning-700" style={{ flex: 1 }}>
                            Please review all totals carefully. Once approved, the payroll will be disbursed and cannot be changed.
                        </Text>
                    </View>
                )}

                {/* KPI tiles */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees" value={employees} tint="primary" />
                    <StatTile label="Gross Pay"        value={formatINRCompact(totalGross)} sub={formatINR(totalGross)} tint="success" />
                    <StatTile label="Deductions"       value={formatINRCompact(totalDeductions)} sub={formatINR(totalDeductions)} tint="danger" />
                    <StatTile label="Net Pay"           value={formatINRCompact(totalNet)} sub={formatINR(totalNet)} tint="emerald" />
                    <StatTile label="Employer Stat."   value={formatINRCompact(employerCost)} sub={formatINR(employerCost)} tint="accent" />
                    <StatTile label="Total Payable"    value={formatINRCompact(totalPayable)} sub={formatINR(totalPayable)} tint="violet" />
                </View>

                {/* Payroll Summary */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Payroll Summary</Text>

                    {/* Header */}
                    <View style={[styles.summaryRow, { backgroundColor: colors.neutral[100], borderRadius: 6 }]}>
                        <View style={{ flex: 2 }}><Text className="font-inter text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Particulars</Text></View>
                        <View style={{ flex: 1.5, alignItems: 'flex-end' }}><Text className="font-inter text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Amount</Text></View>
                        <View style={{ flex: 0.8, alignItems: 'flex-end' }}><Text className="font-inter text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Emp</Text></View>
                        <View style={{ flex: 0.8, alignItems: 'flex-end' }}><Text className="font-inter text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">%</Text></View>
                    </View>

                    {/* Earnings */}
                    <View style={{ marginTop: 4, paddingVertical: 4 }}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-success-700">Earnings</Text>
                    </View>
                    {Object.entries(earningsBreakdown).length > 0 ? (
                        Object.entries(earningsBreakdown).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                            <SummaryRow key={k} label={k} amount={v} employees={employees} total={totalGross} />
                        ))
                    ) : (
                        <SummaryRow label="No detailed breakdown" amount={totalGross} employees={employees} total={totalGross} />
                    )}
                    <SummaryRow label="Total Gross Pay" amount={totalGross} employees={employees} total={totalGross} isTotal tone="success" />

                    {/* Deductions */}
                    <View style={{ marginTop: 6, paddingVertical: 4 }}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-danger-700">Deductions (Employee)</Text>
                    </View>
                    {Object.entries(deductionsBreakdown).length > 0 ? (
                        Object.entries(deductionsBreakdown).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                            <SummaryRow key={k} label={k} amount={v} employees={employees} total={totalDeductions} />
                        ))
                    ) : (
                        <SummaryRow label="No detailed breakdown" amount={totalDeductions} employees={employees} total={totalDeductions} />
                    )}
                    <SummaryRow label="Total Deductions" amount={totalDeductions} employees={employees} total={totalDeductions} isTotal tone="danger" />

                    {/* Net */}
                    <View style={{ marginTop: 6 }}>
                        <SummaryRow label="Total Net Pay (Bank Transfer)" amount={totalNet} employees={employees} total={totalGross} isTotal tone="primary" />
                    </View>
                </View>

                {/* Statutory mini-summary */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Statutory</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <MiniStat label="PF Total" value={formatINR(Number(statutory?.pfEmployeeTotal ?? 0) + Number(statutory?.pfEmployerTotal ?? 0))} />
                        <MiniStat label="ESI Total" value={formatINR(Number(statutory?.esiEmployeeTotal ?? 0) + Number(statutory?.esiEmployerTotal ?? 0))} />
                        <MiniStat label="PT" value={formatINR(statutory?.ptTotal ?? 0)} />
                        <MiniStat label="TDS" value={formatINR(statutory?.tdsTotal ?? 0)} />
                    </View>
                </View>

                {/* Approval Workflow */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Approval Workflow</Text>
                    {approvers.map((a: any, idx: number) => {
                        const statusBg =
                            a.status === 'APPROVED' ? colors.success[50] :
                            a.status === 'REJECTED' ? colors.danger[50] :
                            colors.warning[50];
                        const statusFg =
                            a.status === 'APPROVED' ? colors.success[700] :
                            a.status === 'REJECTED' ? colors.danger[700] :
                            colors.warning[700];
                        return (
                            <View key={idx} style={styles.approverRow}>
                                <View style={[styles.approverNum, { backgroundColor: a.status === 'APPROVED' ? colors.success[600] : colors.primary[100] }]}>
                                    <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: a.status === 'APPROVED' ? colors.white : colors.primary[700] }}>
                                        {a.status === 'APPROVED' ? '✓' : idx + 1}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text className="font-inter text-[12.5px] font-bold text-neutral-900" numberOfLines={1}>{a.role}</Text>
                                        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                                            <Text style={{ fontFamily: 'Inter', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, color: statusFg, textTransform: 'uppercase' }}>{a.status}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-inter text-[11.5px] text-neutral-600" numberOfLines={1}>{a.name ?? '—'}</Text>
                                    {a.when && <Text className="font-inter text-[10.5px] text-neutral-500">{fmt.date(a.when)} {fmt.time(a.when)}</Text>}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Approval Notes */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Approval Notes</Text>
                    <TextInput
                        value={notes}
                        onChangeText={(t) => setNotes(t.slice(0, 500))}
                        placeholder="Add your comments (optional)…"
                        placeholderTextColor={colors.neutral[400]}
                        editable={!isApproved}
                        multiline
                        textAlignVertical="top"
                        style={[styles.notesInput, isApproved && { opacity: 0.6 }]}
                    />
                    <Text className="mt-1 font-inter text-[10px] text-neutral-500 text-right">{notes.length}/500 characters</Text>
                </View>
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                {isApproved ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Payroll approved</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">{formatINR(totalNet)} · {employees} employees</Text>
                        </View>
                        <Pressable onPress={() => router.push({ pathname: '/company/hr/payroll-runs' as any })} style={styles.actionBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[12.5px] font-bold text-white">Done  ›</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Pressable onPress={handleSaveDraft} disabled={saveNotesMutation.isPending}
                            style={[styles.actionBtn, styles.actionBtnSecondary, saveNotesMutation.isPending && { opacity: 0.6 }]}>
                            <Text className="font-inter text-[12.5px] font-bold text-neutral-700">
                                {saveNotesMutation.isPending ? 'Saving…' : 'Save Draft'}
                            </Text>
                        </Pressable>
                        <Pressable onPress={handleApprove} disabled={approveMutation.isPending} style={[styles.actionBtn, approveMutation.isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.success[600], '#059669'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {approveMutation.isPending ? 'Approving…' : '✓ Approve & Submit'}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ width: '50%', paddingVertical: 6 }}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="font-inter text-[13px] font-bold text-neutral-900" style={{ fontFamily: 'Inter' }}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    summaryRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 7, paddingHorizontal: 8,
        borderRadius: 4,
    },
    alertBanner: { backgroundColor: colors.warning[50], borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.warning[200] },
    approverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    approverNum: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    notesInput: {
        minHeight: 80,
        borderWidth: 1, borderColor: colors.neutral[200],
        borderRadius: 10, padding: 10,
        fontFamily: 'Inter', fontSize: 13, color: colors.neutral[800],
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    actionBtnSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
});

export default PhaseCStep5Screen;
