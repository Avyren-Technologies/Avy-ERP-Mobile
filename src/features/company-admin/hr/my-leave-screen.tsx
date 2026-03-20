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
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useMyLeaveBalance } from '@/features/company-admin/api/use-ess-queries';
import { useApplyLeave } from '@/features/company-admin/api/use-ess-mutations';

// ============ TYPES ============

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

interface LeaveBalance {
    type: string;
    code: string;
    balance: number;
    used: number;
    total: number;
    color: string;
}

interface MyLeaveRequest {
    id: string;
    type: string;
    fromDate: string;
    toDate: string;
    days: number;
    status: LeaveStatus;
    reason: string;
}

// ============ CONSTANTS ============

const BALANCE_COLORS = [colors.info[500], colors.success[500], colors.warning[500], colors.accent[500], colors.primary[500]];

const STATUS_COLORS: Record<LeaveStatus, { bg: string; text: string; dot: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

const LEAVE_TYPES = ['Casual Leave', 'Privilege Leave', 'Sick Leave', 'Earned Leave', 'Compensatory Off'];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: LeaveStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

// ============ BALANCE CARD ============

function BalanceCard({ item, index }: { item: LeaveBalance; index: number }) {
    const pct = item.total > 0 ? (item.balance / item.total) * 100 : 0;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 80)} style={[styles.balanceCard, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-2xl font-bold" style={{ color: item.color }}>{item.balance}</Text>
            <Text className="mt-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.code}</Text>
            <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: item.color }]} />
            </View>
            <Text className="mt-1 font-inter text-[10px] text-neutral-400">{item.used} used of {item.total}</Text>
        </Animated.View>
    );
}

// ============ APPLY LEAVE MODAL ============

function ApplyLeaveModal({ visible, onClose, onSave, isSaving }: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [leaveType, setLeaveType] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [halfDay, setHalfDay] = React.useState(false);
    const [reason, setReason] = React.useState('');
    const [typeOpen, setTypeOpen] = React.useState(false);

    React.useEffect(() => {
        if (visible) { setLeaveType(''); setFromDate(''); setToDate(''); setHalfDay(false); setReason(''); }
    }, [visible]);

    const calcDays = React.useMemo(() => {
        if (!fromDate || !toDate) return 0;
        const from = new Date(fromDate); const to = new Date(toDate);
        if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return 0;
        const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return halfDay ? 0.5 : diff;
    }, [fromDate, toDate, halfDay]);

    const isValid = leaveType && fromDate && toDate && reason.trim() && calcDays > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Apply for Leave</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Leave Type */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Leave Type <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setTypeOpen(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${leaveType ? 'font-semibold text-primary-950' : 'text-neutral-400'}`}>{leaveType || 'Select type...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={typeOpen} transparent animationType="slide" onRequestClose={() => setTypeOpen(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTypeOpen(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Leave Type</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {LEAVE_TYPES.map(t => (
                                                <Pressable key={t} onPress={() => { setLeaveType(t); setTypeOpen(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: t === leaveType ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${t === leaveType ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{t}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Dates */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">From <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={fromDate} onChangeText={setFromDate} /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">To <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={toDate} onChangeText={setToDate} /></View>
                            </View>
                        </View>

                        {/* Half Day */}
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950" style={{ flex: 1 }}>Half Day</Text>
                            <Switch value={halfDay} onValueChange={setHalfDay} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={halfDay ? colors.primary[600] : colors.neutral[300]} />
                        </View>

                        {calcDays > 0 && (
                            <View style={styles.daysBadge}><Text className="font-inter text-sm font-bold text-primary-700">{calcDays} day{calcDays !== 1 ? 's' : ''}</Text></View>
                        )}

                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for leave..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => { if (isValid) onSave({ leaveType, fromDate, toDate, halfDay, days: calcDays, reason: reason.trim() }); }} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Applying...' : 'Apply'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function MyLeaveScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch, isFetching } = useMyLeaveBalance();
    const applyMutation = useApplyLeave();

    const [formVisible, setFormVisible] = React.useState(false);

    const data = React.useMemo(() => {
        const raw: any = (response as any)?.data ?? response ?? {};
        const balances: LeaveBalance[] = (raw.balances ?? raw.leaveBalances ?? []).map((b: any, i: number) => ({
            type: b.type ?? b.leaveTypeName ?? '',
            code: b.code ?? b.leaveTypeCode ?? b.type?.slice(0, 2).toUpperCase() ?? '',
            balance: b.balance ?? b.available ?? 0,
            used: b.used ?? b.taken ?? 0,
            total: b.total ?? b.entitled ?? 0,
            color: BALANCE_COLORS[i % BALANCE_COLORS.length],
        }));
        const requests: MyLeaveRequest[] = (raw.requests ?? raw.myRequests ?? []).map((r: any) => ({
            id: r.id ?? '',
            type: r.type ?? r.leaveTypeName ?? '',
            fromDate: r.fromDate ?? '',
            toDate: r.toDate ?? '',
            days: r.days ?? 0,
            status: r.status ?? 'Pending',
            reason: r.reason ?? '',
        }));
        return { balances, requests };
    }, [response]);

    const handleApply = (formData: Record<string, unknown>) => {
        applyMutation.mutate(formData, { onSuccess: () => setFormVisible(false) });
    };

    type ListItem = { type: 'header'; key: string } | { type: 'request'; item: MyLeaveRequest; key: string };

    const listData: ListItem[] = React.useMemo(() => {
        const items: ListItem[] = [{ type: 'header', key: 'header' }];
        data.requests.forEach(r => items.push({ type: 'request', item: r, key: r.id }));
        return items;
    }, [data.requests]);

    const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
        if (item.type === 'header') {
            return (
                <>
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                        <Text className="font-inter text-2xl font-bold text-primary-950">My Leave</Text>
                        <Text className="mt-1 font-inter text-sm text-neutral-500">Balances and requests</Text>
                    </Animated.View>

                    {/* Balance Cards */}
                    {data.balances.length > 0 && (
                        <View style={styles.balanceGrid}>
                            {data.balances.map((b, i) => <BalanceCard key={b.code} item={b} index={i} />)}
                        </View>
                    )}

                    {/* Apply Button */}
                    <Pressable onPress={() => setFormVisible(true)} style={styles.applyBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth="2" strokeLinecap="round" /></Svg>
                        <Text className="font-inter text-sm font-bold text-white">Apply for Leave</Text>
                    </Pressable>

                    <Text className="mb-2 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">My Requests</Text>
                </>
            );
        }

        const req = item.item;
        return (
            <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 40)}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950">{req.type}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{req.fromDate} to {req.toDate} ({req.days}d)</Text>
                        </View>
                        <StatusBadge status={req.status} />
                    </View>
                    {req.reason ? <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{req.reason}</Text> : null}
                </View>
            </Animated.View>
        );
    };

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return null;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Leave</Text>
                <View style={{ width: 36 }} />
            </View>
            {isLoading || error ? renderEmpty() : (
                <FlatList
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={item => item.key}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            )}
            <ApplyLeaveModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleApply} isSaving={applyMutation.isPending} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    balanceCard: {
        flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    barBg: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.neutral[100], marginTop: 8, overflow: 'hidden' },
    barFill: { height: 4, borderRadius: 2 },
    applyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, backgroundColor: colors.primary[600],
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    daysBadge: { backgroundColor: colors.primary[50], borderRadius: 12, padding: 10, alignItems: 'center', marginBottom: 14 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
