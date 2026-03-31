/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    SectionList,
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
import { FAB } from '@/components/ui/fab';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useMyLoans, useEssLoanPolicies } from '@/features/company-admin/api/use-ess-queries';
import { useApplyForLoan } from '@/features/company-admin/api/use-ess-mutations';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    ACTIVE: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    CLOSED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    DRAFT: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    PAID: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '\u20B90';
    return `\u20B9${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
    if (!principal || !annualRate || !tenureMonths) return 0;
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
}

// ── Apply for Loan Modal ────────────────────────────────────────

function ApplyLoanModal({
    visible, onClose, onSave, isSaving, policies,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { policyId: string; amount: number; tenureMonths: number; reason: string }) => void;
    isSaving: boolean;
    policies: any[];
}) {
    const insets = useSafeAreaInsets();
    const [policyId, setPolicyId] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [tenure, setTenure] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [policyPickerVisible, setPolicyPickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            setPolicyId(''); setAmount(''); setTenure(''); setReason('');
        }
    }, [visible]);

    const selectedPolicy = policies.find((p: any) => p.id === policyId);
    const parsedAmount = parseFloat(amount) || 0;
    const parsedTenure = parseInt(tenure, 10) || 0;
    const rate = selectedPolicy?.interestRate ?? 0;
    const emi = calculateEMI(parsedAmount, rate, parsedTenure);

    const isValid = policyId && parsedAmount > 0 && parsedTenure > 0 && reason.trim().length >= 5;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Apply for Loan</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }}>
                        {/* Policy Picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Loan Policy <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable onPress={() => setPolicyPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${policyId ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {selectedPolicy?.name ?? 'Select policy...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={policyPickerVisible} transparent animationType="slide" onRequestClose={() => setPolicyPickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPolicyPickerVisible(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Loan Policy</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {policies.map((pol: any) => (
                                                <Pressable
                                                    key={pol.id}
                                                    onPress={() => { setPolicyId(pol.id); setPolicyPickerVisible(false); }}
                                                    style={{
                                                        paddingVertical: 12,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: colors.neutral[100],
                                                        backgroundColor: pol.id === policyId ? colors.primary[50] : undefined,
                                                        paddingHorizontal: 4,
                                                        borderRadius: 8,
                                                    }}
                                                >
                                                    <Text className={`font-inter text-sm ${pol.id === policyId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>
                                                        {pol.name}
                                                    </Text>
                                                    <Text className="font-inter text-xs text-neutral-500 mt-0.5">
                                                        Max: {formatCurrency(pol.maxAmount)} | {pol.interestRate}% | Up to {pol.maxTenureMonths} months
                                                    </Text>
                                                </Pressable>
                                            ))}
                                            {policies.length === 0 && (
                                                <Text className="py-4 text-center font-inter text-sm text-neutral-400">No loan policies available</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Amount */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Amount ({'\u20B9'}) <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={selectedPolicy ? `Max ${formatCurrency(selectedPolicy.maxAmount)}` : '0'}
                                    placeholderTextColor={colors.neutral[400]}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Tenure */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Tenure (months) <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={selectedPolicy ? `Max ${selectedPolicy.maxTenureMonths} months` : '0'}
                                    placeholderTextColor={colors.neutral[400]}
                                    value={tenure}
                                    onChangeText={setTenure}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* EMI Display */}
                        {emi > 0 && (
                            <View style={styles.emiCard}>
                                <Text className="font-inter text-xs font-semibold text-primary-700">Estimated Monthly EMI</Text>
                                <Text className="font-inter text-lg font-bold text-primary-950 mt-1">{formatCurrency(emi)}</Text>
                                <Text className="font-inter text-[10px] text-neutral-500 mt-0.5">
                                    at {rate}% p.a. for {parsedTenure} months
                                </Text>
                            </View>
                        )}

                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, { height: 100 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Reason for loan application (min 5 characters)..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={reason}
                                    onChangeText={setReason}
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
                                policyId,
                                amount: parsedAmount,
                                tenureMonths: parsedTenure,
                                reason: reason.trim(),
                            })}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Applying...' : 'Apply'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyLoanScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: loansData, isLoading: loansLoading, refetch: refetchLoans } = useMyLoans();
    const { data: policiesData } = useEssLoanPolicies();
    const applyLoan = useApplyForLoan();

    const [formVisible, setFormVisible] = React.useState(false);

    const loans = (loansData as any)?.data ?? [];
    const policies = React.useMemo(() => {
        const raw = (policiesData as any)?.data ?? policiesData ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [policiesData]);

    const handleApply = (formData: { policyId: string; amount: number; tenureMonths: number; reason: string }) => {
        showConfirm({
            title: 'Apply for Loan',
            message: `Are you sure you want to apply for a loan of ${formatCurrency(formData.amount)}?`,
            confirmText: 'Apply',
            variant: 'primary',
            onConfirm: () => {
                applyLoan.mutate(formData, {
                    onSuccess: () => setFormVisible(false),
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to submit loan application'),
                });
            },
        });
    };

    const sections = React.useMemo(() => {
        const result = [];
        if (policies.length > 0) {
            result.push({ title: 'Available Loan Policies', data: policies, type: 'policy' as const });
        }
        result.push({ title: 'My Loan Applications', data: loans.length > 0 ? loans : [{ _empty: true }], type: 'loan' as const });
        return result;
    }, [policies, loans]);

    const renderSectionHeader = ({ section }: { section: any }) => (
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.sectionHeader}>
            <Text className="font-inter text-sm font-bold text-primary-800">{section.title}</Text>
        </Animated.View>
    );

    const renderItem = ({ item, index, section }: { item: any; index: number; section: any }) => {
        if (item._empty) {
            return (
                <View style={styles.empty}>
                    <Text className="font-inter text-sm text-neutral-400">No loan applications yet</Text>
                </View>
            );
        }

        if (section.type === 'policy') {
            return (
                <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <View style={[styles.tagBadge, { backgroundColor: colors.primary[50] }]}>
                            <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                {item.type ?? 'GENERAL'}
                            </Text>
                        </View>
                        <View style={[styles.tagBadge, { backgroundColor: colors.success[50] }]}>
                            <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                Max {formatCurrency(item.maxAmount)}
                            </Text>
                        </View>
                        <View style={[styles.tagBadge, { backgroundColor: colors.info[50] }]}>
                            <Text style={{ color: colors.info[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                {item.interestRate}% p.a.
                            </Text>
                        </View>
                        <View style={[styles.tagBadge, { backgroundColor: colors.warning[50] }]}>
                            <Text style={{ color: colors.warning[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                Up to {item.maxTenureMonths}m
                            </Text>
                        </View>
                    </View>
                    {item.description ? (
                        <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.description}</Text>
                    ) : null}
                </Animated.View>
            );
        }

        // Loan application
        const policyName = item.policyName ?? item.policy?.name ?? 'Loan';
        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{policyName}</Text>
                        <Text className="font-inter text-xs text-neutral-500 mt-1">
                            Amount: {formatCurrency(item.amount)} | EMI: {formatCurrency(item.emi ?? 0)}
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500 mt-0.5">
                            Tenure: {item.tenureMonths ?? '--'} months
                        </Text>
                    </View>
                    <StatusBadge status={item.status ?? 'PENDING'} />
                </View>
                {item.reason && <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.reason}</Text>}
                {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Applied: {item.createdAt}</Text>}
            </Animated.View>
        );
    };

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
                    <Text className="font-inter text-lg font-bold text-white ml-3">Loans</Text>
                </View>
            </LinearGradient>
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.id ?? `item-${index}`}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={loansLoading} onRefresh={refetchLoans} tintColor={colors.primary[500]} />}
                stickySectionHeadersEnabled={false}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <ApplyLoanModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleApply}
                isSaving={applyLoan.isPending}
                policies={policies}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    sectionHeader: { paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
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
    tagBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: 40 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    emiCard: {
        backgroundColor: colors.primary[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary[200],
        padding: 14,
        marginBottom: 14,
        alignItems: 'center',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
