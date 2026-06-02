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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useCompletePostRunActivity,
    useConfigurationStatus,
    usePostRunChecklist,
    usePostRunInsights,
} from '@/features/company-admin/api/use-payroll-phases-queries';
import { usePayrollRun, usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

type ActivityStatus = 'COMPLETE' | 'PENDING' | 'NOT_APPLICABLE';
type ActivityCategory = 'DISTRIBUTION' | 'STATUTORY' | 'RECONCILIATION' | 'REPORTING';

interface BackendActivity {
    id: string;
    activityNumber: number;
    name: string;
    description: string;
    category: ActivityCategory;
    status: ActivityStatus;
    dueDate: string | null;
    metadata: { count?: number; label?: string } | null;
}

const MANUAL_ACTIVITIES = ['bank_reconciliation', 'variance_audit', 'gl_posting'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ACTIVITY_META: Record<string, { emoji: string; tint: string }> = {
    payslip_generation:     { emoji: '📄', tint: colors.info[600] },
    payslip_distribution:   { emoji: '📨', tint: colors.primary[600] },
    pf_filing:              { emoji: '🛡',  tint: colors.accent[600] },
    esi_filing:             { emoji: '🛡',  tint: colors.accent[600] },
    pt_filing:              { emoji: '🛡',  tint: colors.warning[600] },
    tds_filing:             { emoji: '🛡',  tint: colors.danger[600] },
    bank_reconciliation:    { emoji: '🏛',  tint: colors.primary[600] },
    variance_audit:         { emoji: '📊', tint: colors.warning[600] },
    employee_notifications: { emoji: '🔔', tint: colors.success[600] },
    gl_posting:             { emoji: '📒', tint: colors.accent[600] },
    form_16_generation:     { emoji: '🏆', tint: colors.success[600] },
    archive_complete:       { emoji: '📦', tint: colors.success[600] },
};

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

function ProgressDonut({ pct, size = 90 }: { pct: number; size?: number }) {
    const strokeWidth = 9;
    const radius = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - pct / 100);
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id="phaseD-donut-mobile" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={colors.success[500]} />
                        <Stop offset="100%" stopColor={colors.success[700]} />
                    </SvgGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={strokeWidth} fill="none" />
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#phaseD-donut-mobile)" strokeWidth={strokeWidth} fill="none"
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
            </Svg>
            <Text className="font-inter text-[16px] font-extrabold text-neutral-900">{pct}%</Text>
        </View>
    );
}

function StatusPill({ status, dueLabel }: { status: ActivityStatus; dueLabel?: string }) {
    const map = {
        COMPLETE:        { bg: colors.success[50], fg: colors.success[700], label: 'Completed' },
        PENDING:         { bg: colors.warning[50], fg: colors.warning[700], label: dueLabel ?? 'In Progress' },
        NOT_APPLICABLE:  { bg: colors.neutral[100], fg: colors.neutral[600], label: dueLabel ?? 'Not Due' },
    } as const;
    const t = map[status];
    return (
        <View style={[styles.pill, { backgroundColor: t.bg }]}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: t.fg }}>{t.label}</Text>
        </View>
    );
}

