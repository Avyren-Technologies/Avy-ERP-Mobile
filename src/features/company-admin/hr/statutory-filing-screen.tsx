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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCreateStatutoryFiling, useUpdateStatutoryFiling } from '@/features/company-admin/api/use-payroll-run-mutations';
import { useStatutoryDashboard, useStatutoryFilings } from '@/features/company-admin/api/use-payroll-run-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type FilingType = 'PF_ECR' | 'ESI' | 'TDS' | 'PT' | 'LWF';
type FilingStatus = 'Pending' | 'Filed' | 'Verified' | 'Overdue';

interface StatutoryFilingItem {
    id: string;
    type: FilingType;
    month: number;
    year: number;
    status: FilingStatus;
    amount: number;
    dueDate: string;
    filedDate: string;
    createdAt: string;
}

interface DashboardData {
    filedOnTimePercent: number;
    dueThisWeek: number;
    overdue: number;
}

// ============ CONSTANTS ============

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FILING_TYPE_CONFIG: Record<FilingType, { bg: string; text: string; label: string }> = {
    PF_ECR: { bg: colors.info[50], text: colors.info[700], label: 'PF ECR' },
    ESI: { bg: colors.success[50], text: colors.success[700], label: 'ESI' },
    TDS: { bg: colors.primary[50], text: colors.primary[700], label: 'TDS' },
    PT: { bg: colors.warning[50], text: colors.warning[700], label: 'PT' },
    LWF: { bg: colors.accent[50], text: colors.accent[700], label: 'LWF' },
};

const STATUS_COLORS: Record<FilingStatus, { bg: string; text: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700] },
    Filed: { bg: colors.info[50], text: colors.info[700] },
    Verified: { bg: colors.success[50], text: colors.success[700] },
    Overdue: { bg: colors.danger[50], text: colors.danger[700] },
};

const FILING_TYPES: FilingType[] = ['PF_ECR', 'ESI', 'TDS', 'PT', 'LWF'];

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ ATOMS ============

