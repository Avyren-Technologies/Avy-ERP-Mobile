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
import { useConfigurationStatus } from '@/features/company-admin/api/use-payroll-phases-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Step metadata ─────────────────────────────────────────────────────────
const STEP_META: Record<string, { emoji: string; ownerRole: string; estMin: number }> = {
  org_structure:       { emoji: '🏢', ownerRole: 'HR Admin',        estMin: 20 },
  salary_components:   { emoji: '💰', ownerRole: 'Payroll Officer', estMin: 15 },
  salary_structures:   { emoji: '📋', ownerRole: 'Payroll Officer', estMin: 15 },
  ctc_breakup:         { emoji: '📊', ownerRole: 'Payroll Officer', estMin: 10 },
  employee_salary:     { emoji: '👥', ownerRole: 'HR Admin',        estMin: 25 },
  pf_esi_config:       { emoji: '🛡️', ownerRole: 'Finance Lead',    estMin: 12 },
  tds_pt_config:       { emoji: '📑', ownerRole: 'Finance Lead',    estMin: 18 },
  attendance_rules:    { emoji: '⏰', ownerRole: 'HR Admin',        estMin: 10 },
  leave_types:         { emoji: '🌴', ownerRole: 'HR Admin',        estMin: 8 },
  leave_policy:        { emoji: '📅', ownerRole: 'HR Admin',        estMin: 10 },
  payroll_simulation:  { emoji: '🚀', ownerRole: 'Payroll Officer', estMin: 5 },
};

// ── Premium Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ completed, total, size = 140 }: { completed: number; total: number; size?: number }) {
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
          <SvgGradient id="ringgrad-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary[500]} />
            <Stop offset="100%" stopColor={colors.accent[500]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? colors.charcoal[800] : colors.neutral[100]} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#ringgrad-a)"
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={offset}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text className="text-3xl font-inter font-bold text-gray-900 dark:text-white">{completed}/{total}</Text>
        <Text className="text-[10px] uppercase font-inter font-semibold tracking-widest text-gray-400 mt-1">Progress</Text>
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
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
      </View>
      <Text className="text-2xl font-inter font-bold" style={{ color: palette.text, marginTop: 6 }}>{count}</Text>
      <Text className="text-[10px] uppercase font-inter font-semibold tracking-wider" style={{ color: palette.label, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isDark = useIsDark();
  const map: Record<string, { label: string; bg: string; text: string }> = {
    COMPLETE:    { label: 'Complete',    bg: isDark ? 'rgba(16,185,129,0.18)' : colors.success[100], text: colors.success[700] },
    IN_PROGRESS: { label: 'In Progress', bg: isDark ? 'rgba(245,158,11,0.18)' : colors.warning[100], text: colors.warning[700] },
    NOT_STARTED: { label: 'Not Started', bg: isDark ? colors.charcoal[800]      : colors.neutral[100], text: isDark ? colors.neutral[400] : colors.neutral[500] },
  };
  const c = map[status] ?? map.NOT_STARTED;
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text className="text-[10px] font-inter font-bold uppercase tracking-wider" style={{ color: c.text }}>{c.label}</Text>
    </View>
  );
}

// ── Step Number Badge ─────────────────────────────────────────────────────
function StepNumberBadge({ num, status }: { num: number; status: string }) {
  const isDark = useIsDark();
  const bg = status === 'COMPLETE' ? colors.success[500] : status === 'IN_PROGRESS' ? colors.warning[500] : (isDark ? colors.charcoal[700] : colors.neutral[200]);
  const fg = status === 'NOT_STARTED' ? (isDark ? colors.neutral[400] : colors.neutral[500]) : '#fff';
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {status === 'COMPLETE'
        ? <Text style={{ color: fg, fontSize: 16, fontWeight: 'bold' }}>✓</Text>
        : <Text className="font-inter font-bold" style={{ color: fg, fontSize: 12 }}>{num}</Text>
      }
    </View>
  );
}

