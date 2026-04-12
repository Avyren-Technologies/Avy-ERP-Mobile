/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useSubmitProbationReview } from '@/features/company-admin/api/use-hr-mutations';
import { useProbationDue } from '@/features/company-admin/api/use-hr-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface ProbationEmployee {
    id: string;
    name: string;
    employeeId: string;
    department: string;
    designation: string;
    probationEndDate: string;
}

const DECISIONS = ['Confirm', 'Extend', 'Terminate'] as const;
type Decision = typeof DECISIONS[number];

// ============ HELPERS ============

function getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============ URGENCY BADGE ============

function UrgencyBadge({ days }: { days: number }) {
    const bg = days < 7 ? colors.danger[50] : days < 15 ? colors.warning[50] : days < 30 ? '#FEF9C3' : colors.success[50];
    const textCls = days < 7 ? 'text-danger-700' : days < 15 ? 'text-warning-700' : days < 30 ? 'text-yellow-700' : 'text-success-700';
    const label = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`;
    return (
        <View style={[styles.typeBadge, { backgroundColor: bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${textCls}`}>{label}</Text>
        </View>
    );
}

// ============ STAR RATING ============

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => onChange(star)} hitSlop={4}>
                    <Svg width={28} height={28} viewBox="0 0 24 24">
                        <Path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={star <= value ? colors.warning[400] : 'none'}
                            stroke={star <= value ? colors.warning[400] : colors.neutral[300]}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
            ))}
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    const isTerminate = opt === 'Terminate';
                    return (
                        <Pressable
                            key={opt}
                            onPress={() => onSelect(opt)}
                            style={[
                                styles.chip,
                                selected && (isTerminate ? styles.chipDanger : styles.chipActive),
                            ]}
                        >
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : isTerminate ? 'text-danger-600' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ REVIEW MODAL ============

function ReviewModal({
    visible,
    onClose,
    employee,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    employee: ProbationEmployee | null;
    onSubmit: (data: { rating: number; feedback: string; decision: string; extensionMonths?: number }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [rating, setRating] = React.useState(0);
    const [feedback, setFeedback] = React.useState('');
    const [decision, setDecision] = React.useState('');
    const [extensionMonths, setExtensionMonths] = React.useState('3');

    React.useEffect(() => {
        if (visible) { setRating(0); setFeedback(''); setDecision(''); setExtensionMonths('3'); }
    }, [visible]);

    const isValid = rating > 0 && decision.length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">Probation Review</Text>
                    {employee && (
                        <View style={{ backgroundColor: colors.neutral[50], borderRadius: 12, padding: 12, marginBottom: 16 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{employee.name}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{employee.employeeId} &middot; {employee.department} &middot; {employee.designation}</Text>
                        </View>
                    )}
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        {/* Rating */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Performance Rating <Text className="text-danger-500">*</Text></Text>
                            <StarRating value={rating} onChange={setRating} />
                        </View>
                        {/* Feedback */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Feedback</Text>
                            <View style={[styles.inputWrap, { height: 100 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Enter review feedback..." placeholderTextColor={colors.neutral[400]} value={feedback} onChangeText={setFeedback} multiline />
                            </View>
                        </View>
                        {/* Decision */}
                        <ChipSelector label="Decision *" options={[...DECISIONS]} value={decision} onSelect={setDecision} />
                        {/* Extension */}
                        {decision === 'Extend' && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Extension (months)</Text>
                                <ChipSelector label="" options={['1', '2', '3', '6']} value={extensionMonths} onSelect={setExtensionMonths} />
                            </View>
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable
                            onPress={() => onSubmit({ rating, feedback, decision: decision.toUpperCase(), extensionMonths: decision === 'Extend' ? Number(extensionMonths) : undefined })}
                            disabled={!isValid || isSubmitting}
                            style={[decision === 'Terminate' ? styles.dangerBtn : styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSubmitting ? 'Submitting...' : 'Submit Review'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ EMPLOYEE CARD ============

function EmployeeCard({ item, index, onReview }: { item: ProbationEmployee; index: number; onReview: () => void }) {
    const fmt = useCompanyFormatter();
    const endDate = item.probationEndDate ?? (item as any).probationEnd;
    const days = getDaysRemaining(endDate);
    const borderColor = days < 7 ? colors.danger[200] : days < 15 ? colors.warning[200] : days < 30 ? '#FDE68A' : colors.primary[50];
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onReview} style={({ pressed }) => [styles.card, { borderColor }, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.avatar}>
                            <Text className="font-inter text-sm font-bold text-primary-700">{(item.name ?? '?')[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.employeeId}</Text>
                        </View>
                    </View>
                    <UrgencyBadge days={days} />
                </View>
                <View style={styles.cardMeta}>
                    {item.department ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">{item.department}</Text>
                        </View>
                    ) : null}
                    {item.designation ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.designation}</Text>
                        </View>
                    ) : null}
                    {endDate ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Ends: {fmt.date(endDate)}</Text>
                        </View>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ SUMMARY CARD ============

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <View style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">{count}</Text>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{label}</Text>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function ProbationReviewScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [reviewVisible, setReviewVisible] = React.useState(false);
    const [selectedEmployee, setSelectedEmployee] = React.useState<ProbationEmployee | null>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useProbationDue();
    const submitMutation = useSubmitProbationReview();

    const employees: ProbationEmployee[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        return Array.isArray(raw) ? raw.map((e: any) => ({
            id: e.id ?? '', name: e.name ?? '', employeeId: e.employeeId ?? '',
            department: e.department ?? '', designation: e.designation ?? '',
            probationEndDate: e.probationEndDate ?? e.probationEnd ?? '',
        })) : [];
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return employees;
        const q = search.toLowerCase();
        return employees.filter(e => e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
    }, [employees, search]);

    const urgentCount = employees.filter(e => getDaysRemaining(e.probationEndDate) < 7).length;
    const soonCount = employees.filter(e => { const d = getDaysRemaining(e.probationEndDate); return d >= 7 && d < 30; }).length;

    const openReview = (emp: ProbationEmployee) => { setSelectedEmployee(emp); setReviewVisible(true); };

    const handleSubmit = (data: { rating: number; feedback: string; decision: string; extensionMonths?: number }) => {
        if (!selectedEmployee) return;
        submitMutation.mutate({ id: selectedEmployee.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setReviewVisible(false) });
    };

    const renderItem = ({ item, index }: { item: ProbationEmployee; index: number }) => (
        <EmployeeCard item={item} index={index} onReview={() => openReview(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Probation Reviews</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{employees.length} employee{employees.length !== 1 ? 's' : ''} due</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <SummaryCard label="Total Due" count={employees.length} color={colors.primary[500]} />
                <SummaryCard label="< 7 Days" count={urgentCount} color={colors.danger[500]} />
                <SummaryCard label="< 30 Days" count={soonCount} color={colors.warning[500]} />
            </View>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, ID..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No employees match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No reviews due" message="All employees have been reviewed." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Probation Reviews" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <ReviewModal visible={reviewVisible} onClose={() => setReviewVisible(false)} employee={selectedEmployee} onSubmit={handleSubmit} isSubmitting={submitMutation.isPending} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    summaryCard: { flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 14, padding: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.primary[800] : colors.primary[100], justifyContent: 'center', alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    chipDanger: { backgroundColor: colors.danger[500], borderColor: colors.danger[500] },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    dangerBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.danger[500], justifyContent: 'center', alignItems: 'center', shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
