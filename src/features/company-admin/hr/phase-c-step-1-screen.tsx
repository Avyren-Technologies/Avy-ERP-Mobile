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
    usePayrollAttendanceDetail,
    usePayrollAttendanceSummary,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import { useLockAttendance } from '@/features/company-admin/api/use-payroll-run-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STEP_LABELS = [
    { num: 1, label: 'Lock Attendance',    desc: 'Freeze attendance' },
    { num: 2, label: 'Review Exceptions',  desc: 'Resolve issues' },
    { num: 3, label: 'Compute Salaries',   desc: 'Preview & lock' },
    { num: 4, label: 'Statutory',          desc: 'PF, ESI, PT, TDS' },
    { num: 5, label: 'Approve',            desc: 'Manager / Finance' },
    { num: 6, label: 'Disburse',           desc: 'Disburse & archive' },
];

type AttendanceRow = {
    employeeId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string | null;
    workingDays: number;
    present: number;
    lop: number;
    otHours: number;
    status: 'OK' | 'HAS_ISSUES' | 'NO_DATA';
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperRow}>
            {STEP_LABELS.map((s, i) => {
                const isCurrent = s.num === current;
                const isDone = s.num < current;
                return (
                    <View key={s.num} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.stepCard, isCurrent && styles.stepCardCurrent, isDone && styles.stepCardDone]}>
                            <View style={[
                                styles.stepBadge,
                                {
                                    backgroundColor: isCurrent ? colors.primary[600] : isDone ? colors.success[600] : colors.neutral[200],
                                },
                            ]}>
                                <Text style={{ color: isCurrent || isDone ? colors.white : colors.neutral[600], fontWeight: '800', fontSize: 12 }}>
                                    {s.num}
                                </Text>
                            </View>
                            <View style={{ marginLeft: 8 }}>
                                <Text className="font-inter text-[12px] font-bold" style={{ color: isCurrent ? colors.primary[800] : isDone ? colors.success[700] : colors.neutral[700] }}>
                                    {s.label}
                                </Text>
                                <Text className="font-inter text-[10px]" style={{ color: colors.neutral[500] }}>{s.desc}</Text>
                            </View>
                        </View>
                        {i < STEP_LABELS.length - 1 && (
                            <Text style={{ color: colors.neutral[300], marginHorizontal: 4 }}>···</Text>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

function StatTile({
    label, value, sub, tint = 'primary',
}: { label: string; value: string | number; sub?: string; tint?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' }) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
    } as const;
    const t = tintMap[tint];
    return (
        <View style={styles.statTile}>
            <View style={[styles.statDot, { backgroundColor: t.bg }]}><View style={[styles.statDotInner, { backgroundColor: t.fg }]} /></View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[18px] font-extrabold text-neutral-900" style={{ lineHeight: 22 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

function LockDonut({ ready, override, notReady }: { ready: number; override: number; notReady: number }) {
    const total = ready + override + notReady;
    const safeTotal = total || 1;
    const size = 130;
    const sw = 10;
    const radius = (size - sw) / 2;
    const circ = 2 * Math.PI * radius;
    const readyLen = (ready / safeTotal) * circ;
    const overrideLen = (override / safeTotal) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id="lock-ring" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={colors.success[500]} />
                        <Stop offset="100%" stopColor={colors.success[700]} />
                    </SvgGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={sw} fill="none" />
                {total > 0 && (
                    <>
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.success[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${readyLen} ${circ - readyLen}`} strokeDashoffset={0} />
                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.warning[500]} strokeWidth={sw} fill="none"
                            strokeDasharray={`${overrideLen} ${circ - overrideLen}`} strokeDashoffset={-readyLen} />
                    </>
                )}
            </Svg>
            <Text className="font-inter text-[20px] font-extrabold text-neutral-900">{ready}</Text>
            <Text className="font-inter text-[10px] font-bold text-neutral-500" style={{ letterSpacing: 0.5 }}>
                {total > 0 ? `(${((ready / total) * 100).toFixed(1)}%)` : '—'}
            </Text>
            <Text className="font-inter text-[10px] text-neutral-500">Ready</Text>
        </View>
    );
}

function StatusBadge({ status }: { status: 'OK' | 'HAS_ISSUES' | 'NO_DATA' }) {
    const map = {
        OK:          { bg: colors.success[50], fg: colors.success[700], label: 'Ready' },
        HAS_ISSUES:  { bg: colors.danger[50],  fg: colors.danger[700],  label: 'Issues' },
        NO_DATA:     { bg: colors.neutral[100], fg: colors.neutral[600], label: 'No Data' },
    } as const;
    const t = map[status];
    return (
        <View style={[styles.pill, { backgroundColor: t.bg }]}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: t.fg }}>{t.label}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep1Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    const [searchInput, setSearchInput] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const limit = 10;

    React.useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    /* Resolve a runId — explicit or latest pre-execution
       payrollRunApi.* returns the API envelope — extract `.data` here. */
    const { data: runsResp, isLoading: runsLoading } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);

    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const preExec = runsList.find(r => ['DRAFT', 'ATTENDANCE_LOCKED', 'EXCEPTIONS_REVIEWED', 'COMPUTED', 'STATUTORY_DONE'].includes(r.status));
        if (preExec) return preExec.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: summaryResp, isLoading: summaryLoading, isRefetching: summaryRefetching, refetch: refetchSummary } = usePayrollAttendanceSummary(inferredRunId);
    const summary: any = (summaryResp as any)?.data ?? null;

    const { data: detailResp, isLoading: detailLoading, isFetching: detailFetching, refetch: refetchDetail } =
        usePayrollAttendanceDetail(inferredRunId, { page, limit, search: search || undefined });
    const detail: any = (detailResp as any)?.data ?? null;

    const lockMutation = useLockAttendance();
    const confirmModal = useConfirmModal();

    const employees: AttendanceRow[] = detail?.employees ?? [];
    const total = detail?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const overridePending = summary?.overrideSummary?.pending ?? 0;
    const overrideApproved = summary?.overrideSummary?.approved ?? 0;
    const overrideRejected = summary?.overrideSummary?.rejected ?? 0;
    const overrideTotal = summary?.overrideSummary?.total ?? (overridePending + overrideApproved + overrideRejected);
    const totalActive = summary?.headcount?.totalActive ?? 0;
    const withSalary = summary?.headcount?.withSalary ?? 0;
    const attendancePresent = summary?.attendance?.employeesWithAttendance ?? 0;
    const totalLOP = summary?.attendance?.lop ?? 0;
    const presentPercent = withSalary > 0 ? ((attendancePresent / withSalary) * 100).toFixed(2) : '0.00';

    const month = runDetail?.month;
    const year = runDetail?.year;
    const monthStart = month && year ? new Date(year, month - 1, 1) : null;
    const monthEnd = month && year ? new Date(year, month, 0) : null;
    const lockedBy = runDetail?.lockedBy;
    const lockedAt = runDetail?.lockedAt;
    const isAlreadyLocked = runDetail?.status && runDetail.status !== 'DRAFT';

    const counts = React.useMemo(() => {
        const c = { ready: 0, notReady: 0 };
        employees.forEach(e => {
            if (e.status === 'OK') c.ready++;
            else c.notReady++;
        });
        return c;
    }, [employees]);

    const vs = summary?.vsLastMonth;
    const currentTotalLOP = vs?.currentTotalLOP ?? totalLOP;
    const previousTotalLOP = vs?.previousTotalLOP ?? 0;
    const lopDelta = currentTotalLOP - previousTotalLOP;
    const lopPct = previousTotalLOP > 0 ? ((lopDelta / previousTotalLOP) * 100) : 0;
    const presentDelta = vs ? (vs.currentAvgPresent - vs.previousAvgPresent) : 0;
    const presentPct = vs?.changePercent ?? 0;

    /* Empty + Loading states */
    if (!runsLoading && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase C — Step 1" onMenuPress={toggle} subtitle="Lock Attendance" />
                <EmptyState
                    icon="inbox"
                    title="No payroll runs yet"
                    message="Create a payroll run before locking attendance."
                    action={{ label: 'Open Payroll Wizard', onPress: () => router.push('/company/hr/payroll-runs' as any) }}
                />
            </View>
        );
    }
    if (runsLoading || (!summary && summaryLoading)) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase C — Step 1" onMenuPress={toggle} subtitle="Lock Attendance" />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    const handleLock = () => {
        confirmModal.show({
            title: 'Lock Attendance?',
            message: 'Once locked, no further changes can be made unless unlocked by an authorized approver. Proceed?',
            confirmText: 'Lock Attendance',
            onConfirm: () => {
                lockMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchDetail(); },
                });
            },
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Phase C — Step 1" onMenuPress={toggle} subtitle="Lock Attendance" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={summaryRefetching} onRefresh={() => { refetchSummary(); refetchDetail(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stepper */}
                <View style={styles.heroCard}>
                    <Text className="mb-2 font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Phase C — 6-Step Wizard</Text>
                    <StepIndicator current={isAlreadyLocked ? 2 : 1} />
                </View>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(360)} style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 1 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Lock Attendance</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Freeze attendance for the selected payroll period. Once locked, no further changes
                        will be allowed unless unlocked by an authorized approver.
                    </Text>

                    <View style={styles.metaGrid}>
                        <MetaPill emoji="📅" label="Payroll Period" value={monthStart && monthEnd ? `${fmt.date(monthStart.toISOString())} – ${fmt.date(monthEnd.toISOString())}` : '—'} />
                        <MetaPill emoji="⏰" label="Cut-off" value={monthEnd ? fmt.date(monthEnd.toISOString()) : '—'} />
                        <MetaPill emoji="🧮" label="LOP Method" value="÷ Working Days" />
                        <MetaPill emoji="✓" label="Pro-rata" value="Enabled" />
                    </View>
                </Animated.View>

                {/* KPI grid */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees"   value={totalActive}    sub="Active" tint="primary" />
                    <StatTile label="Attendance Avail." value={`${attendancePresent}`} sub={`${presentPercent}%`} tint="success" />
                    <StatTile label="Manual Overrides"  value={overrideTotal}  sub={overridePending > 0 ? `${overridePending} pending` : 'All approved'} tint="warning" />
                    <StatTile label="LOP Days"          value={totalLOP.toFixed(1)} sub="Total" tint="danger" />
                    <StatTile label="Locked By"         value={isAlreadyLocked && lockedBy ? String(lockedBy).slice(0, 12) : '—'} sub={isAlreadyLocked ? 'See log' : 'Not yet'} tint="info" />
                    <StatTile label="Locked On"         value={isAlreadyLocked && lockedAt ? fmt.date(lockedAt) : '—'} sub={isAlreadyLocked && lockedAt ? fmt.time(lockedAt) : 'Not yet'} tint="accent" />
                </View>

                {/* Lock summary donut */}
                <Animated.View entering={FadeInDown.delay(60).duration(360)} style={[styles.heroCard, { marginTop: 16 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Attendance Lock Summary</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <LockDonut ready={counts.ready} override={overridePending} notReady={counts.notReady} />
                        <View style={{ flex: 1, gap: 8 }}>
                            <LegendRow color={colors.success[500]} label="Ready to Lock"          value={counts.ready} />
                            <LegendRow color={colors.warning[500]} label="Overrides Pending"      value={overridePending} />
                            <LegendRow color={colors.danger[500]}  label="Not Ready"              value={counts.notReady} />
                        </View>
                    </View>
                </Animated.View>

                {/* Override Statistics */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Override Statistics</Text>
                    <OverrideRow color={colors.primary[500]} label="Total Overrides"  value={overrideTotal} />
                    <OverrideRow color={colors.success[500]} label="Approved"         value={overrideApproved} />
                    <OverrideRow color={colors.warning[500]} label="Pending Approval" value={overridePending} />
                    <OverrideRow color={colors.danger[500]}  label="Rejected"         value={overrideRejected} />
                </View>

                {/* Month vs Month */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Attendance vs Last Month</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <DeltaTile
                            label="LOP Days"
                            value={currentTotalLOP.toFixed(1)}
                            delta={lopDelta}
                            pct={lopPct}
                            prev={`vs ${prevMonthLabel(month, year)} (${previousTotalLOP.toFixed(1)})`}
                            inverse
                        />
                        <DeltaTile
                            label="Present %"
                            value={`${presentPercent}%`}
                            delta={presentDelta}
                            pct={presentPct}
                            prev={`vs ${prevMonthLabel(month, year)}`}
                        />
                    </View>
                </View>

                {/* Employee table heading + search */}
                <View style={{ marginTop: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text className="font-inter text-[15px] font-bold text-neutral-900">Employee Attendance ({total})</Text>
                </View>
                <View style={styles.searchBox}>
                    <Text style={{ color: colors.neutral[400], marginRight: 6 }}>🔍</Text>
                    <TextInput
                        value={searchInput}
                        onChangeText={setSearchInput}
                        placeholder="Search employees…"
                        placeholderTextColor={colors.neutral[400]}
                        style={styles.searchInput}
                    />
                </View>

                {/* Employee cards (using inline list — FlatList nested in ScrollView is anti-pattern; we map directly) */}
                {detailLoading && !detail ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : employees.length === 0 ? (
                    <View style={[styles.heroCard, { marginTop: 12, alignItems: 'center', paddingVertical: 24 }]}>
                        <Text style={{ fontSize: 28, marginBottom: 4 }}>🔎</Text>
                        <Text className="font-inter text-[13px] text-neutral-500">No employees found{search ? ` for "${search}"` : ''}.</Text>
                    </View>
                ) : (
                    <View style={{ marginTop: 8, gap: 8, opacity: detailFetching ? 0.7 : 1 }}>
                        {employees.map((emp) => (
                            <View key={emp.employeeId} style={styles.empCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-[13.5px] font-bold text-neutral-900" numberOfLines={1}>
                                            {emp.firstName} {emp.lastName}
                                        </Text>
                                        <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>
                                            {emp.employeeCode}{emp.department ? ` • ${emp.department}` : ''}
                                        </Text>
                                    </View>
                                    <StatusBadge status={emp.status} />
                                </View>
                                <View style={styles.empMetricsRow}>
                                    <Metric label="Working" value={emp.workingDays} />
                                    <Metric label="Present" value={emp.present} />
                                    <Metric label="LOP" value={emp.lop.toFixed(1)} accent={emp.lop > 0 ? colors.danger[600] : undefined} />
                                    <Metric label="OT (Hrs)" value={emp.otHours.toFixed(1)} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Pagination */}
                {total > 0 && (
                    <View style={styles.paginationRow}>
                        <Text className="font-inter text-[11px] text-neutral-500">
                            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <PageBtn disabled={page === 1} onPress={() => setPage(1)} label="«" />
                            <PageBtn disabled={page === 1} onPress={() => setPage(p => p - 1)} label="‹" />
                            <View style={styles.pageNumberCurrent}>
                                <Text className="font-inter text-[11px] font-bold text-white">{page}/{totalPages}</Text>
                            </View>
                            <PageBtn disabled={page === totalPages} onPress={() => setPage(p => p + 1)} label="›" />
                            <PageBtn disabled={page === totalPages} onPress={() => setPage(totalPages)} label="»" />
                        </View>
                    </View>
                )}

                {/* Warning */}
                {!isAlreadyLocked && (
                    <View style={styles.warningBanner}>
                        <Text style={{ color: colors.warning[700], fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12.5px] font-semibold text-warning-700">
                                Once locked, no changes allowed unless unlocked by an approver.
                            </Text>
                            {overridePending > 0 && (
                                <Text className="mt-1 font-inter text-[11.5px] text-warning-700">
                                    {overridePending} override(s) pending approval — review before locking.
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Sticky bottom action bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={{ flex: 1 }}>
                    {isAlreadyLocked ? (
                        <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Attendance locked</Text>
                    ) : (
                        <Text className="font-inter text-[11.5px] text-neutral-500">
                            {counts.ready}/{total} ready • {overridePending} pending overrides
                        </Text>
                    )}
                </View>
                <Pressable
                    onPress={handleLock}
                    disabled={isAlreadyLocked || lockMutation.isPending}
                    style={[styles.lockBtn, (isAlreadyLocked || lockMutation.isPending) && { opacity: 0.5 }]}
                >
                    {isAlreadyLocked ? (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.success[100] }]} />
                    ) : (
                        <LinearGradient
                            colors={[colors.primary[600], colors.accent[600]] as const}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                    <Text className="font-inter text-[13px] font-bold" style={{ color: isAlreadyLocked ? colors.success[700] : colors.white }}>
                        🔒 {isAlreadyLocked ? 'Attendance Locked' : 'Lock Attendance'}
                    </Text>
                </Pressable>
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Small atoms                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function MetaPill({ emoji, label, value }: { emoji: string; label: string; value: string }) {
    return (
        <View style={styles.metaPill}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>{emoji}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="font-inter text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
                <Text className="font-inter text-[11.5px] font-bold text-neutral-900" numberOfLines={1}>{value}</Text>
            </View>
        </View>
    );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
                <Text className="font-inter text-[11.5px] text-neutral-700" numberOfLines={1}>{label}</Text>
            </View>
            <Text className="font-inter text-[12px] font-bold text-neutral-900">{value}</Text>
        </View>
    );
}

function OverrideRow({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
                <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            </View>
            <Text className="font-inter text-[12.5px] font-bold text-neutral-900">{value}</Text>
        </View>
    );
}

function DeltaTile({
    label, value, delta, pct, prev, inverse,
}: { label: string; value: string; delta: number; pct: number; prev: string; inverse?: boolean }) {
    const up = delta >= 0;
    const positive = inverse ? !up : up;
    const tint = positive ? colors.success[600] : colors.danger[600];
    return (
        <View style={styles.deltaTile}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[16px] font-extrabold text-neutral-900">{value}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '700', color: tint }}>
                {up ? '↑' : '↓'} {up ? '+' : ''}{delta.toFixed(1)} ({pct.toFixed(1)}%)
            </Text>
            <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{prev}</Text>
        </View>
    );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: accent ?? colors.neutral[800] }}>{value}</Text>
        </View>
    );
}

function PageBtn({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[styles.pageBtn, disabled && { opacity: 0.35 }]}
        >
            <Text style={{ fontFamily: 'Inter', fontWeight: '700', color: colors.neutral[700] }}>{label}</Text>
        </Pressable>
    );
}

function prevMonthLabel(month?: number, year?: number) {
    if (!month || !year) return 'last month';
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    return `${MONTHS[pm]!.slice(0, 3)} ${py}`;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    heroCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    stepperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        minWidth: 150,
    },
    stepCardCurrent: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
    stepCardDone: { backgroundColor: colors.success[50] },
    stepBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    metaGrid: {
        marginTop: 12,
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 10,
        gap: 8,
    },
    metaPill: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: {
        width: '48%',
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    statDot: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDotInner: { width: 10, height: 10, borderRadius: 3 },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    searchBox: {
        marginTop: 4,
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
    empCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    empMetricsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    paginationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 4,
    },
    pageBtn: {
        width: 32, height: 32,
        borderRadius: 8,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageNumberCurrent: {
        height: 32,
        paddingHorizontal: 10,
        backgroundColor: colors.primary[600],
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningBanner: {
        marginTop: 16,
        backgroundColor: colors.warning[50],
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1,
        borderTopColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    lockBtn: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        overflow: 'hidden',
        minWidth: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deltaTile: {
        flex: 1,
        backgroundColor: colors.neutral[50],
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
});

export default PhaseCStep1Screen;
