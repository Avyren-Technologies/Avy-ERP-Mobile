/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Modal as RNModal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showSuccess, showErrorMessage } from '@/components/ui/utils';

import {
    useInvoiceDetail,
    useMarkAsPaid,
    useVoidInvoice,
    useSendInvoiceEmail,
} from '@/features/super-admin/api/use-invoice-queries';
import type {
    Invoice,
    InvoiceStatus,
    InvoiceType,
    PaymentMethod,
} from '@/lib/api/invoice';

// ============ CONSTANTS ============

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
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

const TYPE_LABELS: Record<InvoiceType, string> = {
    SUBSCRIPTION: 'Subscription',
    ONE_TIME_LICENSE: 'One-Time License',
    AMC: 'AMC',
    PRORATED_ADJUSTMENT: 'Prorated Adjustment',
};

// ============ HELPERS ============

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function toStatusBadge(status: InvoiceStatus): 'paid' | 'pending' | 'overdue' | 'cancelled' {
    switch (status) {
        case 'PAID': return 'paid';
        case 'OVERDUE': return 'overdue';
        case 'CANCELLED': return 'cancelled';
        default: return 'pending';
    }
}

// ============ MARK AS PAID MODAL ============

interface MarkAsPaidModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: (data: {
        method: PaymentMethod;
        transactionReference?: string;
        paidAt: string;
        notes?: string;
    }) => void;
    loading: boolean;
}