function FilingTypeBadge({ type }: { type: FilingType }) {
    const config = FILING_TYPE_CONFIG[type] ?? FILING_TYPE_CONFIG.PF_ECR;
    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={{ color: config.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{config.label}</Text>
        </View>
    );
}

function FilingStatusBadge({ status }: { status: FilingStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.badge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function MetricCard({ label, value, color, icon, index }: { label: string; value: string; color: string; icon: string; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 80)} style={[styles.metricCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-2xl font-bold" style={{ color }}>{value}</Text>
            <Text className="mt-1 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</Text>
        </Animated.View>
    );
}

function Dropdown({ label, value, options, onSelect, placeholder }: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string;
}) {
    const [open, setOpen] = React.useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CREATE FILING MODAL ============

function CreateFilingModal({ visible, onClose, onSave, isSaving }: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [type, setType] = React.useState<string>('');
    const [month, setMonth] = React.useState(String(now.getMonth() + 1));
    const [year, setYear] = React.useState(String(now.getFullYear()));
    const [amount, setAmount] = React.useState('');
    const [dueDate, setDueDate] = React.useState('');

    React.useEffect(() => {
        if (visible) { setType(''); setMonth(String(now.getMonth() + 1)); setYear(String(now.getFullYear())); setAmount(''); setDueDate(''); }
    }, [visible]);

    const typeOptions = FILING_TYPES.map(t => ({ id: t, label: FILING_TYPE_CONFIG[t].label }));
    const monthOptions = MONTH_LABELS.map((m, i) => ({ id: String(i + 1), label: m }));
    const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => ({ id: String(y), label: String(y) }));

    const isValid = type && month && year && Number(amount) > 0 && dueDate.trim();

    const handleSave = () => {
        if (!isValid) return;
        onSave({ type, month: Number(month), year: Number(year), amount: Number(amount), dueDate: dueDate.trim() });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">New Statutory Filing</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Filing Type" value={type} options={typeOptions} onSelect={setType} placeholder="Select type..." />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}><Dropdown label="Month" value={month} options={monthOptions} onSelect={setMonth} /></View>
                            <View style={{ flex: 1 }}><Dropdown label="Year" value={year} options={yearOptions} onSelect={setYear} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Amount <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{'₹'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Due Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={dueDate} onChangeText={setDueDate} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Filing'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ FILING CARD ============

function FilingCard({ item, index, onMarkFiled, onMarkVerified }: {
    item: StatutoryFilingItem; index: number; onMarkFiled: () => void; onMarkVerified: () => void;
}) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <FilingTypeBadge type={item.type} />
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{MONTH_LABELS[item.month - 1]} {item.year}</Text>
                    </View>
                    <FilingStatusBadge status={item.status} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Amount: {formatCurrency(item.amount)}</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Due: {formatDate(item.dueDate)}</Text></View>
                    {item.filedDate && (
                        <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] text-success-700">Filed: {formatDate(item.filedDate)}</Text>
                        </View>
                    )}
                </View>
                {/* Status transition buttons */}
                {(item.status === 'Pending' || item.status === 'Overdue') && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onMarkFiled} style={[styles.actionBtn, { backgroundColor: colors.info[50] }]}>
                            <Text className="font-inter text-xs font-bold text-info-700">Mark as Filed</Text>
                        </Pressable>
                    </View>
                )}
                {item.status === 'Filed' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onMarkVerified} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-xs font-bold text-success-700">Mark as Verified</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function StatutoryFilingScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useStatutoryFilings();
    const { data: dashResponse } = useStatutoryDashboard();
    const createMutation = useCreateStatutoryFiling();
    const updateMutation = useUpdateStatutoryFiling();

    const [formVisible, setFormVisible] = React.useState(false);

    const dashboard: DashboardData = React.useMemo(() => {
        const raw = (dashResponse as any)?.data ?? dashResponse ?? {};
        return {
            filedOnTimePercent: raw.filedOnTimePercent ?? raw.filedOnTime ?? 0,
            dueThisWeek: raw.dueThisWeek ?? 0,
            overdue: raw.overdue ?? 0,
        };
    }, [dashResponse]);

    const items: StatutoryFilingItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            type: item.type ?? 'PF_ECR',
            month: item.month ?? 1,
            year: item.year ?? new Date().getFullYear(),
            status: item.status ?? 'Pending',
            amount: item.amount ?? 0,
            dueDate: item.dueDate ?? '',
            filedDate: item.filedDate ?? '',
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const handleMarkFiled = (item: StatutoryFilingItem) => {
        showConfirm({
            title: 'Mark as Filed',
            message: `Mark ${FILING_TYPE_CONFIG[item.type]?.label ?? item.type} for ${MONTH_LABELS[item.month - 1]} ${item.year} as filed?`,
            confirmText: 'Mark Filed', variant: 'primary',
            onConfirm: () => { updateMutation.mutate({ id: item.id, data: { status: 'Filed', filedDate: new Date().toISOString().split('T')[0] } }); },
        });
    };

    const handleMarkVerified = (item: StatutoryFilingItem) => {
        showConfirm({
            title: 'Mark as Verified',
            message: `Mark ${FILING_TYPE_CONFIG[item.type]?.label ?? item.type} for ${MONTH_LABELS[item.month - 1]} ${item.year} as verified?`,
            confirmText: 'Verify', variant: 'primary',
            onConfirm: () => { updateMutation.mutate({ id: item.id, data: { status: 'Verified' } }); },
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: StatutoryFilingItem; index: number }) => (
        <FilingCard item={item} index={index} onMarkFiled={() => handleMarkFiled(item)} onMarkVerified={() => handleMarkVerified(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Statutory Filings</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">Compliance dashboard & filings</Text>

            {/* Dashboard Metrics */}
            <View style={styles.metricRow}>
                <MetricCard label="Filed On Time" value={`${dashboard.filedOnTimePercent}%`} color={colors.success[500]} icon="check" index={0} />
                <MetricCard label="Due This Week" value={String(dashboard.dueThisWeek)} color={colors.warning[500]} icon="clock" index={1} />
                <MetricCard label="Overdue" value={String(dashboard.overdue)} color={colors.danger[500]} icon="alert" index={2} />
            </View>

            <Text className="mt-4 mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">All Filings</Text>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load filings" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No filings" message="Create a new statutory filing to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Statutory Filings" onMenuPress={toggle} />
            <FlashList data={items} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateFilingModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending} />
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
    metricRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    metricCard: {
        flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    // Form
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
