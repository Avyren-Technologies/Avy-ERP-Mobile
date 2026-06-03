/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePreRunChecklist } from '@/features/company-admin/api/use-payroll-phases-queries';
import { usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

type ActivityStatus = 'COMPLETE' | 'PENDING' | 'IN_PROGRESS' | 'BLOCKED';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

interface BackendActivity {
    id: string;
    activityNumber: number;
    name: string;
    description: string;
    status: ActivityStatus;
    priority: Priority;
    pendingCount: number | null;
    blockerReason: string | null;
    /** Backend-provided deep link to the page where this activity can be resolved. */
    actionUrl?: string;
}

interface BackendChecklist {
    completedCount: number;
    totalCount: number;
    run: { id: string; month: number; year: number; status: string; employeeCount: number };
    keyStats: { totalEmployees: number; totalMonthlyCTC: number; newJoiners: number; exits: number };
    activities: BackendActivity[];
}

interface ActivityMeta {
    emoji: string;
    iconTintBg: string;
    iconTintFg: string;
    estMin: number;
    ownerRole: string;
}

const ACTIVITY_META: Record<string, ActivityMeta> = {
    verify_attendance:     { emoji: '🗓', iconTintBg: colors.success[50], iconTintFg: colors.success[700], estMin: 20, ownerRole: 'HR Admin' },
    pending_approvals:     { emoji: '✓',  iconTintBg: colors.success[50], iconTintFg: colors.success[700], estMin: 15, ownerRole: 'HR Admin' },
    salary_revisions:      { emoji: '👤', iconTintBg: colors.accent[50],  iconTintFg: colors.accent[700],  estMin: 30, ownerRole: 'Payroll Officer' },
    one_time_adjustments:  { emoji: '⇄',  iconTintBg: colors.primary[50], iconTintFg: colors.primary[700], estMin: 20, ownerRole: 'Payroll Officer' },
    review_exceptions:     { emoji: '⚠',  iconTintBg: colors.warning[50], iconTintFg: colors.warning[700], estMin: 25, ownerRole: 'Payroll Officer' },
    statutory_compliance:  { emoji: '🛡', iconTintBg: '#F5F3FF',          iconTintFg: '#7C3AED',           estMin: 20, ownerRole: 'Compliance' },
    new_joiners_exits:     { emoji: '👥', iconTintBg: '#F0F9FF',          iconTintFg: '#0284C7',           estMin: 20, ownerRole: 'HR Admin' },
    loan_adjustments:      { emoji: '🏛', iconTintBg: colors.warning[50], iconTintFg: colors.warning[700], estMin: 15, ownerRole: 'Finance Lead' },
    salary_holds:          { emoji: '🔒', iconTintBg: colors.danger[50],  iconTintFg: colors.danger[700],  estMin: 15, ownerRole: 'Payroll Officer' },
    payroll_readiness:     { emoji: '⚡', iconTintBg: colors.neutral[100], iconTintFg: colors.neutral[700], estMin: 20, ownerRole: 'Payroll Officer' },
};

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function ProgressRing({ completed, total, size = 110 }: { completed: number; total: number; size?: number }) {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const progress = total > 0 ? completed / total : 0;
    const offset = circ * (1 - progress);
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id="phaseB-ring" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={colors.primary[600]} />
                        <Stop offset="100%" stopColor={colors.accent[600]} />
                    </SvgGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="url(#phaseB-ring)" strokeWidth={strokeWidth}
                    strokeLinecap="round" fill="none"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                />
            </Svg>
            <Text className="font-inter text-xl font-bold text-neutral-900">{completed}/{total}</Text>
            <Text className="mt-0.5 font-inter text-[10px] font-medium uppercase tracking-wider text-neutral-500">Completed</Text>
        </View>
    );
}

