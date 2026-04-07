/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Image,
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
import { ImageViewer, isImageFile } from '@/components/ui/image-viewer';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage } from '@/components/ui/utils';

import { useExpenseCategories } from '@/features/company-admin/api/use-ess-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    useApproveExpenseClaim,
    useCreateExpenseClaim,
    useRejectExpenseClaim,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useExpenseClaims } from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type ClaimStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'PARTIALLY_APPROVED' | 'PENDING' | 'PENDING_APPROVAL' | 'CANCELLED';

interface LineItem {
    id: string;
    categoryCode: string;
    description: string;
    amount: string;
    expenseDate: string;
    merchantName: string;
}

interface ReceiptItem {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: string[] = ['All', 'Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'];

const FALLBACK_CATEGORIES = ['TRAVEL', 'MEDICAL', 'INTERNET', 'FUEL', 'UNIFORM', 'BUSINESS', 'OTHER'];

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'PERSONAL_CARD', label: 'Personal Card' },
    { value: 'COMPANY_CARD', label: 'Company Card' },
    { value: 'UPI', label: 'UPI' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Submitted: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    SUBMITTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    PENDING_APPROVAL: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    PARTIALLY_APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    Paid: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    PAID: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    Travel: { bg: colors.info[50], text: colors.info[700] },
    TRAVEL: { bg: colors.info[50], text: colors.info[700] },
    Medical: { bg: colors.danger[50], text: colors.danger[700] },
    MEDICAL: { bg: colors.danger[50], text: colors.danger[700] },
    Fuel: { bg: colors.warning[50], text: colors.warning[700] },
    FUEL: { bg: colors.warning[50], text: colors.warning[700] },
    Food: { bg: colors.success[50], text: colors.success[700] },
    FOOD: { bg: colors.success[50], text: colors.success[700] },
    Accommodation: { bg: colors.accent[50], text: colors.accent[700] },
    ACCOMMODATION: { bg: colors.accent[50], text: colors.accent[700] },
    Communication: { bg: colors.primary[50], text: colors.primary[700] },
    COMMUNICATION: { bg: colors.primary[50], text: colors.primary[700] },
    INTERNET: { bg: colors.accent[50], text: colors.accent[700] },
    UNIFORM: { bg: colors.primary[50], text: colors.primary[700] },
    BUSINESS: { bg: colors.success[50], text: colors.success[700] },
    'Office Supplies': { bg: colors.neutral[100], text: colors.neutral[700] },
    Other: { bg: colors.neutral[100], text: colors.neutral[600] },
    OTHER: { bg: colors.neutral[100], text: colors.neutral[600] },
};

// ============ HELPERS ============

function formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
    if (Number.isNaN(num)) return '\u20B90';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function CategoryBadge({ category }: { category: string }) {
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

function ChevronDownIcon() {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
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
                <ChevronDownIcon />
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

// ============ PICKER MODAL ============

function PickerModal({
    visible,
    onClose,
    title,
    options,
    selectedValue,
    onSelect,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: Array<{ value: string; label: string }>;
    selectedValue: string;
    onSelect: (value: string) => void;
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
                                <Text className={`font-inter text-sm ${opt.value === selectedValue ? 'font-bold text-primary-700' : 'text-primary-950'}`}>
                                    {opt.label}
                                </Text>
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

// ============ LINE ITEM CARD ============

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
        <View style={styles.lineItemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text className="font-inter text-xs font-bold text-primary-800">Item {index + 1}</Text>
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
        </View>
    );
}

// ============ CLAIM FORM MODAL ============

function ClaimFormModal({
    visible, onClose, onSave, employeeOptions, isSaving, categories,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    employeeOptions: { id: string; label: string }[];
    isSaving: boolean;
    categories: Array<{ value: string; label: string }>;
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState('');
    const [merchantName, setMerchantName] = React.useState('');
    const [projectCode, setProjectCode] = React.useState('');
    const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
    const [receipts, setReceipts] = React.useState<ReceiptItem[]>([]);

    const [categoryPickerVisible, setCategoryPickerVisible] = React.useState(false);
    const [paymentPickerVisible, setPaymentPickerVisible] = React.useState(false);

    // Image viewer state
    const [viewerImages, setViewerImages] = React.useState<Array<{ fileName: string; fileUrl: string }>>([]);
    const [viewerIndex, setViewerIndex] = React.useState(0);
    const [viewerOpen, setViewerOpen] = React.useState(false);

    const openReceiptViewer = (receiptList: ReceiptItem[], index: number) => {
        const imageReceipts = receiptList.filter(r => isImageFile(r.fileUrl));
        if (imageReceipts.length === 0) {
            showErrorMessage('This file cannot be previewed');
            return;
        }
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
            setEmployeeId('');
            setTitle('');
            setCategory('');
            setDescription('');
            setFromDate('');
            setToDate('');
            setPaymentMethod('');
            setMerchantName('');
            setProjectCode('');
            setLineItems([]);
            setReceipts([]);
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

    // Receipt helpers
    const handleUploadFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setReceipts((prev) => [
                    ...prev,
                    {
                        fileName: asset.name ?? `Document ${prev.length + 1}`,
                        fileUrl: asset.uri,
                        fileSize: asset.size,
                    },
                ]);
            }
        } catch {
            // User cancelled or error — silently ignore
        }
    };

    const handleTakePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) return;

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const fileName = asset.fileName ?? `Photo_${Date.now()}.jpg`;
                setReceipts((prev) => [
                    ...prev,
                    {
                        fileName,
                        fileUrl: asset.uri,
                        fileSize: asset.fileSize,
                    },
                ]);
            }
        } catch {
            // User cancelled or error — silently ignore
        }
    };

    const removeReceipt = (index: number) => {
        setReceipts((prev) => prev.filter((_, i) => i !== index));
    };

    // Running total from line items
    const lineItemsTotal = lineItems.reduce((sum, li) => sum + (Number.parseFloat(li.amount) || 0), 0);
    const hasLineItems = lineItems.length > 0;

    // Validation
    const lineItemsValid = lineItems.every(
        (li) => li.categoryCode && li.description.trim() && Number.parseFloat(li.amount) > 0 && li.expenseDate.trim()
    );
    const isValid = employeeId && title.trim() && category && hasLineItems && lineItemsValid && lineItemsTotal > 0;

    const paymentLabel = PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? '';

    const handleSave = () => {
        const validLineItems = lineItems.filter(
            (li) => li.categoryCode && li.description.trim() && Number.parseFloat(li.amount) > 0 && li.expenseDate.trim()
        );
        onSave({
            employeeId,
            employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '',
            title: title.trim(),
            amount: lineItemsTotal,
            category,
            description: description.trim() || undefined,
            fromDate: fromDate.trim() || undefined,
            toDate: toDate.trim() || undefined,
            paymentMethod: paymentMethod || undefined,
            merchantName: merchantName.trim() || undefined,
            projectCode: projectCode.trim() || undefined,
            status: 'Submitted',
            items: validLineItems.map(li => ({
                categoryCode: li.categoryCode,
                description: li.description.trim(),
                amount: parseFloat(li.amount),
                expenseDate: li.expenseDate.trim(),
                merchantName: li.merchantName.trim() || undefined,
            })),
            receipts: receipts.length > 0 ? receipts.map(r => ({
                fileName: r.fileName,
                fileUrl: r.fileUrl,
            })) : undefined,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">New Expense Claim</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: '80%' }}>
                        {/* Employee */}
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />

                        {/* Title */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Title <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Client visit travel"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={title}
                                    onChangeText={setTitle}
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
                        </View>

                        {/* From / To Date */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                        </View>

                        {/* Payment Method */}
                        <View style={styles.fieldWrap}>
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
                        </View>

                        {/* Merchant + Project Code */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                        </View>

                        {/* Description */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Expense details..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>

                        {/* ── Line Items Section ── */}
                        <View style={styles.sectionDivider}>
                            <Text className="font-inter text-xs font-bold text-primary-800">
                                Line Items <Text className="text-danger-500">*</Text>
                            </Text>
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

                        {/* ── Receipts Section ── */}
                        <View style={[styles.sectionDivider, { marginTop: 4 }]}>
                            <Text className="font-inter text-xs font-bold text-primary-800">Receipts / Proofs</Text>
                        </View>

                        {receipts.map((r, idx) => (
                            <Pressable
                                key={`receipt-${idx}`}
                                onPress={() => openReceiptViewer(receipts, idx)}
                                style={styles.receiptCard}
                            >
                                {r.fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) || r.fileUrl.startsWith('file://') ? (
                                    <Image source={{ uri: r.fileUrl }} style={styles.receiptThumb} />
                                ) : (
                                    <View style={styles.receiptFileIcon}>
                                        <Svg width={16} height={16} viewBox="0 0 24 24">
                                            <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.neutral[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M14 2v6h6" stroke={colors.neutral[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-xs font-semibold text-primary-950" numberOfLines={1}>{r.fileName}</Text>
                                    {r.fileSize ? (
                                        <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">{formatFileSize(r.fileSize)}</Text>
                                    ) : null}
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

                        <ImageViewer
                            images={viewerImages}
                            initialIndex={viewerIndex}
                            visible={viewerOpen}
                            onClose={() => setViewerOpen(false)}
                        />

                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                            <Pressable onPress={handleUploadFile} style={styles.uploadBtn}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text className="font-inter text-xs font-bold text-primary-600">Upload File</Text>
                            </Pressable>
                            <Pressable onPress={handleTakePhoto} style={styles.uploadBtn}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text className="font-inter text-xs font-bold text-primary-600">Take Photo</Text>
                            </Pressable>
                        </View>
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
    item: any; index: number;
    onApprove: () => void; onReject: () => void;
}) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '' : fmt.date(d);
    const status = item.status ?? 'Draft';
    const claimedAmount = Number(item.amount ?? 0);
    const approvedAmount = item.approvedAmount != null ? Number(item.approvedAmount) : null;
    const isApprovedOrPaid = ['Approved', 'APPROVED', 'PARTIALLY_APPROVED', 'Paid', 'PAID'].includes(status);
    const isSubmitted = status === 'Submitted' || status === 'SUBMITTED';
    const itemsList: any[] = item.items ?? [];

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName ?? 'NA'} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                            {item.claimNumber && (
                                <Text className="font-inter text-[10px] text-neutral-400">#{item.claimNumber}</Text>
                            )}
                        </View>
                    </View>
                    <StatusBadge status={status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <CategoryBadge category={item.category ?? 'Other'} />
                    <Text className="font-inter text-sm font-bold text-primary-700">{formatCurrency(claimedAmount)}</Text>
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
                            <View style={[styles.typeBadge, { backgroundColor: colors.neutral[100] }]}>
                                <Text style={{ color: colors.neutral[600], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                                    {PAYMENT_METHODS.find(p => p.value === item.paymentMethod)?.label ?? item.paymentMethod}
                                </Text>
                            </View>
                        )}
                        {item.fromDate && item.toDate && (
                            <Text className="font-inter text-[10px] text-neutral-500" style={{ alignSelf: 'center' }}>
                                {formatDate(item.fromDate)} - {formatDate(item.toDate)}
                            </Text>
                        )}
                        {item.fromDate && !item.toDate && (
                            <Text className="font-inter text-[10px] text-neutral-500" style={{ alignSelf: 'center' }}>
                                {formatDate(item.fromDate)}
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

                {item.description ? <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.description}</Text> : null}

                {isSubmitted && (
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
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('All');
    const [formVisible, setFormVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useExpenseClaims();
    const createMutation = useCreateExpenseClaim();
    const approveMutation = useApproveExpenseClaim();
    const rejectMutation = useRejectExpenseClaim();
    const { data: empResponse } = useEmployees();
    const { data: categoriesData } = useExpenseCategories();

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    // Build categories list from API or fallback
    const categoryOptions = React.useMemo(() => {
        const raw = (categoriesData as any)?.data ?? categoriesData ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((c: any) => ({ value: c.code ?? c.name, label: c.name ?? c.code }));
        }
        return FALLBACK_CATEGORIES.map((c) => ({ value: c, label: c }));
    }, [categoriesData]);

    const claims = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            title: item.title ?? '',
            amount: item.amount ?? 0,
            category: item.category ?? 'Other',
            description: item.description ?? '',
            tripDate: item.tripDate ?? '',
            status: item.status ?? 'Draft',
            createdAt: item.createdAt ?? '',
            claimNumber: item.claimNumber ?? '',
            fromDate: item.fromDate ?? '',
            toDate: item.toDate ?? '',
            paymentMethod: item.paymentMethod ?? '',
            approvedAmount: item.approvedAmount,
            items: item.items ?? [],
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let list = claims;
        if (statusFilter !== 'All') {
            const q = statusFilter.toLowerCase();
            list = list.filter((c: any) => c.status.toLowerCase() === q);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((c: any) => c.employeeName.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
        }
        return list;
    }, [claims, statusFilter, search]);

    const handleApprove = (item: any) => {
        showConfirm({
            title: 'Approve Claim',
            message: `Approve ${item.employeeName}'s claim of ${formatCurrency(item.amount)}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => approveMutation.mutate(item.id),
        });
    };

    const handleReject = (item: any) => {
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

    const totalAmount = React.useMemo(() => claims.reduce((sum: number, c: any) => sum + Number(c.amount ?? 0), 0), [claims]);

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Expense Claims</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{claims.length} claim{claims.length !== 1 ? 's' : ''} | Total: {formatCurrency(totalAmount)}</Text>
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
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Expenses" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={({ item, index }) => <ClaimCard item={item} index={index} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <ClaimFormModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleSave}
                employeeOptions={employeeOptions}
                isSaving={createMutation.isPending}
                categories={categoryOptions}
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
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    amountsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    amountChip: { backgroundColor: colors.neutral[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    lineItemCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        padding: 12,
        marginBottom: 10,
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
    receiptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: colors.neutral[50],
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    receiptThumb: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.neutral[200],
    },
    receiptFileIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
    },
});
