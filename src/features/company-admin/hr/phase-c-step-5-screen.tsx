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
    usePayrollRunApprovalWorkflow,
    useComponentBreakdown,
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
    label, value, sub, tint, onPress,
}: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    tint: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'emerald' | 'violet';
    onPress?: () => void;
}) {
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
    const Wrap: any = onPress ? Pressable : View;
    return (
        <Wrap onPress={onPress} style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[15px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </Wrap>
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
/* Info Tooltip Bottom Sheet                                                */
/* ──────────────────────────────────────────────────────────────────────── */

function InfoSheet({
    visible, onClose, title, body,
}: { visible: boolean; onClose: () => void; title: string; body: string }) {
    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable onPress={onClose} style={sheetStyles.backdrop}>
                <Pressable style={[sheetStyles.card, { padding: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text className="font-inter text-[15px] font-bold text-neutral-900">{title}</Text>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                        </Pressable>
                    </View>
                    <Text className="font-inter text-[13px] text-neutral-700" style={{ lineHeight: 19 }}>{body}</Text>
                </Pressable>
            </Pressable>
        </Modal>
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

    const workflowQuery = usePayrollRunApprovalWorkflow(inferredRunId);
    const workflow: any = (workflowQuery.data as any)?.data ?? null;

    const componentQuery = useComponentBreakdown(inferredRunId);
    const components: any = (componentQuery.data as any)?.data ?? null;

    const approveMutation = useApproveRun();
    const saveNotesMutation = useSaveApprovalNotes();
    const confirmModal = useConfirmModal();

    const [notes, setNotes] = React.useState<string>(runDetail?.approvalNotes ?? '');
    const [notesError, setNotesError] = React.useState<string | null>(null);
    React.useEffect(() => {
        if (typeof runDetail?.approvalNotes === 'string') setNotes(runDetail.approvalNotes);
    }, [runDetail?.approvalNotes]);

    /* Tap-to-expand state */
    const [kpiDetail, setKpiDetail] = React.useState<{ label: string; value: string; sub?: string } | null>(null);
    const [infoSheet, setInfoSheet] = React.useState<{ title: string; body: string } | null>(null);

    const isApproved = runDetail?.status && ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);

    /* Backend `getApprovalSummary` nests executive metrics under `summary`,
     * and exposes `comparison.previous` / `comparison.current` for variance. */
    const summary = approval?.summary ?? approval?.comparison?.current ?? approval?.current ?? null;
    /* All amounts wrapped Number(value ?? 0) defensively */
    const employees       = Number(summary?.employees ?? runDetail?.employeeCount ?? 0);
    const totalGross      = Number(summary?.grossPay ?? runDetail?.totalGross ?? 0);
    const totalDeductions = Number(summary?.totalDeductions ?? runDetail?.totalDeductions ?? 0);
    const totalNet        = Number(summary?.netPay ?? runDetail?.totalNet ?? 0);
    const employerCost    = Number(summary?.employerCost ?? runDetail?.totalEmployerCost ?? 0);
    const totalPayable    = totalNet + employerCost;

    /* Detailed component breakdown — backend returns `componentName` and `totalAmount` */
    const earningComponents: Array<{ name: string; total: number; employeeCount: number }> = (
        Array.isArray(components?.earnings) ? components.earnings : []
    ).map((c: any) => ({
        name: c.componentName ?? c.name ?? c.componentCode ?? '—',
        total: Number(c.totalAmount ?? c.total ?? 0),
        employeeCount: Number(c.employeeCount ?? 0),
    }));
    const deductionComponents: Array<{ name: string; total: number; employeeCount: number }> = (
        Array.isArray(components?.deductions) ? components.deductions : []
    ).map((c: any) => ({
        name: c.componentName ?? c.name ?? c.componentCode ?? '—',
        total: Number(c.totalAmount ?? c.total ?? 0),
        employeeCount: Number(c.employeeCount ?? 0),
    }));

    /* Aggregate maps for legacy `earningsBreakdown` consumers */
    const earningsBreakdown: Record<string, number> = approval?.earningsBreakdown
        ?? Object.fromEntries(earningComponents.map(c => [c.name, c.total]));
    const deductionsBreakdown: Record<string, number> = approval?.deductionsBreakdown
        ?? Object.fromEntries(deductionComponents.map(c => [c.name, c.total]));

    /* Department breakdown — backend uses `department` field, not `deptName`/`name` */
    const departments: any[] = Array.isArray(approval?.departmentBreakdown) ? approval.departmentBreakdown : [];

    /* Bank disbursement breakdown — backend nests under `bankDisbursementSummary` */
    const bankDisbursement: any = approval?.bankDisbursementSummary ?? {};
    const bankBreakdown: any[] = Array.isArray(bankDisbursement?.bankBreakdown)
        ? bankDisbursement.bankBreakdown
        : Array.isArray(approval?.bankBreakdown) ? approval.bankBreakdown : [];
    const paymentModeBreakdown: any[] = Array.isArray(bankDisbursement?.paymentModeBreakdown)
        ? bankDisbursement.paymentModeBreakdown
        : Array.isArray(approval?.paymentModeBreakdown) ? approval.paymentModeBreakdown : [];
    const employeesWithoutBank: number = Number(
        bankDisbursement?.employeesWithoutBank?.count
            ?? (typeof approval?.employeesWithoutBank === 'object'
                ? approval?.employeesWithoutBank?.count
                : approval?.employeesWithoutBank)
            ?? 0,
    );

    /* Statutory totals — prefer approval.statutoryTotals, fall back to statutory-summary endpoint
     * (which nests under `totals` and exposes legacy aliases) */
    const statutoryTotals: any = approval?.statutoryTotals ?? statutory?.totals ?? statutory ?? {};

    /* Workflow rendering */
    const workflowError: any = workflowQuery.error;
    const workflowMissing = !!workflowError
        || (workflowQuery.isSuccess && (!workflow || !Array.isArray(workflow?.steps) || (workflow?.steps?.length ?? 0) === 0));
    const workflowSteps: any[] = Array.isArray(workflow?.steps) ? workflow.steps : [];
    const currentApprovalLevel: number = Number(
        runDetail?.approvalCurrentLevel
            ?? workflow?.currentLevel
            ?? approval?.approvalCurrentLevel
            ?? (isApproved ? (workflowSteps.length || 1) + 1 : 1),
    );
    const approvers = workflowSteps.length > 0
        ? workflowSteps.map((s: any, idx: number) => {
            const level = Number(s.level ?? idx + 1);
            const explicitStatus = (s.status ?? s.approvalStatus ?? '').toString().toUpperCase();
            let status: 'APPROVED' | 'REJECTED' | 'CURRENT' | 'PENDING';
            if (explicitStatus === 'APPROVED' || explicitStatus === 'REJECTED') {
                status = explicitStatus as 'APPROVED' | 'REJECTED';
            } else if (isApproved || level < currentApprovalLevel) {
                status = 'APPROVED';
            } else if (level === currentApprovalLevel) {
                status = 'CURRENT';
            } else {
                status = 'PENDING';
            }
            return {
                level,
                role: s.approverRole ?? s.role ?? `Level ${level} Approver`,
                name: s.approverName ?? s.name ?? (status === 'CURRENT' ? authUserName || '—' : '—'),
                status,
                when: s.approvedAt ?? s.when ?? null,
            };
        })
        : [];

    const handleSaveDraft = () => {
        if (!inferredRunId) return;
        saveNotesMutation.mutate({ runId: inferredRunId, notes }, {
            onSuccess: () => { refetchRun(); },
        });
    };

    const handleApprove = () => {
        if (!inferredRunId) return;
        /* Required notes validation */
        if (!notes.trim()) {
            setNotesError('Approval notes are required before submitting for approval.');
            return;
        }
        setNotesError(null);

        const impactMessage = `Approving will move the run to "Approved" and unlock disbursement.\n\n`
            + `• Employees: ${employees}\n`
            + `• Net Pay: ${formatINR(totalNet)}\n`
            + `• Employer Cost: ${formatINR(employerCost)}\n`
            + `• Total Payable: ${formatINR(totalPayable)}\n\n`
            + `Once approved, payroll cannot be changed.`;

        confirmModal.show({
            title: 'Approve Payroll?',
            message: impactMessage,
            confirmText: 'Approve',
            onConfirm: () => {
                const fire = () => approveMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchRun(); refetchApproval(); refetchStatutory(); workflowQuery.refetch(); },
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
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchRun(); refetchApproval(); refetchStatutory(); workflowQuery.refetch(); componentQuery.refetch(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 5 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Approval</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Review the complete payroll summary, statutory amounts and bank disbursement totals.
                        Submit for approval to your configured workflow.
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

                {/* KPI tiles (tap to expand) */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees" value={employees} tint="primary"
                        onPress={() => setKpiDetail({ label: 'Total Employees', value: String(employees), sub: 'Employees included in run' })} />
                    <StatTile label="Gross Pay" value={formatINRCompact(totalGross)} sub={formatINR(totalGross)} tint="success"
                        onPress={() => setKpiDetail({ label: 'Gross Pay', value: formatINR(totalGross), sub: 'Sum of all earnings (before deductions)' })} />
                    <StatTile label="Deductions" value={formatINRCompact(totalDeductions)} sub={formatINR(totalDeductions)} tint="danger"
                        onPress={() => setKpiDetail({ label: 'Deductions', value: formatINR(totalDeductions), sub: 'Employee statutory + other deductions' })} />
                    <StatTile label="Net Pay" value={formatINRCompact(totalNet)} sub={formatINR(totalNet)} tint="emerald"
                        onPress={() => setKpiDetail({ label: 'Net Pay', value: formatINR(totalNet), sub: 'Amount to be credited to employees' })} />
                    <StatTile label="Employer Stat." value={formatINRCompact(employerCost)} sub={formatINR(employerCost)} tint="accent"
                        onPress={() => setKpiDetail({ label: 'Employer Stat.', value: formatINR(employerCost), sub: 'Employer share of PF, ESI, etc.' })} />
                    <StatTile label="Total Payable" value={formatINRCompact(totalPayable)} sub={formatINR(totalPayable)} tint="violet"
                        onPress={() => setKpiDetail({ label: 'Total Payable', value: formatINR(totalPayable), sub: 'Net Pay + Employer Contributions' })} />
                </View>

                {/* Payroll Summary */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Payroll Summary</Text>

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
                        Object.entries(earningsBreakdown).sort((a, b) => Number(b[1]) - Number(a[1])).map(([k, v]) => (
                            <SummaryRow key={k} label={k} amount={Number(v || 0)} employees={employees} total={totalGross} />
                        ))
                    ) : (
                        <SummaryRow label="No detailed breakdown" amount={totalGross} employees={employees} total={totalGross} />
                    )}
                    <SummaryRow label="Total Gross Pay" amount={totalGross} employees={employees} total={totalGross} isTotal tone="success" />

                    <View style={{ marginTop: 6, paddingVertical: 4 }}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-danger-700">Deductions (Employee)</Text>
                    </View>
                    {Object.entries(deductionsBreakdown).length > 0 ? (
                        Object.entries(deductionsBreakdown).sort((a, b) => Number(b[1]) - Number(a[1])).map(([k, v]) => (
                            <SummaryRow key={k} label={k} amount={Number(v || 0)} employees={employees} total={totalDeductions} />
                        ))
                    ) : (
                        <SummaryRow label="No detailed breakdown" amount={totalDeductions} employees={employees} total={totalDeductions} />
                    )}
                    <SummaryRow label="Total Deductions" amount={totalDeductions} employees={employees} total={totalDeductions} isTotal tone="danger" />

                    <View style={{ marginTop: 6 }}>
                        <SummaryRow label="Total Net Pay (Bank Transfer)" amount={totalNet} employees={employees} total={totalGross} isTotal tone="primary" />
                    </View>
                </View>

                {/* Earnings & Deductions Breakdown (from /component-breakdown endpoint) */}
                {(earningComponents.length > 0 || deductionComponents.length > 0) ? (
                    <View style={[styles.heroCard, { marginTop: 12 }]}>
                        <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Earnings & Deductions Breakdown</Text>
                        {earningComponents.length > 0 && (
                            <>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-success-700 mt-1 mb-1">Earnings</Text>
                                {earningComponents.map((c, i) => (
                                    <BreakdownRow key={`e-${i}`} label={c.name} count={Number(c.employeeCount || 0)} amount={Number(c.total || 0)} tone="success" />
                                ))}
                            </>
                        )}
                        {deductionComponents.length > 0 && (
                            <>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-danger-700 mt-3 mb-1">Deductions</Text>
                                {deductionComponents.map((c, i) => (
                                    <BreakdownRow key={`d-${i}`} label={c.name} count={Number(c.employeeCount || 0)} amount={Number(c.total || 0)} tone="danger" />
                                ))}
                            </>
                        )}
                    </View>
                ) : componentQuery.isError ? null : null}

                {/* Department Summary */}
                {departments.length > 0 && (
                    <View style={[styles.heroCard, { marginTop: 12 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text className="font-inter text-[13px] font-bold text-neutral-900">Department Summary</Text>
                            <Pressable onPress={() => setInfoSheet({
                                title: 'Department Summary',
                                body: 'Per-department breakdown of payroll. Departments labeled "Unassigned" represent employees who have not been mapped to any department yet.',
                            })}>
                                <Text style={{ fontSize: 14, color: colors.primary[600] }}>ⓘ</Text>
                            </Pressable>
                        </View>
                        {departments.map((d: any, idx: number) => {
                            /* Backend uses `department` field, not `deptName`/`name` */
                            const rawName = d.department ?? d.deptName ?? d.departmentName ?? d.name;
                            const isUnassigned = rawName == null || String(rawName).trim() === '';
                            const gross = Number(d.gross ?? d.grossPay ?? 0);
                            const net = Number(d.netPay ?? d.net ?? 0);
                            const employer = Number(d.employerCost ?? d.employer ?? 0);
                            const emps = Number(d.employees ?? d.count ?? 0);
                            return (
                                <View key={idx} style={styles.deptRow}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        {isUnassigned ? (
                                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ fontStyle: 'italic' }}>
                                                Unassigned
                                            </Text>
                                        ) : (
                                            <Text className="font-inter text-[12.5px] font-bold text-neutral-900" numberOfLines={1}>
                                                {String(rawName)}
                                            </Text>
                                        )}
                                        <Text className="font-inter text-[11.5px] text-neutral-600">{emps} emp</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                        <DeptMetric
                                            label="Gross"
                                            value={formatINRCompact(gross)}
                                            onInfo={() => setInfoSheet({ title: 'Gross', body: 'Total earnings for this department (basic + allowances + bonuses, before deductions).' })}
                                        />
                                        <DeptMetric
                                            label="Net"
                                            value={formatINRCompact(net)}
                                            onInfo={() => setInfoSheet({ title: 'Net Pay', body: 'Amount credited to employees after all deductions (statutory + others).' })}
                                        />
                                        <DeptMetric
                                            label="Employer"
                                            value={formatINRCompact(employer)}
                                            onInfo={() => setInfoSheet({ title: 'Employer Cost', body: 'Employer share of statutory contributions (PF, ESI, gratuity, etc.) for this department.' })}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Statutory mini-summary — uses statutoryTotals (totals.* keys) with legacy alias fallback */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Statutory</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <MiniStat label="PF Total" value={formatINR(
                            Number(statutoryTotals?.pfEmployee ?? statutory?.pfEmployeeTotal ?? 0)
                            + Number(statutoryTotals?.pfEmployer ?? statutory?.pfEmployerTotal ?? 0),
                        )} />
                        <MiniStat label="ESI Total" value={formatINR(
                            Number(statutoryTotals?.esiEmployee ?? statutory?.esiEmployeeTotal ?? 0)
                            + Number(statutoryTotals?.esiEmployer ?? statutory?.esiEmployerTotal ?? 0),
                        )} />
                        <MiniStat label="PT" value={formatINR(Number(statutoryTotals?.pt ?? statutory?.ptTotal ?? 0))} />
                        <MiniStat label="TDS" value={formatINR(Number(statutoryTotals?.tds ?? statutory?.tdsTotal ?? 0))} />
                    </View>
                </View>

                {/* Bank Disbursement Expansion */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Bank Disbursement</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                        <Text className="font-inter text-[12.5px] text-neutral-700">Total Disbursable</Text>
                        <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{formatINR(totalNet)}</Text>
                    </View>

                    {bankBreakdown.length > 0 && (
                        <>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-3 mb-1">By Bank</Text>
                            {bankBreakdown.map((b: any, idx: number) => (
                                <View key={`bk-${idx}`} style={styles.bankRow}>
                                    <Text className="font-inter text-[12px] text-neutral-700" numberOfLines={1} style={{ flex: 1 }}>
                                        {b.bankName ?? b.name ?? <Text className="font-inter text-[12px] text-neutral-500" style={{ fontStyle: 'italic' }}>Unassigned</Text>}
                                    </Text>
                                    <Text className="font-inter text-[11.5px] text-neutral-500" style={{ marginRight: 8 }}>{Number(b.employeeCount ?? b.employees ?? b.count ?? 0)}</Text>
                                    <Text className="font-inter text-[12px] font-bold text-neutral-900">{formatINR(Number(b.amount ?? b.totalAmount ?? b.total ?? 0))}</Text>
                                </View>
                            ))}
                        </>
                    )}

                    {paymentModeBreakdown.length > 0 && (
                        <>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-3 mb-1">By Payment Mode</Text>
                            {paymentModeBreakdown.map((m: any, idx: number) => (
                                <View key={`pm-${idx}`} style={styles.bankRow}>
                                    <Text className="font-inter text-[12px] text-neutral-700" style={{ flex: 1 }} numberOfLines={1}>
                                        {m.mode ?? m.paymentMode ?? m.name ?? '—'}
                                    </Text>
                                    <Text className="font-inter text-[11.5px] text-neutral-500" style={{ marginRight: 8 }}>{Number(m.employeeCount ?? m.employees ?? m.count ?? 0)}</Text>
                                    <Text className="font-inter text-[12px] font-bold text-neutral-900">{formatINR(Number(m.amount ?? m.totalAmount ?? m.total ?? 0))}</Text>
                                </View>
                            ))}
                        </>
                    )}

                    {employeesWithoutBank > 0 && (
                        <View style={[styles.alertBanner, { marginTop: 10 }]}>
                            <Text style={{ color: colors.warning[700], fontSize: 14, marginRight: 8 }}>⚠</Text>
                            <Text className="font-inter text-[12px] text-warning-700" style={{ flex: 1 }}>
                                {employeesWithoutBank} employee{employeesWithoutBank === 1 ? '' : 's'} without bank details. Their payments will be skipped.
                            </Text>
                        </View>
                    )}

                    {bankBreakdown.length === 0 && paymentModeBreakdown.length === 0 && (
                        <Text className="mt-2 font-inter text-[11.5px] text-neutral-500">
                            Bank-wise breakdown will appear once available.
                        </Text>
                    )}
                </View>

                {/* Approval Workflow — real data */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text className="font-inter text-[13px] font-bold text-neutral-900">Approval Workflow</Text>
                        {workflowQuery.isLoading && <Text className="font-inter text-[11px] text-neutral-500">Loading…</Text>}
                    </View>

                    {workflowMissing ? (
                        <View style={{ padding: 12, backgroundColor: colors.warning[50], borderRadius: 10, borderWidth: 1, borderColor: colors.warning[200] }}>
                            <Text className="font-inter text-[12.5px] font-bold text-warning-900 mb-1">No approval workflow configured</Text>
                            <Text className="font-inter text-[11.5px] text-warning-800">
                                Configure the workflow under HR → Approval Workflow Config (trigger: PAYROLL_RUN_APPROVAL).
                            </Text>
                            <Pressable
                                onPress={() => router.push('/company/hr/approval-workflow' as any)}
                                style={[styles.actionBtn, { marginTop: 10, backgroundColor: colors.primary[600], paddingHorizontal: 14, alignSelf: 'flex-start' }]}
                            >
                                <Text className="font-inter text-[12px] font-bold text-white">Open Workflow Config  ›</Text>
                            </Pressable>
                        </View>
                    ) : approvers.length === 0 && workflowQuery.isLoading ? (
                        <Text className="font-inter text-[12px] text-neutral-500">Loading workflow…</Text>
                    ) : (
                        approvers.map((a: any, idx: number) => {
                            const isCurrent = a.status === 'CURRENT';
                            const statusBg =
                                a.status === 'APPROVED' ? colors.success[50] :
                                a.status === 'REJECTED' ? colors.danger[50] :
                                isCurrent ? colors.primary[50] :
                                colors.warning[50];
                            const statusFg =
                                a.status === 'APPROVED' ? colors.success[700] :
                                a.status === 'REJECTED' ? colors.danger[700] :
                                isCurrent ? colors.primary[700] :
                                colors.warning[700];
                            const numBg = a.status === 'APPROVED' ? colors.success[600]
                                : a.status === 'REJECTED' ? colors.danger[600]
                                : isCurrent ? colors.primary[600]
                                : colors.neutral[200];
                            const numFg = a.status === 'PENDING' ? colors.neutral[700] : colors.white;
                            return (
                                <View key={idx} style={[styles.approverRow, isCurrent && { backgroundColor: colors.primary[50] + '40', borderRadius: 8 }]}>
                                    <View style={[styles.approverNum, { backgroundColor: numBg }]}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: numFg }}>
                                            {a.status === 'APPROVED' ? '✓' : a.status === 'REJECTED' ? '✕' : a.level}
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
                        })
                    )}
                </View>

                {/* Approval Notes (required) */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <Text className="font-inter text-[13px] font-bold text-neutral-900">Approval Notes</Text>
                        <Text style={{ color: colors.danger[600], fontSize: 13, fontWeight: '700' }}>*</Text>
                    </View>
                    <TextInput
                        value={notes}
                        onChangeText={(t) => { setNotes(t.slice(0, 500)); if (notesError) setNotesError(null); }}
                        placeholder="Add your comments (required for audit trail)…"
                        placeholderTextColor={colors.neutral[400]}
                        editable={!isApproved}
                        multiline
                        textAlignVertical="top"
                        style={[styles.notesInput, isApproved && { opacity: 0.6 }, notesError && { borderColor: colors.danger[400] }]}
                    />
                    {notesError && (
                        <Text className="mt-1 font-inter text-[11.5px] text-danger-600">{notesError}</Text>
                    )}
                    <Text className="mt-1 font-inter text-[10px] text-neutral-500 text-right">{notes.length}/500 characters</Text>
                </View>

                {/* Attachments info */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[13px] font-bold text-neutral-900">Attachments</Text>
                        <Pressable onPress={() => setInfoSheet({
                            title: 'Attachments',
                            body: 'Attach supporting documents such as variance approval memos, special incentive sanctions, exception clearances, or any document referenced in the approval notes. Attach files via the web app — mobile preview/upload coming soon.',
                        })}>
                            <Text style={{ fontSize: 14, color: colors.primary[600] }}>ⓘ</Text>
                        </Pressable>
                    </View>
                    <Text className="mt-1 font-inter text-[11.5px] text-neutral-500">
                        Upload supporting documents (variance memos, sanction letters, etc.) from the web app.
                    </Text>
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
                        <Pressable onPress={() => router.push({ pathname: '/company/hr/payroll-c-step-6' as any, params: { runId: inferredRunId } })} style={styles.actionBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[12.5px] font-bold text-white">Next: Disburse  ›</Text>
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

            {/* KPI tap-to-expand */}
            <Modal visible={!!kpiDetail} animationType="fade" transparent onRequestClose={() => setKpiDetail(null)}>
                <Pressable onPress={() => setKpiDetail(null)} style={sheetStyles.backdrop}>
                    <Pressable style={[sheetStyles.card, { padding: 20 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-neutral-500">{kpiDetail?.label}</Text>
                            <Pressable onPress={() => setKpiDetail(null)} hitSlop={10}>
                                <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                            </Pressable>
                        </View>
                        <Text className="font-inter text-[26px] font-extrabold text-neutral-900">{kpiDetail?.value}</Text>
                        {kpiDetail?.sub && <Text className="mt-2 font-inter text-[13px] text-neutral-600">{kpiDetail.sub}</Text>}
                    </Pressable>
                </Pressable>
            </Modal>

            <InfoSheet
                visible={!!infoSheet}
                onClose={() => setInfoSheet(null)}
                title={infoSheet?.title ?? ''}
                body={infoSheet?.body ?? ''}
            />
        </View>
    );
}

function BreakdownRow({ label, count, amount, tone }: { label: string; count: number; amount: number; tone: 'success' | 'danger' }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
            <Text className="font-inter text-[12.5px] text-neutral-700" style={{ flex: 1.6 }} numberOfLines={1}>{label}</Text>
            <Text className="font-inter text-[11.5px] text-neutral-500" style={{ flex: 0.5, textAlign: 'right' }}>{count}</Text>
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 12.5, fontWeight: '700', color: tone === 'success' ? colors.success[700] : colors.danger[700], textAlign: 'right' }}>
                {formatINR(amount)}
            </Text>
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

function DeptMetric({ label, value, onInfo }: { label: string; value: string; onInfo: () => void }) {
    return (
        <View style={{ width: '32%', paddingVertical: 3 }}>
            <Pressable onPress={onInfo} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text className="font-inter text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
                <Text style={{ fontSize: 9.5, color: colors.primary[500] }}>ⓘ</Text>
            </Pressable>
            <Text className="font-inter text-[11.5px] font-bold text-neutral-900" numberOfLines={1}>{value}</Text>
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
    approverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
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
    deptRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    bankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
});

const sheetStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    card: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
});

export default PhaseCStep5Screen;
