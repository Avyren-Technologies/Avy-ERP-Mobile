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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useDepartments, useDesignations, useEmployees  } from '@/features/company-admin/api/use-hr-queries';
import {
    useApplyTransfer,
    useApproveTransfer,
    useCancelTransfer,
    useCreateTransfer,
    useRejectTransfer,
} from '@/features/company-admin/api/use-transfer-mutations';
import { useTransfers } from '@/features/company-admin/api/use-transfer-queries';

// ============ TYPES ============

type TransferStatus = 'Requested' | 'Approved' | 'Applied' | 'Rejected' | 'Cancelled';
type TransferType = 'Lateral' | 'Relocation' | 'Restructuring';

interface TransferItem {
    id: string;
    employeeId: string;
    employeeName: string;
    fromDepartment: string;
    toDepartment: string;
    fromDesignation: string;
    toDesignation: string;
    fromLocation: string;
    toLocation: string;
    toManagerId: string;
    toManagerName: string;
    effectiveDate: string;
    reason: string;
    transferType: TransferType;
    status: TransferStatus;
    createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: ('All' | TransferStatus)[] = ['All', 'Requested', 'Approved', 'Applied', 'Rejected', 'Cancelled'];
const TRANSFER_TYPES: TransferType[] = ['Lateral', 'Relocation', 'Restructuring'];

const STATUS_COLORS: Record<TransferStatus, { bg: string; text: string; dot: string }> = {
    Requested: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Applied: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

const TYPE_COLORS: Record<TransferType, { bg: string; text: string }> = {
    Lateral: { bg: colors.primary[50], text: colors.primary[700] },
    Relocation: { bg: colors.accent[50], text: colors.accent[700] },
    Restructuring: { bg: colors.warning[50], text: colors.warning[700] },
};

// ============ HELPERS ============

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ ATOMS ============

function StatusBadge({ status }: { status: TransferStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Requested;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function TypeBadge({ type }: { type: TransferType }) {
    const scheme = TYPE_COLORS[type] ?? TYPE_COLORS.Lateral;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
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
    label, value, options, onSelect, placeholder, required, searchable,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean; searchable?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const filtered = searchable && q.trim() ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setQ(''); }} style={styles.dropdownBtn}>
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
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} autoCapitalize="none" />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            {filtered.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>}
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

// ============ CREATE MODAL ============

function CreateTransferModal({
    visible, onClose, onSave, isSaving, employeeOptions, departmentOptions, designationOptions, locationOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    departmentOptions: { id: string; label: string }[];
    designationOptions: { id: string; label: string }[];
    locationOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [toDepartment, setToDepartment] = React.useState('');
    const [toDesignation, setToDesignation] = React.useState('');
    const [toLocation, setToLocation] = React.useState('');
    const [toManagerId, setToManagerId] = React.useState('');
    const [effectiveDate, setEffectiveDate] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [transferType, setTransferType] = React.useState<string>('Lateral');

    React.useEffect(() => {
        if (visible) {
            setEmployeeId(''); setToDepartment(''); setToDesignation(''); setToLocation('');
            setToManagerId(''); setEffectiveDate(''); setReason(''); setTransferType('Lateral');
        }
    }, [visible]);

    const isValid = employeeId && toDepartment && effectiveDate.trim() && reason.trim();

    const handleSave = () => {
        if (!isValid) return;
        onSave({
            employeeId, toDepartment, toDesignation, toLocation, toManagerId,
            effectiveDate: effectiveDate.trim(), reason: reason.trim(), transferType,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Initiate Transfer</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." required searchable />
                        <Dropdown label="To Department" value={toDepartment} options={departmentOptions} onSelect={setToDepartment} placeholder="Select department..." required />
                        <Dropdown label="To Designation" value={toDesignation} options={designationOptions} onSelect={setToDesignation} placeholder="Select designation..." />
                        <Dropdown label="To Location" value={toLocation} options={locationOptions} onSelect={setToLocation} placeholder="Select location..." />
                        <Dropdown label="To Manager" value={toManagerId} options={employeeOptions} onSelect={setToManagerId} placeholder="Select manager..." searchable />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveDate} onChangeText={setEffectiveDate} /></View>
                        </View>
                        <ChipSelector label="Transfer Type" options={TRANSFER_TYPES} value={transferType} onSelect={setTransferType} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for transfer..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Initiate Transfer'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ REJECTION NOTE MODAL ============

function RejectionNoteModal({ visible, onClose, onSubmit, isSubmitting }: {
    visible: boolean; onClose: () => void; onSubmit: (note: string) => void; isSubmitting: boolean;
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

// ============ TRANSFER CARD ============

function TransferCard({ item, index, onApprove, onApply, onReject, onCancel }: {
    item: TransferItem; index: number;
    onApprove: () => void; onApply: () => void; onReject: () => void; onCancel: () => void;
}) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '' : fmt.date(d);
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">Effective {formatDate(item.effectiveDate)}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <StatusBadge status={item.status} />
                        <TypeBadge type={item.transferType} />
                    </View>
                </View>

                {/* Transfer flow: from -> to */}
                <View style={styles.flowRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[10px] text-neutral-400 uppercase">From</Text>
                        {item.fromDepartment ? <Text className="font-inter text-xs font-semibold text-neutral-600">{item.fromDepartment}</Text> : null}
                        {item.fromDesignation ? <Text className="font-inter text-[10px] text-neutral-500">{item.fromDesignation}</Text> : null}
                        {item.fromLocation ? <Text className="font-inter text-[10px] text-neutral-400">{item.fromLocation}</Text> : null}
                    </View>
                    <View style={styles.arrowCircle}>
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text className="font-inter text-[10px] text-neutral-400 uppercase">To</Text>
                        {item.toDepartment ? <Text className="font-inter text-xs font-semibold text-primary-700">{item.toDepartment}</Text> : null}
                        {item.toDesignation ? <Text className="font-inter text-[10px] text-primary-600">{item.toDesignation}</Text> : null}
                        {item.toLocation ? <Text className="font-inter text-[10px] text-primary-500">{item.toLocation}</Text> : null}
                    </View>
                </View>

                {item.reason ? <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.reason}</Text> : null}

                {/* Action buttons */}
                {item.status === 'Requested' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApprove} style={styles.approveBtn}>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                        <Pressable onPress={onReject} style={styles.rejectActionBtn}>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}>
                            <Text className="font-inter text-xs font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                    </View>
                )}
                {item.status === 'Approved' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApply} style={[styles.approveBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-xs font-bold text-white">Apply Transfer</Text>
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

export function TransferScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useTransfers();
    const createMutation = useCreateTransfer();
    const approveMutation = useApproveTransfer();
    const applyMutation = useApplyTransfer();
    const rejectMutation = useRejectTransfer();
    const cancelMutation = useCancelTransfer();

    const { data: empResponse } = useEmployees();
    const { data: deptResponse } = useDepartments();
    const { data: desigResponse } = useDesignations();
    const { data: locResponse } = useCompanyLocations();

    const [formVisible, setFormVisible] = React.useState(false);
    const [rejectionModalVisible, setRejectionModalVisible] = React.useState(false);
    const [rejectingId, setRejectingId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | TransferStatus>('All');

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const departmentOptions = React.useMemo(() => {
        const raw = (deptResponse as any)?.data ?? deptResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [deptResponse]);

    const designationOptions = React.useMemo(() => {
        const raw = (desigResponse as any)?.data ?? desigResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [desigResponse]);

    const locationOptions = React.useMemo(() => {
        const raw = (locResponse as any)?.data ?? locResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [locResponse]);

    const items: TransferItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            fromDepartment: item.fromDepartment ?? '', toDepartment: item.toDepartment ?? '',
            fromDesignation: item.fromDesignation ?? '', toDesignation: item.toDesignation ?? '',
            fromLocation: item.fromLocation ?? '', toLocation: item.toLocation ?? '',
            toManagerId: item.toManagerId ?? '', toManagerName: item.toManagerName ?? '',
            effectiveDate: item.effectiveDate ?? '', reason: item.reason ?? '',
            transferType: item.transferType ?? 'Lateral', status: item.status ?? 'Requested',
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let result = items;
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(i => i.employeeName.toLowerCase().includes(q) || i.toDepartment.toLowerCase().includes(q) || i.toLocation.toLowerCase().includes(q));
        }
        return result;
    }, [items, search, statusFilter]);

    const handleApprove = (item: TransferItem) => {
        showConfirm({
            title: 'Approve Transfer', message: `Approve transfer for ${item.employeeName}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => { approveMutation.mutate({ id: item.id }); },
        });
    };

    const handleApply = (item: TransferItem) => {
        showConfirm({
            title: 'Apply Transfer', message: `Apply transfer for ${item.employeeName}? Employee profile will be updated.`,
            confirmText: 'Apply', variant: 'warning',
            onConfirm: () => { applyMutation.mutate({ id: item.id }); },
        });
    };

    const handleReject = (item: TransferItem) => { setRejectingId(item.id); setRejectionModalVisible(true); };

    const handleRejectSubmit = (note: string) => {
        rejectMutation.mutate({ id: rejectingId, data: { rejectionNote: note } }, {
            onSuccess: () => setRejectionModalVisible(false),
        });
    };

    const handleCancel = (item: TransferItem) => {
        showConfirm({
            title: 'Cancel Transfer', message: `Cancel transfer for ${item.employeeName}?`,
            confirmText: 'Cancel Transfer', variant: 'warning',
            onConfirm: () => { cancelMutation.mutate({ id: item.id }); },
        });
    };

    const handleCreate = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: TransferItem; index: number }) => (
        <TransferCard item={item} index={index}
            onApprove={() => handleApprove(item)} onApply={() => handleApply(item)}
            onReject={() => handleReject(item)} onCancel={() => handleCancel(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Employee Transfers</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} transfer{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, department, location..." /></View>
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
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load transfers" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim() || statusFilter !== 'All') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No transfers match your filters." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No transfers" message="Initiate a transfer to move employees across departments or locations." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Employee Transfers" onMenuPress={toggle} />
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateTransferModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleCreate} isSaving={createMutation.isPending}
                employeeOptions={employeeOptions} departmentOptions={departmentOptions} designationOptions={designationOptions} locationOptions={locationOptions} />
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    arrowCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.info[600], justifyContent: 'center', alignItems: 'center' },
    rejectActionBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200], justifyContent: 'center', alignItems: 'center' },
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
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    rejectBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.danger[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
