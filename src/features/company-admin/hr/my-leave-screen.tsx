/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
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
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage } from '@/components/ui/utils';

import { useApplyLeave, useCancelLeave } from '@/features/company-admin/api/use-ess-mutations';
import { useMyLeaveBalance } from '@/features/company-admin/api/use-ess-queries';
import { useLeaveRequests, useLeaveTypes } from '@/features/company-admin/api/use-leave-queries';

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

const BALANCE_COLORS = [
    colors.info[500],
    colors.success[500],
    colors.warning[500],
    colors.accent[500],
    colors.primary[500],
];

const STATUS_COLORS: Record<LeaveStatus, { bg: string; text: string; dot: string }> = {
    Pending:   { bg: colors.warning[50],  text: colors.warning[700],  dot: colors.warning[500] },
    Approved:  { bg: colors.success[50],  text: colors.success[700],  dot: colors.success[500] },
    Rejected:  { bg: colors.danger[50],   text: colors.danger[700],   dot: colors.danger[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600],  dot: colors.neutral[400] },
};


const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// ============ STATUS BADGE ============

function StatusBadge({ status }: Readonly<{ status: LeaveStatus }>) {
    // We override pending styling to exactly match mockup: soft yellow bg, brown text
    const s = status === 'Pending' ? { bg: '#FFF9E6', text: '#A16E28', dot: '#DE911D' } : (STATUS_COLORS[status] ?? STATUS_COLORS.Pending);
    return (
        <View style={[st.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[st.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                {status}
            </Text>
        </View>
    );
}

// ============ BALANCE CARD (horizontal) ============

function BalanceCard({ item, index }: Readonly<{ item: LeaveBalance; index: number }>) {
    return (
        <Animated.View
            entering={FadeInUp.duration(350).delay(60 * index)}
            style={[st.balanceCard, { borderColor: `${item.color}30` }]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[st.balanceCodeCircle, { backgroundColor: `${item.color}15` }]}>
                    <Text style={[st.balanceCodeText, { color: item.color }]}>{item.code}</Text>
                </View>
                
                <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 8 }}>
                    <Text style={st.balanceLabel} numberOfLines={1}>{item.type.toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                         <Text style={st.balanceBig}>{item.used}</Text>
                         <Text style={st.balanceTotal}> / {item.total}</Text>
                    </View>
                    <Text style={st.balanceSub}>Used</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MINI CALENDAR ============

function MiniCalendar({
    label,
    selectedDate,
    onSelect,
    minDate,
}: Readonly<{
    label: string;
    selectedDate: string;
    onSelect: (date: string) => void;
    minDate?: string;
}>) {
    const today = new Date();
    const [viewYear, setViewYear]   = React.useState(today.getFullYear());
    const [viewMonth, setViewMonth] = React.useState(today.getMonth()); // 0-indexed

    const monthName   = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday-first offset
    const rawOffset = new Date(viewYear, viewMonth, 1).getDay();
    const offset    = (rawOffset + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const fmt = (d: number) =>
        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const tStr = todayStr();

    return (
        <View style={st.calBox}>
            <Text style={st.calFieldLabel}>{label}</Text>

            {/* Selected date display */}
            {selectedDate ? (
                <View style={st.calSelectedDisplay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </Svg>
                    <Text style={st.calSelectedText}>{selectedDate}</Text>
                </View>
            ) : null}

            {/* Month nav */}
            <View style={st.calHeader}>
                <Pressable onPress={prevMonth} style={st.calNavBtn} hitSlop={8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M15 18l-6-6 6-6" stroke={colors.primary[700]} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </Svg>
                </Pressable>
                <Text style={st.calMonthTitle}>{monthName} {viewYear}</Text>
                <Pressable onPress={nextMonth} style={st.calNavBtn} hitSlop={8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M9 18l6-6-6-6" stroke={colors.primary[700]} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </Svg>
                </Pressable>
            </View>

            {/* Day-of-week header */}
            <View style={st.calWeekRow}>
                {WEEKDAY_LABELS.map((d, i) => (
                    // weekday headers are static — index is safe here
                    // eslint-disable-next-line react/no-array-index-key
                    <Text key={`wd-${i}`} style={st.calWeekLabel}>{d}</Text>
                ))}
            </View>

            {/* Day grid */}
            <View style={st.calGrid}>
                {cells.map((day, i) => {
                    if (!day) return <View key={`empty-${viewYear}-${viewMonth}-${i}`} style={st.calCell} />;
                    const dateStr   = fmt(day);
                    const isSelected = dateStr === selectedDate;
                    const isToday    = dateStr === tStr;
                    const disabled   = !!minDate && dateStr < minDate;
                    return (
                        <Pressable
                            key={dateStr}
                            onPress={() => { if (!disabled) onSelect(dateStr); }}
                            style={[
                                st.calCell,
                                isSelected && st.calCellSelected,
                                isToday && !isSelected && st.calCellToday,
                            ]}
                        >
                            <Text style={[
                                st.calDayText,
                                isSelected && st.calDayTextSelected,
                                isToday && !isSelected && st.calDayTextToday,
                                disabled && st.calDayTextDisabled,
                            ]}>
                                {day}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ APPLY LEAVE — FULL-SCREEN MODAL ============

function ApplyLeaveModal({
    visible, onClose, onSave, isSaving, balances
}: Readonly<{
    visible: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    isSaving: boolean;
    balances: LeaveBalance[];
}>) {
    const insets = useSafeAreaInsets();
    const [leaveTypeId, setLeaveTypeId] = React.useState('');
    const [fromDate,  setFromDate]  = React.useState('');
    const [toDate,    setToDate]    = React.useState('');
    const [isHalfDay, setIsHalfDay] = React.useState(false);
    const [reason,    setReason]    = React.useState('');
    const [openCalendar, setOpenCalendar] = React.useState<'from' | 'to' | null>(null);
    const [leaveTypeDropdownOpen, setLeaveTypeDropdownOpen] = React.useState(false);

    const { data: leaveTypesResponse } = useLeaveTypes();
    const allLeaveTypes = React.useMemo(() => {
        const raw = (leaveTypesResponse as any)?.data ?? leaveTypesResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [leaveTypesResponse]);

    const displayLeaveTypes = allLeaveTypes.map((lt: any) => {
        const name = lt.name ?? lt.leaveTypeName ?? lt.type ?? 'Unknown';
        const bal = balances.find(b => b.type === name);
        return {
            name,
            id: lt.id,
            used: bal?.used ?? 0,
            total: bal?.total ?? 0,
        };
    });

    const handleShow = () => {
        setLeaveTypeId('');
        setFromDate('');
        setToDate('');
        setIsHalfDay(false);
        setReason('');
        setOpenCalendar(null);
        setLeaveTypeDropdownOpen(false);
    };

    // When fromDate changes, clear toDate if it's before fromDate
    const handleFromSelect = (d: string) => {
        setFromDate(d);
        if (toDate && toDate < d) setToDate('');
        setOpenCalendar(null);
    };
    const handleToSelect = (d: string) => {
        setToDate(d);
        setOpenCalendar(null);
    };

    const calcDays = React.useMemo(() => {
        if (!fromDate || !toDate) return 0;
        const from = new Date(fromDate), to = new Date(toDate);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
        const diff = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
        return isHalfDay ? 0.5 : diff;
    }, [fromDate, toDate, isHalfDay]);

    const isValid = leaveTypeId && fromDate && toDate && reason.trim() && calcDays > 0;

    const handleApply = () => {
        if (!isValid) { showErrorMessage('Please fill all required fields.'); return; }
        onSave({ leaveTypeId, fromDate, toDate, isHalfDay, days: calcDays, reason: reason.trim() });
    };

    // Main form
    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} onShow={handleShow} statusBarTranslucent>
            <KeyboardAvoidingView
                style={[st.modalPage, { backgroundColor: colors.neutral[50] }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Nav bar */}
                <View style={[st.navBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={st.navCancelWrap}>
                        <Text style={st.navCancelText}>Cancel</Text>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Apply for Leave</Text>
                    <Pressable
                        onPress={handleApply}
                        disabled={!isValid || isSaving}
                        style={[st.navApplyBtn, (!isValid || isSaving) && { opacity: 0.4 }]}
                    >
                        {isSaving
                            ? <ActivityIndicator size="small" color={colors.white} />
                            : <Text style={st.navApplyText}>Apply</Text>
                        }
                    </Pressable>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={st.formContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Leave Type ── */}
                    <Text style={st.groupLabel}>Leave Type <Text style={{ color: colors.danger[500] }}>*</Text></Text>
                    <View style={st.card}>
                        <Pressable 
                            onPress={() => {
                                setLeaveTypeDropdownOpen(prev => !prev);
                                setOpenCalendar(null);
                            }} 
                            style={st.dateRow}
                        >
                            <Text style={leaveTypeId ? st.dateValue : st.datePlaceholder}>
                                {allLeaveTypes.find((lt: any) => lt.id === leaveTypeId)?.name || 'Select leave type'}
                            </Text>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d={leaveTypeDropdownOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                            </Svg>
                        </Pressable>
                        {leaveTypeDropdownOpen && (
                            <View style={{ borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.neutral[50] }}>
                                {displayLeaveTypes.map((lt) => (
                                    <Pressable 
                                        key={lt.id ?? lt.name} 
                                        onPress={() => {
                                            setLeaveTypeId(lt.id);
                                            setLeaveTypeDropdownOpen(false);
                                        }}
                                        style={[
                                            st.dateRow, 
                                            { paddingVertical: 12 },
                                            leaveTypeId === lt.id && { backgroundColor: colors.primary[50] }
                                        ]}
                                    >
                                        <View>
                                            <Text style={[st.dateValue, leaveTypeId === lt.id && { color: colors.primary[700] }]}>{lt.name}</Text>
                                            {lt.total > 0 && (
                                                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>
                                                    {lt.used} used out of {lt.total}
                                                </Text>
                                            )}
                                        </View>
                                        {leaveTypeId === lt.id && (
                                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                                <Path d="M20 6L9 17l-5-5" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" />
                                            </Svg>
                                        )}
                                    </Pressable>
                                ))}
                                {displayLeaveTypes.length === 0 && (
                                    <View style={{ padding: 16, alignItems: 'center' }}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.neutral[400] }}>No leave types available</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Dates ── */}
                    <Text style={st.groupLabel}>Duration <Text style={{ color: colors.danger[500] }}>*</Text></Text>
                    <View style={st.card}>
                        {/* From date picker trigger */}
                        <Pressable onPress={() => { setOpenCalendar(openCalendar === 'from' ? null : 'from'); setLeaveTypeDropdownOpen(false); }} style={st.dateRow}>
                            <View style={st.dateRowLeft}>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                                </Svg>
                                <Text style={st.dateLabel}>From</Text>
                            </View>
                            <Text style={fromDate ? st.dateValue : st.datePlaceholder}>
                                {fromDate || 'Select date'}
                            </Text>
                        </Pressable>
                        {openCalendar === 'from' && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.neutral[50] }}>
                                <MiniCalendar label="From Date" selectedDate={fromDate} onSelect={handleFromSelect} />
                            </View>
                        )}

                        <View style={st.dateDivider} />

                        {/* To date picker trigger */}
                        <Pressable onPress={() => { setOpenCalendar(openCalendar === 'to' ? null : 'to'); setLeaveTypeDropdownOpen(false); }} style={st.dateRow}>
                            <View style={st.dateRowLeft}>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                                </Svg>
                                <Text style={st.dateLabel}>To</Text>
                            </View>
                            <Text style={toDate ? st.dateValue : st.datePlaceholder}>
                                {toDate || 'Select date'}
                            </Text>
                        </Pressable>
                        {openCalendar === 'to' && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.neutral[50] }}>
                                <MiniCalendar label="To Date" selectedDate={toDate} onSelect={handleToSelect} minDate={fromDate || todayStr()} />
                            </View>
                        )}
                    </View>

                    {/* Days badge */}
                    {calcDays > 0 && (
                        <View style={st.daysBadge}>
                            <Text style={st.daysBadgeText}>{calcDays} day{calcDays === 1 ? '' : 's'}</Text>
                        </View>
                    )}

                    {/* ── Half Day ── */}
                    <View style={st.card}>
                        <View style={st.toggleRow}>
                            <View>
                                <Text style={st.toggleLabel}>Half Day</Text>
                                <Text style={st.toggleSub}>Apply for half a day only</Text>
                            </View>
                            <Switch
                                value={isHalfDay}
                                onValueChange={setIsHalfDay}
                                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                thumbColor={isHalfDay ? colors.primary[600] : colors.neutral[300]}
                            />
                        </View>
                    </View>

                    {/* ── Reason ── */}
                    <Text style={st.groupLabel}>Reason <Text style={{ color: colors.danger[500] }}>*</Text></Text>
                    <View style={st.card}>
                        <TextInput
                            style={st.reasonInput}
                            placeholder="Describe the reason for your leave..."
                            placeholderTextColor={colors.neutral[400]}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            returnKeyType="default"
                        />
                    </View>

                    <View style={{ height: Math.max(insets.bottom, 24) + 16 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============ LEAVE REQUEST CARD ============

function LeaveRequestCard({
    req, index, onCancel,
}: Readonly<{
    req: MyLeaveRequest;
    index: number;
    onCancel: (id: string) => void;
}>) {
    const canCancel = req.status === 'Pending' || req.status === 'Approved';
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(50 * index)}>
            <View style={st.requestCard}>
                <View style={st.requestCardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={st.requestType}>{req.type.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}</Text>
                        <Text style={st.requestDates}>
                            {req.fromDate} to {req.toDate} {req.days > 0 ? `(${req.days}d)` : ''}
                        </Text>
                    </View>
                    <StatusBadge status={req.status} />
                </View>
                {req.reason ? (
                    <Text style={st.requestReason} numberOfLines={2}>{req.reason}</Text>
                ) : null}
                {canCancel && (
                    <Pressable onPress={() => onCancel(req.id)} style={st.cancelLeaveBtn}>
                        <Svg width={13} height={13} viewBox="0 0 24 24">
                            <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                        <Text style={st.cancelLeaveBtnText}>Cancel Leave</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function MyLeaveScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useMyLeaveBalance();
    const { data: reqsResponse, isLoading: isLoadingReqs, refetch: refetchReqs } = useLeaveRequests({ employeeId: 'me' });
    const applyMutation = useApplyLeave();
    const cancelLeave   = useCancelLeave();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const [formVisible, setFormVisible] = React.useState(false);

    const data = React.useMemo(() => {
        const raw: any = (response as any)?.data ?? response;
        const balancesArr = Array.isArray(raw) ? raw : (raw?.balances ?? raw?.leaveBalances ?? []);
        const balances: LeaveBalance[] = balancesArr.map((b: any, i: number) => ({
            type:    b.leaveTypeName ?? b.type ?? b.leaveType?.name ?? '',
            code:    b.leaveTypeCode ?? b.code ?? b.leaveType?.code ?? (b.leaveTypeName ?? b.type ?? '').slice(0, 2).toUpperCase(),
            balance: b.available ?? b.balance ?? b.remaining ?? 0,
            used:    b.used ?? b.taken ?? 0,
            total:   b.entitled ?? b.total ?? b.allocated ?? 0,
            color:   BALANCE_COLORS[i % BALANCE_COLORS.length],
        }));

        const requestsRaw = (reqsResponse as any)?.data?.data ?? (reqsResponse as any)?.data;
        const requestsArr = Array.isArray(requestsRaw) ? requestsRaw : (requestsRaw?.requests ?? []);
        const requests: MyLeaveRequest[] = requestsArr.map((r: any) => ({
            id:       r.id ?? '',
            type:     r.leaveTypeName ?? r.leaveType?.name ?? r.type ?? '',
            fromDate: r.fromDate ? r.fromDate.split('T')[0] : '',
            toDate:   r.toDate ? r.toDate.split('T')[0] : '',
            days:     r.days ?? r.numberOfDays ?? 0,
            status:   r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase() : 'Pending',
            reason:   r.reason ?? '',
        }));

        return { balances, requests };
    }, [response, reqsResponse]);

    const handleApply = (formData: Record<string, unknown>) => {
        applyMutation.mutate(formData, { onSuccess: () => setFormVisible(false) });
    };

    const handleCancelLeave = (id: string) => {
        showConfirm({
            title: 'Cancel Leave',
            message: 'Are you sure you want to cancel this leave request?',
            confirmText: 'Cancel Leave',
            variant: 'danger',
            onConfirm: () => cancelLeave.mutate(id),
        });
    };

    const listData = [{ key: 'my-leave-content' }];

    const renderItem = () => (
        <View>
            {data.balances.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text style={st.sectionTitle}>Leave Balance</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={st.balanceScroll}
                    >
                        {data.balances.map((b, i) => (
                            <BalanceCard key={b.code + i} item={b} index={i} />
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            <Pressable onPress={() => setFormVisible(true)} style={st.applyBtn}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
                <Text style={st.applyBtnText}>Apply for Leave</Text>
            </Pressable>

            <Text style={[st.sectionTitle, { marginTop: 24 }]}>
                My Requests
                {data.requests.length > 0 ? (
                    <Text style={st.sectionCount}> ({data.requests.length})</Text>
                ) : null}
            </Text>

            {data.requests.length === 0 ? (
                <View style={st.emptyRequests}>
                    <Svg width={40} height={40} viewBox="0 0 24 24">
                        <Path
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            stroke={colors.neutral[300]}
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                        />
                    </Svg>
                    <Text style={st.emptyText}>No leave requests yet</Text>
                </View>
            ) : (
                data.requests.map((req, i) => (
                    <LeaveRequestCard key={req.id} req={req} index={i} onCancel={handleCancelLeave} />
                ))
            )}
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return null;
    };

    return (
        <View style={st.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="My Leave" onMenuPress={toggle} />
            {isLoading || error ? renderEmpty() : (
                <FlashList
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={item => item.key}
                    contentContainerStyle={[st.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            )}

            <ApplyLeaveModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleApply}
                isSaving={applyMutation.isPending}
                balances={data.balances}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },

    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    hamburgerBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center', alignItems: 'center',
    },

    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    sectionTitle: {
        fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
        color: colors.neutral[500], letterSpacing: 0.5,
        textTransform: 'uppercase', marginBottom: 10,
    },
    sectionCount: { fontFamily: 'Inter', fontSize: 12, color: colors.neutral[400], fontWeight: '500' },

    // Balance
    balanceScroll: { paddingBottom: 4, paddingRight: 4, gap: 10 },
    balanceCard: {
        width: 190,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    balanceCodeCircle: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center'
    },
    balanceCodeText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
    balanceLabel: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.neutral[400], letterSpacing: 0.6 },
    balanceBig: { fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.primary[950], lineHeight: 28 },
    balanceTotal: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.neutral[400] },
    balanceSub: { fontFamily: 'Inter', fontSize: 11, color: colors.neutral[500] },

    // Apply button
    applyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, height: 52, borderRadius: 16,
        backgroundColor: colors.primary[600],
        marginTop: 20,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
    },
    applyBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white },

    // Request card
    requestCard: {
        backgroundColor: colors.white, borderRadius: 16, padding: 18,
        marginBottom: 12,
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 10, elevation: 1,
        borderWidth: 1, borderColor: colors.neutral[100],
    },
    requestCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    requestType: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.primary[950], marginBottom: 6 },
    requestDates: { fontFamily: 'Inter', fontSize: 13, color: colors.neutral[500], marginTop: 2 },
    requestReason: { fontFamily: 'Inter', fontSize: 13, color: colors.neutral[500], marginTop: 10 },
    cancelLeaveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 12, paddingVertical: 8, borderRadius: 8,
        borderWidth: 1, borderColor: colors.danger[200], backgroundColor: colors.danger[50],
    },
    cancelLeaveBtnText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.danger[600] },

    // Status badge
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFFDF0' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DE911D' },

    // Empty state
    emptyRequests: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { fontFamily: 'Inter', fontSize: 13, color: colors.neutral[400] },

    // Modal / full-screen page
    modalPage: { flex: 1 },
    navBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    navCancelWrap: { minWidth: 60, paddingVertical: 6 },
    navCancelText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.neutral[500] },
    navApplyBtn: {
        minWidth: 60, height: 36, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: colors.primary[600],
        justifyContent: 'center', alignItems: 'center',
    },
    navApplyText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white },
    navBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

    // Form
    formContent: { paddingHorizontal: 16, paddingTop: 20 },
    groupLabel: {
        fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
        color: colors.neutral[500], letterSpacing: 0.7,
        textTransform: 'uppercase', marginBottom: 8, marginLeft: 2,
    },
    card: {
        backgroundColor: colors.white, borderRadius: 16,
        marginBottom: 18, borderWidth: 1, borderColor: colors.neutral[100],
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },

    // Leave type chips
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    chipActive: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
    chipText: { fontFamily: 'Inter', fontSize: 13, color: colors.neutral[500], fontWeight: '500' },
    chipTextActive: { color: colors.primary[700], fontWeight: '700' },

    // Date row
    dateRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    dateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.neutral[600] },
    dateValue: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primary[700] },
    datePlaceholder: { fontFamily: 'Inter', fontSize: 14, color: colors.neutral[400] },
    dateDivider: { height: 1, backgroundColor: colors.neutral[100], marginHorizontal: 16 },

    // Days badge
    daysBadge: {
        alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8,
        backgroundColor: colors.primary[50], borderRadius: 20,
        borderWidth: 1, borderColor: colors.primary[100], marginBottom: 18,
    },
    daysBadgeText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primary[700] },

    // Toggle
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    toggleLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.primary[950] },
    toggleSub: { fontFamily: 'Inter', fontSize: 11, color: colors.neutral[400], marginTop: 2 },

    // Reason
    reasonInput: {
        fontFamily: 'Inter', fontSize: 14, color: colors.primary[950],
        padding: 16, minHeight: 110, textAlignVertical: 'top',
    },

    // Calendar
    calBox: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.neutral[100] },
    calFieldLabel: {
        fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
        color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10,
    },
    calSelectedDisplay: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary[50], borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
        borderWidth: 1, borderColor: colors.primary[100],
    },
    calSelectedText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primary[700] },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    calNavBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    calMonthTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.primary[950] },
    calWeekRow: { flexDirection: 'row', marginBottom: 4 },
    calWeekLabel: {
        flex: 1, textAlign: 'center',
        fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
        color: colors.neutral[400], paddingVertical: 4,
    },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: `${100 / 7}%` as any, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    calCellSelected: { backgroundColor: colors.primary[600] },
    calCellToday: { backgroundColor: colors.primary[50] },
    calDayText: { fontFamily: 'Inter', fontSize: 13, color: colors.primary[900] },
    calDayTextSelected: { color: colors.white, fontWeight: '800' },
    calDayTextToday: { color: colors.primary[600], fontWeight: '700' },
    calDayTextDisabled: { color: colors.neutral[300] },
});
