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
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { usePaymentList, useRecordPayment } from '@/features/super-admin/api/use-payment-queries';
import type { PaymentMethod, PaymentRecord, RecordPaymentPayload } from '@/lib/api/payment';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const PAYMENT_METHODS: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { key: 'CHEQUE', label: 'Cheque' },
    { key: 'CASH', label: 'Cash' },
    { key: 'RAZORPAY', label: 'Razorpay' },
    { key: 'UPI', label: 'UPI' },
    { key: 'OTHER', label: 'Other' },
];

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
    BANK_TRANSFER: { bg: colors.info[50], text: colors.info[700] },
    CHEQUE: { bg: colors.warning[50], text: colors.warning[700] },
    CASH: { bg: colors.success[50], text: colors.success[700] },
    RAZORPAY: { bg: colors.accent[50], text: colors.accent[700] },
    UPI: { bg: colors.primary[50], text: colors.primary[700] },
    OTHER: { bg: colors.neutral[100], text: colors.neutral[600] },
};

function formatMethodLabel(method: string): string {
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ PAYMENT CARD ============

function PaymentCard({ payment, index }: { payment: PaymentRecord; index: number }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => fmt.date(d);
    const methodStyle = METHOD_COLORS[payment.method] ?? METHOD_COLORS.OTHER;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 50)}>
            <View style={styles.card}>
                {/* Top row: date + amount */}
                <View style={styles.cardTopRow}>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(payment.paidAt)}
                    </Text>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                        {formatCurrency(payment.amount)}
                    </Text>
                </View>

                {/* Invoice + Tenant */}
                <View style={styles.cardMiddleRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-semibold text-neutral-800" numberOfLines={1}>
                            {payment.tenantName ?? 'Unknown Tenant'}
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Invoice: {payment.invoiceNumber ?? payment.invoiceId}
                        </Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: methodStyle.bg }]}>
                        <Text
                            className="font-inter text-[10px] font-bold"
                            style={{ color: methodStyle.text }}
                        >
                            {formatMethodLabel(payment.method)}
                        </Text>
                    </View>
                </View>

                {/* Reference */}
                {payment.transactionReference ? (
                    <View style={styles.cardBottomRow}>
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                            <Path
                                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <Path
                                d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </Svg>
                        <Text className="font-inter text-[10px] text-neutral-400 ml-1" numberOfLines={1}>
                            Ref: {payment.transactionReference}
                        </Text>
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
}

// ============ RECORD PAYMENT MODAL ============

const FORM_METHODS: PaymentMethod[] = [
    'BANK_TRANSFER',
    'CHEQUE',
    'CASH',
    'RAZORPAY',
    'UPI',
    'OTHER',
];

function RecordPaymentModal({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: RecordPaymentPayload) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [invoiceId, setInvoiceId] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [method, setMethod] = React.useState<PaymentMethod>('BANK_TRANSFER');
    const [reference, setReference] = React.useState('');
    const [paidAt, setPaidAt] = React.useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = React.useState('');

    const resetForm = () => {
        setInvoiceId('');
        setAmount('');
        setMethod('BANK_TRANSFER');
        setReference('');
        setPaidAt(new Date().toISOString().split('T')[0]);
        setNotes('');
    };

    const handleSubmit = () => {
        if (!invoiceId.trim() || !amount.trim()) return;
        onSubmit({
            invoiceId: invoiceId.trim(),
            amount: parseFloat(amount),
            method,
            transactionReference: reference.trim() || undefined,
            paidAt: new Date(paidAt).toISOString(),
            notes: notes.trim() || undefined,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.modalContainer, { paddingTop: insets.top + 12 }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">
                        Record Payment
                    </Text>
                    <Pressable onPress={handleClose} style={styles.modalCloseBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path
                                d="M18 6L6 18M6 6l12 12"
                                stroke={colors.neutral[500]}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </Svg>
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Invoice ID */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Invoice ID *
                        </Text>
                        <TextInput
                            value={invoiceId}
                            onChangeText={setInvoiceId}
                            placeholder="Enter invoice ID"
                            placeholderTextColor={colors.neutral[400]}
                            style={styles.formInput}
                        />
                    </View>

                    {/* Amount */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Amount (INR) *
                        </Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={colors.neutral[400]}
                            keyboardType="decimal-pad"
                            style={styles.formInput}
                        />
                    </View>

                    {/* Payment Method */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Payment Method
                        </Text>
                        <View style={styles.methodChipRow}>
                            {FORM_METHODS.map((m) => {
                                const active = method === m;
                                return (
                                    <Pressable
                                        key={m}
                                        onPress={() => setMethod(m)}
                                        style={[
                                            styles.formMethodChip,
                                            active && styles.formMethodChipActive,
                                        ]}
                                    >
                                        <Text
                                            className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                                        >
                                            {formatMethodLabel(m)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Transaction Reference */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Transaction Reference
                        </Text>
                        <TextInput
                            value={reference}
                            onChangeText={setReference}
                            placeholder="e.g., TXN-2024-001"
                            placeholderTextColor={colors.neutral[400]}
                            style={styles.formInput}
                        />
                    </View>

                    {/* Date */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Payment Date
                        </Text>
                        <TextInput
                            value={paidAt}
                            onChangeText={setPaidAt}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.neutral[400]}
                            style={styles.formInput}
                        />
                    </View>

                    {/* Notes */}
                    <View style={styles.formGroup}>
                        <Text className="font-inter text-sm font-semibold text-neutral-700 mb-1.5">
                            Notes
                        </Text>
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Optional notes..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={3}
                            style={[styles.formInput, styles.formTextArea]}
                        />
                    </View>

                    {/* Submit */}
                    <Pressable
                        onPress={handleSubmit}
                        disabled={isSubmitting || !invoiceId.trim() || !amount.trim()}
                        style={({ pressed }) => [
                            styles.submitBtn,
                            pressed && styles.submitBtnPressed,
                            (isSubmitting || !invoiceId.trim() || !amount.trim()) && styles.submitBtnDisabled,
                        ]}
                    >
                        <Text className="font-inter text-base font-bold text-white">
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </Text>
                    </Pressable>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function PaymentHistoryScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const [methodFilter, setMethodFilter] = React.useState('ALL');
    const [page] = React.useState(1);
    const [showRecordModal, setShowRecordModal] = React.useState(false);

    const queryParams = React.useMemo(() => ({
        page,
        limit: 50,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
    }), [page, methodFilter]);

    const { data: response, isLoading, error, refetch, isFetching } = usePaymentList(queryParams);

    const rawData = (response as any)?.data ?? response ?? [];
    const payments: PaymentRecord[] = React.useMemo(() => {
        if (Array.isArray(rawData)) return rawData;
        return [];
    }, [rawData]);

    const totalCount = (response as any)?.meta?.total ?? payments.length;

    const recordPayment = useRecordPayment();

    const handleRecordPayment = (data: RecordPaymentPayload) => {
        recordPayment.mutate(data, {
            onSuccess: () => {
                setShowRecordModal(false);
            },
        });
    };

    const renderPayment = ({ item, index }: { item: PaymentRecord; index: number }) => (
        <PaymentCard payment={item} index={index} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Payment History
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                        {totalCount} payments recorded
                    </Text>
                </View>
            </Animated.View>

            {/* Filter Chips */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.filterSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {PAYMENT_METHODS.map((f) => {
                        const active = methodFilter === f.key;
                        return (
                            <Pressable
                                key={f.key}
                                onPress={() => setMethodFilter(f.key)}
                                style={[
                                    styles.filterChip,
                                    active && styles.filterChipActive,
                                ]}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                                >
                                    {f.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 24 }]}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                    <EmptyState
                        icon="error"
                        title="Failed to load payments"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon="search"
                    title="No payments found"
                    message={
                        methodFilter !== 'ALL'
                            ? 'Try changing the method filter.'
                            : 'No payment records yet.'
                    }
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlashList
                data={payments}
                renderItem={renderPayment}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />

            <FAB onPress={() => setShowRecordModal(true)} />

            <RecordPaymentModal
                visible={showRecordModal}
                onClose={() => setShowRecordModal(false)}
                onSubmit={handleRecordPayment}
                isSubmitting={recordPayment.isPending}
            />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 4,
    },
    filterSection: {
        paddingVertical: 12,
    },
    filterScrollContent: {
        paddingHorizontal: 24,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    filterChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardMiddleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    methodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    formGroup: {
        marginBottom: 18,
    },
    formInput: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter',
        color: colors.neutral[900],
    },
    formTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    methodChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    formMethodChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    formMethodChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    submitBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnPressed: {
        backgroundColor: colors.primary[700],
        transform: [{ scale: 0.98 }],
    },
    submitBtnDisabled: {
        backgroundColor: colors.neutral[300],
        shadowOpacity: 0,
        elevation: 0,
    },
});
const styles = createStyles(false);
