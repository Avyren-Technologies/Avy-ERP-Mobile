/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useExpenseClaims } from '@/features/company-admin/api/use-recruitment-queries';
import {
    useCreateExpenseClaim,
    useApproveExpenseClaim,
    useRejectExpenseClaim,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type ClaimStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
type ExpenseCategory = 'Travel' | 'Medical' | 'Fuel' | 'Food' | 'Accommodation' | 'Communication' | 'Office Supplies' | 'Other';

interface ExpenseClaimItem {
    id: string;
    employeeId: string;
    employeeName: string;
    title: string;
    amount: number;
    category: ExpenseCategory;
    description: string;
    tripDate: string;
    status: ClaimStatus;
    createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: ('All' | ClaimStatus)[] = ['All', 'Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Travel', 'Medical', 'Fuel', 'Food', 'Accommodation', 'Communication', 'Office Supplies', 'Other'];

const STATUS_COLORS: Record<ClaimStatus, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Submitted: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Paid: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
};

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string }> = {
    Travel: { bg: colors.info[50], text: colors.info[700] },
    Medical: { bg: colors.danger[50], text: colors.danger[700] },
    Fuel: { bg: colors.warning[50], text: colors.warning[700] },
    Food: { bg: colors.success[50], text: colors.success[700] },
    Accommodation: { bg: colors.accent[50], text: colors.accent[700] },
    Communication: { bg: colors.primary[50], text: colors.primary[700] },
    'Office Supplies': { bg: colors.neutral[100], text: colors.neutral[700] },
    Other: { bg: colors.neutral[100], text: colors.neutral[600] },
};

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: ClaimStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function CategoryBadge({ category }: { category: ExpenseCategory }) {
    const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{category}</Text>
        </View>
    );
}

function AvatarCircle({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatar}>
            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredOptions.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            {filteredOptions.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CLAIM FORM MODAL ============

function ClaimFormModal({
    visible, onClose, onSave, employeeOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    employeeOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [category, setCategory] = React.useState<ExpenseCategory>('Travel');
    const [description, setDescription] = React.useState('');
    const [tripDate, setTripDate] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeId(''); setTitle(''); setAmount(''); setCategory('Travel');
            setDescription(''); setTripDate('');
        }
    }, [visible]);

    const isValid = employeeId && title.trim() && amount.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">New Expense Claim</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Title <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Client visit travel" placeholderTextColor={colors.neutral[400]} value={title} onChangeText={setTitle} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Amount <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={amount} onChangeText={setAmount} keyboardType="number-pad" /></View>
                        </View>
                        <ChipSelector label="Category" options={[...EXPENSE_CATEGORIES]} value={category} onSelect={v => setCategory(v as ExpenseCategory)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Expense details..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Trip Date</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={tripDate} onChangeText={setTripDate} /></View>
                        </View>
                        <View style={{ backgroundColor: colors.neutral[50], borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}>
                            <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="mt-2 font-inter text-xs text-neutral-400">Upload receipts (coming soon)</Text>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ employeeId, employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '', title: title.trim(), amount: Number(amount) || 0, category, description: description.trim(), tripDate: tripDate.trim(), status: 'Submitted' })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit Claim'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CLAIM CARD ============

function ClaimCard({ item, index, onApprove, onReject }: {
    item: ExpenseClaimItem; index: number;
    onApprove: () => void; onReject: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <CategoryBadge category={item.category} />
                    <Text className="font-inter text-sm font-bold text-primary-700">{'\u20B9'}{item.amount.toLocaleString('en-IN')}</Text>
                    {item.tripDate ? <Text className="font-inter text-xs text-neutral-400">{item.tripDate}</Text> : null}
                </View>
                {item.description ? <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.description}</Text> : null}
                {item.status === 'Submitted' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApprove} style={styles.approveBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                        <Pressable onPress={onReject} style={styles.rejectActionBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ExpensesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | ClaimStatus>('All');
    const [formVisible, setFormVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useExpenseClaims();
    const createMutation = useCreateExpenseClaim();
    const approveMutation = useApproveExpenseClaim();
    const rejectMutation = useRejectExpenseClaim();
    const { data: empResponse } = useEmployees();

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const claims: ExpenseClaimItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            title: item.title ?? '', amount: item.amount ?? 0, category: item.category ?? 'Other',
            description: item.description ?? '', tripDate: item.tripDate ?? '', status: item.status ?? 'Draft',
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let list = claims;
        if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => c.employeeName.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
        }
        return list;
    }, [claims, statusFilter, search]);

    const handleApprove = (item: ExpenseClaimItem) => {
        showConfirm({
            title: 'Approve Claim',
            message: `Approve ${item.employeeName}'s claim of ${'\u20B9'}${item.amount.toLocaleString('en-IN')}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => approveMutation.mutate(item.id),
        });
    };

    const handleReject = (item: ExpenseClaimItem) => {
        showConfirm({
            title: 'Reject Claim',
            message: `Reject ${item.employeeName}'s claim "${item.title}"?`,
            confirmText: 'Reject', variant: 'danger',
            onConfirm: () => rejectMutation.mutate(item.id),
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const totalAmount = React.useMemo(() => claims.reduce((sum, c) => sum + c.amount, 0), [claims]);

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Expense Claims</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{claims.length} claim{claims.length !== 1 ? 's' : ''} | Total: {'\u20B9'}{totalAmount.toLocaleString('en-IN')}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee or title..." /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
                {STATUS_FILTERS.map(s => {
                    const active = s === statusFilter;
                    return (
                        <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{s}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No expense claims" message="Submit your first expense claim." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Expenses</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filtered}
                renderItem={({ item, index }) => <ClaimCard item={item} index={index} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <ClaimFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} employeeOptions={employeeOptions} isSaving={createMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.success[600] },
    rejectActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