function StatusPill({ status, pendingCount }: { status: ActivityStatus; pendingCount: number | null }) {
    const map: Record<ActivityStatus, { bg: string; fg: string; label: string }> = {
        COMPLETE:    { bg: colors.success[50], fg: colors.success[700], label: 'Completed' },
        IN_PROGRESS: { bg: colors.warning[50], fg: colors.warning[700], label: 'In Progress' },
        BLOCKED:     { bg: colors.danger[50],  fg: colors.danger[700],  label: 'Issues' },
        PENDING:     { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Pending' },
    };
    const t = map[status];
    return (
        <View>
            <View style={[styles.pill, { backgroundColor: t.bg }]}>
                <Text style={[styles.pillText, { color: t.fg }]}>{t.label}</Text>
            </View>
            {status === 'BLOCKED' && pendingCount != null && pendingCount > 0 && (
                <Text style={{ fontFamily: 'Inter', fontSize: 10, marginTop: 2, color: colors.danger[600], fontWeight: '600' }}>{pendingCount} employees</Text>
            )}
        </View>
    );
}

function PriorityChip({ priority }: { priority: Priority }) {
    const map: Record<Priority, string> = {
        HIGH: colors.danger[600],
        MEDIUM: colors.warning[600],
        LOW: colors.neutral[500],
    };
    return <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: map[priority] }}>{priority}</Text>;
}

function RolePill({ role, bg, fg }: { role: string; bg: string; fg: string }) {
    return (
        <View style={[styles.pill, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: fg, opacity: 0.7 }} />
            <Text style={[styles.pillText, { color: fg }]}>{role}</Text>
        </View>
    );
}

