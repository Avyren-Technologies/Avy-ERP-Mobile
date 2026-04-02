/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useApproveRun,
    useComputeSalaries,
    useComputeStatutory,
    useCreatePayrollRun,
    useDisburseRun,
    useLockAttendance,
    useReviewExceptions,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { usePayrollRun, usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';

// ============ TYPES ============

type RunStatus =
    | 'DRAFT'
    | 'ATTENDANCE_LOCKED'
    | 'EXCEPTIONS_REVIEWED'
    | 'COMPUTED'
    | 'STATUTORY_DONE'
    | 'APPROVED'
    | 'DISBURSED'
    | 'ARCHIVED';

interface PayrollRunItem {
    id: string;
    month: number;
    year: number;
    status: RunStatus;
    employeeCount: number;
    totalNetPay: number;
    totalGross: number;
    totalDeductions: number;
    createdAt: string;
    exceptions: ExceptionItem[];
    pfTotal: number;
    esiTotal: number;
    ptTotal: number;
    tdsTotal: number;
    lwfTotal: number;
    holdCount: number;
}

interface ExceptionItem {
    id: string;
    employeeName: string;
    type: string;
    description: string;
    reviewed: boolean;
}

// ============ CONSTANTS ============

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<RunStatus, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    ATTENDANCE_LOCKED: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    EXCEPTIONS_REVIEWED: { bg: colors.warning[50], text: colors.warning[600], dot: colors.warning[400] },
    COMPUTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    STATUTORY_DONE: { bg: colors.info[50], text: colors.info[600], dot: colors.info[400] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    DISBURSED: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    ARCHIVED: { bg: colors.primary[100], text: colors.primary[800], dot: colors.primary[600] },
};

const STATUS_LABELS: Record<RunStatus, string> = {
    DRAFT: 'Draft',
    ATTENDANCE_LOCKED: 'Attendance Locked',
    EXCEPTIONS_REVIEWED: 'Exceptions Reviewed',
    COMPUTED: 'Computed',
    STATUTORY_DONE: 'Statutory Done',
    APPROVED: 'Approved',
    DISBURSED: 'Disbursed',
    ARCHIVED: 'Archived',
};

const WIZARD_STEPS = [
    'Lock Attendance',
    'Review Exceptions',
    'Compute Salaries',
    'Statutory Deductions',
    'Approve',
    'Disburse',
];

const STATUS_TO_STEP: Record<RunStatus, number> = {
    DRAFT: 0,
    ATTENDANCE_LOCKED: 1,
    EXCEPTIONS_REVIEWED: 2,
    COMPUTED: 3,
    STATUTORY_DONE: 4,
    APPROVED: 5,
    DISBURSED: 6,
    ARCHIVED: 6,
};

// ============ HELPERS ============

const formatCurrency = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ SHARED ATOMS ============

function RunStatusBadge({ status }: { status: RunStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{STATUS_LABELS[status] ?? status}</Text>
        </View>
    );
}

function ExceptionTypeBadge({ type }: { type: string }) {
    const typeMap: Record<string, { bg: string; text: string }> = {
        attendance: { bg: colors.warning[50], text: colors.warning[700] },
        leave: { bg: colors.info[50], text: colors.info[700] },
        overtime: { bg: colors.accent[50], text: colors.accent[700] },
        deduction: { bg: colors.danger[50], text: colors.danger[700] },
    };
    const scheme = typeMap[type.toLowerCase()] ?? { bg: colors.neutral[100], text: colors.neutral[600] };
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
        </View>
    );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <View style={styles.stepIndicatorContainer}>
            <View style={styles.stepRow}>
                {Array.from({ length: totalSteps }).map((_, idx) => {
                    const isComplete = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && (
                                <View style={[styles.stepLine, isComplete && styles.stepLineActive]} />
                            )}
                            <View style={[styles.stepCircle, isComplete && styles.stepCircleComplete, isCurrent && styles.stepCircleCurrent]}>
                                {isComplete ? (
                                    <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                ) : (
                                    <Text style={{ color: isCurrent ? colors.white : colors.neutral[400], fontFamily: 'Inter', fontSize: 9, fontWeight: '700' }}>{idx + 1}</Text>
                                )}
                            </View>
                        </React.Fragment>
                    );
                })}
            </View>
            <Text className="mt-2 font-inter text-xs font-bold text-primary-950 text-center">
                {currentStep < totalSteps ? WIZARD_STEPS[currentStep] : 'Complete'}
            </Text>
        </View>
    );
}

