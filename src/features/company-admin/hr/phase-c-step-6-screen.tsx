/* eslint-disable better-tailwindcss/no-unknown-classes */
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
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useDisbursementBreakdown,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useArchiveRun,
    useDisburseRun,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

const formatINR = (v: unknown): string => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatINRCompact = (v: unknown): string => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
};
const MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'emerald' | 'neutral' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        emerald: { bg: '#ECFDF5',          fg: '#059669' },
        neutral: { bg: colors.neutral[100], fg: colors.neutral[700] },
    } as const;
    const t = tintMap[tint];
    return (
        <View style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[14px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

function Donut({ successful, pending, failed, total }: { successful: number; pending: number; failed: number; total: number }) {
    const safe = total || 1;
    const size = 130;
    const sw = 12;
    const radius = (size - sw) / 2;
    const circ = 2 * Math.PI * radius;
    const sucLen = (successful / safe) * circ;
    const penLen = (pending / safe) * circ;
    const failLen = (failed / safe) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={sw} fill="none" />
                {total > 0 && (
                    <>
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.success[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${sucLen} ${circ - sucLen}`} strokeDashoffset={0} />
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.warning[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${penLen} ${circ - penLen}`} strokeDashoffset={-sucLen} />
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.danger[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${failLen} ${circ - failLen}`} strokeDashoffset={-sucLen - penLen} />
                    </>
                )}
            </Svg>
            <Text className="font-inter text-[22px] font-extrabold text-neutral-900">{total}</Text>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Transactions</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep6Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
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
        const t = runsList.find(r => ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(r.status));
        if (t) return t.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp, refetch: refetchRun } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: breakdownResp, isLoading, isRefetching, refetch: refetchBreakdown } = useDisbursementBreakdown(inferredRunId);
    const breakdown: any = (breakdownResp as any)?.data ?? null;

    const disburseMutation = useDisburseRun();
    const archiveMutation = useArchiveRun();
    const confirmModal = useConfirmModal();

    const status = (runDetail?.status ?? '').toUpperCase();
    const isApproved = ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(status);
    const isDisbursed = ['DISBURSED', 'ARCHIVED'].includes(status);
    const isArchived = status === 'ARCHIVED';

    const totals = breakdown?.totals ?? {};
    const distribution = breakdown?.distributionStatus ?? {};
    const employees = Number(totals.totalEmployees ?? runDetail?.employeeCount ?? 0);
    const netDisbursed = Number(totals.netDisbursed ?? runDetail?.totalNet ?? 0);
    const successful = Number(distribution?.processed?.count ?? (isDisbursed ? employees : 0));
    const pending = Number(distribution?.pending?.count ?? 0);
    const failed = Number(distribution?.failed?.count ?? 0);
    const totalTx = successful + pending + failed || employees;
    const successPct = totalTx > 0 ? (successful / totalTx) * 100 : 0;
    const avgNet = employees > 0 ? netDisbursed / employees : 0;

    const lock = breakdown?.payrollLock ?? {};
    const lockedAt = lock.lockedAt ?? runDetail?.lockedAt;
    const disbursedAt = lock.disbursedAt ?? runDetail?.disbursedAt;
    const approvedAt = lock.approvedAt ?? runDetail?.approvedAt;
    const computedAt = lock.computedAt ?? runDetail?.computedAt;

    const lockedByName = runDetail?.lockedByName ?? null;
    const approvedByName = runDetail?.approvedByName ?? null;

    const processingTime = React.useMemo(() => {
        if (!lockedAt || !disbursedAt) return null;
        const diffMs = new Date(disbursedAt).getTime() - new Date(lockedAt).getTime();
        if (diffMs <= 0) return null;
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, [lockedAt, disbursedAt]);

    const payslipStats = breakdown?.payslipDistribution ?? {};
    const payslipsGenerated = Number(payslipStats.generated ?? (isDisbursed ? employees : 0));
    const emailSent = Number(payslipStats.emailSent ?? 0);
    const whatsappDelivered = Number(payslipStats.whatsapp ?? 0);

    const bankFileName = React.useMemo(() => {
        if (!runDetail?.month || !runDetail?.year) return null;
        return `PAYROLL_${MONTHS_SHORT[runDetail.month]?.toUpperCase()}${runDetail.year}.txt`;
    }, [runDetail]);

    const handleDisburse = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Disburse Payroll?',
            message: 'Credit salaries to all employees and send notifications. This cannot be undone.',
            confirmText: 'Disburse',
            onConfirm: () => {
                disburseMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchRun(); refetchBreakdown(); },
                });
            },
        });
    };

    const handleArchive = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Archive Payroll Run?',
            message: 'All artifacts will be locked for audit. Unlock requires CFO permission.',
            confirmText: 'Archive',
            onConfirm: () => {
                archiveMutation.mutate(
                    { runId: inferredRunId, payload: { archivePayslips: true, archiveBankFile: true, archiveStatutoryFiles: true, archiveReports: true } },
                    { onSuccess: () => { refetchRun(); refetchBreakdown(); } },
                );
            },
        });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 6 — Disburse" onMenuPress={toggle} />
                <EmptyState icon="inbox" title="No payroll run found"
                    message="Create and approve a payroll run before disbursement."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }} />
            </View>
        );
    }

    if (isLoading && !breakdown) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 6 — Disburse" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 6 — Disburse" onMenuPress={toggle} subtitle="Phase C · Disburse & Archive" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchRun(); refetchBreakdown(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Step header */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 6 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Disburse &amp; Archive</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        {isArchived
                            ? 'Salaries have been disbursed and the run has been archived for audit.'
                            : isDisbursed
                                ? 'Salaries credited. Archive the run to lock all artifacts.'
                                : 'Disburse salaries to employees and archive the run for audit.'}
                    </Text>
                </Animated.View>

                {/* Success / status callout */}
                <View style={[
                    styles.callout,
                    { marginTop: 12, backgroundColor: isArchived ? colors.success[50] + '60' : isDisbursed ? colors.info[50] + '60' : colors.warning[50] + '60',
                       borderColor: isArchived ? colors.success[200] : isDisbursed ? colors.info[200] : colors.warning[200] },
                ]}>
                    <Text style={{ fontSize: 22, marginRight: 10 }}>{isArchived ? '✓' : isDisbursed ? '✓' : '○'}</Text>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[14px] font-bold" style={{ color: isArchived ? colors.success[900] : isDisbursed ? colors.info[900] : colors.warning[900] }}>
                            {isArchived ? 'Payroll Run Completed!' : isDisbursed ? 'Payroll Disbursed!' : 'Ready for Disbursement'}
                        </Text>
                        <Text className="mt-1 font-inter text-[12px]" style={{ color: isArchived ? colors.success[800] : isDisbursed ? colors.info[800] : colors.warning[800] }}>
                            {isArchived
                                ? `The payroll for ${runDetail?.month ? MONTHS_SHORT[runDetail.month] : ''} ${runDetail?.year} has been disbursed and archived.`
                                : isDisbursed
                                    ? 'Archive the run to lock all artifacts for audit.'
                                    : 'Click "Disburse Payroll" to credit salaries.'}
                        </Text>
                    </View>
                </View>

                {/* KPI grid */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees"        value={employees} sub="Active" tint="primary" />
                    <StatTile label="Net Pay Disbursed"      value={formatINRCompact(netDisbursed)} sub={formatINR(netDisbursed)} tint="success" />
                    <StatTile label="Bank Transfer"          value={formatINRCompact(netDisbursed)} sub={formatINR(netDisbursed)} tint="emerald" />
                    <StatTile label="Transactions Successful" value={String(successful)} sub={`${successPct.toFixed(0)}%`} tint="success" />
                    <StatTile label="Transactions Failed"    value={String(failed)} sub={failed > 0 ? 'Action needed' : 'All ok'} tint={failed > 0 ? 'danger' : 'neutral'} />
                    <StatTile label="Average Net Pay"        value={formatINRCompact(avgNet)} sub={formatINR(avgNet)} tint="accent" />
                    <StatTile label="Processing Time"        value={processingTime ?? '—'} tint="info" />
                    <StatTile label="Status"                 value={isArchived ? 'Archived' : isDisbursed ? 'Disbursed' : 'Pending'} tint={isDisbursed ? 'success' : 'warning'} />
                </View>

                {/* Bank Disbursement Status */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Bank Disbursement Status</Text>
                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                        <Donut successful={successful} pending={pending} failed={failed} total={totalTx} />
                    </View>
                    <BreakdownLine color={colors.success[500]} label="Successful Transfers" value={successful} total={totalTx} />
                    <BreakdownLine color={colors.warning[500]} label="Pending Bank Ack."     value={pending}    total={totalTx} />
                    <BreakdownLine color={colors.danger[500]}  label="Rejected by Bank"      value={failed}     total={totalTx} />
                </View>

                {/* Payslip Distribution */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Payslip Distribution</Text>
                    <DistribRow label="📄  Payslips Generated"  value={payslipsGenerated} />
                    <DistribRow label="🌐  Portal Published"    value={payslipsGenerated} />
                    <DistribRow label="✉️  Email Sent"            value={emailSent} />
                    <DistribRow label="💬  WhatsApp Delivered"    value={whatsappDelivered} />
                </View>

                {/* Approval Trail */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Approval Trail</Text>
                    <TimelineRow label="Lock Attendance" status={lockedAt ? 'Locked' : 'Pending'}    when={lockedAt}    done={!!lockedAt} name={lockedByName} />
                    <TimelineRow label="Computed"         status={computedAt ? 'Computed' : 'Pending'} when={computedAt} done={!!computedAt} name={null} />
                    <TimelineRow label="Approved"         status={approvedAt ? 'Approved' : 'Pending'} when={approvedAt} done={!!approvedAt} name={approvedByName} />
                    <TimelineRow label="Disbursed"        status={disbursedAt ? 'Disbursed' : 'Pending'} when={disbursedAt} done={!!disbursedAt} name="System" />
                    {isArchived && (
                        <TimelineRow label="Archived" status="Archived" when={runDetail?.metadata?.archivedAt} done={true} name={runDetail?.metadata?.archivedByName ?? 'System'} isLast />
                    )}
                </View>

                {/* Payroll Lock */}
                <View style={[styles.heroCard, { marginTop: 12, alignItems: 'center' }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2" style={{ alignSelf: 'flex-start' }}>Payroll Lock</Text>
                    <View style={[styles.lockBadge, { backgroundColor: isArchived ? colors.success[100] : isDisbursed ? colors.warning[100] : colors.neutral[100] }]}>
                        <Text style={{ fontSize: 22 }}>🔒</Text>
                    </View>
                    <Text className="mt-2 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Payroll Status</Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: isArchived ? colors.success[700] : isDisbursed ? colors.warning[700] : colors.neutral[600] }}>
                        {isArchived ? 'LOCKED' : isDisbursed ? 'DISBURSED' : 'OPEN'}
                    </Text>
                    <View style={{ width: '100%', marginTop: 10, gap: 6 }}>
                        <LockRow label="Locked By"        value={lockedByName ?? '—'} />
                        <LockRow label="Locked On"        value={disbursedAt ? `${fmt.date(disbursedAt)} ${fmt.time(disbursedAt)}` : '—'} />
                        <LockRow label="Unlock Permission" value="CFO Only" />
                    </View>
                </View>

                {/* Bank File Summary */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Bank File Summary</Text>
                    <LockRow label="File Name"      value={bankFileName ?? '—'} mono />
                    <LockRow label="Total Records" value={String(employees)} />
                    <LockRow label="Generated On"  value={disbursedAt ? `${fmt.date(disbursedAt)} ${fmt.time(disbursedAt)}` : '—'} />
                    <LockRow label="Status"        value={isDisbursed ? 'Uploaded to Bank' : 'Pending'} />
                </View>

                {/* Next Steps */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Next Steps</Text>
                    <NextStepRow icon="🧾" label="View Payslips"            onPress={() => router.push('/company/hr/payslips' as any)} />
                    <NextStepRow icon="📊" label="View Payroll Reports"     onPress={() => router.push('/company/hr/payroll-reports' as any)} />
                    <NextStepRow icon="🛡" label="Statutory Filing Center"  onPress={() => router.push('/company/hr/statutory-filings' as any)} />
                    <NextStepRow icon="🏛" label="Post-Run Activities"      onPress={() => router.push('/company/hr/payroll-post-run' as any)} />
                    <NextStepRow icon="🔁" label="Start Next Payroll Cycle" onPress={() => router.push('/company/hr/payroll-pre-run' as any)} />
                </View>
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                {isArchived ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Archived</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">{formatINR(netDisbursed)} · {employees} employees</Text>
                        </View>
                        <Pressable onPress={() => router.push('/company/hr/payroll-post-run' as any)} style={styles.actionBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">Post-Run  ›</Text>
                        </Pressable>
                    </>
                ) : isDisbursed ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-info-700">✓ Disbursed</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">Ready to archive</Text>
                        </View>
                        <Pressable onPress={handleArchive} disabled={archiveMutation.isPending} style={[styles.actionBtn, archiveMutation.isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {archiveMutation.isPending ? 'Archiving…' : '📦 Archive Run'}
                            </Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[11px] text-neutral-500">{employees} employees · {formatINRCompact(netDisbursed)}</Text>
                        </View>
                        <Pressable onPress={handleDisburse} disabled={!isApproved || disburseMutation.isPending} style={[styles.actionBtn, (!isApproved || disburseMutation.isPending) && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.success[600], '#059669'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {disburseMutation.isPending ? 'Disbursing…' : '💸 Disburse Payroll'}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Small atoms                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function BreakdownLine({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
                <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            </View>
            <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{value} <Text style={{ color: colors.neutral[500], fontWeight: '400' }}>({pct}%)</Text></Text>
        </View>
    );
}

function DistribRow({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{value}</Text>
        </View>
    );
}

function TimelineRow({ label, status, when, done, name, isLast }: { label: string; status: string; when?: string; done: boolean; name: string | null; isLast?: boolean }) {
    const fmt = useCompanyFormatter();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
            <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: done ? colors.success[600] : colors.neutral[300], alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.white, fontWeight: '800', fontSize: 11 }}>{done ? '✓' : '○'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{label}</Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '700', color: done ? colors.success[700] : colors.neutral[500], textTransform: 'uppercase' }}>{status}</Text>
                </View>
                {name && <Text className="font-inter text-[11.5px] text-neutral-600">{name}</Text>}
                {when && <Text className="font-inter text-[10.5px] text-neutral-500">{fmt.date(when)} {fmt.time(when)}</Text>}
            </View>
        </View>
    );
}

function LockRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 }}>
            <Text className="font-inter text-[12px] text-neutral-500">{label}</Text>
            <Text style={{ fontFamily: mono ? 'monospace' : 'Inter', fontSize: 12, fontWeight: '700', color: colors.neutral[900], textAlign: 'right', maxWidth: '60%' }} numberOfLines={1}>{value}</Text>
        </View>
    );
}

function NextStepRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
            backgroundColor: pressed ? colors.neutral[50] : 'transparent',
        }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>{icon}</Text>
                <Text className="font-inter text-[12.5px] font-bold text-primary-700">{label}</Text>
            </View>
            <Text style={{ color: colors.neutral[400], fontSize: 14 }}>›</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    callout: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    lockBadge: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    actionBtn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, overflow: 'hidden', minWidth: 180, alignItems: 'center', justifyContent: 'center' },
});

export default PhaseCStep6Screen;
