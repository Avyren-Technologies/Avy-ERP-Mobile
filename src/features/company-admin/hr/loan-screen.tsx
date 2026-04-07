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
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCreateLoan, useUpdateLoanStatus } from '@/features/company-admin/api/use-payroll-mutations';
import { useLoanPolicies, useLoans } from '@/features/company-admin/api/use-payroll-queries';

// ============ TYPES ============

type LoanStatus = 'Pending' | 'Approved' | 'Active' | 'Closed' | 'Rejected';

interface LoanItem {
    id: string;
    employeeId: string;
    employeeName: string;
    policyId: string;
    policyName: string;
    amount: number;
    tenure: number;
    interestRate: number;
    emi: number;
    outstanding: number;
    status: LoanStatus;
}

// ============ CONSTANTS ============

const LOAN_STATUSES: LoanStatus[] = ['Pending', 'Approved', 'Active', 'Closed', 'Rejected'];

const STATUS_COLORS: Record<LoanStatus, { bg: string; text: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700] },
    Approved: { bg: colors.info[50], text: colors.info[700] },
    Active: { bg: colors.success[50], text: colors.success[700] },
    Closed: { bg: colors.neutral[100], text: colors.neutral[600] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700] },
};

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function computeEMI(principal: number, annualRate: number, months: number): number {
    if (months <= 0 || principal <= 0) return 0;
    if (annualRate <= 0) return Math.round(principal / months);
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * (1 + monthlyRate)**months) / ((1 + monthlyRate)**months - 1);
    return Math.round(emi);
}

// ============ SHARED ATOMS ============