// ── Owner Avatar ──────────────────────────────────────────────────────────
const AVATAR_PALETTE = [colors.primary[500], colors.accent[500], colors.success[500], colors.warning[500], colors.danger[500]];
function OwnerAvatar({ role }: { role: string }) {
  const initials = role.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const idx = initials.charCodeAt(0) % AVATAR_PALETTE.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: AVATAR_PALETTE[idx], alignItems: 'center', justifyContent: 'center' }}>
        <Text className="font-inter font-bold text-white" style={{ fontSize: 8 }}>{initials}</Text>
      </View>
      <Text className="text-[10px] font-inter font-medium text-gray-600 dark:text-gray-400">{role}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export function PhaseAConfigScreen() {
  const isDark = useIsDark();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fmt = useCompanyFormatter();
  const { data, isLoading, refetch } = useConfigurationStatus();
  const config = data?.data;

  const completedCount = config?.completedCount ?? 0;
  const totalCount = config?.totalCount ?? 11;
  const steps = config?.steps ?? [];
  const estimatedMin = config?.estimatedMinutesRemaining ?? 0;
  const lastActivity = config?.lastActivity;
  const allComplete = completedCount === totalCount;

  const inProgressCount = steps.filter((s: any) => s.status === 'IN_PROGRESS').length;
  const pendingCount = steps.filter((s: any) => s.status === 'NOT_STARTED').length;

  if (isLoading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  const navigateToStep = (actionUrl: string) => {
    const mobilePath = actionUrl.replace('/app/', '/');
    router.push(mobilePath as any);
  };

  const formatTime = (min: number) => {
    if (min <= 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const bgColor = isDark ? colors.charcoal[950] : colors.gradient.surface;
  const cardBg = isDark ? colors.charcoal[900] : '#fff';
  const borderColor = isDark ? colors.charcoal[800] : colors.neutral[200];

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text className="text-xl font-inter font-bold text-white">Phase A — Configuration</Text>
        <Text className="text-xs font-inter text-white/80 mt-1">Complete prerequisites before running payroll</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        {/* Hero: Progress + Stats */}
        <Animated.View entering={FadeInDown.delay(80)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ProgressRing completed={completedCount} total={totalCount} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatCard count={completedCount} label="Completed" tone="green" emoji="✓" />
            <StatCard count={inProgressCount} label="In Progress" tone="amber" emoji="⟳" />
            <StatCard count={pendingCount} label="Pending" tone="gray" emoji="○" />
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? colors.charcoal[800] : colors.neutral[200] }]} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.timeIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : colors.primary[50] }]}>
                <Text style={{ fontSize: 14 }}>⏱</Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase font-inter font-semibold tracking-widest text-gray-400">Est. Remaining</Text>
                <Text className="text-sm font-inter font-bold text-gray-900 dark:text-white mt-0.5">~{formatTime(estimatedMin)}</Text>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.timeIcon, { backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : colors.accent[50] }]}>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase font-inter font-semibold tracking-widest text-gray-400">Last Activity</Text>
                <Text className="text-sm font-inter font-bold text-gray-900 dark:text-white mt-0.5">{lastActivity ? fmt.date(lastActivity) : '—'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Configuration Steps */}
        <Animated.View entering={FadeInDown.delay(150)} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 0 }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100] }]}>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">
              Configuration Steps <Text className="text-gray-400 font-inter">({totalCount})</Text>
            </Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Text className="text-[10px] font-inter font-semibold text-gray-500 dark:text-gray-400">↻ Refresh</Text>
            </Pressable>
          </View>

          {steps.map((step: any, i: number) => {
            const meta = STEP_META[step.id] ?? { emoji: '⚙️', ownerRole: 'Admin', estMin: 10 };
            const isLast = i === steps.length - 1;
            return (
              <Animated.View
                key={step.id}
                entering={FadeInDown.delay(200 + i * 35)}
                style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100] }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <StepNumberBadge num={step.stepNumber} status={step.status} />
                  <View style={[styles.stepIconWrap, { backgroundColor: isDark ? colors.charcoal[850] : colors.neutral[50] }]}>
                    <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="text-sm font-inter font-semibold text-gray-900 dark:text-white">{step.name}</Text>
                    <Text className="text-xs font-inter text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={2}>{step.description}</Text>
                    {step.metadata?.label && (
                      <View style={{ marginTop: 4 }}>
                        <Text className="text-[10px] font-inter font-medium text-indigo-500 dark:text-indigo-400">{step.metadata.label}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <OwnerAvatar role={meta.ownerRole} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 9 }}>⏱</Text>
                        <Text className="text-[10px] font-inter font-medium text-gray-500">{meta.estMin} min</Text>
                      </View>
                      <StatusBadge status={step.status} />
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => navigateToStep(step.actionUrl)}
                  style={[styles.actionBtn, {
                    backgroundColor: step.status === 'COMPLETE'
                      ? 'transparent'
                      : step.status === 'IN_PROGRESS' ? colors.warning[500] : colors.primary[600],
                    borderWidth: step.status === 'COMPLETE' ? 1 : 0,
                    borderColor: isDark ? colors.charcoal[700] : colors.neutral[300],
                    marginTop: 10,
                  }]}
                >
                  <Text className="text-xs font-inter font-bold" style={{ color: step.status === 'COMPLETE' ? (isDark ? colors.neutral[300] : colors.neutral[600]) : '#fff' }}>
                    {step.status === 'COMPLETE' ? 'Review' : step.status === 'IN_PROGRESS' ? 'Continue' : 'Configure'} →
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* About Phase A */}
        <Animated.View entering={FadeInDown.delay(450)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={styles.sectionIcon}>
              <LinearGradient colors={[colors.primary[500], colors.accent[500]]} style={styles.sectionIconGrad}>
                <Text style={{ fontSize: 14, color: '#fff' }}>ℹ</Text>
              </LinearGradient>
            </View>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">About Phase A</Text>
          </View>
          <Text className="text-xs font-inter text-gray-600 dark:text-gray-400 leading-5">
            Phase A ensures all foundational configurations — org structure, salary components, statutory rules, and attendance policies — are in place before you process payroll. Each step builds on the previous, creating a reliable and compliant payroll pipeline.
          </Text>
        </Animated.View>

        {/* Key Benefits */}
        <Animated.View entering={FadeInDown.delay(500)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={styles.sectionIcon}>
              <LinearGradient colors={[colors.success[500], colors.success[600]]} style={styles.sectionIconGrad}>
                <Text style={{ fontSize: 14, color: '#fff' }}>✨</Text>
              </LinearGradient>
            </View>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">Key Benefits</Text>
          </View>
          {[
            { t: 'Statutory compliance', d: 'PF, ESI, PT, TDS rules in place before first run.' },
            { t: 'Validated structures', d: 'Salary structures and CTC breakups correctly defined.' },
            { t: 'Clean employee data', d: 'Catches missing salary assignments and gaps early.' },
            { t: 'Reduced rework', d: 'Lowers payroll errors, reissues, and penalties.' },
          ].map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <View style={[styles.checkBullet, { backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : colors.success[100] }]}>
                <Text style={{ fontSize: 10, color: colors.success[600] }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-xs font-inter text-gray-600 dark:text-gray-400">
                  <Text className="font-inter font-bold text-gray-900 dark:text-white">{b.t}.</Text> {b.d}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Quick Links */}
        <Animated.View entering={FadeInDown.delay(550)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={styles.sectionIcon}>
              <LinearGradient colors={[colors.accent[500], '#D946EF']} style={styles.sectionIconGrad}>
                <Text style={{ fontSize: 14, color: '#fff' }}>📖</Text>
              </LinearGradient>
            </View>
            <Text className="text-base font-inter font-bold text-gray-900 dark:text-white">Quick Links</Text>
          </View>
          {[
            { label: 'Salary Components', path: '/company/hr/salary-components', emoji: '💰' },
            { label: 'Salary Structures', path: '/company/hr/salary-structures', emoji: '📋' },
            { label: 'Employee Salary',  path: '/company/hr/employee-salary',  emoji: '👥' },
            { label: 'Statutory Config', path: '/company/hr/statutory-config', emoji: '🛡️' },
            { label: 'Tax & TDS',        path: '/company/hr/tax-config',       emoji: '📑' },
          ].map((link) => (
            <Pressable
              key={link.path}
              onPress={() => router.push(link.path as any)}
              style={[styles.quickLink, { borderBottomColor: isDark ? colors.charcoal[800] : colors.neutral[100] }]}
            >
              <Text style={{ fontSize: 14, width: 22 }}>{link.emoji}</Text>
              <Text className="text-sm font-inter font-medium text-gray-700 dark:text-gray-300 flex-1">{link.label}</Text>
              <Text className="text-gray-400">›</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Need Help */}
        <Animated.View entering={FadeInDown.delay(600)}>
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
              Our payroll experts are here to help you set up Phase A correctly the first time.
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
            {allComplete ? 'All steps complete!' : `${totalCount - completedCount} steps remaining`}
          </Text>
          <Text className="text-[10px] font-inter mt-0.5" style={{ color: allComplete ? colors.success[600] : colors.primary[600] }}>
            {allComplete ? 'Proceed to Phase B.' : 'Complete to unlock Phase B.'}
          </Text>
        </View>
        <Pressable
          disabled={!allComplete}
          onPress={() => router.push('/company/hr/payroll-pre-run' as any)}
          style={{
            backgroundColor: allComplete ? colors.primary[600] : (isDark ? colors.charcoal[700] : colors.neutral[200]),
            paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
          }}
        >
          <Text className="text-sm font-inter font-bold" style={{ color: allComplete ? '#fff' : (isDark ? colors.neutral[500] : colors.neutral[400]) }}>
            Phase B →
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
  statCard:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'flex-start' },
  statIconWrap:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  divider:       { height: 1, marginVertical: 14 },
  timeIcon:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stepIconWrap:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtn:     { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', alignSelf: 'flex-start' },
  sectionIcon:   { width: 32, height: 32, borderRadius: 10, overflow: 'hidden' },
  sectionIconGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  checkBullet:   { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  quickLink:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  contactBtn:    { backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  bottomBar:     { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center' },
});
