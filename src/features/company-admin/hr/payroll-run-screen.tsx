/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
    useDeletePayrollRun,
    useDisburseRun,
    useLockAttendance,
    useReviewExceptions,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { usePayrollRun, usePayrollRuns } from '@/features/company-admin/api/use-payroll-run-queries';
import { useIsDark } from '@/hooks/use-is-dark';

import { Step1AttendanceValidation } from '@/features/company-admin/hr/Step1AttendanceValidation';
import { Step2PayrollExceptions } from '@/features/company-admin/hr/Step2PayrollExceptions';
import { Step3PayrollComputation } from '@/features/company-admin/hr/Step3PayrollComputation';
import { Step4StatutoryCompliance } from '@/features/company-admin/hr/Step4StatutoryCompliance';
import { Step5PayrollApproval } from '@/features/company-admin/hr/Step5PayrollApproval';
import { Step6Disbursement } from '@/features/company-admin/hr/Step6Disbursement';
import { Step7PostPayroll } from '@/features/company-admin/hr/Step7PostPayroll';

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
    'Post-Payroll',
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

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

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
            <Text className="mt-2 font-inter text-xs font-bold text-primary-950 dark:text-white text-center">
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
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{MONTH_LABELS[month - 1]} {year}</Text>
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
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">New Payroll Run</Text>
                    <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
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
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{MONTH_LABELS[item.month - 1]} {item.year}</Text>
                        <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">Created {formatDate(item.createdAt)}</Text>
                    </View>
                    <RunStatusBadge status={item.status} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.employeeCount} employees</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Net: {formatCurrency(item.totalNetPay)}</Text></View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PayrollRunScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const now = new Date();
    const [filterMonth, setFilterMonth] = React.useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = React.useState(now.getFullYear());

    const { data: response, isLoading, error, refetch, isFetching } = usePayrollRuns({ month: filterMonth, year: filterYear } as any);

    const createMutation = useCreatePayrollRun();
    const deleteMutation = useDeletePayrollRun();
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950 dark:text-white">
                        {MONTHS[selectedRun.month - 1]} {selectedRun.year} Run
                    </Text>
                    <RunStatusBadge status={selectedRun.status} />
                    {!['DISBURSED', 'ARCHIVED'].includes(selectedRun.status) && (
                        <Pressable
                            onPress={() => {
                                showConfirm({
                                    title: 'Delete Payroll Run',
                                    message: `Delete payroll run for ${MONTHS[selectedRun.month - 1]} ${selectedRun.year}? This action cannot be undone.`,
                                    confirmText: 'Delete',
                                    variant: 'danger',
                                    onConfirm: () => {
                                        deleteMutation.mutate(selectedRun.id, {
                                            onSuccess: () => { setSelectedRunId(null); },
                                        });
                                    },
                                });
                            }}
                            disabled={deleteMutation.isPending}
                            style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: colors.danger[50] }}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke={colors.danger[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    )}
                </View>
                <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                    <StepIndicator currentStep={currentStep} totalSteps={7} />
                    {(() => {
                        const anyMut = lockMutation.isPending || reviewMutation.isPending || computeMutation.isPending || statutoryMutation.isPending || approveMutation.isPending || disburseMutation.isPending;
                        const stepProps = { runId: selectedRun.id, runDetail: selectedRun, completedStep: currentStep, anyMutating: anyMut };
                        return (
                            <>
                                {currentStep >= 0 && <Step1AttendanceValidation {...stepProps} onStepAction={handleLock} />}
                                {currentStep >= 1 && <Step2PayrollExceptions {...stepProps} onStepAction={handleReview} />}
                                {currentStep >= 2 && <Step3PayrollComputation {...stepProps} onStepAction={handleCompute} />}
                                {currentStep >= 3 && <Step4StatutoryCompliance {...stepProps} onStepAction={handleStatutory} />}
                                {currentStep >= 4 && <Step5PayrollApproval {...stepProps} onStepAction={handleApprove} />}
                                {currentStep >= 5 && <Step6Disbursement {...stepProps} onStepAction={handleDisburse} />}
                                {currentStep >= 6 && <Step7PostPayroll {...stepProps} onStepAction={() => {}} />}
                            </>
                        );
                    })()}
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
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Payroll Runs</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{runs.length} run{runs.length !== 1 ? 's' : ''}</Text>
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
            <FlashList data={runs} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
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

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    // Wizard
    wizardCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    summaryChip: {
        flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
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
        height: 44, borderRadius: 14, backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
        borderWidth: 1.5, borderColor: colors.primary[200],
    },
    exceptionRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    statutoryRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    },
    netPayBanner: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 14, padding: 16,
        alignItems: 'center', marginTop: 4,
    },
    finalSummary: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 14, padding: 16, marginBottom: 12, gap: 8,
    },
    finalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    readyRow: { flexDirection: 'row', alignItems: 'center' },
    // Step indicator
    stepIndicatorContainer: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    stepCircleComplete: { backgroundColor: colors.success[500], borderColor: colors.success[500] },
    stepCircleCurrent: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    stepLine: { width: 20, height: 2, backgroundColor: colors.neutral[200] },
    stepLineActive: { backgroundColor: colors.success[400] },
    // MonthYear Picker
    monthYearPicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    // Form sheet
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
