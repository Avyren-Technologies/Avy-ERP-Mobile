/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';

import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
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
import { showMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/components/ui/utils';

import { FAB } from '@/components/ui/fab';
import {
    useAdjustLeaveBalance,
    useConfirmBalanceImport,
    useEncashBalance,
    useInitializeLeaveBalances,
    useRunAccrual,
    useRunCarryForward,
    useUpdateBalance,
    useValidateBalanceUpload,
} from '@/features/company-admin/api/use-leave-mutations';
import {
    useBalanceTransactions,
    useLeaveBalances,
    useLeaveTypes,
} from '@/features/company-admin/api/use-leave-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface LeaveBalanceEntry {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    opening: number;
    accrued: number;
    taken: number;
    adjusted: number;
    balance: number;
    entitlement: number;
    balanceRecordId?: string;
    encashmentAllowed?: boolean;
    year?: number;
}

interface EmployeeBalance {
    id: string;
    employeeId: string;
    employeeName: string;
    employeePhoto: string;
    balances: LeaveBalanceEntry[];
}

interface TransactionRecord {
    id: string;
    date: string;
    type: string;
    delta: number;
    resultingBalance: number;
    reason: string;
}

// ============ HELPERS ============

function getBalanceColor(balance: number, entitlement: number): string {
    if (entitlement <= 0) return colors.neutral[600];
    const pct = balance / entitlement;
    if (pct > 0.5) return colors.success[600];
    if (pct > 0.25) return colors.warning[600];
    return colors.danger[600];
}

function getBalanceBg(balance: number, entitlement: number): string {
    if (entitlement <= 0) return colors.neutral[50];
    const pct = balance / entitlement;
    if (pct > 0.5) return colors.success[50];
    if (pct > 0.25) return colors.warning[50];
    return colors.danger[50];
}

function getTransactionTypeBadge(type: string): { bg: string; color: string; label: string } {
    const t = type.toLowerCase();
    if (t.includes('accrual') || t.includes('accrue')) return { bg: colors.success[50], color: colors.success[700], label: 'Accrual' };
    if (t.includes('taken') || t.includes('deduct')) return { bg: colors.danger[50], color: colors.danger[700], label: 'Taken' };
    if (t.includes('credit') || t.includes('adjust')) return { bg: colors.accent[50], color: colors.accent[700], label: 'Adjustment' };
    if (t.includes('carry') || t.includes('forward')) return { bg: colors.primary[50], color: colors.primary[700], label: 'Carry Forward' };
    if (t.includes('encash')) return { bg: colors.warning[50], color: colors.warning[700], label: 'Encashment' };
    if (t.includes('opening') || t.includes('init')) return { bg: colors.primary[50], color: colors.primary[700], label: 'Opening' };
    return { bg: colors.neutral[100], color: colors.neutral[700], label: type };
}

// ============ SHARED ATOMS ============

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
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt}</Text>
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

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
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

// ============ ICONS ============