function MonthYearPicker({ month, year, onMonthChange, onYearChange }: {
    month: number; year: number; onMonthChange: (m: number) => void; onYearChange: (y: number) => void;
}) {
    return (
        <View style={styles.monthYearPicker}>
            <Pressable onPress={() => { if (month === 1) { onMonthChange(12); onYearChange(year - 1); } else { onMonthChange(month - 1); } }} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <Text className="font-inter text-sm font-bold text-primary-950">{MONTH_LABELS[month - 1]} {year}</Text>
            </View>
            <Pressable onPress={() => { if (month === 12) { onMonthChange(1); onYearChange(year + 1); } else { onMonthChange(month + 1); } }} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
        </View>
    );
}

// ============ NEW RUN MODAL ============

function NewRunModal({ visible, onClose, onCreate, isCreating }: {
    visible: boolean; onClose: () => void;
    onCreate: (data: { month: number; year: number }) => void; isCreating: boolean;
}) {
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [month, setMonth] = React.useState(now.getMonth() + 1);
    const [year, setYear] = React.useState(now.getFullYear());

    React.useEffect(() => {
        if (visible) { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">New Payroll Run</Text>
                    <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onCreate({ month, year })} disabled={isCreating} style={[styles.saveBtn, isCreating && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isCreating ? 'Creating...' : 'Create Run'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ RUN LIST CARD ============

function RunCard({ item, index, onPress }: { item: PayrollRunItem; index: number; onPress: () => void }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '' : fmt.date(d);
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{MONTH_LABELS[item.month - 1]} {item.year}</Text>
                        <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">Created {formatDate(item.createdAt)}</Text>
                    </View>
                    <RunStatusBadge status={item.status} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{item.employeeCount} employees</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">Net: {formatCurrency(item.totalNetPay)}</Text></View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ WIZARD STEPS ============

function Step1LockAttendance({ run, onLock, isLocking }: { run: PayrollRunItem; onLock: () => void; isLocking: boolean }) {
    const unresolvedCount = (run.exceptions ?? []).filter(e => !e.reviewed).length;
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Lock Attendance</Text>
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryChip, { borderLeftColor: colors.primary[400], borderLeftWidth: 3 }]}>
                        <Text className="font-inter text-xl font-bold text-primary-800">{run.employeeCount}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500 mt-1">Employees</Text>
                    </View>
                    <View style={[styles.summaryChip, { borderLeftColor: unresolvedCount > 0 ? colors.warning[400] : colors.success[400], borderLeftWidth: 3 }]}>
                        <Text className="font-inter text-xl font-bold" style={{ color: unresolvedCount > 0 ? colors.warning[700] : colors.success[700] }}>{unresolvedCount}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500 mt-1">Unresolved Issues</Text>
                    </View>
                </View>
                {unresolvedCount > 0 && (
                    <View style={styles.warningBanner}>
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>
                        <Text className="ml-2 font-inter text-xs text-warning-700 flex-1">There are unresolved attendance issues. You can still lock, but exceptions will carry over.</Text>
                    </View>
                )}
                <Pressable onPress={onLock} disabled={isLocking} style={[styles.primaryBtn, isLocking && { opacity: 0.5 }]}>
                    {isLocking ? <ActivityIndicator size="small" color={colors.white} /> : (
                        <Text className="font-inter text-sm font-bold text-white">Lock Attendance</Text>
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
}

function Step2ReviewExceptions({ run, onMarkAllReviewed, isReviewing }: { run: PayrollRunItem; onMarkAllReviewed: () => void; isReviewing: boolean }) {
    const exceptions = run.exceptions ?? [];
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Review Exceptions</Text>
                {exceptions.length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Svg width={32} height={32} viewBox="0 0 24 24"><Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.success[500]} strokeWidth="1.5" fill="none" /></Svg>
                        <Text className="mt-2 font-inter text-sm text-success-700 font-semibold">No exceptions found</Text>
                    </View>
                ) : (
                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                        {exceptions.map((exc, idx) => (
                            <View key={exc.id || idx} style={styles.exceptionRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">{exc.employeeName}</Text>
                                        <ExceptionTypeBadge type={exc.type} />
                                    </View>
                                    <Text className="mt-1 font-inter text-xs text-neutral-500">{exc.description}</Text>
                                </View>
                                {exc.reviewed && (
                                    <View style={[styles.statusBadge, { backgroundColor: colors.success[50] }]}>
                                        <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Reviewed</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}
                <Pressable onPress={onMarkAllReviewed} disabled={isReviewing} style={[styles.primaryBtn, isReviewing && { opacity: 0.5 }]}>
                    {isReviewing ? <ActivityIndicator size="small" color={colors.white} /> : (
                        <Text className="font-inter text-sm font-bold text-white">Mark All Reviewed</Text>
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
}

function Step3ComputeSalaries({ run, onCompute, isComputing }: { run: PayrollRunItem; onCompute: () => void; isComputing: boolean }) {
    const hasComputed = run.status === 'COMPUTED' || run.status === 'STATUTORY_DONE' || run.status === 'APPROVED' || run.status === 'DISBURSED' || run.status === 'ARCHIVED';
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Compute Salaries</Text>
                {isComputing ? (
                    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary[500]} />
                        <Text className="mt-3 font-inter text-sm text-primary-600 font-semibold">Computing salaries...</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-400">This may take a moment</Text>
                    </View>
                ) : hasComputed ? (
                    <>
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryChip, { borderLeftColor: colors.success[400], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-lg font-bold text-success-700">{formatCurrency(run.totalGross)}</Text>
                                <Text className="font-inter text-[10px] text-neutral-500 mt-1">Total Gross</Text>
                            </View>
                            <View style={[styles.summaryChip, { borderLeftColor: colors.danger[400], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-lg font-bold text-danger-700">{formatCurrency(run.totalDeductions)}</Text>
                                <Text className="font-inter text-[10px] text-neutral-500 mt-1">Total Deductions</Text>
                            </View>
                        </View>
                        <View style={styles.netPayBanner}>
                            <Text className="font-inter text-xs text-neutral-500">Total Net Pay</Text>
                            <Text className="font-inter text-xl font-bold text-primary-800">{formatCurrency(run.totalNetPay)}</Text>
                            <Text className="font-inter text-[10px] text-neutral-400">{run.employeeCount} employees</Text>
                        </View>
                    </>
                ) : (
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <Svg width={40} height={40} viewBox="0 0 24 24"><Path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>
                        <Text className="mt-2 font-inter text-sm text-neutral-500">Ready to compute salaries for {run.employeeCount} employees</Text>
                    </View>
                )}
                {!hasComputed && !isComputing && (
                    <Pressable onPress={onCompute} style={styles.primaryBtn}>
                        <Text className="font-inter text-sm font-bold text-white">Compute Salaries</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

function Step4StatutoryDeductions({ run, onCompute, isComputing }: { run: PayrollRunItem; onCompute: () => void; isComputing: boolean }) {
    const hasStatutory = run.pfTotal > 0 || run.esiTotal > 0 || run.ptTotal > 0 || run.tdsTotal > 0 || run.lwfTotal > 0;
    const items = [
        { label: 'PF', amount: run.pfTotal, color: colors.primary[500] },
        { label: 'ESI', amount: run.esiTotal, color: colors.info[500] },
        { label: 'PT', amount: run.ptTotal, color: colors.warning[500] },
        { label: 'TDS', amount: run.tdsTotal, color: colors.danger[500] },
        { label: 'LWF', amount: run.lwfTotal, color: colors.accent[500] },
    ];
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Statutory Deductions</Text>
                {hasStatutory ? (
                    <View style={{ gap: 8 }}>
                        {items.map(item => (
                            <View key={item.label} style={[styles.statutoryRow, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 flex-1">{item.label}</Text>
                                <Text className="font-inter text-sm font-bold" style={{ color: item.color }}>{formatCurrency(item.amount)}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <Text className="font-inter text-sm text-neutral-500">Compute statutory deductions for PF, ESI, PT, TDS, and LWF</Text>
                    </View>
                )}
                {!hasStatutory && (
                    <Pressable onPress={onCompute} disabled={isComputing} style={[styles.primaryBtn, isComputing && { opacity: 0.5 }]}>
                        {isComputing ? <ActivityIndicator size="small" color={colors.white} /> : (
                            <Text className="font-inter text-sm font-bold text-white">Compute Statutory</Text>
                        )}
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

function Step5Approve({ run, onApprove }: { run: PayrollRunItem; onApprove: () => void }) {
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Approve Payroll</Text>
                <View style={styles.finalSummary}>
                    <View style={styles.finalSummaryRow}>
                        <Text className="font-inter text-xs text-neutral-500">Total Gross</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950">{formatCurrency(run.totalGross)}</Text>
                    </View>
                    <View style={styles.finalSummaryRow}>
                        <Text className="font-inter text-xs text-neutral-500">Total Deductions</Text>
                        <Text className="font-inter text-sm font-bold text-danger-700">{formatCurrency(run.totalDeductions)}</Text>
                    </View>
                    <View style={[styles.finalSummaryRow, { borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8, marginTop: 4 }]}>
                        <Text className="font-inter text-sm font-bold text-primary-950">Total Net Pay</Text>
                        <Text className="font-inter text-base font-bold text-primary-800">{formatCurrency(run.totalNetPay)}</Text>
                    </View>
                    <View style={styles.finalSummaryRow}>
                        <Text className="font-inter text-xs text-neutral-500">Employees</Text>
                        <Text className="font-inter text-sm font-semibold text-primary-950">{run.employeeCount}</Text>
                    </View>
                    <View style={styles.finalSummaryRow}>
                        <Text className="font-inter text-xs text-neutral-500">Exceptions</Text>
                        <Text className="font-inter text-sm font-semibold text-primary-950">{(run.exceptions ?? []).length}</Text>
                    </View>
                    <View style={styles.finalSummaryRow}>
                        <Text className="font-inter text-xs text-neutral-500">Holds</Text>
                        <Text className="font-inter text-sm font-semibold text-primary-950">{run.holdCount ?? 0}</Text>
                    </View>
                </View>
                <Pressable onPress={onApprove} style={[styles.primaryBtn, { backgroundColor: colors.success[600] }]}>
                    <Text className="font-inter text-sm font-bold text-white">Approve Payroll</Text>
                </Pressable>
            </View>
        </Animated.View>
    );
}

function Step6Disburse({ run, onDisburse, isDisbursing, disbursed }: { run: PayrollRunItem; onDisburse: () => void; isDisbursing: boolean; disbursed: boolean }) {
    const router = useRouter();
    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 mb-3">Disburse</Text>
                {disbursed || run.status === 'DISBURSED' || run.status === 'ARCHIVED' ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success[100], justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                            <Svg width={28} height={28} viewBox="0 0 24 24"><Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.success[600]} strokeWidth="2" fill="none" /></Svg>
                        </View>
                        <Text className="font-inter text-base font-bold text-success-700">Payroll Disbursed!</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">Bank file generated and payslips created</Text>
                        <Pressable onPress={() => router.push('/company/hr/payslips' as any)} style={[styles.outlineBtn, { marginTop: 16 }]}>
                            <Text className="font-inter text-sm font-bold text-primary-600">View Payslips</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View style={{ gap: 8, marginBottom: 16 }}>
                            <View style={styles.readyRow}>
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                <Text className="ml-2 font-inter text-sm text-primary-950">Bank file ready for generation</Text>
                            </View>
                            <View style={styles.readyRow}>
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                <Text className="ml-2 font-inter text-sm text-primary-950">Payslips will be auto-generated</Text>
                            </View>
                        </View>
                        <Pressable onPress={onDisburse} disabled={isDisbursing} style={[styles.primaryBtn, { backgroundColor: colors.primary[700] }, isDisbursing && { opacity: 0.5 }]}>
                            {isDisbursing ? <ActivityIndicator size="small" color={colors.white} /> : (
                                <Text className="font-inter text-sm font-bold text-white">Disburse & Generate Payslips</Text>
                            )}
                        </Pressable>
                    </>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PayrollRunScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const now = new Date();
    const [filterMonth, setFilterMonth] = React.useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = React.useState(now.getFullYear());

    const { data: response, isLoading, error, refetch, isFetching } = usePayrollRuns({ month: filterMonth, year: filterYear } as any);

    const createMutation = useCreatePayrollRun();
    const lockMutation = useLockAttendance();
    const reviewMutation = useReviewExceptions();
    const computeMutation = useComputeSalaries();
    const statutoryMutation = useComputeStatutory();
    const approveMutation = useApproveRun();
    const disburseMutation = useDisburseRun();

    const [showNewRunModal, setShowNewRunModal] = React.useState(false);
    const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
    const [disbursed, setDisbursed] = React.useState(false);

    // Fetch single run when selected
    const { data: selectedRunResponse } = usePayrollRun(selectedRunId ?? '');

    const runs: PayrollRunItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            month: item.month ?? 1,
            year: item.year ?? now.getFullYear(),
            status: item.status ?? 'DRAFT',
            employeeCount: item.employeeCount ?? 0,
            totalNetPay: item.totalNetPay ?? 0,
            totalGross: item.totalGross ?? 0,
            totalDeductions: item.totalDeductions ?? 0,
            createdAt: item.createdAt ?? '',
            exceptions: Array.isArray(item.exceptions) ? item.exceptions : [],
            pfTotal: item.pfTotal ?? 0,
            esiTotal: item.esiTotal ?? 0,
            ptTotal: item.ptTotal ?? 0,
            tdsTotal: item.tdsTotal ?? 0,
            lwfTotal: item.lwfTotal ?? 0,
            holdCount: item.holdCount ?? 0,
        }));
    }, [response]);

    const selectedRun: PayrollRunItem | null = React.useMemo(() => {
        if (!selectedRunId) return null;
        const raw = (selectedRunResponse as any)?.data ?? selectedRunResponse;
        if (!raw) return runs.find(r => r.id === selectedRunId) ?? null;
        return {
            id: raw.id ?? '',
            month: raw.month ?? 1,
            year: raw.year ?? now.getFullYear(),
            status: raw.status ?? 'DRAFT',
            employeeCount: raw.employeeCount ?? 0,
            totalNetPay: raw.totalNetPay ?? 0,
            totalGross: raw.totalGross ?? 0,
            totalDeductions: raw.totalDeductions ?? 0,
            createdAt: raw.createdAt ?? '',
            exceptions: Array.isArray(raw.exceptions) ? raw.exceptions : [],
            pfTotal: raw.pfTotal ?? 0,
            esiTotal: raw.esiTotal ?? 0,
            ptTotal: raw.ptTotal ?? 0,
            tdsTotal: raw.tdsTotal ?? 0,
            lwfTotal: raw.lwfTotal ?? 0,
            holdCount: raw.holdCount ?? 0,
        };
    }, [selectedRunId, selectedRunResponse, runs]);

    const currentStep = React.useMemo(() => {
        if (!selectedRun) return 0;
        return STATUS_TO_STEP[selectedRun.status] ?? 0;
    }, [selectedRun]);

    const handleCreateRun = (data: { month: number; year: number }) => {
        createMutation.mutate(data as any, { onSuccess: () => setShowNewRunModal(false) });
    };

    const handleLock = () => {
        if (!selectedRunId) return;
        lockMutation.mutate(selectedRunId);
    };

    const handleReview = () => {
        if (!selectedRunId) return;
        reviewMutation.mutate(selectedRunId);
    };

    const handleCompute = () => {
        if (!selectedRunId) return;
        computeMutation.mutate(selectedRunId);
    };

    const handleStatutory = () => {
        if (!selectedRunId) return;
        statutoryMutation.mutate(selectedRunId);
    };

    const handleApprove = () => {
        showConfirm({
            title: 'Approve Payroll',
            message: `Approve payroll for ${MONTH_LABELS[(selectedRun?.month ?? 1) - 1]} ${selectedRun?.year}? This will finalize all salary computations.`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => { if (selectedRunId) approveMutation.mutate(selectedRunId); },
        });
    };

    const handleDisburse = () => {
        showConfirm({
            title: 'Disburse Payroll',
            message: `Disburse ${formatCurrency(selectedRun?.totalNetPay ?? 0)} to ${selectedRun?.employeeCount ?? 0} employees? This action cannot be undone.`,
            confirmText: 'Disburse', variant: 'warning',
            onConfirm: () => {
                if (selectedRunId) {
                    disburseMutation.mutate(selectedRunId, {
                        onSuccess: () => setDisbursed(true),
                    });
                }
            },
        });
    };

    // ---- Wizard view ----
    if (selectedRun) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => { setSelectedRunId(null); setDisbursed(false); }} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                        {MONTHS[selectedRun.month - 1]} {selectedRun.year} Run
                    </Text>
                    <RunStatusBadge status={selectedRun.status} />
                </View>
                <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                    <StepIndicator currentStep={currentStep} totalSteps={6} />
                    {currentStep === 0 && <Step1LockAttendance run={selectedRun} onLock={handleLock} isLocking={lockMutation.isPending} />}
                    {currentStep === 1 && <Step2ReviewExceptions run={selectedRun} onMarkAllReviewed={handleReview} isReviewing={reviewMutation.isPending} />}
                    {currentStep === 2 && <Step3ComputeSalaries run={selectedRun} onCompute={handleCompute} isComputing={computeMutation.isPending} />}
                    {currentStep === 3 && <Step4StatutoryDeductions run={selectedRun} onCompute={handleStatutory} isComputing={statutoryMutation.isPending} />}
                    {currentStep === 4 && <Step5Approve run={selectedRun} onApprove={handleApprove} />}
                    {(currentStep === 5 || currentStep === 6) && <Step6Disburse run={selectedRun} onDisburse={handleDisburse} isDisbursing={disburseMutation.isPending} disbursed={disbursed} />}
                </ScrollView>
                <ConfirmModal {...confirmModalProps} />
            </View>
        );
    }

    // ---- List view ----
    const renderItem = ({ item, index }: { item: PayrollRunItem; index: number }) => (
        <RunCard item={item} index={index} onPress={() => setSelectedRunId(item.id)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Payroll Runs</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{runs.length} run{runs.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}>
                <MonthYearPicker month={filterMonth} year={filterYear} onMonthChange={setFilterMonth} onYearChange={setFilterYear} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load payroll runs" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No payroll runs" message="Create a new payroll run to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Payroll Runs" onMenuPress={toggle} />
            <FlatList data={runs} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setShowNewRunModal(true)} />
            <NewRunModal visible={showNewRunModal} onClose={() => setShowNewRunModal(false)} onCreate={handleCreateRun} isCreating={createMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    // Wizard
    wizardCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 20, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    summaryChip: {
        flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: colors.neutral[100],
    },
    warningBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning[50],
        borderRadius: 10, padding: 10, marginBottom: 12,
    },
    primaryBtn: {
        height: 48, borderRadius: 14, backgroundColor: colors.primary[600],
        justifyContent: 'center', alignItems: 'center', marginTop: 8,
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    outlineBtn: {
        height: 44, borderRadius: 14, backgroundColor: colors.primary[50],
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
        borderWidth: 1.5, borderColor: colors.primary[200],
    },
    exceptionRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    statutoryRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.neutral[100],
    },
    netPayBanner: {
        backgroundColor: colors.primary[50], borderRadius: 14, padding: 16,
        alignItems: 'center', marginTop: 4,
    },
    finalSummary: {
        backgroundColor: colors.neutral[50], borderRadius: 14, padding: 16, marginBottom: 12, gap: 8,
    },
    finalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    readyRow: { flexDirection: 'row', alignItems: 'center' },
    // Step indicator
    stepIndicatorContainer: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutral[100],
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.neutral[200],
    },
    stepCircleComplete: { backgroundColor: colors.success[500], borderColor: colors.success[500] },
    stepCircleCurrent: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    stepLine: { width: 20, height: 2, backgroundColor: colors.neutral[200] },
    stepLineActive: { backgroundColor: colors.success[400] },
    // MonthYear Picker
    monthYearPicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    // Form sheet
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
