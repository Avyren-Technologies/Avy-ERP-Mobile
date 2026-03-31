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
    Switch,
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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    useApproveLeaveRequest,
    useCancelLeaveRequest,
    useCreateLeaveRequest,
    useRejectLeaveRequest,
} from '@/features/company-admin/api/use-leave-mutations';
import { useLeaveRequests, useLeaveTypes } from '@/features/company-admin/api/use-leave-queries';

// ============ TYPES ============

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
type HalfDayType = 'First Half' | 'Second Half';

interface LeaveRequestItem {
    id: string;
    employeeId: string;
    employeeName: string;
    employeePhoto: string;
    leaveTypeId: string;
    leaveTypeName: string;
    fromDate: string;
    toDate: string;
    days: number;
    halfDay: boolean;
    halfDayType: HalfDayType | '';
    reason: string;
    status: RequestStatus;
    approverName: string;
    rejectionNote: string;
    createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: ('All' | RequestStatus)[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

const STATUS_COLORS: Record<RequestStatus, { bg: string; text: string; dot: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: RequestStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
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
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
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
                            {filteredOptions.length === 0 && (
                                <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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

// ============ APPLY LEAVE MODAL ============

function ApplyLeaveModal({
    visible, onClose, onSave, isSaving, employeeOptions, leaveTypeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    leaveTypeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [leaveTypeId, setLeaveTypeId] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [halfDay, setHalfDay] = React.useState(false);
    const [halfDayType, setHalfDayType] = React.useState<HalfDayType>('First Half');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeId(''); setLeaveTypeId(''); setFromDate(''); setToDate('');
            setHalfDay(false); setHalfDayType('First Half'); setReason('');
        }
    }, [visible]);

    const calcDays = React.useMemo(() => {
        if (!fromDate || !toDate) return 0;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return 0;
        const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return halfDay ? 0.5 : diff;
    }, [fromDate, toDate, halfDay]);

    const handleSave = () => {
        if (!employeeId || !leaveTypeId || !fromDate || !toDate || !reason.trim()) return;
        onSave({
            employeeId, leaveTypeId, fromDate, toDate,
            halfDay, halfDayType: halfDay ? halfDayType : '',
            days: calcDays, reason: reason.trim(),
        });
    };

    const isValid = employeeId && leaveTypeId && fromDate && toDate && reason.trim() && calcDays > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Apply Leave</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <Dropdown label="Leave Type" value={leaveTypeId} options={leaveTypeOptions} onSelect={setLeaveTypeId} placeholder="Select leave type..." required />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">From Date <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={fromDate} onChangeText={setFromDate} /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">To Date <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={toDate} onChangeText={setToDate} /></View>
                            </View>
                        </View>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">Half Day</Text>
                            </View>
                            <Switch value={halfDay} onValueChange={setHalfDay} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={halfDay ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        {halfDay && (
                            <ChipSelector label="Half Day Type" options={['First Half', 'Second Half']} value={halfDayType} onSelect={v => setHalfDayType(v as HalfDayType)} />
                        )}
                        {calcDays > 0 && (
                            <View style={styles.calcDaysBadge}>
                                <Text className="font-inter text-sm font-bold text-primary-700">{calcDays} day{calcDays !== 1 ? 's' : ''}</Text>
                            </View>
                        )}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for leave..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Apply Leave'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ REJECTION NOTE MODAL ============

function RejectionNoteModal({
    visible, onClose, onSubmit, isSubmitting,
}: {
    visible: boolean; onClose: () => void;
    onSubmit: (note: string) => void; isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [note, setNote] = React.useState('');

    React.useEffect(() => { if (visible) setNote(''); }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Rejection Reason</Text>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Note <Text className="text-danger-500">*</Text></Text>
                        <View style={[styles.inputWrap, { height: 100 }]}>
                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for rejection..." placeholderTextColor={colors.neutral[400]} value={note} onChangeText={setNote} multiline numberOfLines={4} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSubmit(note.trim())} disabled={!note.trim() || isSubmitting} style={[styles.rejectBtn, (!note.trim() || isSubmitting) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSubmitting ? 'Rejecting...' : 'Reject'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ REQUEST CARD ============

function RequestCard({
    item, index, onApprove, onReject, onCancel, isPending,
}: {
    item: LeaveRequestItem; index: number;
    onApprove: () => void; onReject: () => void; onCancel: () => void;
    isPending: boolean;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.leaveTypeName}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateChip}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-xs text-neutral-600">{item.fromDate} to {item.toDate}</Text>
                    </View>
                    <View style={styles.daysBadge}>
                        <Text className="font-inter text-xs font-bold text-primary-600">{item.days}d</Text>
                    </View>
                    {item.halfDay && (
                        <View style={[styles.daysBadge, { backgroundColor: colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-600">{item.halfDayType}</Text>
                        </View>
                    )}
                </View>

                {item.reason ? (
                    <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.reason}</Text>
                ) : null}

                {item.approverName ? (
                    <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                        {item.status === 'Approved' ? 'Approved' : item.status === 'Rejected' ? 'Rejected' : 'Reviewed'} by {item.approverName}
                    </Text>
                ) : null}

                {item.rejectionNote ? (
                    <View style={styles.rejectionNote}>
                        <Text className="font-inter text-[10px] text-danger-600">Reason: {item.rejectionNote}</Text>
                    </View>
                ) : null}

                {/* Action buttons for pending requests */}
                {isPending && item.status === 'Pending' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApprove} style={styles.approveBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                        <Pressable onPress={onReject} style={styles.rejectActionBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}>
                            <Text className="font-inter text-xs font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function LeaveRequestScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useLeaveRequests();
    const createMutation = useCreateLeaveRequest();
    const approveMutation = useApproveLeaveRequest();
    const rejectMutation = useRejectLeaveRequest();
    const cancelMutation = useCancelLeaveRequest();

    const { data: ltResponse } = useLeaveTypes();
    const { data: empResponse } = useEmployees();

    const [formVisible, setFormVisible] = React.useState(false);
    const [rejectionModalVisible, setRejectionModalVisible] = React.useState(false);
    const [rejectingId, setRejectingId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | RequestStatus>('All');

    const mapOptions = (resp: any) => {
        const raw = (resp as any)?.data ?? resp ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    };

    const leaveTypeOptions = React.useMemo(() => mapOptions(ltResponse), [ltResponse]);
    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const requests: LeaveRequestItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            employeePhoto: item.employeePhoto ?? '',
            leaveTypeId: item.leaveTypeId ?? '',
            leaveTypeName: item.leaveTypeName ?? leaveTypeOptions.find((o: any) => o.id === item.leaveTypeId)?.label ?? '',
            fromDate: item.fromDate ?? '',
            toDate: item.toDate ?? '',
            days: item.days ?? 0,
            halfDay: item.halfDay ?? false,
            halfDayType: item.halfDayType ?? '',
            reason: item.reason ?? '',
            status: item.status ?? 'Pending',
            approverName: item.approverName ?? '',
            rejectionNote: item.rejectionNote ?? '',
            createdAt: item.createdAt ?? '',
        }));
    }, [response, leaveTypeOptions]);

    const pendingRequests = React.useMemo(() => requests.filter(r => r.status === 'Pending'), [requests]);

    const filteredRequests = React.useMemo(() => {
        let list = requests;
        if (statusFilter !== 'All') list = list.filter(r => r.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r => r.employeeName.toLowerCase().includes(q) || r.leaveTypeName.toLowerCase().includes(q));
        }
        return list;
    }, [requests, statusFilter, search]);

    const handleApprove = (item: LeaveRequestItem) => {
        showConfirm({
            title: 'Approve Leave',
            message: `Approve ${item.days} day(s) of ${item.leaveTypeName} for ${item.employeeName}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => { approveMutation.mutate({ id: item.id }); },
        });
    };

    const handleReject = (item: LeaveRequestItem) => {
        setRejectingId(item.id);
        setRejectionModalVisible(true);
    };

    const handleRejectSubmit = (note: string) => {
        rejectMutation.mutate({ id: rejectingId, data: { rejectionNote: note } }, {
            onSuccess: () => setRejectionModalVisible(false),
        });
    };

    const handleCancel = (item: LeaveRequestItem) => {
        showConfirm({
            title: 'Cancel Leave Request',
            message: `Cancel ${item.employeeName}'s leave request?`,
            confirmText: 'Cancel Request', variant: 'warning',
            onConfirm: () => { cancelMutation.mutate({ id: item.id }); },
        });
    };

    const handleApplyLeave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    // Combined list: pending approvals section + all requests section
    type SectionItem = { type: 'section-header'; title: string; key: string } | { type: 'request'; item: LeaveRequestItem; isPending: boolean; key: string };

    const listData: SectionItem[] = React.useMemo(() => {
        const items: SectionItem[] = [];
        if (pendingRequests.length > 0) {
            items.push({ type: 'section-header', title: `Pending Approvals (${pendingRequests.length})`, key: 'section-pending' });
            pendingRequests.forEach(r => items.push({ type: 'request', item: r, isPending: true, key: `pending-${r.id}` }));
        }
        items.push({ type: 'section-header', title: 'All Requests', key: 'section-all' });
        filteredRequests.forEach(r => items.push({ type: 'request', item: r, isPending: false, key: `all-${r.id}` }));
        return items;
    }, [pendingRequests, filteredRequests]);

    const renderSectionItem = ({ item, index }: { item: SectionItem; index: number }) => {
        if (item.type === 'section-header') {
            return (
                <Animated.View entering={FadeInDown.duration(300)} style={{ paddingTop: index > 0 ? 20 : 0, paddingBottom: 8 }}>
                    <Text className="font-inter text-sm font-bold text-neutral-600">{item.title}</Text>
                </Animated.View>
            );
        }
        return (
            <RequestCard
                item={item.item} index={index}
                onApprove={() => handleApprove(item.item)}
                onReject={() => handleReject(item.item)}
                onCancel={() => handleCancel(item.item)}
                isPending={item.isPending}
            />
        );
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Leave Requests</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{requests.length} request{requests.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee or leave type..." /></View>
            {/* Status filter chips */}
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
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load requests" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim() || statusFilter !== 'All') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="Try adjusting your filters." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No leave requests" message="No leave requests have been submitted yet." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Leave Requests" onMenuPress={toggle} />
            <FlatList
                data={listData.length > 2 ? listData : []} // Only show sections if we have data beyond headers
                renderItem={renderSectionItem}
                keyExtractor={item => item.key}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <ApplyLeaveModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleApplyLeave} isSaving={createMutation.isPending} employeeOptions={employeeOptions} leaveTypeOptions={leaveTypeOptions} />
            <RejectionNoteModal visible={rejectionModalVisible} onClose={() => setRejectionModalVisible(false)} onSubmit={handleRejectSubmit} isSubmitting={rejectMutation.isPending} />
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
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    daysBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    rejectionNote: { marginTop: 6, backgroundColor: colors.danger[50], borderRadius: 8, padding: 8 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.success[600] },
    rejectActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200] },
    cancelActionBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
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
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    calcDaysBadge: { backgroundColor: colors.primary[50], borderRadius: 12, padding: 10, alignItems: 'center', marginBottom: 14 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    rejectBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.danger[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