function PencilIcon({ size = 14, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ClockIcon({ size = 14, color = colors.neutral[500] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth="2" fill="none" />
            <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function DollarIcon({ size = 14, color = colors.success[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

// ============ TRANSACTION HISTORY SHEET ============

function TransactionHistorySheet({
    visible, onClose, balanceId, leaveTypeName,
}: {
    visible: boolean; onClose: () => void; balanceId: string; leaveTypeName: string;
}) {
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const { data: txResponse, isLoading } = useBalanceTransactions(balanceId, { limit: 50 });

    const transactions: TransactionRecord[] = React.useMemo(() => {
        const raw = (txResponse as any)?.data ?? txResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            date: item.createdAt ?? item.date ?? '',
            type: item.type ?? item.transactionType ?? '',
            delta: Number(item.delta ?? item.days ?? item.amount ?? 0),
            resultingBalance: Number(item.resultingBalance ?? item.balanceAfter ?? 0),
            reason: item.reason ?? item.description ?? '',
        }));
    }, [txResponse]);

    const renderTxItem = ({ item }: { item: TransactionRecord }) => {
        const badge = getTransactionTypeBadge(item.type);
        const dateStr = item.date ? fmt.date(item.date) : '';
        const isPositive = item.delta >= 0;
        return (
            <View style={txStyles.row}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={[txStyles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                        </View>
                        <Text className="font-inter text-[10px] text-neutral-400">{dateStr}</Text>
                    </View>
                    {item.reason ? <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>{item.reason}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text className={`font-inter text-sm font-bold ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
                        {isPositive ? '+' : ''}{item.delta}
                    </Text>
                    <Text className="font-inter text-[10px] text-neutral-400">Bal: {item.resultingBalance}</Text>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '75%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">
                        {leaveTypeName} - Transaction History
                    </Text>
                    {isLoading ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary[500]} />
                            <Text className="mt-2 font-inter text-xs text-neutral-400">Loading transactions...</Text>
                        </View>
                    ) : transactions.length === 0 ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <Text className="font-inter text-sm text-neutral-400">No transactions found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={transactions}
                            renderItem={renderTxItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 16 }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const txStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral[100],
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
});

// ============ EDIT BALANCE INLINE ============

function EditBalanceForm({
    balance, onSave, onCancel, isSaving,
}: {
    balance: LeaveBalanceEntry;
    onSave: (data: { opening: number; accrued: number; taken: number; adjusted: number; reason: string }) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [opening, setOpening] = React.useState(String(balance.opening));
    const [accrued, setAccrued] = React.useState(String(balance.accrued));
    const [taken, setTaken] = React.useState(String(balance.taken));
    const [adjusted, setAdjusted] = React.useState(String(balance.adjusted));
    const [reason, setReason] = React.useState('');

    const computedBalance = (Number(opening) || 0) + (Number(accrued) || 0) - (Number(taken) || 0) + (Number(adjusted) || 0);
    const isValid = reason.trim().length > 0;

    return (
        <View style={editStyles.container}>
            <Text className="mb-3 font-inter text-xs font-bold text-primary-950 dark:text-white">Edit Balance</Text>
            <View style={editStyles.row}>
                <View style={editStyles.fieldSmall}>
                    <Text className="font-inter text-[10px] text-neutral-400 mb-1">Opening</Text>
                    <View style={editStyles.inputWrap}>
                        <TextInput style={editStyles.input} value={opening} onChangeText={setOpening} keyboardType="decimal-pad" />
                    </View>
                </View>
                <View style={editStyles.fieldSmall}>
                    <Text className="font-inter text-[10px] text-neutral-400 mb-1">Accrued</Text>
                    <View style={editStyles.inputWrap}>
                        <TextInput style={editStyles.input} value={accrued} onChangeText={setAccrued} keyboardType="decimal-pad" />
                    </View>
                </View>
                <View style={editStyles.fieldSmall}>
                    <Text className="font-inter text-[10px] text-neutral-400 mb-1">Taken</Text>
                    <View style={editStyles.inputWrap}>
                        <TextInput style={editStyles.input} value={taken} onChangeText={setTaken} keyboardType="decimal-pad" />
                    </View>
                </View>
                <View style={editStyles.fieldSmall}>
                    <Text className="font-inter text-[10px] text-neutral-400 mb-1">Adjusted</Text>
                    <View style={editStyles.inputWrap}>
                        <TextInput style={editStyles.input} value={adjusted} onChangeText={setAdjusted} keyboardType="decimal-pad" />
                    </View>
                </View>
            </View>
            <View style={editStyles.previewRow}>
                <Text className="font-inter text-xs font-semibold text-neutral-500">Computed Balance:</Text>
                <Text className={`font-inter text-sm font-bold ${computedBalance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{computedBalance.toFixed(1)}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                <View style={[editStyles.inputWrap, { height: 56, paddingTop: 6 }]}>
                    <TextInput style={[editStyles.input, { textAlignVertical: 'top' }]} value={reason} onChangeText={setReason} placeholder="Reason for edit..." placeholderTextColor={colors.neutral[400]} multiline numberOfLines={2} />
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={onCancel} style={editStyles.cancelBtn}>
                    <Text className="font-inter text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                </Pressable>
                <Pressable onPress={() => onSave({ opening: Number(opening), accrued: Number(accrued), taken: Number(taken), adjusted: Number(adjusted), reason: reason.trim() })} disabled={!isValid || isSaving} style={[editStyles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                    {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-inter text-[11px] font-bold text-white">Save</Text>}
                </Pressable>
            </View>
        </View>
    );
}

const editStyles = StyleSheet.create({
    container: { marginTop: 8, backgroundColor: colors.primary[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primary[100] },
    row: { flexDirection: 'row', gap: 6 },
    fieldSmall: { flex: 1 },
    inputWrap: { backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 8, height: 36, justifyContent: 'center' },
    input: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950], flex: 1 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
    cancelBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
});

// ============ ENCASH BALANCE MODAL ============

function EncashBalanceModal({
    visible, onClose, employee, balance, onEncash, isSubmitting,
}: {
    visible: boolean; onClose: () => void;
    employee: EmployeeBalance | null; balance: LeaveBalanceEntry | null;
    onEncash: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [days, setDays] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) { setDays(''); setReason(''); }
    }, [visible]);

    const isValid = Number(days) > 0 && reason.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Encash Leave Balance</Text>
                    {employee && balance && (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                            {employee.employeeName} - {balance.leaveTypeName} (Available: {balance.balance})
                        </Text>
                    )}
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Days to Encash <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.textInput} placeholder="e.g. 5" placeholderTextColor={colors.neutral[400]} value={days} onChangeText={setDays} keyboardType="decimal-pad" />
                        </View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                        <View style={[styles.inputWrap, { height: 70 }]}>
                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for encashment..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={2} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onEncash({
                                employeeId: employee?.id,
                                leaveTypeId: balance?.leaveTypeId,
                                days: Number(days),
                                reason: reason.trim(),
                                year: balance?.year ?? new Date().getFullYear(),
                            })}
                            disabled={!isValid || isSubmitting}
                            style={[styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-inter text-sm font-bold text-white">Encash</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DETAIL BOTTOM SHEET ============

function EmployeeDetailSheet({
    visible, onClose, employee, leaveTypeOptions, onAdjust,
}: {
    visible: boolean; onClose: () => void; employee: EmployeeBalance | null;
    leaveTypeOptions: { id: string; label: string }[];
    onAdjust: (data: Record<string, unknown>) => void;
}) {
    const insets = useSafeAreaInsets();
    const [showAdjustForm, setShowAdjustForm] = React.useState(false);
    const [adjustLeaveTypeId, setAdjustLeaveTypeId] = React.useState('');
    const [adjustAction, setAdjustAction] = React.useState<'Credit' | 'Debit'>('Credit');
    const [adjustDays, setAdjustDays] = React.useState('');
    const [adjustReason, setAdjustReason] = React.useState('');
    const [editingBalanceId, setEditingBalanceId] = React.useState<string | null>(null);
    const [txBalanceId, setTxBalanceId] = React.useState<string | null>(null);
    const [txLeaveTypeName, setTxLeaveTypeName] = React.useState('');
    const [encashBalance, setEncashBalance] = React.useState<LeaveBalanceEntry | null>(null);

    const updateBalanceMutation = useUpdateBalance();
    const encashMutation = useEncashBalance();

    React.useEffect(() => {
        if (visible) {
            setShowAdjustForm(false);
            setAdjustLeaveTypeId('');
            setAdjustAction('Credit');
            setAdjustDays('');
            setAdjustReason('');
            setEditingBalanceId(null);
            setTxBalanceId(null);
            setEncashBalance(null);
        }
    }, [visible]);

    if (!employee) return null;

    const handleAdjustSubmit = () => {
        if (!adjustLeaveTypeId || !adjustDays || !adjustReason.trim()) return;
        const balanceYear = employee.balances[0]?.year;
        onAdjust({
            employeeId: employee.id,
            leaveTypeId: adjustLeaveTypeId,
            action: adjustAction.toLowerCase(),
            days: Number(adjustDays),
            reason: adjustReason.trim(),
            year: balanceYear ?? new Date().getFullYear(),
        });
    };

    const handleEditSave = (balanceEntry: LeaveBalanceEntry, data: { opening: number; accrued: number; taken: number; adjusted: number; reason: string }) => {
        if (!balanceEntry.balanceRecordId) return;
        updateBalanceMutation.mutate(
            { id: balanceEntry.balanceRecordId, data: { openingBalance: data.opening, accrued: data.accrued, taken: data.taken, adjusted: data.adjusted, reason: data.reason } },
            {
                onSuccess: () => {
                    setEditingBalanceId(null);
                    showSuccess('Balance updated successfully');
                },
                onError: (err: any) => showError(err),
            },
        );
    };

    const handleEncash = (data: Record<string, unknown>) => {
        encashMutation.mutate(data, {
            onSuccess: () => {
                setEncashBalance(null);
                showSuccess('Leave encashed successfully');
            },
            onError: (err: any) => showError(err),
        });
    };

    const adjustValid = adjustLeaveTypeId && Number(adjustDays) > 0 && adjustReason.trim();

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                    <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                        <View style={styles.sheetHandle} />

                        {/* Employee header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <AvatarCircle name={employee.employeeName} />
                            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{employee.employeeName}</Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Per leave type breakdown */}
                            {employee.balances.map((b, index) => (
                                <View key={`${b.balanceRecordId ?? b.leaveTypeId ?? 'leave-balance'}-${index}`}>
                                    <View style={styles.detailCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ flex: 1 }}>{b.leaveTypeName}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                {/* Transaction history icon */}
                                                {b.balanceRecordId && (
                                                    <Pressable
                                                        onPress={() => { setTxBalanceId(b.balanceRecordId!); setTxLeaveTypeName(b.leaveTypeName); }}
                                                        style={iconBtnStyle}
                                                        hitSlop={6}
                                                    >
                                                        <ClockIcon size={14} color={colors.neutral[500]} />
                                                    </Pressable>
                                                )}
                                                {/* Edit icon */}
                                                {b.balanceRecordId && (
                                                    <Pressable
                                                        onPress={() => setEditingBalanceId(editingBalanceId === b.balanceRecordId ? null : b.balanceRecordId!)}
                                                        style={iconBtnStyle}
                                                        hitSlop={6}
                                                    >
                                                        <PencilIcon size={14} color={colors.primary[600]} />
                                                    </Pressable>
                                                )}
                                                {/* Encash button */}
                                                {b.encashmentAllowed && (
                                                    <Pressable
                                                        onPress={() => setEncashBalance(b)}
                                                        style={iconBtnStyle}
                                                        hitSlop={6}
                                                    >
                                                        <DollarIcon size={14} color={colors.success[600]} />
                                                    </Pressable>
                                                )}
                                                <View style={[styles.balancePill, { backgroundColor: getBalanceBg(b.balance, b.entitlement) }]}>
                                                    <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: getBalanceColor(b.balance, b.entitlement) }}>
                                                        {b.balance}/{b.entitlement}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.breakdownRow}>
                                            <View style={styles.breakdownItem}>
                                                <Text className="font-inter text-[10px] text-neutral-400">Opening</Text>
                                                <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{b.opening}</Text>
                                            </View>
                                            <View style={styles.breakdownItem}>
                                                <Text className="font-inter text-[10px] text-neutral-400">Accrued</Text>
                                                <Text className="font-inter text-xs font-semibold text-success-600">{b.accrued}</Text>
                                            </View>
                                            <View style={styles.breakdownItem}>
                                                <Text className="font-inter text-[10px] text-neutral-400">Taken</Text>
                                                <Text className="font-inter text-xs font-semibold text-danger-600">{b.taken}</Text>
                                            </View>
                                            <View style={styles.breakdownItem}>
                                                <Text className="font-inter text-[10px] text-neutral-400">Adjusted</Text>
                                                <Text className="font-inter text-xs font-semibold text-accent-600">{b.adjusted}</Text>
                                            </View>
                                            <View style={styles.breakdownItem}>
                                                <Text className="font-inter text-[10px] text-neutral-400">Balance</Text>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: getBalanceColor(b.balance, b.entitlement) }}>{b.balance}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {/* Inline edit form */}
                                    {editingBalanceId === b.balanceRecordId && (
                                        <EditBalanceForm
                                            balance={b}
                                            onSave={(data) => handleEditSave(b, data)}
                                            onCancel={() => setEditingBalanceId(null)}
                                            isSaving={updateBalanceMutation.isPending}
                                        />
                                    )}
                                </View>
                            ))}

                            {employee.balances.length === 0 && (
                                <Text className="py-8 text-center font-inter text-sm text-neutral-400">No balance data available</Text>
                            )}

                            {/* Adjust Balance */}
                            {!showAdjustForm ? (
                                <Pressable onPress={() => setShowAdjustForm(true)} style={styles.adjustBtn}>
                                    <Text className="font-inter text-sm font-semibold text-primary-600">Adjust Balance</Text>
                                </Pressable>
                            ) : (
                                <View style={styles.adjustForm}>
                                    <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">Adjust Balance</Text>
                                    <Dropdown label="Leave Type" value={adjustLeaveTypeId} options={leaveTypeOptions} onSelect={setAdjustLeaveTypeId} placeholder="Select..." required />
                                    <ChipSelector label="Action" options={['Credit', 'Debit']} value={adjustAction} onSelect={v => setAdjustAction(v as 'Credit' | 'Debit')} />
                                    <View style={styles.fieldWrap}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Days <Text className="text-danger-500">*</Text></Text>
                                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0.5" placeholderTextColor={colors.neutral[400]} value={adjustDays} onChangeText={setAdjustDays} keyboardType="decimal-pad" /></View>
                                    </View>
                                    <View style={styles.fieldWrap}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                                        <View style={[styles.inputWrap, { height: 70 }]}>
                                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for adjustment..." placeholderTextColor={colors.neutral[400]} value={adjustReason} onChangeText={setAdjustReason} multiline numberOfLines={2} />
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <Pressable onPress={() => setShowAdjustForm(false)} style={[styles.cancelBtn, { height: 44 }]}>
                                            <Text className="font-inter text-xs font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                                        </Pressable>
                                        <Pressable onPress={handleAdjustSubmit} disabled={!adjustValid} style={[styles.saveBtn, { height: 44 }, !adjustValid && { opacity: 0.5 }]}>
                                            <Text className="font-inter text-xs font-bold text-white">Submit Adjustment</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Transaction History sub-sheet */}
            {txBalanceId ? (
                <TransactionHistorySheet
                    visible={!!txBalanceId}
                    onClose={() => setTxBalanceId(null)}
                    balanceId={txBalanceId}
                    leaveTypeName={txLeaveTypeName}
                />
            ) : null}

            {/* Encash sub-sheet */}
            {encashBalance ? (
                <EncashBalanceModal
                    visible={!!encashBalance}
                    onClose={() => setEncashBalance(null)}
                    employee={employee}
                    balance={encashBalance}
                    onEncash={handleEncash}
                    isSubmitting={encashMutation.isPending}
                />
            ) : null}
        </>
    );
}

const iconBtnStyle: any = {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[100],
};

// ============ BALANCE ROW CARD ============

function BalanceRowCard({
    item, index, leaveTypeCodes, onPress,
}: {
    item: EmployeeBalance; index: number; leaveTypeCodes: string[];
    onPress: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 40)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <AvatarCircle name={item.employeeName} />
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1 }}>{item.employeeName}</Text>
                </View>
                <View style={styles.balanceGrid}>
                    {leaveTypeCodes.map(code => {
                        const entry = item.balances.find(b => b.leaveTypeCode === code);
                        const balance = entry?.balance ?? 0;
                        const entitlement = entry?.entitlement ?? 0;
                        return (
                            <View key={code} style={styles.balanceCell}>
                                <Text className="font-inter text-[9px] font-bold text-neutral-400">{code}</Text>
                                <View style={[styles.balanceCellValue, { backgroundColor: getBalanceBg(balance, entitlement) }]}>
                                    <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: getBalanceColor(balance, entitlement) }}>
                                        {balance}/{entitlement}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ ADJUST BALANCE MODAL ============

function AdjustBalanceModal({
    visible, onClose, employees, leaveTypeOptions, onAdjust,
}: {
    visible: boolean; onClose: () => void;
    employees: EmployeeBalance[];
    leaveTypeOptions: { id: string; label: string }[];
    onAdjust: (data: Record<string, unknown>) => void;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [selectedEmpId, setSelectedEmpId] = React.useState('');
    const [leaveTypeId, setLeaveTypeId] = React.useState('');
    const [action, setAction] = React.useState<'Credit' | 'Debit'>('Credit');
    const [days, setDays] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeSearch(''); setSelectedEmpId(''); setLeaveTypeId('');
            setAction('Credit'); setDays(''); setReason('');
        }
    }, [visible]);

    const filteredEmployees = React.useMemo(() => {
        if (!employeeSearch.trim()) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter(e => e.employeeName.toLowerCase().includes(q));
    }, [employees, employeeSearch]);

    const selectedEmp = employees.find(e => e.id === selectedEmpId);
    const isValid = selectedEmpId && leaveTypeId && Number(days) > 0 && reason.trim();

    const handleSubmit = () => {
        if (!isValid) return;
        const balanceYear = selectedEmp?.balances[0]?.year;
        onAdjust({
            employeeId: selectedEmpId,
            leaveTypeId,
            action: action.toLowerCase(),
            days: Number(days),
            reason: reason.trim(),
            year: balanceYear ?? new Date().getFullYear(),
        });
        onClose();
    };

    const formBg = isDark ? '#1A1730' : colors.white;
    const inputBg = isDark ? colors.neutral[800] : colors.neutral[50];
    const inputBorder = isDark ? colors.neutral[700] : colors.neutral[200];
    const textColor = isDark ? colors.neutral[100] : colors.primary[950];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[adjustModalStyles.sheet, { backgroundColor: formBg, paddingBottom: insets.bottom + 20 }]}>
                    <View style={adjustModalStyles.handle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">Adjust Leave Balance</Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Employee selection */}
                        {!selectedEmp ? (
                            <View style={{ marginBottom: 12 }}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Select Employee <Text className="text-danger-500">*</Text>
                                </Text>
                                <View style={[adjustModalStyles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    <TextInput
                                        style={[adjustModalStyles.textInput, { color: textColor }]}
                                        placeholder="Search employee..."
                                        placeholderTextColor={colors.neutral[400]}
                                        value={employeeSearch}
                                        onChangeText={setEmployeeSearch}
                                        autoFocus
                                    />
                                </View>
                                <View style={{ maxHeight: 200, marginTop: 8 }}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {filteredEmployees.map(emp => (
                                            <Pressable
                                                key={emp.id}
                                                onPress={() => { setSelectedEmpId(emp.id); setEmployeeSearch(''); }}
                                                style={[adjustModalStyles.empItem, { borderBottomColor: inputBorder }]}
                                            >
                                                <AvatarCircle name={emp.employeeName} />
                                                <Text className="ml-3 font-inter text-sm font-semibold text-primary-950 dark:text-white">{emp.employeeName}</Text>
                                            </Pressable>
                                        ))}
                                        {filteredEmployees.length === 0 && (
                                            <Text className="py-4 text-center font-inter text-xs text-neutral-400">No employees found</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : (
                            <Pressable
                                onPress={() => { setSelectedEmpId(''); setEmployeeSearch(''); }}
                                style={[adjustModalStyles.selectedEmp, { backgroundColor: isDark ? '#1E1B4B' : colors.primary[50], borderColor: isDark ? colors.primary[800] : colors.primary[100] }]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <AvatarCircle name={selectedEmp.employeeName} />
                                    <Text className="ml-3 font-inter text-sm font-bold text-primary-950 dark:text-white">{selectedEmp.employeeName}</Text>
                                </View>
                                <Text className="font-inter text-xs font-semibold text-primary-600">Change</Text>
                            </Pressable>
                        )}

                        {selectedEmp && (
                            <>
                                <Dropdown label="Leave Type" value={leaveTypeId} options={leaveTypeOptions} onSelect={setLeaveTypeId} placeholder="Select..." required />
                                <ChipSelector label="Action" options={['Credit', 'Debit']} value={action} onSelect={v => setAction(v as 'Credit' | 'Debit')} />
                                <View style={{ marginBottom: 12 }}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Days <Text className="text-danger-500">*</Text></Text>
                                    <View style={[adjustModalStyles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput style={[adjustModalStyles.textInput, { color: textColor }]} placeholder="0.5" placeholderTextColor={colors.neutral[400]} value={days} onChangeText={setDays} keyboardType="decimal-pad" />
                                    </View>
                                </View>
                                <View style={{ marginBottom: 12 }}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                                    <View style={[adjustModalStyles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder, height: 70 }]}>
                                        <TextInput style={[adjustModalStyles.textInput, { textAlignVertical: 'top', paddingTop: 10, color: textColor }]} placeholder="Reason for adjustment..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={2} />
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={adjustModalStyles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleSubmit} disabled={!isValid} style={[adjustModalStyles.saveBtn, !isValid && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">Submit Adjustment</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const adjustModalStyles = StyleSheet.create({
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
    inputWrap: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
    textInput: { fontSize: 14, fontFamily: 'Inter', flex: 1 },
    empItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    selectedEmp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    saveBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary[600] },
});

// ============ INITIALIZE BALANCES MODAL ============

function InitializeBalancesModal({
    visible, onClose, employees, onInitialize, isSubmitting,
}: {
    visible: boolean; onClose: () => void;
    employees: EmployeeBalance[];
    onInitialize: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [selectedEmpId, setSelectedEmpId] = React.useState('');
    const [year, setYear] = React.useState(String(new Date().getFullYear()));

    React.useEffect(() => {
        if (visible) { setEmployeeSearch(''); setSelectedEmpId(''); setYear(String(new Date().getFullYear())); }
    }, [visible]);

    const filteredEmployees = React.useMemo(() => {
        if (!employeeSearch.trim()) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter(e => e.employeeName.toLowerCase().includes(q));
    }, [employees, employeeSearch]);

    const selectedEmp = employees.find(e => e.id === selectedEmpId);
    const isValid = selectedEmpId && Number(year) >= 2020;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Initialize Leave Balances</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                        Create opening balances for an employee based on their assigned leave policy.
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Employee selection */}
                        {!selectedEmp ? (
                            <View style={{ marginBottom: 12 }}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Select Employee <Text className="text-danger-500">*</Text>
                                </Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.textInput} placeholder="Search employee..." placeholderTextColor={colors.neutral[400]} value={employeeSearch} onChangeText={setEmployeeSearch} />
                                </View>
                                <View style={{ maxHeight: 200, marginTop: 8 }}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {filteredEmployees.map(emp => (
                                            <Pressable key={emp.id} onPress={() => { setSelectedEmpId(emp.id); setEmployeeSearch(''); }}
                                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[100] }}>
                                                <AvatarCircle name={emp.employeeName} />
                                                <Text className="ml-3 font-inter text-sm font-semibold text-primary-950 dark:text-white">{emp.employeeName}</Text>
                                            </Pressable>
                                        ))}
                                        {filteredEmployees.length === 0 && (
                                            <Text className="py-4 text-center font-inter text-xs text-neutral-400">No employees found</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : (
                            <Pressable onPress={() => { setSelectedEmpId(''); setEmployeeSearch(''); }}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.primary[100], backgroundColor: colors.primary[50], marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <AvatarCircle name={selectedEmp.employeeName} />
                                    <Text className="ml-3 font-inter text-sm font-bold text-primary-950 dark:text-white">{selectedEmp.employeeName}</Text>
                                </View>
                                <Text className="font-inter text-xs font-semibold text-primary-600">Change</Text>
                            </Pressable>
                        )}

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Year <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="2026" placeholderTextColor={colors.neutral[400]} value={year} onChangeText={setYear} keyboardType="number-pad" />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onInitialize({ employeeId: selectedEmpId, year: Number(year) })}
                            disabled={!isValid || isSubmitting}
                            style={[styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-inter text-sm font-bold text-white">Initialize</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ RUN ACCRUAL MODAL ============

function RunAccrualModal({
    visible, onClose, onRun, isSubmitting,
}: {
    visible: boolean; onClose: () => void;
    onRun: (data: { month: number; year: number }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [month, setMonth] = React.useState(String(now.getMonth() + 1));
    const [year, setYear] = React.useState(String(now.getFullYear()));

    React.useEffect(() => {
        if (visible) {
            setMonth(String(new Date().getMonth() + 1));
            setYear(String(new Date().getFullYear()));
        }
    }, [visible]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
    }));

    const isValid = Number(month) >= 1 && Number(month) <= 12 && Number(year) >= 2020;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Run Monthly Accrual</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                        This will accrue leave balances for all employees for the selected month.
                    </Text>

                    <View style={{ backgroundColor: colors.warning[50], borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.warning[100] }}>
                        <Text className="font-inter text-xs text-warning-700">
                            This action processes leave accruals for all eligible employees. It is idempotent and safe to re-run if needed.
                        </Text>
                    </View>

                    <Dropdown label="Month" value={month} options={monthOptions} onSelect={setMonth} required />
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Year <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.textInput} placeholder="2026" placeholderTextColor={colors.neutral[400]} value={year} onChangeText={setYear} keyboardType="number-pad" />
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onRun({ month: Number(month), year: Number(year) })}
                            disabled={!isValid || isSubmitting}
                            style={[styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-inter text-sm font-bold text-white">Run Accrual</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARRY FORWARD MODAL ============

function CarryForwardModal({
    visible, onClose, onRun, isSubmitting,
}: {
    visible: boolean; onClose: () => void;
    onRun: (data: { fromYear: number; toYear: number }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const currentYear = new Date().getFullYear();
    const [fromYear, setFromYear] = React.useState(String(currentYear - 1));
    const [toYear, setToYear] = React.useState(String(currentYear));

    React.useEffect(() => {
        if (visible) {
            const yr = new Date().getFullYear();
            setFromYear(String(yr - 1));
            setToYear(String(yr));
        }
    }, [visible]);

    const isValid = Number(fromYear) >= 2020 && Number(toYear) > Number(fromYear);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Carry Forward Balances</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                        Carry over unused leave balances from one year to the next based on policy rules.
                    </Text>

                    <View style={{ backgroundColor: colors.warning[50], borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.warning[100] }}>
                        <Text className="font-inter text-xs text-warning-700">
                            This will process carry-forward for all employees based on their leave policy limits. It is idempotent and safe to re-run.
                        </Text>
                    </View>

                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">From Year <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.textInput} placeholder="2025" placeholderTextColor={colors.neutral[400]} value={fromYear} onChangeText={setFromYear} keyboardType="number-pad" />
                        </View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">To Year <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.textInput} placeholder="2026" placeholderTextColor={colors.neutral[400]} value={toYear} onChangeText={setToYear} keyboardType="number-pad" />
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onRun({ fromYear: Number(fromYear), toYear: Number(toYear) })}
                            disabled={!isValid || isSubmitting}
                            style={[styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-inter text-sm font-bold text-white">Carry Forward</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ IMPORT BALANCES MODAL ============

function ImportBalancesModal({
    visible, onClose,
}: {
    visible: boolean; onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const validateMutation = useValidateBalanceUpload();
    const confirmMutation = useConfirmBalanceImport();
    const [validationResult, setValidationResult] = React.useState<any>(null);
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (visible) { setValidationResult(null); setSelectedFile(null); }
    }, [visible]);

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setSelectedFile(file.name);

            // Build FormData-compatible file object
            const fileObj = {
                uri: file.uri,
                name: file.name,
                type: file.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            validateMutation.mutate(fileObj, {
                onSuccess: (data: any) => {
                    const resultData = data?.data ?? data;
                    setValidationResult(resultData);
                },
                onError: (err: any) => showError(err),
            });
        } catch {
            showMessage({ message: 'Failed to pick file', type: 'danger' });
        }
    };

    const handleConfirmImport = () => {
        const rows = validationResult?.validRows ?? validationResult?.rows ?? [];
        if (rows.length === 0) return;
        confirmMutation.mutate(rows, {
            onSuccess: () => {
                showSuccess('Balances imported successfully');
                onClose();
            },
            onError: (err: any) => showError(err),
        });
    };

    const validRows = validationResult?.validRows ?? validationResult?.rows ?? [];
    const errorRows = validationResult?.errors ?? validationResult?.errorRows ?? [];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Import Leave Balances</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                        Upload an Excel file (.xlsx) to bulk-import leave balances.
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Pick file */}
                        <Pressable onPress={handlePickFile} disabled={validateMutation.isPending} style={importStyles.pickBtn}>
                            {validateMutation.isPending ? (
                                <ActivityIndicator size="small" color={colors.primary[600]} />
                            ) : (
                                <>
                                    <Svg width={20} height={20} viewBox="0 0 24 24">
                                        <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                    <Text className="ml-2 font-inter text-sm font-semibold text-primary-600">
                                        {selectedFile ? selectedFile : 'Choose .xlsx File'}
                                    </Text>
                                </>
                            )}
                        </Pressable>

                        {/* Validation results */}
                        {validationResult && (
                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                    <View style={[importStyles.statCard, { backgroundColor: colors.success[50] }]}>
                                        <Text className="font-inter text-lg font-bold text-success-700">{validRows.length}</Text>
                                        <Text className="font-inter text-[10px] text-success-600">Valid Rows</Text>
                                    </View>
                                    <View style={[importStyles.statCard, { backgroundColor: colors.danger[50] }]}>
                                        <Text className="font-inter text-lg font-bold text-danger-700">{errorRows.length}</Text>
                                        <Text className="font-inter text-[10px] text-danger-600">Errors</Text>
                                    </View>
                                </View>

                                {/* Error list */}
                                {errorRows.length > 0 && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text className="font-inter text-xs font-bold text-danger-700 mb-2">Errors:</Text>
                                        {errorRows.slice(0, 10).map((err: any, i: number) => (
                                            <View key={i} style={{ paddingVertical: 4 }}>
                                                <Text className="font-inter text-[11px] text-danger-600">
                                                    Row {err.row ?? i + 1}: {err.message ?? err.error ?? JSON.stringify(err)}
                                                </Text>
                                            </View>
                                        ))}
                                        {errorRows.length > 10 && (
                                            <Text className="font-inter text-[10px] text-neutral-400 mt-1">
                                                ...and {errorRows.length - 10} more errors
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        {validationResult && validRows.length > 0 && (
                            <Pressable
                                onPress={handleConfirmImport}
                                disabled={confirmMutation.isPending}
                                style={[styles.saveBtn, confirmMutation.isPending && { opacity: 0.5 }]}
                            >
                                {confirmMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text className="font-inter text-sm font-bold text-white">
                                        Import {validRows.length} Row{validRows.length !== 1 ? 's' : ''}
                                    </Text>
                                )}
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const importStyles = StyleSheet.create({
    pickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary[200],
        borderRadius: 14,
        backgroundColor: colors.primary[50],
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
});

// ============ ACTION MENU (Bottom Sheet) ============

function ActionMenuSheet({
    visible, onClose, onSelect,
}: {
    visible: boolean; onClose: () => void;
    onSelect: (action: string) => void;
}) {
    const insets = useSafeAreaInsets();

    const actions = [
        { key: 'adjust', label: 'Adjust Balance', icon: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z', color: colors.primary[600], bg: colors.primary[50] },
        { key: 'initialize', label: 'Initialize Balances', icon: 'M12 5v14M5 12h14', color: colors.success[600], bg: colors.success[50] },
        { key: 'accrual', label: 'Run Accrual', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2', color: colors.accent[600], bg: colors.accent[50] },
        { key: 'carryforward', label: 'Carry Forward', icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3', color: colors.warning[600], bg: colors.warning[50] },
        { key: 'import', label: 'Import Balances', icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', color: colors.neutral[700], bg: colors.neutral[100] },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">Actions</Text>
                    {actions.map((a, i) => (
                        <Animated.View key={a.key} entering={FadeInUp.duration(250).delay(50 + i * 40)}>
                            <Pressable
                                onPress={() => { onClose(); onSelect(a.key); }}
                                style={({ pressed }) => [actionStyles.row, pressed && { backgroundColor: colors.neutral[50] }]}
                            >
                                <View style={[actionStyles.iconWrap, { backgroundColor: a.bg }]}>
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path d={a.icon} stroke={a.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </View>
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{a.label}</Text>
                                <View style={{ flex: 1 }} />
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                        </Animated.View>
                    ))}
                </View>
            </View>
        </Modal>
    );
}

const actionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral[100],
        gap: 12,
        borderRadius: 12,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// ============ MAIN COMPONENT ============

export function LeaveBalanceScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useLeaveBalances({ limit: 100 });
    const { data: ltResponse } = useLeaveTypes();
    const adjustMutation = useAdjustLeaveBalance();
    const initMutation = useInitializeLeaveBalances();
    const accrualMutation = useRunAccrual();
    const carryForwardMutation = useRunCarryForward();

    const confirmModal = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeBalance | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);
    const [adjustVisible, setAdjustVisible] = React.useState(false);
    const [actionMenuVisible, setActionMenuVisible] = React.useState(false);
    const [initializeVisible, setInitializeVisible] = React.useState(false);
    const [accrualVisible, setAccrualVisible] = React.useState(false);
    const [carryForwardVisible, setCarryForwardVisible] = React.useState(false);
    const [importVisible, setImportVisible] = React.useState(false);

    const leaveTypeOptions = React.useMemo(() => {
        const raw = (ltResponse as any)?.data ?? ltResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [ltResponse]);

    const leaveTypeCodes = React.useMemo(() => {
        const raw = (ltResponse as any)?.data ?? ltResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => item.code ?? '').filter(Boolean);
    }, [ltResponse]);

    // Build a map of leaveTypeId -> encashmentAllowed from leave type data
    const leaveTypeEncashmentMap = React.useMemo(() => {
        const raw = (ltResponse as any)?.data ?? ltResponse ?? [];
        if (!Array.isArray(raw)) return {};
        const map: Record<string, boolean> = {};
        for (const item of raw) {
            if (item.id) map[item.id] = !!item.encashmentAllowed;
        }
        return map;
    }, [ltResponse]);

    const employees: EmployeeBalance[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];

        // API returns flat balance records with nested employee/leaveType relations.
        // Prisma Decimal fields come as strings. Group by employee for display.
        const grouped: Record<string, { employee: any; balances: LeaveBalanceEntry[] }> = {};

        for (const item of raw) {
            const empId = item.employeeId ?? '';
            if (!grouped[empId]) {
                const emp = item.employee ?? {};
                const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || empId;
                grouped[empId] = { employee: { id: empId, name, photo: '' }, balances: [] };
            }
            const lt = item.leaveType ?? {};
            const opening = Number(item.openingBalance ?? 0);
            const accrued = Number(item.accrued ?? 0);
            const taken = Number(item.taken ?? 0);
            const adjusted = Number(item.adjusted ?? 0);
            const balance = Number(item.balance ?? 0);
            const entitlement = opening + accrued;
            const leaveTypeId = item.leaveTypeId ?? lt.id ?? '';

            grouped[empId].balances.push({
                leaveTypeId,
                leaveTypeName: lt.name ?? '',
                leaveTypeCode: lt.code ?? '',
                opening,
                accrued,
                taken,
                adjusted,
                balance,
                entitlement,
                balanceRecordId: item.id,
                encashmentAllowed: leaveTypeEncashmentMap[leaveTypeId] ?? false,
                year: item.year ? Number(item.year) : undefined,
            });
        }

        return Object.entries(grouped).map(([empId, g]) => ({
            id: empId,
            employeeId: empId,
            employeeName: g.employee.name,
            employeePhoto: g.employee.photo,
            balances: g.balances,
        }));
    }, [response, leaveTypeEncashmentMap]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return employees;
        const q = search.toLowerCase();
        return employees.filter(e => e.employeeName.toLowerCase().includes(q));
    }, [employees, search]);

    const handleRowPress = (emp: EmployeeBalance) => {
        setSelectedEmployee(emp);
        setDetailVisible(true);
    };

    const handleAdjust = (data: Record<string, unknown>) => {
        adjustMutation.mutate(data, {
            onSuccess: () => {
                setDetailVisible(false);
                showSuccess('Balance adjusted successfully');
            },
            onError: (err: any) => showError(err),
        });
    };

    const handleActionSelect = (action: string) => {
        // Small delay to let the action menu close first
        setTimeout(() => {
            switch (action) {
                case 'adjust': setAdjustVisible(true); break;
                case 'initialize': setInitializeVisible(true); break;
                case 'accrual': setAccrualVisible(true); break;
                case 'carryforward': setCarryForwardVisible(true); break;
                case 'import': setImportVisible(true); break;
            }
        }, 200);
    };

    const handleInitialize = (data: Record<string, unknown>) => {
        initMutation.mutate(data, {
            onSuccess: () => {
                setInitializeVisible(false);
                showSuccess('Balances initialized successfully');
            },
            onError: (err: any) => showError(err),
        });
    };

    const handleRunAccrual = (data: { month: number; year: number }) => {
        confirmModal.show({
            title: 'Run Accrual',
            message: `This will process leave accruals for all employees for ${new Date(2000, data.month - 1, 1).toLocaleString('default', { month: 'long' })} ${data.year}. Continue?`,
            confirmText: 'Run',
            variant: 'warning',
            onConfirm: () => {
                accrualMutation.mutate(data, {
                    onSuccess: () => {
                        setAccrualVisible(false);
                        showSuccess('Accrual completed successfully');
                    },
                    onError: (err: any) => showError(err),
                });
            },
        });
    };

    const handleCarryForward = (data: { fromYear: number; toYear: number }) => {
        confirmModal.show({
            title: 'Carry Forward',
            message: `This will carry forward unused balances from ${data.fromYear} to ${data.toYear} for all employees. Continue?`,
            confirmText: 'Carry Forward',
            variant: 'warning',
            onConfirm: () => {
                carryForwardMutation.mutate(data, {
                    onSuccess: () => {
                        setCarryForwardVisible(false);
                        showSuccess('Carry forward completed successfully');
                    },
                    onError: (err: any) => showError(err),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: EmployeeBalance; index: number }) => (
        <BalanceRowCard item={item} index={index} leaveTypeCodes={leaveTypeCodes} onPress={() => handleRowPress(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Leave Balances</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name..." /></View>
            {/* Column headers */}
            {leaveTypeCodes.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                    <View style={styles.columnHeaders}>
                        <View style={{ width: 120 }}><Text className="font-inter text-[10px] font-bold text-neutral-400">EMPLOYEE</Text></View>
                        {leaveTypeCodes.map(code => (
                            <View key={code} style={styles.columnHeader}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-400">{code}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load balances" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No employees match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No balance data" message="Leave balances will appear here once configured." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Leave Balances" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB icon="plus" onPress={() => setActionMenuVisible(true)} />

            {/* Action Menu */}
            {actionMenuVisible && (
                <ActionMenuSheet visible={actionMenuVisible} onClose={() => setActionMenuVisible(false)} onSelect={handleActionSelect} />
            )}

            {adjustVisible && (
                <AdjustBalanceModal
                    visible={adjustVisible}
                    onClose={() => setAdjustVisible(false)}
                    employees={employees}
                    leaveTypeOptions={leaveTypeOptions}
                    onAdjust={handleAdjust}
                />
            )}

            {initializeVisible && (
                <InitializeBalancesModal
                    visible={initializeVisible}
                    onClose={() => setInitializeVisible(false)}
                    employees={employees}
                    onInitialize={handleInitialize}
                    isSubmitting={initMutation.isPending}
                />
            )}

            {accrualVisible && (
                <RunAccrualModal
                    visible={accrualVisible}
                    onClose={() => setAccrualVisible(false)}
                    onRun={handleRunAccrual}
                    isSubmitting={accrualMutation.isPending}
                />
            )}

            {carryForwardVisible && (
                <CarryForwardModal
                    visible={carryForwardVisible}
                    onClose={() => setCarryForwardVisible(false)}
                    onRun={handleCarryForward}
                    isSubmitting={carryForwardMutation.isPending}
                />
            )}

            {importVisible && (
                <ImportBalancesModal
                    visible={importVisible}
                    onClose={() => setImportVisible(false)}
                />
            )}

            {/* Employee Detail Sheet */}
            {detailVisible && (
                <EmployeeDetailSheet visible={detailVisible} onClose={() => setDetailVisible(false)} employee={selectedEmployee} leaveTypeOptions={leaveTypeOptions} onAdjust={handleAdjust} />
            )}

            {/* Confirm Modal for accrual/carry-forward */}
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    balanceCell: { alignItems: 'center', minWidth: 48, gap: 2 },
    balanceCellValue: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
    columnHeaders: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    columnHeader: { width: 54, alignItems: 'center' },
    detailCard: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    },
    balancePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownItem: { alignItems: 'center', gap: 2 },
    adjustBtn: {
        marginTop: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.primary[200],
        borderStyle: 'dashed', borderRadius: 14, alignItems: 'center',
    },
    adjustForm: {
        marginTop: 8, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