function ActivityCard({ activity, meta, index, runId }: { activity: BackendActivity; meta: ActivityMeta; index: number; runId: string }) {
    const router = useRouter();
    let label = 'Start';
    let tint = colors.primary[600];
    if (activity.status === 'COMPLETE') label = 'View Details';
    else if (activity.status === 'IN_PROGRESS') label = 'Continue';
    else if (activity.status === 'BLOCKED') { label = 'Resolve Issues'; tint = colors.danger[600]; }

    return (
        <Animated.View entering={FadeInDown.delay(60 * index).duration(360)} style={styles.actCard}>
            <View style={styles.actHeaderRow}>
                <View style={styles.priorityCol}>
                    <PriorityChip priority={activity.priority} />
                </View>
                <View style={[styles.actIconCircle, { backgroundColor: meta.iconTintBg }]}>
                    <Text style={[styles.actEmoji, { color: meta.iconTintFg }]}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="font-inter text-[13.5px] font-bold text-neutral-900">{activity.name}</Text>
                    <Text className="mt-1 font-inter text-[12px] leading-[16px] text-neutral-600">{activity.description}</Text>
                </View>
            </View>

            <View style={styles.actMetaRow}>
                <StatusPill status={activity.status} pendingCount={activity.pendingCount} />
                <RolePill role={meta.ownerRole} bg={meta.iconTintBg} fg={meta.iconTintFg} />
                <View style={styles.timeChip}>
                    <Text style={styles.timeChipText}>⏱ ~{meta.estMin} min</Text>
                </View>
            </View>

            {activity.blockerReason && (
                <View style={styles.blockerBanner}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.danger[700] }}>⚠ {activity.blockerReason}</Text>
                </View>
            )}

            <View style={styles.actFooterRow}>
                <Text className="font-inter text-[11px] text-neutral-500">
                    {activity.pendingCount != null ? `${activity.pendingCount} pending` : ' '}
                </Text>
                <Pressable onPress={() => {
                    const url = activity.actionUrl
                        ? activity.actionUrl.replace(/^\/app/, '') // strip /app for mobile router
                        : `/company/hr/payroll-c-step-2?runId=${runId}`;
                    router.push(url as any);
                }}>
                    <Text style={[styles.actionText, { color: tint }]}>{label} ›</Text>
                </Pressable>
            </View>
        </Animated.View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Main screen                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseBPreRunScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    /* Fetch runs to discover active runId
       NOTE: mobile axios interceptor + API fn already unwrap to inner payload.
       listPayrollRuns returns either the array directly OR { data: [...], meta }.
       Handle both shapes defensively. */
    const { data: runsResp, isLoading: runsLoading } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const r: any = runsResp;
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.data)) return r.data;
        if (Array.isArray(r?.items)) return r.items;
        return [];
    }, [runsResp]);

    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const preExec = runsList.find(r => ['DRAFT', 'ATTENDANCE_LOCKED', 'EXCEPTIONS_REVIEWED', 'COMPUTED', 'STATUTORY_DONE'].includes(r.status));
        if (preExec) return preExec.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: checklistResp, isLoading: checklistLoading, isRefetching, refetch } = usePreRunChecklist(inferredRunId);
    // mobile axios interceptor + API fn already unwrap to inner payload
    const checklist = (checklistResp as any) as BackendChecklist | undefined;

    const counts = React.useMemo(() => {
        const c = { complete: 0, inProgress: 0, issues: 0, pending: 0 };
        (checklist?.activities ?? []).forEach(a => {
            if (a.status === 'COMPLETE') c.complete++;
            else if (a.status === 'IN_PROGRESS') c.inProgress++;
            else if (a.status === 'BLOCKED') c.issues++;
            else c.pending++;
        });
        return c;
    }, [checklist]);

    const completed = checklist?.completedCount ?? 0;
    const total = checklist?.totalCount ?? 10;
    const blockingIssues = (checklist?.activities ?? []).filter(a => a.status === 'BLOCKED');
    const blockingHolds = (checklist?.activities ?? []).find(a => a.id === 'salary_holds' && a.status === 'BLOCKED');
    const allReady = completed >= total && blockingIssues.length === 0;

    if (!runsLoading && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase B — Pre-Run" onMenuPress={toggle} />
                <EmptyState
                    icon="inbox"
                    title="No payroll runs yet"
                    message="Create a payroll run before pre-run activities can be evaluated."
                    action={{ label: 'Open Payroll Run Wizard', onPress: () => router.push('/company/hr/payroll-runs' as any) }}
                />
            </View>
        );
    }

    if (runsLoading || checklistLoading || !checklist) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase B — Pre-Run" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    const acts = checklist.activities;
    const get = (id: string) => acts.find(a => a.id === id);

    const healthChecks = [
        { label: 'Attendance Closed',     sub: ((p: number) => p === 0 ? 'All attendance reviewed' : `${p} record${p === 1 ? '' : 's'} pending`)(get('verify_attendance')?.pendingCount ?? 0), ok: get('verify_attendance')?.status === 'COMPLETE', emoji: '🗓' },
        { label: 'Leaves Actioned',       sub: 'All leave requests are actioned',                                                  ok: get('pending_approvals')?.status === 'COMPLETE', emoji: '📅' },
        { label: 'Pending Regularizations', sub: `${get('review_exceptions')?.pendingCount ?? 0} pending`,                          ok: (get('review_exceptions')?.pendingCount ?? 0) === 0, emoji: '⚠' },
        { label: 'Salary Holds',          sub: `${get('salary_holds')?.pendingCount ?? 0} employees on hold`,                       ok: (get('salary_holds')?.pendingCount ?? 0) === 0, emoji: '🔒' },
        { label: 'Loan EMI Schedules',    sub: 'All active and verified',                                                          ok: get('loan_adjustments')?.status === 'COMPLETE', emoji: '🏛' },
        { label: 'Reimbursement Claims',  sub: `${get('one_time_adjustments')?.pendingCount ?? 0} pending review`,                  ok: (get('one_time_adjustments')?.pendingCount ?? 0) === 0, emoji: '🧾' },
    ];

    const pendingItems = acts
        .filter(a => a.status === 'BLOCKED' || (a.status === 'PENDING' && (a.pendingCount ?? 0) > 0))
        .slice(0, 4);

    const periodLabel = `${MONTHS[checklist.run.month]} ${checklist.run.year} Payroll`;
    const monthStart = new Date(checklist.run.year, checklist.run.month - 1, 1).toISOString();
    const monthEnd = new Date(checklist.run.year, checklist.run.month, 0).toISOString();
    const payDate = new Date(checklist.run.year, checklist.run.month, 5).toISOString();

    const DOCUMENTS = [
        { label: 'Attendance Summary',      emoji: '🗓', to: '/company/hr/attendance' },
        { label: 'Leave Summary',           emoji: '📅', to: '/company/hr/my-leave' },
        { label: 'Pending Regularizations', emoji: '⚠', to: '/company/hr/attendance-overrides' },
        { label: 'Reimbursement Claims',    emoji: '🧾', to: '/company/hr/expenses' },
        { label: 'Salary Revision Report',  emoji: '📊', to: '/company/hr/salary-revisions' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Phase B — Pre-Run" onMenuPress={toggle} subtitle="Every Payroll Cycle" />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-primary-600">Pre-Run Activities</Text>
                    <Text className="mt-1 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Complete all pre-run activities to ensure accurate and smooth payroll execution.
                    </Text>
                </Animated.View>

                {/* Progress + Stats */}
                <Animated.View entering={FadeInDown.delay(60).duration(360)} style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">Pre-Run Progress</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
                        <ProgressRing completed={completed} total={total} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <CountRow color={colors.success[500]} label="Completed"   value={counts.complete} />
                            <CountRow color={colors.warning[500]} label="In Progress" value={counts.inProgress} />
                            <CountRow color={colors.danger[500]}  label="Issues"      value={counts.issues} />
                            <CountRow color={colors.neutral[400]} label="Pending"     value={counts.pending} />
                        </View>
                    </View>
                </Animated.View>

                {/* Payroll Period card */}
                <Animated.View entering={FadeInDown.delay(120).duration(360)} style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.miniIcon, { backgroundColor: colors.info[50] }]}>
                                <Text style={{ color: colors.info[600] }}>📅</Text>
                            </View>
                            <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">Payroll Period</Text>
                        </View>
                        <Pressable onPress={() => router.push(`/company/hr/payroll-c-step-1?runId=${checklist.run.id}` as any)}>
                            <Text style={styles.actionText}>✎ Edit Period</Text>
                        </Pressable>
                    </View>
                    <Text className="mt-2 font-inter text-[18px] font-bold text-neutral-900">{periodLabel}</Text>
                    <Text className="mt-1 font-inter text-[12.5px] text-neutral-600">
                        {fmt.date(monthStart)} – {fmt.date(monthEnd)}
                    </Text>
                    <Text className="mt-1 font-inter text-[12px] text-neutral-500">
                        Pay Date (Tentative): <Text className="font-inter font-bold text-neutral-700">{fmt.date(payDate)}</Text>
                    </Text>
                </Animated.View>

                {/* Key Stats */}
                <Animated.View entering={FadeInDown.delay(180).duration(360)} style={[styles.heroCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <View style={[styles.miniIcon, { backgroundColor: colors.accent[50] }]}>
                            <Text style={{ color: colors.accent[600] }}>📊</Text>
                        </View>
                        <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">Key Stats</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <KeyStat label="Total Employees" value={checklist.keyStats.totalEmployees} />
                        <KeyStat label="Active"          value={checklist.run.employeeCount || checklist.keyStats.totalEmployees} />
                        <KeyStat label="New Joiners"     value={checklist.keyStats.newJoiners} color={colors.success[600]} />
                        <KeyStat label="Exits"           value={checklist.keyStats.exits}      color={colors.danger[600]} />
                    </View>
                </Animated.View>

                {/* Checklist */}
                <View style={{ marginTop: 20, marginBottom: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text className="font-inter text-[15px] font-bold text-neutral-900">
                        Pre-Run Checklist <Text className="font-inter text-neutral-500 font-semibold">({total})</Text>
                    </Text>
                </View>

                {acts.map((a, idx) => {
                    const meta = ACTIVITY_META[a.id] ?? { emoji: '⚙️', iconTintBg: colors.neutral[100], iconTintFg: colors.neutral[700], estMin: 15, ownerRole: 'HR' };
                    return <ActivityCard key={a.id} activity={a} meta={meta} index={idx} runId={checklist.run.id} />;
                })}

                {/* Holds alert */}
                {blockingHolds && (
                    <View style={styles.holdAlert}>
                        <Text style={{ fontFamily: 'Inter', flex: 1, fontSize: 12.5, color: colors.danger[700], fontWeight: '600' }}>
                            ⚠ {blockingHolds.pendingCount} employee{(blockingHolds.pendingCount ?? 0) !== 1 ? 's are' : ' is'} on salary hold. Resolve before proceeding.
                        </Text>
                        <Pressable
                            onPress={() => router.push('/company/hr/salary-holds' as any)}
                            style={styles.reviewHoldsBtn}
                        >
                            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.danger[700] }}>Review Holds ›</Text>
                        </Pressable>
                    </View>
                )}

                {/* Health check */}
                <View style={[styles.infoCard, { marginTop: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text className="font-inter text-[14px] font-bold text-neutral-900">Pre-Run Health Check</Text>
                        <Pressable onPress={() => refetch()}>
                            <Text style={styles.actionText}>⟳ Refresh</Text>
                        </Pressable>
                    </View>
                    {healthChecks.map(h => (
                        <View key={h.label} style={styles.healthRow}>
                            <View style={[styles.healthIcon, { backgroundColor: h.ok ? colors.success[50] : colors.danger[50] }]}>
                                <Text style={{ color: h.ok ? colors.success[600] : colors.danger[600] }}>{h.emoji}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-[12.5px] font-semibold text-neutral-800">{h.label}</Text>
                                <Text className="font-inter text-[11px] text-neutral-500">{h.sub}</Text>
                            </View>
                            <Text style={{ color: h.ok ? colors.success[700] : colors.danger[700], fontWeight: '700' }}>{h.ok ? '✓' : '✕'}</Text>
                        </View>
                    ))}
                </View>

                {/* Pending Items */}
                <View style={[styles.infoCard, { marginTop: 12 }]}>
                    <Text className="mb-3 font-inter text-[14px] font-bold text-neutral-900">Pending Items Requiring Attention</Text>
                    {pendingItems.length === 0 ? (
                        <Text className="font-inter text-[12px] text-neutral-500">No pending items 🎉</Text>
                    ) : (
                        pendingItems.map(p => {
                            const tint = p.priority === 'HIGH' ? colors.danger[600] : p.priority === 'MEDIUM' ? colors.warning[600] : colors.neutral[500];
                            const iconBg = p.priority === 'HIGH' ? colors.danger[50] : p.priority === 'MEDIUM' ? colors.warning[50] : colors.neutral[100];
                            return (
                                <View key={p.id} style={styles.pendingRow}>
                                    <View style={[styles.healthIcon, { backgroundColor: iconBg }]}>
                                        <Text style={{ color: tint }}>⚠</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-[12.5px] font-semibold text-neutral-800">{p.name}</Text>
                                        <Text className="font-inter text-[11px] text-neutral-500">{p.blockerReason || (p.pendingCount != null ? `${p.pendingCount} pending` : 'Needs attention')}</Text>
                                    </View>
                                    <Text style={{ color: tint, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{p.priority}</Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Documents */}
                <View style={[styles.infoCard, { marginTop: 12 }]}>
                    <Text className="mb-3 font-inter text-[14px] font-bold text-neutral-900">Documents & Reports</Text>
                    {DOCUMENTS.map(d => (
                        <Pressable
                            key={d.label}
                            onPress={() => router.push(d.to as any)}
                            style={({ pressed }) => [styles.quickLink, pressed && { backgroundColor: colors.neutral[100] }]}
                        >
                            <Text style={styles.quickLinkText}>
                                <Text style={{ color: colors.primary[500] }}>{d.emoji}  </Text>
                                {d.label} – {MONTHS[checklist.run.month]!.slice(0, 3)} {checklist.run.year}
                            </Text>
                            <Text style={{ color: colors.neutral[400], fontSize: 14 }}>›</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Need Help */}
                <LinearGradient
                    colors={[colors.primary[600], colors.primary[700], colors.accent[700]] as const}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.helpCard, { marginTop: 12 }]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={styles.helpIcon}>
                            <Text style={{ fontSize: 16 }}>🎧</Text>
                        </View>
                        <Text className="font-inter text-[14px] font-bold text-white">Need Help?</Text>
                    </View>
                    <Text className="mb-3 font-inter text-[12.5px] text-white/80">Contact Payroll Support Team</Text>
                    <Pressable onPress={() => Linking.openURL('mailto:payroll.support@avyerp.com')} style={styles.helpLine}>
                        <Text style={styles.helpLineText}>✉  payroll.support@avyerp.com</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL('tel:+91 9019189889')} style={styles.helpLine}>
                        <Text style={styles.helpLineText}>📞  +91 9019189889</Text>
                    </Pressable>
                </LinearGradient>
            </ScrollView>

            {/* Sticky bottom bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.bottomStatus}>
                    {allReady ? (
                        <>
                            <Text style={{ color: colors.success[600], fontSize: 14 }}>✓</Text>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">All complete. Ready to proceed.</Text>
                        </>
                    ) : blockingIssues.length > 0 ? (
                        <>
                            <Text style={{ color: colors.neutral[500], fontSize: 14 }}>🔒</Text>
                            <Text className="font-inter text-[12px] font-semibold text-neutral-700">
                                {blockingIssues.length} blocking item{blockingIssues.length === 1 ? '' : 's'} need attention
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={{ color: colors.neutral[500], fontSize: 14 }}>⏱</Text>
                            <Text className="font-inter text-[12px] font-semibold text-neutral-700">
                                {total - completed} of {total} remaining
                            </Text>
                        </>
                    )}
                </View>
                <Pressable
                    disabled={!allReady}
                    onPress={() => router.push(`/company/hr/payroll-c-step-1?runId=${checklist.run.id}` as any)}
                    style={[styles.bottomCta, !allReady && { opacity: 0.5 }]}
                >
                    {allReady ? (
                        <LinearGradient
                            colors={[colors.primary[600], colors.accent[600]] as const}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.neutral[200] }]} />
                    )}
                    <Text className="font-inter text-[13px] font-bold" style={{ color: allReady ? colors.white : colors.neutral[500] }}>
                        {allReady ? 'Proceed to Wizard' : 'Resolve to enable'}  ›
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Small atoms                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function CountRow({ color, label, value }: { color: string; label: string; value: number }) {
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

function KeyStat({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <View style={{ width: '50%', paddingVertical: 6 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: color ?? colors.neutral[900], lineHeight: 26 }}>{value}</Text>
            <Text className="mt-1 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    heroCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    miniIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    actCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginTop: 10,
        gap: 10,
    },
    actHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    priorityCol: { width: 52, alignItems: 'flex-start' },
    actIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    actEmoji: { fontSize: 17, fontWeight: '700' },
    actMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    pillText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
    timeChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: colors.neutral[100],
    },
    timeChipText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.neutral[700] },
    actFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    actionText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.primary[600] },
    blockerBanner: {
        backgroundColor: colors.danger[50],
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    infoCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    healthIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    quickLinkText: { fontFamily: 'Inter', fontSize: 12.5, color: colors.neutral[700] },
    helpCard: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    helpIcon: {
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpLine: { paddingVertical: 4 },
    helpLineText: { fontFamily: 'Inter', fontSize: 12.5, color: colors.white },
    holdAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.danger[50],
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    reviewHoldsBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    bottomBar: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderTopWidth: 1,
        borderTopColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    bottomStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    bottomCta: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        overflow: 'hidden',
        minWidth: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default PhaseBPreRunScreen;
