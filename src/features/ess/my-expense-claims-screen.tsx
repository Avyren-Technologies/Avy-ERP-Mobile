/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useMyExpenseClaims } from '@/features/company-admin/api/use-ess-queries';
import { useCreateMyExpenseClaim, useSubmitMyExpenseClaim } from '@/features/company-admin/api/use-ess-mutations';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    SUBMITTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    PAID: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    TRAVEL: { bg: colors.info[50], text: colors.info[700] },
    MEDICAL: { bg: colors.danger[50], text: colors.danger[700] },
    INTERNET: { bg: colors.accent[50], text: colors.accent[700] },
    FUEL: { bg: colors.warning[50], text: colors.warning[700] },
    UNIFORM: { bg: colors.primary[50], text: colors.primary[700] },
    BUSINESS: { bg: colors.success[50], text: colors.success[700] },
    OTHER: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const EXPENSE_CATEGORIES = ['TRAVEL', 'MEDICAL', 'INTERNET', 'FUEL', 'UNIFORM', 'BUSINESS', 'OTHER'];

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function CategoryBadge({ category }: { category: string }) {
    const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
    return (
        <View style={[styles.catBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{category}</Text>
        </View>
    );
}

function formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '\u20B90';
    return `\u20B9${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

// ── Create Expense Claim Modal ──────────────────────────────────

function CreateExpenseClaimModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { title: string; amount: number; category: string; description: string; tripDate: string }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [tripDate, setTripDate] = React.useState('');
    const [categoryPickerVisible, setCategoryPickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            setTitle(''); setAmount(''); setCategory(''); setDescription(''); setTripDate('');
        }
    }, [visible]);

    const isValid = title.trim() && parseFloat(amount) > 0 && category;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">New Expense Claim</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
                        {/* Title */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Title <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Client visit cab fare"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>
                        </View>

                        {/* Amount */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Amount ({'\u20B9'}) <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Category Picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Category <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable onPress={() => setCategoryPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${category ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {category || 'Select category...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={categoryPickerVisible} transparent animationType="slide" onRequestClose={() => setCategoryPickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCategoryPickerVisible(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Category</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {EXPENSE_CATEGORIES.map((cat) => (
                                                <Pressable
                                                    key={cat}
                                                    onPress={() => { setCategory(cat); setCategoryPickerVisible(false); }}
                                                    style={{
                                                        paddingVertical: 12,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: colors.neutral[100],
                                                        backgroundColor: cat === category ? colors.primary[50] : undefined,
                                                        paddingHorizontal: 4,
                                                        borderRadius: 8,
                                                    }}
                                                >
                                                    <Text className={`font-inter text-sm ${cat === category ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{cat}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Trip Date */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Trip Date</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={tripDate}
                                    onChangeText={setTripDate}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 100 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Additional details..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSave({
                                title: title.trim(),
                                amount: parseFloat(amount),
                                category,
                                description: description.trim(),
                                tripDate: tripDate.trim(),
                            })}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Claim'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyExpenseClaimsScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyExpenseClaims();
    const createClaim = useCreateMyExpenseClaim();
    const submitClaim = useSubmitMyExpenseClaim();

    const [formVisible, setFormVisible] = React.useState(false);

    const claims = (data as any)?.data ?? [];

    const handleCreate = (formData: { title: string; amount: number; category: string; description: string; tripDate: string }) => {
        createClaim.mutate(formData, {
            onSuccess: () => setFormVisible(false),
            onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to create expense claim'),
        });
    };

    const handleSubmit = (id: string) => {
        showConfirm({
            title: 'Submit Expense Claim',
            message: 'Are you sure you want to submit this claim for approval? This cannot be undone.',
            confirmText: 'Submit',
            variant: 'primary',
            onConfirm: () => {
                submitClaim.mutate(id, {
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to submit expense claim'),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.title ?? 'Untitled'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <CategoryBadge category={item.category ?? 'OTHER'} />
                        <Text className="font-inter text-xs font-bold text-primary-700">
                            {formatCurrency(item.amount)}
                        </Text>
                    </View>
                </View>
                <StatusBadge status={item.status ?? 'DRAFT'} />
            </View>
            {item.description ? (
                <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.description}</Text>
            ) : null}
            {item.createdAt && (
                <Text className="font-inter text-[10px] text-neutral-400 mt-1">Created: {formatDate(item.createdAt)}</Text>
            )}
            {item.status === 'DRAFT' && (
                <Pressable onPress={() => handleSubmit(item.id)} style={styles.submitActionBtn}>
                    <Text className="font-inter text-xs font-semibold text-primary-600">Submit for Approval</Text>
                </Pressable>
            )}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={open} />
                    <Text className="font-inter text-lg font-bold text-white ml-3">Expense Claims</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={claims}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text className="font-inter text-sm text-neutral-400">No expense claims</Text>
                        </View>
                    ) : null
                }
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateExpenseClaimModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleCreate}
                isSaving={createClaim.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
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
    submitActionBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.primary[50] },
});
