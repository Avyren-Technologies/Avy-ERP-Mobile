import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePreRunChecklist } from '@/features/company-admin/api/use-payroll-phases-queries';
import { usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';
import { useIsDark } from '@/hooks/use-is-dark';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ACTIVITY_META: Record<string, { emoji: string; owner: string }> = {
  verify_attendance:     { emoji: '⏰', owner: 'Attendance Lead' },
  pending_approvals:     { emoji: '📋', owner: 'HR Manager' },
  salary_revisions:      { emoji: '📈', owner: 'Payroll Officer' },
  one_time_adjustments:  { emoji: '✏️', owner: 'Payroll Officer' },
  review_exceptions:     { emoji: '⚠️', owner: 'Payroll Officer' },
  statutory_compliance:  { emoji: '🛡️', owner: 'Finance Lead' },
  new_joiners_exits:     { emoji: '👥', owner: 'HR Admin' },
  loan_adjustments:      { emoji: '🏦', owner: 'Finance Lead' },
  salary_holds:          { emoji: '⏸', owner: 'Payroll Officer' },
  payroll_readiness:     { emoji: '✓', owner: 'Payroll Manager' },
};

// ── Progress Ring ─────────────────────────────────────────────────────────
function ProgressRing({ completed, total, size = 130 }: { completed: number; total: number; size?: number }) {
  const isDark = useIsDark();
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringgrad-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary[500]} />
            <Stop offset="100%" stopColor={colors.accent[500]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? colors.charcoal[800] : colors.neutral[100]} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#ringgrad-b)" strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={offset} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text className="text-2xl font-inter font-bold text-gray-900 dark:text-white">{completed}/{total}</Text>
        <Text className="text-[10px] uppercase font-inter font-semibold tracking-widest text-gray-400 mt-1">Pre-Run</Text>
      </View>
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ count, label, tone, emoji }: { count: number; label: string; tone: 'green' | 'amber' | 'gray'; emoji: string }) {
  const isDark = useIsDark();
  const palette = {
    green: { bg: isDark ? 'rgba(16,185,129,0.12)' : colors.success[50],  border: isDark ? 'rgba(16,185,129,0.3)' : colors.success[200],  iconBg: isDark ? 'rgba(16,185,129,0.2)' : colors.success[100],  text: colors.success[700],  label: colors.success[600] },
    amber: { bg: isDark ? 'rgba(245,158,11,0.12)' : colors.warning[50],  border: isDark ? 'rgba(245,158,11,0.3)' : colors.warning[200],  iconBg: isDark ? 'rgba(245,158,11,0.2)' : colors.warning[100],  text: colors.warning[700],  label: colors.warning[600] },
    gray:  { bg: isDark ? colors.charcoal[850]     : colors.neutral[50],  border: isDark ? colors.charcoal[800]    : colors.neutral[200],  iconBg: isDark ? colors.charcoal[800]    : colors.neutral[100],  text: isDark ? colors.neutral[300] : colors.neutral[700], label: isDark ? colors.neutral[400] : colors.neutral[500] },
  }[tone];

  return (
    <View style={[styles.statCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: palette.iconBg }]}>
        <Text style={{ fontSize: 13 }}>{emoji}</Text>
      </View>
      <Text className="text-xl font-inter font-bold" style={{ color: palette.text, marginTop: 4 }}>{count}</Text>
      <Text className="text-[9px] uppercase font-inter font-semibold tracking-wider" style={{ color: palette.label, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ── KPI Tile ──────────────────────────────────────────────────────────────
function KPITile({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string | number; sub?: string; color: string }) {
  const isDark = useIsDark();
  const tints: Record<string, { bg: string; border: string; iconBg: string }> = {
    indigo:  { bg: isDark ? 'rgba(99,102,241,0.10)' : colors.primary[50], border: isDark ? 'rgba(99,102,241,0.25)' : colors.primary[200], iconBg: isDark ? 'rgba(99,102,241,0.20)' : colors.primary[100] },
    emerald: { bg: isDark ? 'rgba(16,185,129,0.10)' : colors.success[50], border: isDark ? 'rgba(16,185,129,0.25)' : colors.success[200], iconBg: isDark ? 'rgba(16,185,129,0.20)' : colors.success[100] },
    violet:  { bg: isDark ? 'rgba(139,92,246,0.10)' : colors.accent[50],  border: isDark ? 'rgba(139,92,246,0.25)' : colors.accent[200],  iconBg: isDark ? 'rgba(139,92,246,0.20)' : colors.accent[100] },
    rose:    { bg: isDark ? 'rgba(244,63,94,0.10)'  : colors.danger[50],  border: isDark ? 'rgba(244,63,94,0.25)'  : colors.danger[200],  iconBg: isDark ? 'rgba(244,63,94,0.20)'  : colors.danger[100] },
  };
  const t = tints[color] ?? tints.indigo;
  return (
    <View style={[styles.kpiTile, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: t.iconBg }]}>
        <Text style={{ fontSize: 13 }}>{emoji}</Text>
      </View>
      <Text className="text-xl font-inter font-bold text-gray-900 dark:text-white" style={{ marginTop: 8 }}>{value}</Text>
      <Text className="text-[10px] font-inter font-semibold text-gray-600 dark:text-gray-400 mt-1">{label}</Text>
      {sub && <Text className="text-[9px] font-inter text-gray-400 mt-0.5">{sub}</Text>}
    </View>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isDark = useIsDark();
  const map: Record<string, { label: string; bg: string; text: string }> = {
    COMPLETE:    { label: 'Completed',   bg: isDark ? 'rgba(16,185,129,0.18)' : colors.success[100], text: colors.success[700] },
    PENDING:     { label: 'Pending',     bg: isDark ? 'rgba(245,158,11,0.18)' : colors.warning[100], text: colors.warning[700] },
    IN_PROGRESS: { label: 'In Progress', bg: isDark ? 'rgba(14,165,233,0.18)' : colors.info[100],    text: colors.info[700] },
    BLOCKED:     { label: 'Blocked',     bg: isDark ? 'rgba(244,63,94,0.18)'  : colors.danger[100],  text: colors.danger[700] },
  };
  const c = map[status] ?? map.PENDING;
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
      <Text className="text-[10px] font-inter font-bold uppercase tracking-wider" style={{ color: c.text }}>{c.label}</Text>
    </View>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const isDark = useIsDark();
  const map: Record<string, { bg: string; text: string }> = {
    HIGH:   { bg: isDark ? 'rgba(244,63,94,0.18)' : colors.danger[100],  text: colors.danger[700] },
    MEDIUM: { bg: isDark ? 'rgba(245,158,11,0.18)' : colors.warning[100], text: colors.warning[700] },
    LOW:    { bg: isDark ? colors.charcoal[800]    : colors.neutral[100], text: isDark ? colors.neutral[400] : colors.neutral[500] },
  };
  const c = map[priority] ?? map.LOW;
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <Text className="text-[9px] font-inter font-bold uppercase tracking-wider" style={{ color: c.text }}>{priority}</Text>
    </View>
  );
}

const AVATAR_PALETTE = [colors.primary[500], colors.accent[500], colors.success[500], colors.warning[500], colors.danger[500], colors.info[500]];
function OwnerAvatar({ role }: { role: string }) {
  const initials = role.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const idx = initials.charCodeAt(0) % AVATAR_PALETTE.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: AVATAR_PALETTE[idx], alignItems: 'center', justifyContent: 'center' }}>
        <Text className="font-inter font-bold text-white" style={{ fontSize: 8 }}>{initials}</Text>
      </View>
      <Text className="text-[10px] font-inter font-medium text-gray-600 dark:text-gray-400">{role}</Text>
    </View>
  );
}