function MarkAsPaidModal({ visible, onCancel, onConfirm, loading }: MarkAsPaidModalProps) {
    const [method, setMethod] = React.useState<PaymentMethod>('BANK_TRANSFER');
    const [reference, setReference] = React.useState('');
    const [notes, setNotes] = React.useState('');

    const handleConfirm = () => {
        onConfirm({
            method,
            transactionReference: reference.trim() || undefined,
            paidAt: new Date().toISOString(),
            notes: notes.trim() || undefined,
        });
    };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <View style={markPaidStyles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
                <View style={markPaidStyles.sheet}>
                    <View style={markPaidStyles.handle} />

                    <Text className="text-center font-inter text-lg font-bold text-primary-950">
                        Mark as Paid
                    </Text>
                    <Text className="mt-1 text-center font-inter text-xs text-neutral-500">
                        Select payment method and add details
                    </Text>

                    {/* Payment method chips */}
                    <Text className="mb-2 mt-5 font-inter text-xs font-semibold text-neutral-600">
                        Payment Method
                    </Text>
                    <View style={markPaidStyles.methodGrid}>
                        {PAYMENT_METHODS.map((m) => {
                            const isActive = m.key === method;
                            return (
                                <Pressable
                                    key={m.key}
                                    onPress={() => setMethod(m.key)}
                                    style={[
                                        markPaidStyles.methodChip,
                                        isActive && markPaidStyles.methodChipActive,
                                    ]}
                                >
                                    <Text
                                        className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                                    >
                                        {m.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Transaction reference */}
                    <Text className="mb-2 mt-4 font-inter text-xs font-semibold text-neutral-600">
                        Transaction Reference
                    </Text>
                    <TextInput
                        value={reference}
                        onChangeText={setReference}
                        placeholder="e.g. UTR number, cheque no."
                        placeholderTextColor={colors.neutral[400]}
                        style={markPaidStyles.input}
                    />

                    {/* Notes */}
                    <Text className="mb-2 mt-4 font-inter text-xs font-semibold text-neutral-600">
                        Notes (optional)
                    </Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any additional notes"
                        placeholderTextColor={colors.neutral[400]}
                        style={[markPaidStyles.input, { height: 72, textAlignVertical: 'top' }]}
                        multiline
                    />

                    {/* Actions */}
                    <View style={markPaidStyles.actions}>
                        <Pressable
                            style={({ pressed }) => [
                                markPaidStyles.cancelBtn,
                                pressed && { opacity: 0.8 },
                            ]}
                            onPress={onCancel}
                        >
                            <Text className="font-inter text-sm font-semibold text-neutral-600">
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                markPaidStyles.confirmBtn,
                                pressed && { opacity: 0.85 },
                                loading && { opacity: 0.6 },
                            ]}
                            onPress={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                                <Text className="font-inter text-sm font-bold text-white">
                                    Confirm Payment
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </RNModal>
    );
}

// ============ SECTION CARD ============

function SectionCard({
    title,
    children,
    delay = 0,
}: {
    title: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(delay)} style={styles.sectionCard}>
            <Text className="mb-3 font-inter text-sm font-bold text-primary-950">
                {title}
            </Text>
            {children}
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function InvoiceDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data: response, isLoading, error, refetch } = useInvoiceDetail(id ?? '');
    const markAsPaidMutation = useMarkAsPaid();
    const voidMutation = useVoidInvoice();
    const sendEmailMutation = useSendInvoiceEmail();

    const voidConfirm = useConfirmModal();

    const [showMarkPaid, setShowMarkPaid] = React.useState(false);

    const invoice: Invoice | undefined = (response as any)?.data ?? response;

    const handleMarkAsPaid = (data: {
        method: PaymentMethod;
        transactionReference?: string;
        paidAt: string;
        notes?: string;
    }) => {
        if (!id) return;
        markAsPaidMutation.mutate(
            { id, data },
            {
                onSuccess: () => {
                    setShowMarkPaid(false);
                    showSuccess('Invoice marked as paid');
                    refetch();
                },
                onError: () => {
                    showErrorMessage('Failed to mark invoice as paid');
                },
            },
        );
    };

    const handleVoid = () => {
        if (!id) return;
        voidConfirm.show({
            title: 'Void Invoice',
            message: 'This action cannot be undone. The invoice will be permanently cancelled.',
            variant: 'danger',
            confirmText: 'Void Invoice',
            onConfirm: () => {
                voidMutation.mutate(id, {
                    onSuccess: () => {
                        showSuccess('Invoice voided');
                        refetch();
                    },
                    onError: () => {
                        showErrorMessage('Failed to void invoice');
                    },
                });
            },
        });
    };

    const handleSendEmail = () => {
        if (!id) return;
        sendEmailMutation.mutate(id, {
            onSuccess: () => {
                showSuccess('Invoice email sent');
            },
            onError: () => {
                showErrorMessage('Failed to send invoice email');
            },
        });
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.topBar}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path
                                d="M19 12H5M12 19l-7-7 7-7"
                                stroke={colors.primary[900]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </Pressable>
                    <Text className="font-inter text-lg font-bold text-primary-950">
                        Invoice Details
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'h1', width: '100%', height: 120, borderRadius: 20, marginBottom: 16 },
                            { key: 'h2', width: '100%', height: 160, borderRadius: 20, marginBottom: 16 },
                            { key: 'h3', width: '100%', height: 100, borderRadius: 20, marginBottom: 16 },
                            { key: 'h4', width: '100%', height: 60, borderRadius: 20 },
                        ]}
                    >
                        <View />
                    </Skeleton>
                </View>
            </View>
        );
    }

    // Error state
    if (error || !invoice) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.topBar}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path
                                d="M19 12H5M12 19l-7-7 7-7"
                                stroke={colors.primary[900]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </Pressable>
                    <Text className="font-inter text-lg font-bold text-primary-950">
                        Invoice Details
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <EmptyState
                        icon="error"
                        title="Failed to load invoice"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    const canMarkPaid = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
    const canVoid = invoice.status === 'PENDING';
    const lineItems = invoice.lineItems ?? [];
    const payments = invoice.payments ?? [];
    const typeLabel = TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Top bar */}
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                            d="M19 12H5M12 19l-7-7 7-7"
                            stroke={colors.primary[900]}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-primary-950">
                    Invoice Details
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
            >
                {/* ===== HEADER CARD ===== */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.sectionCard}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text
                                className="font-inter text-lg font-bold text-primary-950"
                                style={styles.monoText}
                            >
                                {invoice.invoiceNumber}
                            </Text>
                            <Text className="mt-1 font-inter text-sm text-neutral-600">
                                {invoice.company?.displayName ?? 'Unknown Tenant'}
                            </Text>
                        </View>
                        <StatusBadge status={toStatusBadge(invoice.status)} size="md" />
                    </View>

                    <View style={styles.detailGrid}>
                        <View style={styles.detailItem}>
                            <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                TYPE
                            </Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {typeLabel}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                DUE DATE
                            </Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {formatDate(invoice.dueDate)}
                            </Text>
                        </View>
                        {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
                            <View style={styles.detailItemFull}>
                                <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                    BILLING PERIOD
                                </Text>
                                <Text className="font-inter text-xs font-semibold text-neutral-700">
                                    {formatDate(invoice.billingPeriodStart)} — {formatDate(invoice.billingPeriodEnd)}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </Animated.View>

                {/* ===== LINE ITEMS ===== */}
                {lineItems.length > 0 ? (
                    <SectionCard title="Line Items" delay={100}>
                        <View style={styles.tableHeader}>
                            <Text className="flex-1 font-inter text-[10px] font-bold text-neutral-400">
                                DESCRIPTION
                            </Text>
                            <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 40, textAlign: 'center' }}>
                                QTY
                            </Text>
                            <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 70, textAlign: 'right' }}>
                                RATE
                            </Text>
                            <Text className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 80, textAlign: 'right' }}>
                                AMOUNT
                            </Text>
                        </View>
                        {lineItems.map((item, idx) => (
                            <View
                                key={item.id ?? idx}
                                style={[
                                    styles.tableRow,
                                    idx < lineItems.length - 1 && styles.tableRowBorder,
                                ]}
                            >
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text className="font-inter text-xs font-medium text-neutral-800" numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                    {item.locationName ? (
                                        <Text className="font-inter text-[10px] text-neutral-400">
                                            {item.locationName}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text className="font-inter text-xs text-neutral-600" style={{ width: 40, textAlign: 'center' }}>
                                    {item.quantity}
                                </Text>
                                <Text className="font-inter text-xs text-neutral-600" style={{ width: 70, textAlign: 'right' }}>
                                    {formatCurrency(item.unitPrice)}
                                </Text>
                                <Text className="font-inter text-xs font-semibold text-neutral-800" style={{ width: 80, textAlign: 'right' }}>
                                    {formatCurrency(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </SectionCard>
                ) : null}

                {/* ===== TAX BREAKDOWN ===== */}
                <SectionCard title="Tax & Total" delay={200}>
                    <View style={styles.taxRow}>
                        <Text className="font-inter text-xs text-neutral-500">Subtotal</Text>
                        <Text className="font-inter text-xs font-semibold text-neutral-700">
                            {formatCurrency(invoice.subtotal)}
                        </Text>
                    </View>
                    {invoice.cgst > 0 ? (
                        <View style={styles.taxRow}>
                            <Text className="font-inter text-xs text-neutral-500">CGST</Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {formatCurrency(invoice.cgst)}
                            </Text>
                        </View>
                    ) : null}
                    {invoice.sgst > 0 ? (
                        <View style={styles.taxRow}>
                            <Text className="font-inter text-xs text-neutral-500">SGST</Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {formatCurrency(invoice.sgst)}
                            </Text>
                        </View>
                    ) : null}
                    {invoice.igst > 0 ? (
                        <View style={styles.taxRow}>
                            <Text className="font-inter text-xs text-neutral-500">IGST</Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {formatCurrency(invoice.igst)}
                            </Text>
                        </View>
                    ) : null}
                    {invoice.totalTax > 0 ? (
                        <View style={[styles.taxRow, styles.taxRowBorder]}>
                            <Text className="font-inter text-xs font-medium text-neutral-500">Total Tax</Text>
                            <Text className="font-inter text-xs font-semibold text-neutral-700">
                                {formatCurrency(invoice.totalTax)}
                            </Text>
                        </View>
                    ) : null}
                    <View style={[styles.taxRow, styles.grandTotalRow]}>
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            Grand Total
                        </Text>
                        <Text className="font-inter text-lg font-bold text-primary-600">
                            {formatCurrency(invoice.grandTotal)}
                        </Text>
                    </View>
                </SectionCard>

                {/* ===== ACTIONS ===== */}
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.actionsSection}>
                    <View style={styles.actionRow}>
                        {canMarkPaid ? (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    styles.actionButtonPrimary,
                                    pressed && { opacity: 0.85 },
                                ]}
                                onPress={() => setShowMarkPaid(true)}
                            >
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path
                                        d="M20 6L9 17l-5-5"
                                        stroke={colors.white}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="font-inter text-xs font-bold text-white">
                                    Mark Paid
                                </Text>
                            </Pressable>
                        ) : null}

                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.actionButtonOutline,
                                pressed && { opacity: 0.7 },
                                sendEmailMutation.isPending && { opacity: 0.5 },
                            ]}
                            onPress={handleSendEmail}
                            disabled={sendEmailMutation.isPending}
                        >
                            {sendEmailMutation.isPending ? (
                                <ActivityIndicator size="small" color={colors.primary[600]} />
                            ) : (
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path
                                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"
                                        stroke={colors.primary[600]}
                                        strokeWidth="1.5"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            )}
                            <Text className="font-inter text-xs font-semibold text-primary-600">
                                Email
                            </Text>
                        </Pressable>

                        {canVoid ? (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    styles.actionButtonDanger,
                                    pressed && { opacity: 0.7 },
                                    voidMutation.isPending && { opacity: 0.5 },
                                ]}
                                onPress={handleVoid}
                                disabled={voidMutation.isPending}
                            >
                                {voidMutation.isPending ? (
                                    <ActivityIndicator size="small" color={colors.danger[600]} />
                                ) : (
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path
                                            d="M18 6L6 18M6 6l12 12"
                                            stroke={colors.danger[600]}
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                )}
                                <Text className="font-inter text-xs font-semibold text-danger-600">
                                    Void
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                </Animated.View>

                {/* ===== PAYMENTS ===== */}
                {payments.length > 0 ? (
                    <SectionCard title="Payments" delay={400}>
                        {payments.map((payment, idx) => {
                            const methodColor = METHOD_COLORS[payment.method] ?? METHOD_COLORS.OTHER;
                            return (
                                <View
                                    key={payment.id ?? idx}
                                    style={[
                                        styles.paymentRow,
                                        idx < payments.length - 1 && styles.paymentRowBorder,
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.paymentTopRow}>
                                            <Text className="font-inter text-sm font-bold text-primary-950">
                                                {formatCurrency(payment.amount)}
                                            </Text>
                                            <View style={[styles.methodBadge, { backgroundColor: methodColor.bg }]}>
                                                <Text
                                                    className="font-inter text-[9px] font-bold"
                                                    style={{ color: methodColor.text }}
                                                >
                                                    {payment.method.replace('_', ' ')}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                            {formatDateTime(payment.paidAt)}
                                        </Text>
                                        {payment.transactionReference ? (
                                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-500">
                                                Ref: {payment.transactionReference}
                                            </Text>
                                        ) : null}
                                        {payment.notes ? (
                                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
                                                {payment.notes}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })}
                    </SectionCard>
                ) : null}
            </ScrollView>

            {/* Mark as Paid modal */}
            <MarkAsPaidModal
                visible={showMarkPaid}
                onCancel={() => setShowMarkPaid(false)}
                onConfirm={handleMarkAsPaid}
                loading={markAsPaidMutation.isPending}
            />

            {/* Void confirmation */}
            <ConfirmModal {...voidConfirm.modalProps} />
        </View>
    );
}

// ============ MARK PAID MODAL STYLES ============

const markPaidStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginBottom: 16,
    },
    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    methodChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    methodChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    input: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        fontSize: 14,
        color: colors.neutral[900],
        backgroundColor: colors.neutral[50],
        fontFamily: 'Inter',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
    },
    confirmBtn: {
        flex: 1.5,
        height: 50,
        borderRadius: 14,
        backgroundColor: colors.success[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.success[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    loadingContainer: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    monoText: {
        fontFamily: 'monospace',
    },

    // Header card
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 16,
    },
    detailItem: {
        minWidth: '40%',
        gap: 2,
    },
    detailItemFull: {
        width: '100%',
        gap: 2,
    },

    // Section card
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },

    // Line items table
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    tableRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[50],
    },

    // Tax breakdown
    taxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    taxRowBorder: {
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        marginTop: 4,
        paddingTop: 10,
    },
    grandTotalRow: {
        borderTopWidth: 2,
        borderTopColor: colors.primary[100],
        marginTop: 6,
        paddingTop: 12,
        paddingBottom: 0,
    },

    // Actions
    actionsSection: {
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
    },
    actionButtonPrimary: {
        backgroundColor: colors.success[600],
        shadowColor: colors.success[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    actionButtonOutline: {
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.primary[200],
    },
    actionButtonDanger: {
        backgroundColor: colors.danger[50],
        borderWidth: 1.5,
        borderColor: colors.danger[200],
    },

    // Payments
    paymentRow: {
        paddingVertical: 10,
    },
    paymentRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[50],
    },
    paymentTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    methodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
});
