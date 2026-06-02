/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
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
    useStatutorySummary,
    useStatutoryFiles,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useComputeStatutory,
    useResetToCompute,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

const formatINR = (v: unknown): string => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'emerald' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        emerald: { bg: '#ECFDF5',          fg: '#059669' },
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

function ComplianceRow({ label, ready, text }: { label: string; ready: boolean; text: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, color: ready ? colors.success[600] : colors.neutral[400] }}>{ready ? '✓' : '○'}</Text>
                <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: ready ? colors.success[700] : colors.neutral[500] }}>{text}</Text>
        </View>
    );
}

function FileCard({
    type, fileName, employees, amount, dueDate, fileUrl, status,
}: {
    type: string; fileName: string; employees?: number; amount?: number;
    dueDate?: string | null; fileUrl?: string | null; status: string;
}) {
    const meta = {
        PF_ECR:      { label: 'PF ECR File',          color: colors.primary[600] },
        ESI_CHALLAN: { label: 'ESI Challan',          color: colors.accent[600] },
        PT_CHALLAN:  { label: 'PT Challan',           color: colors.warning[600] },
        TDS_24Q:     { label: 'TDS 24Q',              color: colors.danger[600] },
    } as const;
    const m = (meta as any)[type] ?? { label: type, color: colors.neutral[600] };
    const generated = status === 'FILED' || status === 'PENDING';
    return (
        <View style={styles.fileCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.fileBadge, { backgroundColor: m.color + '20' }]}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: m.color }}>
                        {type === 'PF_ECR' ? 'ECR' : type === 'ESI_CHALLAN' ? 'ESI' : type === 'PT_CHALLAN' ? 'PT' : type === 'TDS_24Q' ? 'TDS' : '—'}
                    </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900" numberOfLines={1}>{m.label}</Text>
                    <Text className="font-inter text-[10.5px] text-neutral-500" numberOfLines={1}>{fileName}</Text>
                </View>
            </View>
            <View style={{ marginTop: 8, gap: 4 }}>
                {employees !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Employees</Text>
                        <Text className="font-inter text-[11px] font-bold text-neutral-900">{employees}</Text>
                    </View>
                )}
                {amount !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Amount</Text>
                        <Text className="font-inter text-[11px] font-bold text-neutral-900">{formatINR(amount)}</Text>
                    </View>
                )}
                {dueDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Due</Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.warning[700] }}>
                            {new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Text>
                    </View>
                )}
            </View>
            <Pressable
                onPress={() => fileUrl && Linking.openURL(fileUrl)}
                disabled={!generated || !fileUrl}
                style={[styles.dlBtn, (!generated || !fileUrl) && { opacity: 0.5, backgroundColor: colors.neutral[100] }]}
            >
                <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: generated && fileUrl ? colors.primary[700] : colors.neutral[400] }}>
                    ⬇ {generated ? 'Download' : 'Not generated'}
                </Text>
            </Pressable>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep4Screen() {
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
        const t = runsList.find(r => ['COMPUTED', 'STATUTORY_DONE', 'APPROVED'].includes(r.status));
        if (t) return t.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: summaryResp, isLoading, isRefetching, refetch: refetchSummary } = useStatutorySummary(inferredRunId);
    const summary: any = (summaryResp as any)?.data ?? null;

    const { data: filesResp, refetch: refetchFiles } = useStatutoryFiles(inferredRunId);
    const filesData: any = (filesResp as any)?.data ?? null;
    const files: any[] = filesData?.files ?? [];

    const computeMutation = useComputeStatutory();
    const resetMutation = useResetToCompute();
    const confirmModal = useConfirmModal();

    const isStatutoryDone = runDetail?.status && ['STATUTORY_DONE', 'APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);
    const isPostApproval = runDetail?.status && ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);

    const pfEmp        = Number(summary?.pfEmployeeTotal ?? 0);
    const pfEmpr       = Number(summary?.pfEmployerTotal ?? 0);
    const esiEmp       = Number(summary?.esiEmployeeTotal ?? 0);
    const esiEmpr      = Number(summary?.esiEmployerTotal ?? 0);
    const ptTotal      = Number(summary?.ptTotal ?? 0);
    const tdsTotal     = Number(summary?.tdsTotal ?? 0);

    const pfEligible      = Number(summary?.pfEligible ?? 0);
    const esiEligible     = Number(summary?.esiEligible ?? 0);
    const ptApplicable    = Number(summary?.ptApplicable ?? 0);
    const tdsApplicable   = Number(summary?.tdsApplicable ?? 0);

    const totalEmployees = runDetail?.employeeCount ?? 0;

    const computeStatusByType = React.useMemo(() => {
        const set = new Set(files.map((f: any) => f.type));
        return { PF: set.has('PF_ECR'), ESI: set.has('ESI_CHALLAN'), PT: set.has('PT_CHALLAN'), TDS: set.has('TDS_24Q') };
    }, [files]);

    const importantDates = React.useMemo(() => {
        const m = runDetail?.month;
        const y = runDetail?.year;
        if (!m || !y) return [];
        const next = m === 12 ? { m: 1, y: y + 1 } : { m: m + 1, y };
        const pfDue = new Date(next.y, next.m - 1, 15);
        const esiDue = new Date(next.y, next.m - 1, 15);
        const ptDue = new Date(next.y, next.m - 1, 20);
        let tdsDue: Date;
        if (m >= 1 && m <= 3)      tdsDue = new Date(y, 4, 31);
        else if (m >= 4 && m <= 6) tdsDue = new Date(y, 6, 31);
        else if (m >= 7 && m <= 9) tdsDue = new Date(y, 9, 31);
        else                        tdsDue = new Date(y + 1, 0, 31);
        return [
            { label: 'PF ECR',  date: pfDue },
            { label: 'ESI',     date: esiDue },
            { label: 'PT',      date: ptDue },
            { label: 'TDS 24Q', date: tdsDue },
        ];
    }, [runDetail]);

    const handleCompute = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Compute Statutory?',
            message: 'Calculate PF, ESI, PT, TDS and LWF for all applicable employees and generate filing data.',
            confirmText: 'Compute',
            onConfirm: () => {
                computeMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchFiles(); },
                });
            },
        });
    };

    const handleReset = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Reset Statutory?',
            message: 'Reset will return the run to "Computed" so you can recompute statutory amounts.',
            confirmText: 'Reset',
            onConfirm: () => {
                resetMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchFiles(); },
                });
            },
        });
    };

    const handleNext = () => {
        if (!inferredRunId) return;
        router.push({ pathname: '/company/hr/payroll-c-step-5' as any, params: { runId: inferredRunId } });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} />
                <EmptyState icon="inbox" title="No payroll run found"
                    message="Create a payroll run before computing statutory."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }} />
            </View>
        );
    }

    if (isLoading && !summary) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} subtitle="Phase C · Core Execution" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchSummary(); refetchFiles(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 4 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Statutory Deductions</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Auto-compute statutory deductions and generate statutory files and challan data.
                    </Text>
                </Animated.View>

                {/* KPI tiles */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees" value={totalEmployees}     sub="Active" tint="primary" />
                    <StatTile label="PF (Employee)"    value={formatINR(pfEmp)}   sub={`${pfEligible} emp`} tint="emerald" />
                    <StatTile label="PF (Employer)"    value={formatINR(pfEmpr)}  sub={`${pfEligible} emp`} tint="success" />
                    <StatTile label="ESI (Employee)"   value={formatINR(esiEmp)}  sub={`${esiEligible} emp`} tint="info" />
                    <StatTile label="ESI (Employer)"   value={formatINR(esiEmpr)} sub={`${esiEligible} emp`} tint="accent" />
                    <StatTile label="Professional Tax" value={formatINR(ptTotal)} sub={`${ptApplicable} emp`} tint="warning" />
                    <StatTile label="TDS (Income Tax)" value={formatINR(tdsTotal)} sub={`${tdsApplicable} emp`} tint="danger" />
                </View>

                {/* Compliance Status */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Statutory Compliance Status</Text>
                    <ComplianceRow label="PF"  ready={computeStatusByType.PF}  text={computeStatusByType.PF ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="ESI" ready={computeStatusByType.ESI} text={computeStatusByType.ESI ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="Professional Tax" ready={computeStatusByType.PT} text={computeStatusByType.PT ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="TDS (24Q)" ready={computeStatusByType.TDS} text={computeStatusByType.TDS ? 'Ready' : 'Pending'} />
                </View>

                {/* Important Dates */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Important Dates</Text>
                    {importantDates.map(d => (
                        <View key={d.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                            <Text className="font-inter text-[12.5px] text-neutral-700">{d.label}</Text>
                            <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{d.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                        </View>
                    ))}
                </View>

                {/* Generated Files */}
                <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <Text className="font-inter text-[15px] font-bold text-neutral-900">Generated Statutory Files ({files.length})</Text>
                </View>
                {files.length === 0 ? (
                    <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 24 }]}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>📄</Text>
                        <Text className="font-inter text-[13px] text-neutral-500">No files generated yet. Compute statutory first.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 10 }}>
                        {files.map((f, i) => (
                            <FileCard key={f.id ?? f.type ?? i}
                                type={f.type}
                                fileName={f.label ?? `${f.type}_${runDetail?.month}_${runDetail?.year}.xml`}
                                employees={f.employeeCount}
                                amount={f.amount}
                                dueDate={f.dueDate}
                                fileUrl={f.fileUrl}
                                status={f.status} />
                        ))}
                    </View>
                )}

                {/* Warning */}
                {!isPostApproval && (
                    <View style={[styles.alertBanner, { marginTop: 16 }]}>
                        <Text style={{ color: colors.warning[700], fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <Text className="font-inter text-[12.5px] text-warning-700" style={{ flex: 1 }}>
                            Please verify statutory amounts and files before proceeding. Any salary changes require re-computation.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                {isStatutoryDone ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Statutory computed</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">{formatINR(pfEmp + pfEmpr + esiEmp + esiEmpr + ptTotal + tdsTotal)} total</Text>
                        </View>
                        {!isPostApproval && (
                            <Pressable onPress={handleReset} disabled={resetMutation.isPending}
                                style={[styles.actionBtn, { backgroundColor: colors.warning[50], borderWidth: 1, borderColor: colors.warning[300], opacity: resetMutation.isPending ? 0.5 : 1 }]}>
                                <Text className="font-inter text-[12.5px] font-bold" style={{ color: colors.warning[700] }}>↺ Reset</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={handleNext} style={styles.actionBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[12.5px] font-bold text-white">Next: Approval  ›</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[11px] text-neutral-500">{totalEmployees} employees</Text>
                        </View>
                        <Pressable onPress={handleCompute} disabled={computeMutation.isPending} style={[styles.actionBtn, computeMutation.isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {computeMutation.isPending ? 'Computing…' : '🛡 Compute Statutory'}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    fileCard: { backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    fileBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dlBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
    alertBanner: { backgroundColor: colors.warning[50], borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.warning[200] },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    actionBtn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, overflow: 'hidden', minWidth: 130, alignItems: 'center', justifyContent: 'center' },
});

export default PhaseCStep4Screen;