function ActivityNumber({ num, status }: { num: number; status: string }) {
  const isDark = useIsDark();
  const bg = status === 'COMPLETE'
    ? colors.success[500]
    : status === 'BLOCKED' ? colors.danger[500]
    : status === 'IN_PROGRESS' ? colors.info[500]
    : (isDark ? colors.charcoal[700] : colors.neutral[200]);
  const fg = status === 'PENDING' || !['COMPLETE','BLOCKED','IN_PROGRESS'].includes(status) ? (isDark ? colors.neutral[400] : colors.neutral[500]) : '#fff';
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {status === 'COMPLETE'
        ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
        : <Text className="font-inter font-bold" style={{ color: fg, fontSize: 11 }}>{num}</Text>
      }
    </View>
  );
}

function HealthBar({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' | 'red' }) {
  const isDark = useIsDark();
  const fill = tone === 'green' ? colors.success[500] : tone === 'amber' ? colors.warning[500] : colors.danger[500];
  const text = tone === 'green' ? colors.success[600] : tone === 'amber' ? colors.warning[600] : colors.danger[600];
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text className="text-xs font-inter font-medium text-gray-700 dark:text-gray-300">{label}</Text>
        <Text className="text-xs font-inter font-bold" style={{ color: text }}>{value}%</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? colors.charcoal[800] : colors.neutral[100], overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: fill, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export function PhaseBPreRunScreen() {
  const isDark = useIsDark();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: runsData, isLoading: runsLoading } = usePayrollRuns();
  const runs = (runsData?.data ?? []) as any[];
  const latestRun = runs.length > 0 ? runs[0] : null;
  const latestRunId = latestRun?.id ?? '';

  const { data: checklistData, isLoading: checklistLoading, refetch } = usePreRunChecklist(latestRunId);
  const checklist = checklistData?.data;

  const activities = checklist?.activities ?? [];
  const completedCount = checklist?.completedCount ?? 0;
  const totalCount = checklist?.totalCount ?? 10;
  const keyStats = checklist?.keyStats;
  const runInfo = checklist?.run;
  const allComplete = completedCount === totalCount;
  const isLoading = runsLoading || checklistLoading;

  const inProgressCount = activities.filter((a: any) => a.status === 'IN_PROGRESS').length;
  const pendingCount = activities.filter((a: any) => a.status === 'PENDING' || a.status === 'BLOCKED').length;

  if (isLoading) {
    return <View style={{ flex: 1, padding: 16 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
  }

  if (!latestRun) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text className="text-lg font-inter font-bold text-gray-900 dark:text-white mb-2">No Payroll Run Found</Text>
        <Text className="text-sm font-inter text-gray-500 dark:text-gray-400 text-center mb-4">
          Create a payroll run first to see pre-run activities.
        </Text>
        <Pressable onPress={() => router.push('/company/hr/payroll-runs' as any)} style={{ backgroundColor: colors.primary[600], paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 }}>
          <Text className="text-sm font-inter font-bold text-white">Go to Payroll Runs →</Text>
        </Pressable>
      </View>
    );
  }

  const runMonth = runInfo?.month ?? latestRun.month;
  const runYear = runInfo?.year ?? latestRun.year;
  const runLabel = `${MONTH_NAMES[runMonth]} ${runYear} Payroll`;
  const payDateMonth = runMonth === 12 ? 1 : runMonth + 1;
  const payDateYear = runMonth === 12 ? runYear + 1 : runYear;

  const compliancePct = activities.filter((a: any) => a.id === 'statutory_compliance' && a.status === 'COMPLETE').length === 1 ? 100 : 0;
  const dataPct = Math.round((activities.filter((a: any) => ['verify_attendance', 'new_joiners_exits', 'salary_holds'].includes(a.id) && a.status === 'COMPLETE').length / 3) * 100);
  const approvalsPct = Math.round((activities.filter((a: any) => ['pending_approvals', 'one_time_adjustments', 'salary_revisions'].includes(a.id) && a.status === 'COMPLETE').length / 3) * 100);

  const eligibleCount = Math.max((keyStats?.totalEmployees ?? 0) - (keyStats?.exits ?? 0), 0);
  const eligiblePct = keyStats?.totalEmployees > 0 ? Math.round((eligibleCount / keyStats.totalEmployees) * 100) : 0;

  const pendingItemsList = activities.filter((a: any) => a.status !== 'COMPLETE' && a.pendingCount != null && a.pendingCount > 0);

  const bgColor = isDark ? colors.charcoal[950] : colors.gradient.surface;
  const cardBg = isDark ? colors.charcoal[900] : '#fff';
  const borderColor = isDark ? colors.charcoal[800] : colors.neutral[200];

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text className="text-xl font-inter font-bold text-white">Phase B — Pre-Run</Text>
          <View style={{ backgroundColor: 'rgba(16,185,129,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text className="text-[10px] font-inter font-bold text-white">✨ Easy Guide</Text>
          </View>
        </View>
        <Text className="text-xs font-inter text-white/80 mt-1">Verify readiness before payroll execution</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        {/* Hero: Progress + Stats + Pay Period */}
        <Animated.View entering={FadeInDown.delay(80)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <ProgressRing completed={completedCount} total={totalCount} />
            <View style={{ flex: 1, gap: 8 }}>
              <StatCard count={completedCount} label="Completed" tone="green" emoji="✓" />
              <StatCard count={inProgressCount} label="In Progress" tone="amber" emoji="⟳" />
              <StatCard count={pendingCount} label="Pending" tone="gray" emoji="○" />
            </View>
          </View>

          {/* Pay Period Card */}
          <LinearGradient
            colors={[isDark ? 'rgba(99,102,241,0.18)' : colors.primary[50], isDark ? 'rgba(139,92,246,0.18)' : colors.accent[50]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.payPeriodCard, { borderColor: isDark ? 'rgba(99,102,241,0.3)' : colors.primary[200] }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.sectionIcon}>
                  <LinearGradient colors={[colors.primary[500], colors.accent[500]]} style={styles.sectionIconGrad}>
                    <Text style={{ fontSize: 14, color: '#fff' }}>📅</Text>
                  </LinearGradient>
                </View>
                <Text className="text-[10px] uppercase font-inter font-bold tracking-widest" style={{ color: colors.primary[600] }}>Pay Period</Text>
              </View>
              <Pressable onPress={() => router.push('/company/hr/payroll-runs' as any)}>
                <Text style={{ color: colors.primary[500], fontSize: 14 }}>✎</Text>
              </Pressable>
            </View>
            <Text className="text-xl font-inter font-bold text-gray-900 dark:text-white" style={{ marginBottom: 6 }}>{runLabel}</Text>
            <Text className="text-xs font-inter text-gray-600 dark:text-gray-400 mb-2">
              Pay Date: <Text className="font-inter font-bold text-gray-900 dark:text-white">1 {MONTH_NAMES[payDateMonth]} {payDateYear}</Text>
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(99,102,241,0.25)' : colors.primary[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text className="text-[10px] font-inter font-bold uppercase tracking-wider" style={{ color: colors.primary[700] }}>
                {runInfo?.status ?? latestRun.status}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* KPI Tiles */}
        <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <KPITile emoji="👥" label="Total Employees" value={keyStats?.totalEmployees ?? '—'} color="indigo" />
          <KPITile emoji="✓" label="Eligible" value={eligibleCount} sub={`${eligiblePct}% of total`} color="emerald" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200)} style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <KPITile emoji="➕" label="New Joiners" value={keyStats?.newJoiners ?? 0} sub="This month" color="violet" />
          <KPITile emoji="➖" label="Exits" value={keyStats?.exits ?? 0} sub="This month" color="rose" />
        </Animated.View>

        {/* Checklist */}
        <Animated.View entering={FadeInDown.delay(250)} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 0 }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100] }]}>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">
              Pre-Run Checklist <Text className="text-gray-400 font-inter">({totalCount})</Text>
            </Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Text className="text-[10px] font-inter font-semibold text-gray-500 dark:text-gray-400">↻ Refresh</Text>
            </Pressable>
          </View>

          {activities.map((act: any, i: number) => {
            const meta = ACTIVITY_META[act.id] ?? { emoji: '○', owner: 'Admin' };
            const isLast = i === activities.length - 1;
            return (
              <Animated.View
                key={act.id}
                entering={FadeInDown.delay(300 + i * 30)}
                style={{ paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100] }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <ActivityNumber num={act.activityNumber} status={act.status} />
                  <View style={[styles.stepIconWrap, { backgroundColor: isDark ? colors.charcoal[850] : colors.neutral[50] }]}>
                    <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text className="text-sm font-inter font-semibold text-gray-900 dark:text-white">{act.name}</Text>
                      {act.pendingCount != null && act.pendingCount > 0 && act.status !== 'COMPLETE' && (
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger[500], alignItems: 'center', justifyContent: 'center' }}>
                          <Text className="font-inter font-bold text-white" style={{ fontSize: 9 }}>{act.pendingCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs font-inter text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={2}>{act.description}</Text>
                    <View style={{ marginTop: 8 }}>
                      <OwnerAvatar role={meta.owner} />
                    </View>
                    {act.blockerReason && (
                      <Text className="text-[10px] font-inter mt-1.5" style={{ color: colors.danger[600] }}>⚠ {act.blockerReason}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <PriorityPill priority={act.priority} />
                    <StatusBadge status={act.status} />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Health Check */}
        <Animated.View entering={FadeInDown.delay(550)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={styles.sectionIcon}>
              <LinearGradient colors={[colors.success[500], colors.success[600]]} style={styles.sectionIconGrad}>
                <Text style={{ fontSize: 14, color: '#fff' }}>♥</Text>
              </LinearGradient>
            </View>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">Pre-Run Health Check</Text>
          </View>
          <HealthBar label="Compliance" value={compliancePct} tone={compliancePct >= 90 ? 'green' : compliancePct >= 60 ? 'amber' : 'red'} />
          <HealthBar label="Data Quality" value={dataPct} tone={dataPct >= 90 ? 'green' : dataPct >= 60 ? 'amber' : 'red'} />
          <HealthBar label="Approvals" value={approvalsPct} tone={approvalsPct >= 90 ? 'green' : approvalsPct >= 60 ? 'amber' : 'red'} />
        </Animated.View>

        {/* Pending Items */}
        {pendingItemsList.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={styles.sectionIcon}>
                <LinearGradient colors={[colors.warning[500], '#F97316']} style={styles.sectionIconGrad}>
                  <Text style={{ fontSize: 14, color: '#fff' }}>⚠</Text>
                </LinearGradient>
              </View>
              <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">Pending Items</Text>
            </View>
            {pendingItemsList.map((item: any) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                <Text className="text-xs font-inter text-gray-700 dark:text-gray-300 flex-1" numberOfLines={1}>{item.name}</Text>
                <View style={{ minWidth: 24, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: isDark ? 'rgba(244,63,94,0.2)' : colors.danger[100], alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                  <Text className="text-[10px] font-inter font-bold" style={{ color: colors.danger[700] }}>{item.pendingCount}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Documents & Reports */}
        <Animated.View entering={FadeInDown.delay(650)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={styles.sectionIcon}>
              <LinearGradient colors={[colors.accent[500], '#D946EF']} style={styles.sectionIconGrad}>
                <Text style={{ fontSize: 14, color: '#fff' }}>📑</Text>
              </LinearGradient>
            </View>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">Documents & Reports</Text>
          </View>
          {[
            { label: 'Salary Register',    emoji: '📄', path: '/company/hr/payroll-reports' },
            { label: 'Variance Report',    emoji: '📈', path: '/company/hr/payroll-reports' },
            { label: 'PF / ESI Statement', emoji: '🛡️', path: '/company/hr/statutory-filings' },
            { label: 'Bank File Preview',  emoji: '🏦', path: '/company/hr/payroll-reports' },
          ].map((d, i, arr) => (
            <Pressable
              key={d.label}
              onPress={() => router.push(d.path as any)}
              style={[styles.quickLink, { borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100], borderBottomWidth: i === arr.length - 1 ? 0 : 1 }]}
            >
              <Text style={{ fontSize: 14, width: 22 }}>{d.emoji}</Text>
              <Text className="text-sm font-inter font-medium text-gray-700 dark:text-gray-300 flex-1">{d.label}</Text>
              <Text className="text-gray-400">›</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Need Help */}
        <Animated.View entering={FadeInDown.delay(700)}>
          <LinearGradient
            colors={[colors.primary[500], colors.accent[600]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.card, { borderWidth: 0, padding: 18 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#fff' }}>?</Text>
              </View>
              <Text className="text-base font-inter font-bold text-white">Need Help?</Text>
            </View>
            <Text className="text-xs font-inter text-white/85 mb-3 leading-5">
              Stuck on a pre-run check? Our payroll specialists are one call away.
            </Text>
            <Pressable onPress={() => Linking.openURL('tel:+918045671234')} style={styles.contactBtn}>
              <Text className="text-sm font-inter font-bold text-white">📞 +91 80 4567 1234</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL('mailto:support@avyrentechnologies.com')} style={[styles.contactBtn, { marginTop: 6 }]}>
              <Text className="text-sm font-inter font-bold text-white">✉ Email Support</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, {
        backgroundColor: allComplete ? (isDark ? 'rgba(16,185,129,0.12)' : colors.success[50]) : (isDark ? 'rgba(99,102,241,0.12)' : colors.primary[50]),
        borderTopColor: allComplete ? colors.success[200] : colors.primary[200],
        paddingBottom: insets.bottom + 8,
      }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text className="text-xs font-inter font-bold" style={{ color: allComplete ? colors.success[700] : colors.primary[700] }}>
            {allComplete ? 'All checks passed!' : `${totalCount - completedCount} remaining`}
          </Text>
          <Text className="text-[10px] font-inter mt-0.5" style={{ color: allComplete ? colors.success[600] : colors.primary[600] }}>
            {allComplete ? 'Ready for payroll execution.' : 'Complete to unlock execution.'}
          </Text>
        </View>
        <Pressable
          disabled={!allComplete}
          onPress={() => router.push('/company/hr/payroll-runs' as any)}
          style={{
            backgroundColor: allComplete ? colors.primary[600] : (isDark ? colors.charcoal[700] : colors.neutral[200]),
            paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
          }}
        >
          <Text className="text-sm font-inter font-bold" style={{ color: allComplete ? '#fff' : (isDark ? colors.neutral[500] : colors.neutral[400]) }}>
            Phase C →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { paddingBottom: 16, paddingHorizontal: 16 },
  card:          { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader:    { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, gap: 8 },
  statIconWrap:  { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payPeriodCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 14 },
  kpiTile:       { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  kpiIconWrap:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stepIconWrap:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionIcon:   { width: 32, height: 32, borderRadius: 10, overflow: 'hidden' },
  sectionIconGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  quickLink:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  contactBtn:    { backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  bottomBar:     { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center' },
});