function LoanStatusBadge({ status }: { status: LoanStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function StatusFilterChips({ value, onChange }: { value: LoanStatus | 'All'; onChange: (v: LoanStatus | 'All') => void }) {
    const all: (LoanStatus | 'All')[] = ['All', ...LOAN_STATUSES];
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {all.map(opt => {
                const selected = opt === value;
                return (
                    <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.filterChip, selected && styles.filterChipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

function Dropdown({ label, value, options, onSelect, placeholder, searchable }: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; searchable?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const filtered = searchable && q.trim()
        ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
        : options;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); setQ(''); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ FORM MODAL ============

function CreateLoanModal({
    visible, onClose, onSave, isSaving, employeeOptions, policyOptions, policiesData,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    policyOptions: { id: string; label: string }[];
    policiesData: any[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [policyId, setPolicyId] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [tenure, setTenure] = React.useState('');

    React.useEffect(() => {
        if (visible) { setEmployeeId(''); setPolicyId(''); setAmount(''); setTenure(''); }
    }, [visible]);

    const selectedPolicy = policiesData.find((p: any) => (p.id ?? '') === policyId);
    const interestRate = selectedPolicy?.interestRate ?? 0;
    const emi = computeEMI(Number(amount) || 0, interestRate, Number(tenure) || 0);

    const handleSave = () => {
        if (!employeeId || !policyId || !(Number(amount) > 0) || !(Number(tenure) > 0)) return;
        onSave({ employeeId, policyId, amount: Number(amount), tenure: Number(tenure), interestRate, emi });
    };

    const isValid = employeeId && policyId && Number(amount) > 0 && Number(tenure) > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New Loan</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." searchable />
                        <Dropdown label="Loan Policy" value={policyId} options={policyOptions} onSelect={setPolicyId} placeholder="Select policy..." />
                        {selectedPolicy && (
                            <View style={styles.infoChip}>
                                <Text className="font-inter text-[10px] text-info-700">
                                    Rate: {interestRate}% p.a.  {'\u00B7'}  Max: {formatCurrency(selectedPolicy.maxAmount ?? 0)}  {'\u00B7'}  Max tenure: {selectedPolicy.maxTenure ?? 0}m
                                </Text>
                            </View>
                        )}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Loan Amount <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500">&#8377;</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="100000" placeholderTextColor={colors.neutral[400]} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Tenure (months) <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="12" placeholderTextColor={colors.neutral[400]} value={tenure} onChangeText={setTenure} keyboardType="number-pad" /></View>
                        </View>
                        {emi > 0 && (
                            <View style={styles.emiPreview}>
                                <Text className="font-inter text-xs text-neutral-500">Estimated Monthly EMI</Text>
                                <Text className="font-inter text-lg font-bold text-primary-800">{formatCurrency(emi)}</Text>
                            </View>
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Loan'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD ============

function LoanCard({ item, index, onPress, onStatusAction }: { item: LoanItem; index: number; onPress: () => void; onStatusAction: (action: string) => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <LoanStatusBadge status={item.status} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{item.policyName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-sm font-bold text-primary-800">{formatCurrency(item.amount)}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">EMI: {formatCurrency(item.emi)}</Text>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">Outstanding: {formatCurrency(item.outstanding)}</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{item.tenure}m @ {item.interestRate}%</Text></View>
                </View>
                {/* Status actions */}
                {(item.status === 'Pending' || item.status === 'Approved') && (
                    <View style={styles.actionRow}>
                        {item.status === 'Pending' && (
                            <>
                                <Pressable onPress={() => onStatusAction('Approved')} style={[styles.actionBtn, { backgroundColor: colors.info[50] }]}>
                                    <Text className="font-inter text-xs font-bold text-info-700">Approve</Text>
                                </Pressable>
                                <Pressable onPress={() => onStatusAction('Rejected')} style={[styles.actionBtn, { backgroundColor: colors.danger[50] }]}>
                                    <Text className="font-inter text-xs font-bold text-danger-700">Reject</Text>
                                </Pressable>
                            </>
                        )}
                        {item.status === 'Approved' && (
                            <Pressable onPress={() => onStatusAction('Active')} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                                <Text className="font-inter text-xs font-bold text-success-700">Disburse</Text>
                            </Pressable>
                        )}
                    </View>
                )}
                {item.status === 'Active' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={() => onStatusAction('Closed')} style={[styles.actionBtn, { backgroundColor: colors.neutral[100] }]}>
                            <Text className="font-inter text-xs font-bold text-neutral-600">Close Loan</Text>
                        </Pressable>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function LoanScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useLoans();
    const createMutation = useCreateLoan();
    const statusMutation = useUpdateLoanStatus();

    const { data: empResponse } = useEmployees();
    const { data: policyResponse } = useLoanPolicies();

    const [formVisible, setFormVisible] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<LoanStatus | 'All'>('All');

    const toOptions = (res: any) => {
        const raw = (res as any)?.data ?? res ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    };

    const employeeOptions = React.useMemo(() => toOptions(empResponse), [empResponse]);
    const policyOptions = React.useMemo(() => toOptions(policyResponse), [policyResponse]);
    const policiesData = React.useMemo(() => {
        const raw = (policyResponse as any)?.data ?? policyResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [policyResponse]);

    const items: LoanItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            policyId: item.policyId ?? '',
            policyName: item.policyName ?? '',
            amount: item.amount ?? 0,
            tenure: item.tenure ?? 0,
            interestRate: item.interestRate ?? 0,
            emi: item.emi ?? 0,
            outstanding: item.outstanding ?? item.amount ?? 0,
            status: item.status ?? 'Pending',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let result = items;
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(i => i.employeeName.toLowerCase().includes(q));
        }
        return result;
    }, [items, search, statusFilter]);

    const handleAdd = () => setFormVisible(true);
    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const handleStatusAction = (item: LoanItem, newStatus: string) => {
        const actionLabel = newStatus === 'Approved' ? 'Approve' : newStatus === 'Rejected' ? 'Reject' : newStatus === 'Active' ? 'Disburse' : 'Close';
        const variant = newStatus === 'Rejected' ? 'danger' as const : 'primary' as const;
        showConfirm({
            title: `${actionLabel} Loan`,
            message: `${actionLabel} loan for ${item.employeeName} (${formatCurrency(item.amount)})?`,
            confirmText: actionLabel, variant,
            onConfirm: () => { statusMutation.mutate({ id: item.id, data: { status: newStatus } }); },
        });
    };

    const renderItem = ({ item, index }: { item: LoanItem; index: number }) => (
        <LoanCard item={item} index={index} onPress={() => {}} onStatusAction={newStatus => handleStatusAction(item, newStatus)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Loans</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} loan{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name..." /></View>
            <View style={{ marginTop: 12 }}>
                <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load loans" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim() || statusFilter !== 'All') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No loans match your filters." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No loans yet" message="Create a new loan to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Loans" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <CreateLoanModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                isSaving={createMutation.isPending} employeeOptions={employeeOptions}
                policyOptions={policyOptions} policiesData={policiesData}
            />
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
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    infoChip: { backgroundColor: colors.info[50], borderRadius: 8, padding: 8, marginBottom: 12 },
    emiPreview: { backgroundColor: colors.primary[50], borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
