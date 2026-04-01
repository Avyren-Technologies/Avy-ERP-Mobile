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
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useAdjustLeaveBalance } from '@/features/company-admin/api/use-leave-mutations';
import { useLeaveBalances, useLeaveTypes } from '@/features/company-admin/api/use-leave-queries';

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
}

interface EmployeeBalance {
    id: string;
    employeeId: string;
    employeeName: string;
    employeePhoto: string;
    balances: LeaveBalanceEntry[];
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

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
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
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
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

    React.useEffect(() => {
        if (visible) {
            setShowAdjustForm(false);
            setAdjustLeaveTypeId('');
            setAdjustAction('Credit');
            setAdjustDays('');
            setAdjustReason('');
        }
    }, [visible]);

    if (!employee) return null;

    const handleAdjustSubmit = () => {
        if (!adjustLeaveTypeId || !adjustDays || !adjustReason.trim()) return;
        onAdjust({
            employeeId: employee.employeeId,
            leaveTypeId: adjustLeaveTypeId,
            action: adjustAction.toLowerCase(),
            days: Number(adjustDays),
            reason: adjustReason.trim(),
        });
    };

    const adjustValid = adjustLeaveTypeId && Number(adjustDays) > 0 && adjustReason.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />

                    {/* Employee header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <AvatarCircle name={employee.employeeName} />
                        <Text className="font-inter text-lg font-bold text-primary-950">{employee.employeeName}</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Per leave type breakdown */}
                        {employee.balances.map(b => (
                            <View key={b.leaveTypeId} style={styles.detailCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text className="font-inter text-sm font-bold text-primary-950">{b.leaveTypeName}</Text>
                                    <View style={[styles.balancePill, { backgroundColor: getBalanceBg(b.balance, b.entitlement) }]}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: getBalanceColor(b.balance, b.entitlement) }}>
                                            {b.balance}/{b.entitlement}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <View style={styles.breakdownItem}>
                                        <Text className="font-inter text-[10px] text-neutral-400">Opening</Text>
                                        <Text className="font-inter text-xs font-semibold text-primary-950">{b.opening}</Text>
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
                                <Text className="mb-3 font-inter text-sm font-bold text-primary-950">Adjust Balance</Text>
                                <Dropdown label="Leave Type" value={adjustLeaveTypeId} options={leaveTypeOptions} onSelect={setAdjustLeaveTypeId} placeholder="Select..." required />
                                <ChipSelector label="Action" options={['Credit', 'Debit']} value={adjustAction} onSelect={v => setAdjustAction(v as 'Credit' | 'Debit')} />
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Days <Text className="text-danger-500">*</Text></Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0.5" placeholderTextColor={colors.neutral[400]} value={adjustDays} onChangeText={setAdjustDays} keyboardType="decimal-pad" /></View>
                                </View>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                                    <View style={[styles.inputWrap, { height: 70 }]}>
                                        <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for adjustment..." placeholderTextColor={colors.neutral[400]} value={adjustReason} onChangeText={setAdjustReason} multiline numberOfLines={2} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <Pressable onPress={() => setShowAdjustForm(false)} style={[styles.cancelBtn, { height: 44 }]}>
                                        <Text className="font-inter text-xs font-semibold text-neutral-600">Cancel</Text>
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
    );
}

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
                    <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1} style={{ flex: 1 }}>{item.employeeName}</Text>
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

// ============ MAIN COMPONENT ============

export function LeaveBalanceScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useLeaveBalances();
    const { data: ltResponse } = useLeaveTypes();
    const adjustMutation = useAdjustLeaveBalance();

    const [search, setSearch] = React.useState('');
    const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeBalance | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);

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

            grouped[empId].balances.push({
                leaveTypeId: item.leaveTypeId ?? lt.id ?? '',
                leaveTypeName: lt.name ?? '',
                leaveTypeCode: lt.code ?? '',
                opening,
                accrued,
                taken,
                adjusted,
                balance,
                entitlement,
            });
        }

        return Object.entries(grouped).map(([empId, g]) => ({
            id: empId,
            employeeId: empId,
            employeeName: g.employee.name,
            employeePhoto: g.employee.photo,
            balances: g.balances,
        }));
    }, [response]);

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
            },
        });
    };

    const renderItem = ({ item, index }: { item: EmployeeBalance; index: number }) => (
        <BalanceRowCard item={item} index={index} leaveTypeCodes={leaveTypeCodes} onPress={() => handleRowPress(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Leave Balances</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
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
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <EmployeeDetailSheet visible={detailVisible} onClose={() => setDetailVisible(false)} employee={selectedEmployee} leaveTypeOptions={leaveTypeOptions} onAdjust={handleAdjust} />
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
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    balanceCell: { alignItems: 'center', minWidth: 48, gap: 2 },
    balanceCellValue: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
    columnHeaders: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    columnHeader: { width: 54, alignItems: 'center' },
    detailCard: {
        backgroundColor: colors.neutral[50], borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: colors.neutral[100],
    },
    balancePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownItem: { alignItems: 'center', gap: 2 },
    adjustBtn: {
        marginTop: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.primary[200],
        borderStyle: 'dashed', borderRadius: 14, alignItems: 'center',
    },
    adjustForm: {
        marginTop: 8, backgroundColor: colors.neutral[50], borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: colors.neutral[100],
    },
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
