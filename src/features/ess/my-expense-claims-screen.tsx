/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Image,
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
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { ImageViewer, isImageFile } from '@/components/ui/image-viewer';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useCancelMyExpenseClaim, useCreateMyExpenseClaim, useSubmitMyExpenseClaim } from '@/features/company-admin/api/use-ess-mutations';
import { useExpenseCategories, useExpenseClaimsSummary, useMyExpenseClaims } from '@/features/company-admin/api/use-ess-queries';

// ── Constants ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    SUBMITTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    PENDING_APPROVAL: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    PARTIALLY_APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
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

const FALLBACK_CATEGORIES = ['TRAVEL', 'MEDICAL', 'INTERNET', 'FUEL', 'UNIFORM', 'BUSINESS', 'OTHER'];

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'PERSONAL_CARD', label: 'Personal Card' },
    { value: 'COMPANY_CARD', label: 'Company Card' },
    { value: 'UPI', label: 'UPI' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

// ── Types ────────────────────────────────────────────────────────

interface LineItem {
    id: string;
    categoryCode: string;
    description: string;
    amount: string;
    expenseDate: string;
    merchantName: string;
}

interface Receipt {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
}

// ── Helper components ────────────────────────────────────────────

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
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
    if (Number.isNaN(num)) return '\u20B90';
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

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChevronDownIcon() {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function UploadIcon() {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CameraIcon() {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
        </Svg>
    );
}

function FileIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
    return (
        <Animated.View entering={FadeInDown.springify()} style={styles.sectionHeader}>
            <View style={styles.sectionAccentBar} />
            {icon}
            <Text className="font-inter text-xs font-bold text-primary-800">{title}</Text>
        </Animated.View>
    );
}

// ── Summary Card ─────────────────────────────────────────────────

function SummaryCard({ summary }: { summary: any }) {
    if (!summary) return null;

    return (
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.summaryCard}>
            <Text className="font-inter text-xs font-bold text-primary-800 mb-3">This Year Summary</Text>
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-500">Total Claimed</Text>
                    <Text className="font-inter text-sm font-bold text-primary-950">{formatCurrency(summary.totalClaimed ?? 0)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-500">Approved</Text>
                    <Text className="font-inter text-sm font-bold text-success-700">{formatCurrency(summary.totalApproved ?? 0)}</Text>
                </View>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-500">Pending</Text>
                    <Text className="font-inter text-sm font-bold text-warning-700">{formatCurrency(summary.totalPending ?? 0)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-500">Paid</Text>
                    <Text className="font-inter text-sm font-bold text-success-700">{formatCurrency(summary.totalPaid ?? 0)}</Text>
                </View>
            </View>
            {(summary.claimCount ?? 0) > 0 && (
                <Text className="font-inter text-[10px] text-neutral-400 mt-2">
                    {summary.claimCount} claim{summary.claimCount !== 1 ? 's' : ''} this financial year
                </Text>
            )}
        </Animated.View>
    );
}

// ── Picker Modal (reusable) ──────────────────────────────────────

function PickerModal({
    visible,
    onClose,
    title,
    options,
    selectedValue,
    onSelect,
    renderLabel,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: Array<{ value: string; label: string }>;
    selectedValue: string;
    onSelect: (value: string) => void;
    renderLabel?: (opt: { value: string; label: string }) => React.ReactNode;
}) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '50%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-base font-bold text-primary-950 mb-3">{title}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {options.map((opt) => (
                            <Pressable
                                key={opt.value}
                                onPress={() => { onSelect(opt.value); onClose(); }}
                                style={{
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.neutral[100],
                                    backgroundColor: opt.value === selectedValue ? colors.primary[50] : undefined,
                                    paddingHorizontal: 4,
                                    borderRadius: 8,
                                }}
                            >
                                {renderLabel ? renderLabel(opt) : (
                                    <Text className={`font-inter text-sm ${opt.value === selectedValue ? 'font-bold text-primary-700' : 'text-primary-950'}`}>
                                        {opt.label}
                                    </Text>
                                )}
                            </Pressable>
                        ))}
                        {options.length === 0 && (
                            <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options available</Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ── Line Item Card ───────────────────────────────────────────────

function LineItemCard({
    item,
    index,
    categories,
    onUpdate,
    onRemove,
}: {
    item: LineItem;
    index: number;
    categories: Array<{ value: string; label: string }>;
    onUpdate: (id: string, field: keyof LineItem, value: string) => void;
    onRemove: (id: string) => void;
}) {
    const [catPickerVisible, setCatPickerVisible] = React.useState(false);

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.lineItemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.itemNumberBadge}>
                        <Text className="font-inter text-[10px] font-bold text-white">{index + 1}</Text>
                    </View>
                    <Text className="font-inter text-xs font-bold text-primary-800">Item {index + 1}</Text>
                </View>
                <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
                    <Text className="font-inter text-xs font-semibold text-danger-500">Remove</Text>
                </Pressable>
            </View>

            {/* Category */}
            <View style={styles.fieldWrap}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900">Category *</Text>
                <Pressable onPress={() => setCatPickerVisible(true)} style={styles.dropdownBtnSm}>
                    <Text className={`font-inter text-xs ${item.categoryCode ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                        {item.categoryCode || 'Select...'}
                    </Text>
                    <ChevronDownIcon />
                </Pressable>
                <PickerModal
                    visible={catPickerVisible}
                    onClose={() => setCatPickerVisible(false)}
                    title="Item Category"
                    options={categories}
                    selectedValue={item.categoryCode}
                    onSelect={(v) => onUpdate(item.id, 'categoryCode', v)}
                />
            </View>

            {/* Amount + Date row */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900">Amount *</Text>
                    <View style={styles.inputWrapSm}>
                        <TextInput
                            style={styles.textInputSm}
                            placeholder="0.00"
                            placeholderTextColor={colors.neutral[400]}
                            value={item.amount}
                            onChangeText={(v) => onUpdate(item.id, 'amount', v)}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900">Date *</Text>
                    <View style={styles.inputWrapSm}>
                        <TextInput
                            style={styles.textInputSm}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.neutral[400]}
                            value={item.expenseDate}
                            onChangeText={(v) => onUpdate(item.id, 'expenseDate', v)}
                            autoCapitalize="none"
                        />
                    </View>
                </View>
            </View>

            {/* Description */}
            <View style={styles.fieldWrap}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900">Description *</Text>
                <View style={styles.inputWrapSm}>
                    <TextInput
                        style={styles.textInputSm}
                        placeholder="Item description..."
                        placeholderTextColor={colors.neutral[400]}
                        value={item.description}
                        onChangeText={(v) => onUpdate(item.id, 'description', v)}
                    />
                </View>
            </View>

            {/* Merchant */}
            <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900">Merchant</Text>
                <View style={styles.inputWrapSm}>
                    <TextInput
                        style={styles.textInputSm}
                        placeholder="Merchant name (optional)"
                        placeholderTextColor={colors.neutral[400]}
                        value={item.merchantName}
                        onChangeText={(v) => onUpdate(item.id, 'merchantName', v)}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

// ── Create Expense Claim Modal ──────────────────────────────────

function CreateExpenseClaimModal({
    visible,
    onClose,
    onSave,
    isSaving,
    categories,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    isSaving: boolean;
    categories: Array<{ value: string; label: string }>;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState('');
    const [merchantName, setMerchantName] = React.useState('');
    const [projectCode, setProjectCode] = React.useState('');
    const [receipts, setReceipts] = React.useState<Receipt[]>([]);
    const [lineItems, setLineItems] = React.useState<LineItem[]>([]);

    const [categoryPickerVisible, setCategoryPickerVisible] = React.useState(false);
    const [paymentPickerVisible, setPaymentPickerVisible] = React.useState(false);

    // Image viewer state
    const [viewerImages, setViewerImages] = React.useState<Array<{ fileName: string; fileUrl: string }>>([]);
    const [viewerIndex, setViewerIndex] = React.useState(0);
    const [viewerOpen, setViewerOpen] = React.useState(false);

    const openReceiptViewer = (receiptList: Receipt[], index: number) => {
        const imageReceipts = receiptList.filter(r => isImageFile(r.fileUrl));
        if (imageReceipts.length === 0) {
            showErrorMessage('This file cannot be previewed');
            return;
        }
        // Find the adjusted index in the filtered list
        const tappedReceipt = receiptList[index];
        const adjustedIndex = isImageFile(tappedReceipt.fileUrl)
            ? imageReceipts.findIndex(r => r.fileUrl === tappedReceipt.fileUrl)
            : 0;
        setViewerImages(imageReceipts.map(r => ({ fileName: r.fileName, fileUrl: r.fileUrl })));
        setViewerIndex(adjustedIndex >= 0 ? adjustedIndex : 0);
        setViewerOpen(true);
    };

    React.useEffect(() => {
        if (visible) {
            setTitle('');
            setCategory('');
            setDescription('');
            setFromDate('');
            setToDate('');
            setPaymentMethod('');
            setMerchantName('');
            setProjectCode('');
            setReceipts([]);
            setLineItems([]);
        }
    }, [visible]);

    // Line items helpers
    const addLineItem = () => {
        setLineItems((prev) => [
            ...prev,
            {
                id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                categoryCode: '',
                description: '',
                amount: '',
                expenseDate: '',
                merchantName: '',
            },
        ]);
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
        setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
    };

    const removeLineItem = (id: string) => {
        setLineItems((prev) => prev.filter((li) => li.id !== id));
    };

    // Receipt helpers — file & camera upload
    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            multiple: true,
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets) {
            const newReceipts = result.assets.map(asset => ({
                fileName: asset.name,
                fileUrl: asset.uri,
                fileSize: asset.size,
            }));
            setReceipts(prev => [...prev, ...newReceipts]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
            setReceipts(prev => [...prev, {
                fileName,
                fileUrl: asset.uri,
                fileSize: asset.fileSize,
            }]);
        }
    };

    const removeReceipt = (index: number) => {
        setReceipts((prev) => prev.filter((_, i) => i !== index));
    };

    const isImageUri = (uri: string) => {
        const lower = uri.toLowerCase();
        return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp') || lower.startsWith('file://');
    };

    // Running total from line items
    const lineItemsTotal = lineItems.reduce((sum, li) => sum + (Number.parseFloat(li.amount) || 0), 0);
    const hasLineItems = lineItems.length > 0;

    // Compute the effective amount: sum of line items if any, otherwise 0 (user must add items)
    const effectiveAmount = hasLineItems ? lineItemsTotal : 0;

    // Validation
    const lineItemsValid = lineItems.every(
        (li) => li.categoryCode && li.description.trim() && Number.parseFloat(li.amount) > 0 && li.expenseDate.trim()
    );
    const isValid = title.trim() && category && hasLineItems && lineItemsValid && effectiveAmount > 0;

    const handleSave = () => {
        const payload: any = {
            title: title.trim(),
            amount: effectiveAmount,
            category,
            description: description.trim() || undefined,
            fromDate: fromDate.trim() || undefined,
            toDate: toDate.trim() || undefined,
            paymentMethod: paymentMethod || undefined,
            merchantName: merchantName.trim() || undefined,
            projectCode: projectCode.trim() || undefined,
            receipts: receipts.length > 0 ? receipts.map(r => ({ fileName: r.fileName, fileUrl: r.fileUrl })) : undefined,
            items: lineItems.map((li) => ({
                categoryCode: li.categoryCode,
                description: li.description.trim(),
                amount: Number.parseFloat(li.amount),
                expenseDate: li.expenseDate.trim(),
                merchantName: li.merchantName.trim() || undefined,
            })),
        };
        onSave(payload);
    };

    const paymentLabel = PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? '';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, paddingTop: 0 }]}>
                    {/* Gradient Header */}
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalGradientHeader}
                    >
                        <View style={styles.sheetHandleWhite} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text className="font-inter text-lg font-bold text-white">New Expense Claim</Text>
                            {hasLineItems && (
                                <View style={styles.runningTotalBadge}>
                                    <Text className="font-inter text-xs font-bold text-white">{formatCurrency(lineItemsTotal)}</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: '80%' }} contentContainerStyle={{ paddingTop: 16 }}>

                        {/* ── Section 1: Claim Details ── */}
                        <SectionHeader title="Claim Details" />

                        {/* Title */}
                        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Title <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Client visit expenses"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>
                        </Animated.View>

                        {/* Category Picker */}
                        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Category <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable onPress={() => setCategoryPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${category ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {category || 'Select category...'}
                                </Text>
                                <ChevronDownIcon />
                            </Pressable>
                            <PickerModal
                                visible={categoryPickerVisible}
                                onClose={() => setCategoryPickerVisible(false)}
                                title="Category"
                                options={categories}
                                selectedValue={category}
                                onSelect={setCategory}
                            />
                        </Animated.View>

                        {/* From / To Date */}
                        <Animated.View entering={FadeInDown.delay(150).springify()} style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">From Date</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={fromDate}
                                        onChangeText={setFromDate}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">To Date</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={toDate}
                                        onChangeText={setToDate}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                        </Animated.View>

                        {/* ── Section 2: Payment & Info ── */}
                        <SectionHeader title="Payment & Info" />

                        {/* Payment Method */}
                        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Payment Method</Text>
                            <Pressable onPress={() => setPaymentPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${paymentMethod ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {paymentLabel || 'Select method...'}
                                </Text>
                                <ChevronDownIcon />
                            </Pressable>
                            <PickerModal
                                visible={paymentPickerVisible}
                                onClose={() => setPaymentPickerVisible(false)}
                                title="Payment Method"
                                options={PAYMENT_METHODS}
                                selectedValue={paymentMethod}
                                onSelect={setPaymentMethod}
                            />
                        </Animated.View>

                        {/* Merchant + Project Code */}
                        <Animated.View entering={FadeInDown.delay(250).springify()} style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Merchant</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Merchant name"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={merchantName}
                                        onChangeText={setMerchantName}
                                    />
                                </View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Project Code</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Optional"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={projectCode}
                                        onChangeText={setProjectCode}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>
                        </Animated.View>

                        {/* Description */}
                        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Additional details..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </Animated.View>

                        {/* ── Section 3: Expense Items ── */}
                        <View style={styles.sectionDivider}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={styles.sectionAccentBar} />
                                <Text className="font-inter text-xs font-bold text-primary-800">
                                    Expense Items <Text className="text-danger-500">*</Text>
                                </Text>
                            </View>
                            {hasLineItems && (
                                <View style={styles.totalBadge}>
                                    <Text className="font-inter text-xs font-bold text-primary-700">
                                        Total: {formatCurrency(lineItemsTotal)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {lineItems.map((li, idx) => (
                            <LineItemCard
                                key={li.id}
                                item={li}
                                index={idx}
                                categories={categories}
                                onUpdate={updateLineItem}
                                onRemove={removeLineItem}
                            />
                        ))}

                        <Pressable onPress={addLineItem} style={styles.addItemBtn}>
                            <Text className="font-inter text-xs font-bold text-primary-600">+ Add Item</Text>
                        </Pressable>

                        {/* ── Section 4: Receipts & Proof ── */}
                        <SectionHeader title="Receipts & Proof" />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                            <Pressable onPress={pickDocument} style={styles.uploadBtn}>
                                <UploadIcon />
                                <Text className="font-inter text-xs font-bold text-primary-600">Upload File</Text>
                            </Pressable>
                            <Pressable onPress={takePhoto} style={styles.uploadBtn}>
                                <CameraIcon />
                                <Text className="font-inter text-xs font-bold text-primary-600">Take Photo</Text>
                            </Pressable>
                        </View>

                        {receipts.map((r, idx) => (
                            <Pressable
                                key={`receipt-${idx}`}
                                onPress={() => openReceiptViewer(receipts, idx)}
                                style={styles.receiptCard}
                            >
                                {isImageUri(r.fileUrl) ? (
                                    <Image source={{ uri: r.fileUrl }} style={styles.receiptThumb} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.receiptThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                                        <FileIcon />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-xs font-semibold text-primary-950" numberOfLines={1}>{r.fileName}</Text>
                                    {r.fileSize != null && (
                                        <Text className="font-inter text-[10px] text-neutral-500 mt-0.5">{formatFileSize(r.fileSize)}</Text>
                                    )}
                                    {isImageFile(r.fileUrl) && (
                                        <Text className="font-inter text-[10px] text-info-500 mt-0.5">Tap to view</Text>
                                    )}
                                </View>
                                <Pressable onPress={() => removeReceipt(idx)} hitSlop={8}>
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </Pressable>
                            </Pressable>
                        ))}

                        {receipts.length === 0 && (
                            <Text className="font-inter text-[10px] text-neutral-400 mb-4">No receipts added yet</Text>
                        )}

                        <ImageViewer
                            images={viewerImages}
                            initialIndex={viewerIndex}
                            visible={viewerOpen}
                            onClose={() => setViewerOpen(false)}
                        />
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
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
    const { data: summaryData } = useExpenseClaimsSummary();
    const { data: categoriesData } = useExpenseCategories();
    const createClaim = useCreateMyExpenseClaim();
    const submitClaim = useSubmitMyExpenseClaim();
    const cancelClaim = useCancelMyExpenseClaim();

    const [formVisible, setFormVisible] = React.useState(false);

    // Image viewer state for list view receipts
    const [listViewerImages, setListViewerImages] = React.useState<Array<{ fileName: string; fileUrl: string }>>([]);
    const [listViewerIndex, setListViewerIndex] = React.useState(0);
    const [listViewerOpen, setListViewerOpen] = React.useState(false);

    const openListReceiptViewer = (receiptList: any[], index: number) => {
        const imageReceipts = receiptList.filter((r: any) => isImageFile(r.fileUrl ?? ''));
        if (imageReceipts.length === 0) {
            showErrorMessage('This file cannot be previewed');
            return;
        }
        const tappedReceipt = receiptList[index];
        const adjustedIndex = isImageFile(tappedReceipt?.fileUrl ?? '')
            ? imageReceipts.findIndex((r: any) => r.fileUrl === tappedReceipt.fileUrl)
            : 0;
        setListViewerImages(imageReceipts.map((r: any) => ({ fileName: r.fileName ?? 'Receipt', fileUrl: r.fileUrl })));
        setListViewerIndex(adjustedIndex >= 0 ? adjustedIndex : 0);
        setListViewerOpen(true);
    };

    const claims = React.useMemo(() => {
        const raw = (data as any)?.data ?? (data as any)?.claims ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    const summary = (summaryData as any)?.data ?? summaryData ?? null;

    // Build categories list from API or fallback
    const categoryOptions = React.useMemo(() => {
        const raw = (categoriesData as any)?.data ?? categoriesData ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((c: any) => ({ value: c.code ?? c.name, label: c.name ?? c.code }));
        }
        return FALLBACK_CATEGORIES.map((c) => ({ value: c, label: c }));
    }, [categoriesData]);

    const handleCreate = (formData: any) => {
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

    const handleCancel = (id: string) => {
        showConfirm({
            title: 'Cancel Expense Claim',
            message: 'Are you sure you want to cancel this expense claim?',
            confirmText: 'Cancel Claim',
            variant: 'danger',
            onConfirm: () => {
                cancelClaim.mutate(id, {
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to cancel expense claim'),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const status = item.status ?? 'DRAFT';
        const canSubmit = status === 'DRAFT';
        const canCancel = status === 'DRAFT' || status === 'SUBMITTED';
        const isApprovedOrPaid = status === 'APPROVED' || status === 'PARTIALLY_APPROVED' || status === 'PAID';
        const approvedAmount = item.approvedAmount != null ? Number(item.approvedAmount) : null;
        const claimedAmount = Number(item.amount ?? 0);
        const itemsList: any[] = item.items ?? [];

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{item.title ?? 'Untitled'}</Text>
                        {item.claimNumber && (
                            <Text className="font-inter text-[10px] text-neutral-500 mt-0.5">#{item.claimNumber}</Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <CategoryBadge category={item.category ?? 'OTHER'} />
                            <Text className="font-inter text-xs font-bold text-primary-700">
                                {formatCurrency(claimedAmount)}
                            </Text>
                        </View>
                    </View>
                    <StatusBadge status={status} />
                </View>

                {/* Approved vs Claimed amount */}
                {isApprovedOrPaid && approvedAmount != null && approvedAmount !== claimedAmount && (
                    <View style={styles.amountsRow}>
                        <View style={styles.amountChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">Claimed</Text>
                            <Text className="font-inter text-xs font-bold text-primary-950">{formatCurrency(claimedAmount)}</Text>
                        </View>
                        <View style={[styles.amountChip, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] text-success-700">Approved</Text>
                            <Text className="font-inter text-xs font-bold text-success-700">{formatCurrency(approvedAmount)}</Text>
                        </View>
                    </View>
                )}

                {/* Payment method + dates */}
                {(item.paymentMethod || item.fromDate || item.toDate) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {item.paymentMethod && (
                            <View style={[styles.catBadge, { backgroundColor: colors.neutral[100] }]}>
                                <Text style={{ color: colors.neutral[600], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                    {item.paymentMethod}
                                </Text>
                            </View>
                        )}
                        {item.fromDate && item.toDate && (
                            <Text className="font-inter text-[10px] text-neutral-500" style={{ alignSelf: 'center' }}>
                                {formatDate(item.fromDate)} - {formatDate(item.toDate)}
                            </Text>
                        )}
                    </View>
                )}

                {/* Line items count */}
                {itemsList.length > 0 && (
                    <Text className="font-inter text-[10px] text-neutral-500 mt-1">
                        {itemsList.length} line item{itemsList.length !== 1 ? 's' : ''}
                    </Text>
                )}

                {/* Receipts */}
                {Array.isArray(item.receipts) && item.receipts.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                        {item.receipts.map((r: any, rIdx: number) => (
                            <Pressable
                                key={`r-${rIdx}`}
                                onPress={() => isImageFile(r.fileUrl ?? '') ? openListReceiptViewer(item.receipts, rIdx) : showErrorMessage('This file cannot be previewed')}
                                hitSlop={4}
                            >
                                <Text className="font-inter text-[10px] text-info-600" numberOfLines={1} style={{ textDecorationLine: 'underline' }}>
                                    {r.fileName ?? `Receipt ${rIdx + 1}`}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {item.description ? (
                    <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.description}</Text>
                ) : null}

                {item.createdAt && (
                    <Text className="font-inter text-[10px] text-neutral-400 mt-1">Created: {formatDate(item.createdAt)}</Text>
                )}

                {/* Action buttons */}
                {(canSubmit || canCancel) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        {canSubmit && (
                            <Pressable onPress={() => handleSubmit(item.id)} style={styles.submitActionBtn}>
                                <Text className="font-inter text-xs font-semibold text-primary-600">Submit for Approval</Text>
                            </Pressable>
                        )}
                        {canCancel && (
                            <Pressable onPress={() => handleCancel(item.id)} style={styles.cancelActionBtn}>
                                <Text className="font-inter text-xs font-semibold text-danger-600">Cancel</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <AppTopHeader title="Expense Claims" onMenuPress={open} />
            <FlatList
                data={claims}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListHeaderComponent={<SummaryCard summary={summary} />}
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
                categories={categoryOptions}
            />
            <ConfirmModal {...confirmModalProps} />
            <ImageViewer
                images={listViewerImages}
                initialIndex={listViewerIndex}
                visible={listViewerOpen}
                onClose={() => setListViewerOpen(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
    sheetHandleWhite: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginBottom: 12 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    inputWrapSm: { backgroundColor: colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 10, height: 38, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    textInputSm: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    dropdownBtnSm: {
        backgroundColor: colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 10, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    submitActionBtn: { paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.primary[50] },
    cancelActionBtn: { paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: colors.danger[200], backgroundColor: colors.danger[50] },
    summaryCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary[200],
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryRow: { flexDirection: 'row', gap: 12 },
    summaryItem: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: 10, padding: 10 },
    amountsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    amountChip: { backgroundColor: colors.neutral[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    lineItemCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderLeftWidth: 3,
        borderLeftColor: colors.primary[400],
        padding: 12,
        marginBottom: 10,
    },
    itemNumberBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionDivider: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 6,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
        marginTop: 4,
    },
    sectionAccentBar: {
        width: 3,
        height: 16,
        borderRadius: 2,
        backgroundColor: colors.primary[400],
    },
    totalBadge: {
        backgroundColor: colors.primary[50],
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    addItemBtn: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
        marginBottom: 14,
    },
    modalGradientHeader: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
        marginHorizontal: -24,
    },
    runningTotalBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    uploadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
    },
    receiptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        backgroundColor: colors.neutral[50],
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginBottom: 8,
    },
    receiptThumb: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.neutral[200],
    },
});