function InsightTile({
    label, value, sub, tint,
}: { label: string; value: React.ReactNode; sub?: string; tint: 'primary' | 'success' | 'danger' | 'warning' | 'emerald' | 'accent' | 'info' }) {
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

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseDPostRunScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    /* Resolve runId */
    const { data: runsResp, isLoading: runsLoading } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);
    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const t = runsList.find(r => ['DISBURSED', 'ARCHIVED'].includes(r.status));
        if (t) return t.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: checklistResp, isLoading: checklistLoading, isRefetching, refetch: refetchChecklist } = usePostRunChecklist(inferredRunId);
    // payrollPhasesApi double-unwraps — use data directly
    const checklist: any = (checklistResp as any) ?? null;

    const { data: insightsResp, refetch: refetchInsights } = usePostRunInsights(inferredRunId);
    const insights: any = (insightsResp as any) ?? null;

    const { data: configResp } = useConfigurationStatus();
    const configStatus: any = (configResp as any) ?? null;
    const phaseAComplete = configStatus ? configStatus.completedCount >= configStatus.totalCount : true;

    const completeMutation = useCompletePostRunActivity();
    const confirmModal = useConfirmModal();

    const activities: BackendActivity[] = checklist?.activities ?? [];
    const completedCount = checklist?.completedCount ?? 0;
    const totalCount = checklist?.totalCount ?? activities.length ?? 0;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleAction = (a: BackendActivity) => {
        const isManual = MANUAL_ACTIVITIES.includes(a.id);
        if (a.status === 'COMPLETE') return;
        if (isManual) {
            confirmModal.show({
                title: 'Mark Complete?',
                message: `Mark "${a.name}" as completed?`,
                confirmText: 'Mark Complete',
                onConfirm: () => {
                    completeMutation.mutate(
                        { runId: inferredRunId, activityId: a.id },
                        { onSuccess: () => { refetchChecklist(); refetchInsights(); } },
                    );
                },
            });
        } else {
            const routes: Record<string, string> = {
                payslip_generation:   '/company/hr/payslips',
                payslip_distribution: '/company/hr/payslips',
                pf_filing:            '/company/hr/statutory-filings',
                esi_filing:           '/company/hr/statutory-filings',
                pt_filing:            '/company/hr/statutory-filings',
                tds_filing:           '/company/hr/statutory-filings',
                form_16_generation:   '/company/hr/form-16',
                archive_complete:     '/company/hr/payroll-runs',
            };
            router.push((routes[a.id] ?? '/company/hr/payroll-runs') as any);
        }
    };

    const upcomingDeadlines = React.useMemo(() => {
        const now = Date.now();
        return activities
            .filter(a => a.dueDate && a.status !== 'COMPLETE' && new Date(a.dueDate).getTime() >= now)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 4);
    }, [activities]);

    if (!phaseAComplete) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase D — Post-Run" onMenuPress={toggle} />
                <View style={{ padding: 16 }}>
                    <View style={[styles.callout, { backgroundColor: colors.warning[50], borderColor: colors.warning[200] }]}>
                        <Text style={{ fontSize: 20, marginRight: 10 }}>🔒</Text>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[14px] font-bold text-warning-900">Configuration required</Text>
                            <Text className="mt-1 font-inter text-[12px] text-warning-800">Complete Phase A before accessing post-run activities.</Text>
                        </View>
                    </View>
                    <Pressable onPress={() => router.push('/company/hr/payroll-config-prerequisites' as any)} style={[styles.actionBtn, { marginTop: 12 }]}>
                        <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        <Text className="font-inter text-[13px] font-bold text-white">Open Phase A  ›</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!runsLoading && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase D — Post-Run" onMenuPress={toggle} />
                <EmptyState icon="inbox" title="No payroll run found"
                    message="Disburse a payroll run before completing post-run activities."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }} />
            </View>
        );
    }

    if (checklistLoading && !checklist) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase D — Post-Run" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    const m = runDetail?.month;
    const y = runDetail?.year;
    const monthStart = m && y ? new Date(y, m - 1, 1).toISOString() : null;
    const monthEnd = m && y ? new Date(y, m, 0).toISOString() : null;

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Phase D — Post-Run" onMenuPress={toggle} subtitle="After Each Payroll Run" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchChecklist(); refetchInsights(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-primary-600">Post-Run Activities</Text>
                    <Text className="mt-1 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Complete post-payroll activities to ensure compliance, reporting accuracy and smooth reconciliation.
                    </Text>
                </Animated.View>

                {/* Period strip */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Payroll Period</Text>
                            <Text className="mt-0.5 font-inter text-[14px] font-bold text-neutral-900">
                                {m ? `${MONTHS[m]} ${y}` : '—'}
                            </Text>
                            <Text className="font-inter text-[11px] text-neutral-500">
                                {monthStart && monthEnd ? `${fmt.date(monthStart)} – ${fmt.date(monthEnd)}` : '—'}
                            </Text>
                        </View>
                        <ProgressDonut pct={progressPct} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <View>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Completed</Text>
                            <Text className="font-inter text-[13px] font-bold text-neutral-900">{completedCount} / {totalCount}</Text>
                        </View>
                        <View>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Net Pay</Text>
                            <Text className="font-inter text-[13px] font-bold text-success-700">{formatINRCompact(insights?.totalNetPay ?? runDetail?.totalNet ?? 0)}</Text>
                        </View>
                        <View>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Employees</Text>
                            <Text className="font-inter text-[13px] font-bold text-neutral-900">{insights?.employeeCount ?? runDetail?.employeeCount ?? 0}</Text>
                        </View>
                    </View>
                </View>

                {/* Activity cards */}
                <Text className="mt-4 mb-2 font-inter text-[15px] font-bold text-neutral-900">Post-Run Activities Checklist</Text>
                {activities.length === 0 ? (
                    <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 24 }]}>
                        <Text style={{ fontSize: 30, marginBottom: 4 }}>📋</Text>
                        <Text className="font-inter text-[13px] text-neutral-500">No post-run activities yet.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 10 }}>
                        {activities.map(a => {
                            const meta = ACTIVITY_META[a.id] ?? { emoji: '📋', tint: colors.neutral[700] };
                            const isManual = MANUAL_ACTIVITIES.includes(a.id);
                            const dueLabel = a.status === 'NOT_APPLICABLE' ? 'Not Due' : undefined;
                            return (
                                <View key={a.id} style={[styles.actCard, a.status === 'COMPLETE' && { backgroundColor: colors.success[50] + '40' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                        <View style={[styles.numBadge, { backgroundColor: a.status === 'COMPLETE' ? colors.success[600] : colors.primary[100] }]}>
                                            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: a.status === 'COMPLETE' ? colors.white : colors.primary[700] }}>
                                                {a.status === 'COMPLETE' ? '✓' : a.activityNumber}
                                            </Text>
                                        </View>
                                        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[100] }}>
                                            <Text style={{ fontSize: 17 }}>{meta.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text className="font-inter text-[13.5px] font-bold text-neutral-900" numberOfLines={1}>{a.name}</Text>
                                            <Text className="mt-0.5 font-inter text-[11.5px] text-neutral-500" numberOfLines={2}>{a.description}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                                        <View>
                                            <StatusPill status={a.status} dueLabel={dueLabel} />
                                            {a.dueDate && (
                                                <Text className="mt-1 font-inter text-[10.5px] text-neutral-500">Due {fmt.date(a.dueDate)}</Text>
                                            )}
                                        </View>
                                        {a.status === 'COMPLETE' ? (
                                            <Pressable onPress={() => handleAction(a)} style={[styles.actionBtnSm, { borderColor: colors.success[300], borderWidth: 1 }]}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.success[700] }}>View Details</Text>
                                            </Pressable>
                                        ) : (
                                            <Pressable
                                                onPress={() => handleAction(a)}
                                                disabled={completeMutation.isPending}
                                                style={[styles.actionBtnSm, { backgroundColor: isManual ? colors.primary[600] : colors.white, borderWidth: 1, borderColor: colors.primary[300] }, completeMutation.isPending && { opacity: 0.5 }]}
                                            >
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: isManual ? colors.white : colors.primary[700] }}>
                                                    {isManual ? 'Mark Complete' : 'Continue'} ›
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Insights */}
                <Text className="mt-6 mb-2 font-inter text-[15px] font-bold text-neutral-900">Post-Run Insights</Text>
                <View style={styles.kpiGrid}>
                    <InsightTile label="Net Pay Disbursed"  value={formatINRCompact(insights?.totalNetPay ?? 0)}        tint="success" />
                    <InsightTile label="Total Deductions"   value={formatINRCompact(insights?.totalDeductions ?? 0)}    tint="danger" />
                    <InsightTile label="Employees Paid"     value={`${insights?.employeeCount ?? 0}/${insights?.employeeCount ?? 0}`} tint="primary" />
                    <InsightTile label="Avg Net Pay"        value={formatINRCompact(insights?.averageNetPay ?? 0)}      tint="info" />
                    <InsightTile label="Compliance Score"   value={`${insights?.complianceScore ?? 0}/100`}             sub={(insights?.complianceScore ?? 0) >= 80 ? 'Good' : 'Fair'} tint="success" />
                    <InsightTile label="Cost / Employee"    value={formatINRCompact(insights?.costPerEmployee ?? 0)}    tint="accent" />
                </View>

                {/* Upcoming Deadlines */}
                <Text className="mt-6 mb-2 font-inter text-[15px] font-bold text-neutral-900">Upcoming Deadlines</Text>
                {upcomingDeadlines.length === 0 ? (
                    <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 18 }]}>
                        <Text className="font-inter text-[12.5px] text-neutral-500">No upcoming deadlines 🎉</Text>
                    </View>
                ) : (
                    <View style={[styles.heroCard]}>
                        {upcomingDeadlines.map((a, i) => {
                            const days = Math.ceil((new Date(a.dueDate!).getTime() - Date.now()) / 86_400_000);
                            const urgent = days <= 10;
                            const date = new Date(a.dueDate!);
                            const month = date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
                            const day = date.getDate();
                            return (
                                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < upcomingDeadlines.length - 1 ? 1 : 0, borderBottomColor: colors.neutral[100] }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.warning[50], alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '800', color: colors.warning[700], letterSpacing: 0.5 }}>{month}</Text>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: colors.warning[800] }}>{day}</Text>
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-[12.5px] font-bold text-neutral-900" numberOfLines={1}>{a.name}</Text>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: urgent ? colors.danger[600] : colors.neutral[500] }}>
                                            Due in {days} day{days === 1 ? '' : 's'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Quick links */}
                <Text className="mt-6 mb-2 font-inter text-[15px] font-bold text-neutral-900">Quick Links</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                        { label: 'Statutory Filing',   to: '/company/hr/statutory-filings' },
                        { label: 'Payslip Distribution', to: '/company/hr/payslips' },
                        { label: 'GL Integration',     to: '/company/hr/analytics' },
                        { label: 'Bank Reconciliation', to: '/company/hr/payroll-runs' },
                        { label: 'Payroll Reports',    to: '/company/hr/payroll-reports' },
                        { label: 'Compliance Dashboard', to: '/company/hr/analytics' },
                    ].map((q) => (
                        <Pressable key={q.label} onPress={() => router.push(q.to as any)} style={styles.quickLink}>
                            <Text className="font-inter text-[11.5px] font-bold text-neutral-700" numberOfLines={1}>{q.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Need Help */}
                <LinearGradient
                    colors={[colors.primary[600], colors.primary[700], colors.accent[700]] as const}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.helpCard, { marginTop: 16 }]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={styles.helpIcon}><Text style={{ fontSize: 16 }}>🎧</Text></View>
                        <Text className="font-inter text-[14px] font-bold text-white">Need Help?</Text>
                    </View>
                    <Text className="mb-3 font-inter text-[12.5px] text-white/80">Contact Payroll Support Team</Text>
                    <Pressable onPress={() => Linking.openURL('mailto:payroll.support@avyerp.com')}><Text className="font-inter text-[12.5px] text-white">✉  payroll.support@avyerp.com</Text></Pressable>
                    <Pressable onPress={() => Linking.openURL('tel:+91 9019189889')}><Text className="mt-1 font-inter text-[12.5px] text-white">📞  +91 9019189889</Text></Pressable>
                </LinearGradient>

                {/* Footer note */}
                <View style={[styles.callout, { marginTop: 16, backgroundColor: colors.info[50], borderColor: colors.info[200] }]}>
                    <Text style={{ fontSize: 16, marginRight: 8, color: colors.info[600] }}>ℹ</Text>
                    <Text className="font-inter text-[12px] text-info-800" style={{ flex: 1 }}>
                        Complete all post-run activities to ensure compliance, accurate reporting and smooth financial reconciliation.
                    </Text>
                </View>
            </ScrollView>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    callout: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
    actCard: { backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    numBadge: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    actionBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    actionBtnSm: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
    quickLink: {
        width: '48%', paddingVertical: 10, paddingHorizontal: 12,
        backgroundColor: colors.white, borderRadius: 10,
        borderWidth: 1, borderColor: colors.neutral[200],
        alignItems: 'center', justifyContent: 'center',
    },
    helpCard: { borderRadius: 16, padding: 16, overflow: 'hidden' },
    helpIcon: { width: 32, height: 32, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

export default PhaseDPostRunScreen;
