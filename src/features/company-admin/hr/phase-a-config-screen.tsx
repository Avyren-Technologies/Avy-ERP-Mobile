/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useConfigurationStatus } from '@/features/company-admin/api/use-payroll-phases-queries';
import { useAuthStore, getDisplayName } from '@/features/auth/use-auth-store';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

type StepStatus = 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

interface BackendStep {
    id: string;
    stepNumber: number;
    name: string;
    description: string;
    status: StepStatus;
    lastUpdated: string | null;
    actionUrl: string;
    metadata: { count?: number; label?: string } | null;
}

interface StepMeta {
    emoji: string;
    iconTintBg: string;     // background tint
    iconTintFg: string;     // foreground accent (text)
    ownerRole: string;
    estMin: number;
    isNew?: boolean;
}

const STEP_META: Record<string, StepMeta> = {
    org_structure:       { emoji: '🏢', iconTintBg: colors.info[50],    iconTintFg: colors.info[600],    ownerRole: 'HR Admin',        estMin: 10 },
    salary_components:   { emoji: '₹',  iconTintBg: colors.accent[50],  iconTintFg: colors.accent[600],  ownerRole: 'Payroll Officer', estMin: 25 },
    salary_structures:   { emoji: '🧩', iconTintBg: colors.primary[50], iconTintFg: colors.primary[600], ownerRole: 'Payroll Officer', estMin: 45 },
    ctc_breakup:         { emoji: '👤', iconTintBg: colors.success[50], iconTintFg: colors.success[600], ownerRole: 'Payroll Officer', estMin: 30 },
    employee_salary:     { emoji: '👥', iconTintBg: '#F0F9FF',          iconTintFg: '#0284C7',           ownerRole: 'HR Admin',        estMin: 20 },
    pf_esi_config:       { emoji: '🛡️', iconTintBg: '#F5F3FF',          iconTintFg: '#7C3AED',           ownerRole: 'Finance Lead',    estMin: 45 },
    tds_pt_config:       { emoji: '%',  iconTintBg: '#FFF7ED',          iconTintFg: '#EA580C',           ownerRole: 'Finance Lead',    estMin: 20 },
    attendance_rules:    { emoji: '📄', iconTintBg: '#FFF1F2',          iconTintFg: '#E11D48',           ownerRole: 'HR Admin',        estMin: 30 },
    leave_types:         { emoji: '🏦', iconTintBg: colors.danger[50],  iconTintFg: colors.danger[600],  ownerRole: 'HR Admin',        estMin: 30 },
    leave_policy:        { emoji: '🏛️', iconTintBg: colors.warning[50], iconTintFg: colors.warning[600], ownerRole: 'HR Admin',        estMin: 40, isNew: true },
    payroll_simulation:  { emoji: '⚙️', iconTintBg: colors.neutral[100], iconTintFg: colors.neutral[700], ownerRole: 'Payroll Officer', estMin: 30 },
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function ProgressRing({ completed, total, size = 116 }: { completed: number; total: number; size?: number }) {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const progress = total > 0 ? completed / total : 0;
    const offset = circ * (1 - progress);

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id="phaseA-ring" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={colors.success[500]} />
                        <Stop offset="100%" stopColor={colors.success[700]} />
                    </SvgGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral[200]} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="url(#phaseA-ring)" strokeWidth={strokeWidth}
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

function StatTile({ value, label, bg, fg }: { value: number | string; label: string; bg: string; fg: string }) {
    return (
        <View style={[styles.tile, { backgroundColor: bg }]}>
            <Text style={[styles.tileValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>{String(value)}</Text>
            <Text
                style={[styles.tileLabel, { color: fg }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                allowFontScaling={false}
            >
                {label}
            </Text>
        </View>
    );
}

function StatusBadge({ status }: { status: StepStatus }) {
    const map: Record<StepStatus, { bg: string; fg: string; label: string }> = {
        COMPLETE:    { bg: colors.success[50], fg: colors.success[700], label: 'Completed' },
        IN_PROGRESS: { bg: colors.warning[50], fg: colors.warning[700], label: 'In Progress' },
        NOT_STARTED: { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Pending' },
    };
    const t = map[status];
    return (
        <View style={[styles.pill, { backgroundColor: t.bg }]}>
            <Text style={[styles.pillText, { color: t.fg }]}>{t.label}</Text>
        </View>
    );
}

function RolePill({ role, bg, fg }: { role: string; bg: string; fg: string }) {
    return (
        <View style={[styles.pill, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: fg, opacity: 0.7 }} />
            <Text style={[styles.pillText, { color: fg }]}>{role}</Text>
        </View>
    );
}

function StepCard({
    step, meta, isLocked, index,
}: { step: BackendStep; meta: StepMeta; isLocked: boolean; index: number }) {
    const router = useRouter();
    const fmt = useCompanyFormatter();
    const actionLabel = step.status === 'COMPLETE' ? 'View Details' : step.status === 'IN_PROGRESS' ? 'Continue Setup' : 'Start Setup';
    const actionTint = step.status === 'IN_PROGRESS' ? colors.warning[700] : colors.primary[600];

    return (
        <Animated.View entering={FadeInDown.delay(80 * index).duration(360)} style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
                <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>{step.stepNumber}</Text>
                    {isLocked && <Text style={styles.lockChar}>🔒</Text>}
                </View>
                <View style={[styles.stepIconCircle, { backgroundColor: meta.iconTintBg }]}>
                    <Text style={[styles.stepEmoji, { color: meta.iconTintFg }]}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text className="font-inter text-[14px] font-bold text-neutral-900" style={{ flexShrink: 1 }}>
                            {step.name}
                        </Text>
                        {meta.isNew && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                    </View>
                    <Text className="mt-1 font-inter text-[12px] leading-[16px] text-neutral-600">{step.description}</Text>
                </View>
            </View>

            <View style={styles.stepMetaRow}>
                <StatusBadge status={step.status} />
                <RolePill role={meta.ownerRole} bg={meta.iconTintBg} fg={meta.iconTintFg} />
                <View style={styles.timeChip}>
                    <Text style={styles.timeChipText}>⏱ ~{meta.estMin} min</Text>
                </View>
            </View>

            <View style={styles.stepFooterRow}>
                <Text className="font-inter text-[11px] text-neutral-500">
                    {step.lastUpdated ? `Last updated ${fmt.date(step.lastUpdated)}` : 'Not started yet'}
                </Text>
                <Pressable onPress={() => router.push(step.actionUrl.replace('/app', '') as any)}>
                    <Text style={[styles.actionText, { color: actionTint }]}>
                        {actionLabel} ›
                    </Text>
                </Pressable>
            </View>
        </Animated.View>
    );
}

const KEY_BENEFITS = [
    'Accurate salary computation',
    'Statutory compliance',
    'Reduced payroll errors',
    'Faster payroll processing',
    'Audit ready setup',
];

const QUICK_LINKS: { label: string; emoji: string; to: string }[] = [
    { label: 'Organisation Structure',     emoji: '🏢', to: '/company/hr/departments' },
    { label: 'Salary Component Master',    emoji: '₹',  to: '/company/hr/salary-components' },
    { label: 'Salary Structure Templates', emoji: '🧩', to: '/company/hr/salary-structures' },
    { label: 'Statutory Configuration',    emoji: '🛡️', to: '/company/hr/statutory-config' },
    { label: 'Bank Master',                emoji: '🏦', to: '/company/hr/bank-config' },
    { label: 'Loan Policy Configuration',  emoji: '🏛️', to: '/company/hr/loan-policies' },
    { label: 'Payroll Run Configuration',  emoji: '⚙️', to: '/company/hr/payroll-runs' },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Main screen                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseAConfigScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const { toggle } = useSidebar();
    const authUser = useAuthStore.use.user();
    const authUserName = getDisplayName(authUser);

    const { data, isLoading, isRefetching, refetch } = useConfigurationStatus();
    // mobile axios interceptor + API fn already unwrap to inner payload
    const status = (data as any) ?? null;

    const steps: BackendStep[] = (status?.steps as BackendStep[]) ?? [];

    const counts = React.useMemo(() => {
        const c = { complete: 0, inProgress: 0, pending: 0 };
        steps.forEach(s => {
            if (s.status === 'COMPLETE') c.complete++;
            else if (s.status === 'IN_PROGRESS') c.inProgress++;
            else c.pending++;
        });
        return c;
    }, [steps]);

    const completedCount = status?.completedCount ?? 0;
    const totalCount = status?.totalCount ?? 11;
    const estMin = status?.estimatedMinutesRemaining ?? 0;
    const remainingHours = Math.floor(estMin / 60);
    const remainingMin = estMin % 60;
    const remainingSteps = totalCount - completedCount;
    const phaseAComplete = completedCount >= totalCount;

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Phase A — Configuration" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Phase A — Configuration" onMenuPress={toggle} subtitle="One-time Setup" />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Intro card ────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-primary-600">Configuration Prerequisites</Text>
                    <Text className="mt-1 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Complete all configuration prerequisites to ensure accurate, compliant and audit-ready payroll processing.
                    </Text>
                </Animated.View>

                {/* ── Progress hero ─────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(60).duration(360)} style={[styles.heroCard, { marginTop: 12, alignItems: 'center' }]}>
                    <Text className="mb-3 font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500" style={{ alignSelf: 'flex-start' }}>Overall Progress</Text>
                    <ProgressRing completed={completedCount} total={totalCount} />
                    <View style={styles.statGrid}>
                        <StatTile value={counts.complete}   label="Completed"   bg={colors.success[50]} fg={colors.success[700]} />
                        <StatTile value={counts.inProgress} label="In Progress" bg={colors.warning[50]} fg={colors.warning[700]} />
                        <StatTile value={counts.pending}    label="Pending"     bg={colors.accent[50]}  fg={colors.accent[700]} />
                        <StatTile value={0}                 label="Not Started" bg={colors.neutral[100]} fg={colors.neutral[700]} />
                    </View>
                </Animated.View>

                {/* ── Estimated + Last Updated ──────────────────────── */}
                <Animated.View entering={FadeInDown.delay(120).duration(360)} style={[styles.metaRow, { marginTop: 12 }]}>
                    <View style={[styles.metaCard, { backgroundColor: colors.white }]}>
                        <View style={[styles.metaIcon, { backgroundColor: colors.info[50] }]}>
                            <Text style={{ color: colors.info[600] }}>⏱</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Estimated Time</Text>
                            <Text className="mt-1 font-inter text-[16px] font-bold text-neutral-900">
                                {remainingHours > 0 ? `~${remainingHours}h ${remainingMin}m` : `~${remainingMin}m`}
                            </Text>
                            <Text className="font-inter text-[10px] text-neutral-500">Across {remainingSteps} steps</Text>
                        </View>
                    </View>
                    <View style={[styles.metaCard, { backgroundColor: colors.white }]}>
                        <View style={[styles.metaIcon, { backgroundColor: colors.accent[50] }]}>
                            <Text style={{ color: colors.accent[600] }}>📅</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Last Updated</Text>
                            <Text className="mt-1 font-inter text-[13px] font-bold text-neutral-900" numberOfLines={1}>
                                {status?.lastActivity ? fmt.date(status.lastActivity) : '—'}
                            </Text>
                            <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                                {status?.lastActivity && authUser ? `by ${authUserName}` : 'No activity yet'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Configuration steps list ──────────────────────── */}
                <View style={{ marginTop: 20, marginBottom: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text className="font-inter text-[15px] font-bold text-neutral-900">
                        Configuration Steps <Text className="font-inter text-neutral-500 font-semibold">({totalCount})</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Text className="font-inter text-[10px] text-neutral-500">🔒 Dependent</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">⏱ Est. time</Text>
                    </View>
                </View>

                {steps.map((step, idx) => {
                    const meta = STEP_META[step.id] ?? { emoji: '⚙️', iconTintBg: colors.neutral[100], iconTintFg: colors.neutral[700], ownerRole: 'HR', estMin: 15 };
                    const isLocked = idx > 0 && steps[idx - 1]!.status !== 'COMPLETE' && step.status !== 'COMPLETE' && step.status !== 'IN_PROGRESS';
                    return <StepCard key={step.id} step={step} meta={meta} isLocked={isLocked} index={idx} />;
                })}

                {/* ── About card ───────────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(360)} style={[styles.infoCard, { marginTop: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={[styles.miniIcon, { backgroundColor: colors.info[50] }]}>
                            <Text style={{ color: colors.info[600] }}>ℹ</Text>
                        </View>
                        <Text className="font-inter text-[14px] font-bold text-neutral-900">About Phase A</Text>
                    </View>
                    <Text className="font-inter text-[12.5px] leading-[18px] text-neutral-600">
                        Phase A is a one-time configuration of masters, rules and preferences. Once completed, you can proceed to Phase B (Pre-Run Activities) every payroll cycle.
                    </Text>
                </Animated.View>

                {/* ── Key Benefits ─────────────────────────────────── */}
                <View style={[styles.infoCard, { marginTop: 12 }]}>
                    <Text className="mb-3 font-inter text-[14px] font-bold text-neutral-900">Key Benefits</Text>
                    {KEY_BENEFITS.map(b => (
                        <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <View style={styles.checkmarkCircle}>
                                <Text style={{ color: colors.success[700], fontWeight: '700', fontSize: 11 }}>✓</Text>
                            </View>
                            <Text className="font-inter text-[12.5px] text-neutral-700">{b}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Quick Links ──────────────────────────────────── */}
                <View style={[styles.infoCard, { marginTop: 12 }]}>
                    <Text className="mb-3 font-inter text-[14px] font-bold text-neutral-900">Quick Links</Text>
                    {QUICK_LINKS.map(l => (
                        <Pressable
                            key={l.label}
                            onPress={() => router.push(l.to as any)}
                            style={({ pressed }) => [styles.quickLink, pressed && { backgroundColor: colors.neutral[100] }]}
                        >
                            <Text style={styles.quickLinkText}>
                                <Text style={{ color: colors.primary[500] }}>{l.emoji}  </Text>
                                {l.label}
                            </Text>
                            <Text style={{ color: colors.neutral[400], fontSize: 14 }}>›</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Need Help (gradient) ─────────────────────────── */}
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
                    <Pressable onPress={() => Linking.openURL('tel:+918012345678')} style={styles.helpLine}>
                        <Text style={styles.helpLineText}>📞  +91 80 1234 5678</Text>
                    </Pressable>
                </LinearGradient>
            </ScrollView>

            {/* ── Sticky bottom action bar ──────────────────────────── */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.bottomStatus}>
                    {phaseAComplete ? (
                        <>
                            <Text style={{ color: colors.success[600], fontSize: 14 }}>✓</Text>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">
                                All {totalCount} steps complete. Ready to proceed.
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={{ color: colors.neutral[500], fontSize: 14 }}>🔒</Text>
                            <Text className="font-inter text-[12px] font-semibold text-neutral-700">
                                Cannot proceed: {totalCount - completedCount} step{totalCount - completedCount === 1 ? '' : 's'} pending
                            </Text>
                        </>
                    )}
                </View>
                <Pressable
                    disabled={!phaseAComplete}
                    onPress={() => router.push('/company/hr/payroll-pre-run' as any)}
                    style={[styles.bottomCta, !phaseAComplete && { opacity: 0.5 }]}
                >
                    {phaseAComplete ? (
                        <LinearGradient
                            colors={[colors.primary[600], colors.accent[600]] as const}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.neutral[200] }]} />
                    )}
                    <Text className="font-inter text-[13px] font-bold" style={{ color: phaseAComplete ? colors.white : colors.neutral[500] }}>
                        {phaseAComplete ? 'Proceed to Phase B' : 'Complete to enable'}  ›
                    </Text>
                </Pressable>
            </View>
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
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    statGrid: {
        marginTop: 14,
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tile: {
        width: '48%',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 64,
    },
    tileValue: { fontFamily: 'Inter', fontSize: 22, fontWeight: '800', lineHeight: 24 },
    tileLabel: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.6, textTransform: 'uppercase' },
    metaRow: { flexDirection: 'row', gap: 12 },
    metaCard: {
        flex: 1,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    metaIcon: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    stepCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginTop: 10,
        gap: 10,
    },
    stepHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepNumberBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 2,
    },
    stepNumber: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.neutral[700] },
    lockChar: { fontSize: 8 },
    stepIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    stepEmoji: { fontSize: 17, fontWeight: '700' },
    newBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 999,
        backgroundColor: colors.success[50],
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    newBadgeText: { fontFamily: 'Inter', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: colors.success[700] },
    stepMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    pillText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
    timeChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: colors.neutral[100],
    },
    timeChipText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.neutral[700] },
    stepFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    actionText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
    infoCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    miniIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    checkmarkCircle: {
        width: 18,
        height: 18,
        borderRadius: 999,
        backgroundColor: colors.success[100],
        alignItems: 'center',
        justifyContent: 'center',
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

export default PhaseAConfigScreen;
