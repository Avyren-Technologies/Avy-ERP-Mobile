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

import { useDesignations, useEmployees, useGrades } from '@/features/company-admin/api/use-hr-queries';
import {
    useApplyPromotion,
    useApprovePromotion,
    useCancelPromotion,
    useCreatePromotion,
    useRejectPromotion,
} from '@/features/company-admin/api/use-transfer-mutations';
import { usePromotions } from '@/features/company-admin/api/use-transfer-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type PromotionStatus = 'Requested' | 'Approved' | 'Applied' | 'Rejected' | 'Cancelled';

interface PromotionItem {
    id: string;
    employeeId: string;
    employeeName: string;
    fromDesignation: string;
    toDesignation: string;
    fromGrade: string;
    toGrade: string;
    currentCTC: number;
    newCTC: number;
    incrementPercent: number;
    effectiveDate: string;
    reason: string;
    linkedAppraisal: string;
    status: PromotionStatus;
    createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: ('All' | PromotionStatus)[] = ['All', 'Requested', 'Approved', 'Applied', 'Rejected', 'Cancelled'];

const STATUS_COLORS: Record<PromotionStatus, { bg: string; text: string; dot: string }> = {
    Requested: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Applied: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

// ============ HELPERS ============

const formatCurrency = (n: number) => n > 0 ? `₹${n.toLocaleString('en-IN')}` : '';
// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ ATOMS ============

function StatusBadge({ status }: { status: PromotionStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Requested;
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
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setQ(''); }} style={styles.dropdownBtn}>
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
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} autoCapitalize="none" />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
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

// ============ CREATE MODAL ============

function CreatePromotionModal({
    visible, onClose, onSave, isSaving, employeeOptions, designationOptions, gradeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    designationOptions: { id: string; label: string }[];
    gradeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [toDesignation, setToDesignation] = React.useState('');
    const [toGrade, setToGrade] = React.useState('');
    const [newCTC, setNewCTC] = React.useState('');
    const [effectiveDate, setEffectiveDate] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [linkedAppraisal, setLinkedAppraisal] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeId(''); setToDesignation(''); setToGrade(''); setNewCTC('');
            setEffectiveDate(''); setReason(''); setLinkedAppraisal('');
        }
    }, [visible]);

    const isValid = employeeId && toDesignation && effectiveDate.trim() && reason.trim();

    const handleSave = () => {
        if (!isValid) return;
        onSave({
            employeeId, toDesignation, toGrade,
            newCTC: newCTC ? Number(newCTC) : undefined,
            effectiveDate: effectiveDate.trim(), reason: reason.trim(),
            linkedAppraisal: linkedAppraisal.trim() || undefined,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">Initiate Promotion</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." required searchable />
                        <Dropdown label="To Designation" value={toDesignation} options={designationOptions} onSelect={setToDesignation} placeholder="Select designation..." required />
                        <Dropdown label="To Grade" value={toGrade} options={gradeOptions} onSelect={setToGrade} placeholder="Select grade..." />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">New CTC (optional)</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{'₹'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="1200000" placeholderTextColor={colors.neutral[400]} value={newCTC} onChangeText={setNewCTC} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Effective Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveDate} onChangeText={setEffectiveDate} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for promotion..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Linked Appraisal (optional)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Appraisal cycle ID or name" placeholderTextColor={colors.neutral[400]} value={linkedAppraisal} onChangeText={setLinkedAppraisal} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Initiate Promotion'}</Text>
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
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">Rejection Reason</Text>
                    <View style={styles.fieldWrap}>
                        <View style={[styles.inputWrap, { height: 100 }]}>
                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for rejection..." placeholderTextColor={colors.neutral[400]} value={note} onChangeText={setNote} multiline numberOfLines={4} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSubmit(note.trim())} disabled={!note.trim() || isSubmitting} style={[styles.rejectBtn, (!note.trim() || isSubmitting) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSubmitting ? 'Rejecting...' : 'Reject'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ PROMOTION CARD ============

function PromotionCard({ item, index, onApprove, onApply, onReject, onCancel }: {
    item: PromotionItem; index: number;
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
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">Effective {formatDate(item.effectiveDate)}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>

                {/* Promotion flow: designation/grade */}
                <View style={styles.flowRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[10px] text-neutral-400 uppercase">From</Text>
                        {item.fromDesignation ? <Text className="font-inter text-xs font-semibold text-neutral-600 dark:text-neutral-400">{item.fromDesignation}</Text> : null}
                        {item.fromGrade ? <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.fromGrade}</Text> : null}
                    </View>
                    <View style={styles.arrowCircle}>
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 19V5M5 12l7-7 7 7" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text className="font-inter text-[10px] text-neutral-400 uppercase">To</Text>
                        {item.toDesignation ? <Text className="font-inter text-xs font-semibold text-success-700">{item.toDesignation}</Text> : null}
                        {item.toGrade ? <Text className="font-inter text-[10px] text-success-600">{item.toGrade}</Text> : null}
                    </View>
                </View>

                {/* CTC comparison */}
                {(item.currentCTC > 0 || item.newCTC > 0) && (
                    <View style={styles.ctcRow}>
                        {item.currentCTC > 0 && (
                            <View style={styles.metaChip}>
                                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{formatCurrency(item.currentCTC)}</Text>
                                <Text className="font-inter text-[10px] text-neutral-400 mx-1">{'\u2192'}</Text>
                                <Text className="font-inter text-[10px] font-bold text-success-700">{formatCurrency(item.newCTC)}</Text>
                            </View>
                        )}
                        {item.incrementPercent > 0 && (
                            <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                                <Text className="font-inter text-[10px] font-bold text-success-600">+{item.incrementPercent.toFixed(1)}%</Text>
                            </View>
                        )}
                    </View>
                )}

                {item.linkedAppraisal ? <Text className="mt-1 font-inter text-[10px] text-accent-600">Linked: {item.linkedAppraisal}</Text> : null}
                {item.reason ? <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>{item.reason}</Text> : null}

                {/* Actions */}
                {item.status === 'Requested' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApprove} style={styles.approveBtn}><Text className="font-inter text-xs font-bold text-white">Approve</Text></Pressable>
                        <Pressable onPress={onReject} style={styles.rejectActionBtn}><Text className="font-inter text-xs font-bold text-danger-600">Reject</Text></Pressable>
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}><Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text></Pressable>
                    </View>
                )}
                {item.status === 'Approved' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApply} style={[styles.approveBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-xs font-bold text-white">Apply Promotion</Text>
                        </Pressable>
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}><Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text></Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PromotionScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = usePromotions();
    const createMutation = useCreatePromotion();
    const approveMutation = useApprovePromotion();
    const applyMutation = useApplyPromotion();
    const rejectMutation = useRejectPromotion();
    const cancelMutation = useCancelPromotion();

    const { data: empResponse } = useEmployees();
    const { data: desigResponse } = useDesignations();
    const { data: gradeResponse } = useGrades();

    const [formVisible, setFormVisible] = React.useState(false);
    const [rejectionModalVisible, setRejectionModalVisible] = React.useState(false);
    const [rejectingId, setRejectingId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | PromotionStatus>('All');

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const designationOptions = React.useMemo(() => {
        const raw = (desigResponse as any)?.data ?? desigResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [desigResponse]);

    const gradeOptions = React.useMemo(() => {
        const raw = (gradeResponse as any)?.data ?? gradeResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [gradeResponse]);

    const items: PromotionItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            fromDesignation: item.fromDesignation ?? '', toDesignation: item.toDesignation ?? '',
            fromGrade: item.fromGrade ?? '', toGrade: item.toGrade ?? '',
            currentCTC: item.currentCTC ?? 0, newCTC: item.newCTC ?? 0,
            incrementPercent: item.incrementPercent ?? 0,
            effectiveDate: item.effectiveDate ?? '', reason: item.reason ?? '',
            linkedAppraisal: item.linkedAppraisal ?? '', status: item.status ?? 'Requested',
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let result = items;
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(i => i.employeeName.toLowerCase().includes(q) || i.toDesignation.toLowerCase().includes(q));
        }
        return result;
    }, [items, search, statusFilter]);

    const handleApprove = (item: PromotionItem) => {
        showConfirm({ title: 'Approve Promotion', message: `Approve promotion for ${item.employeeName}?`, confirmText: 'Approve', variant: 'primary', onConfirm: () => { approveMutation.mutate({ id: item.id }); } });
    };

    const handleApply = (item: PromotionItem) => {
        showConfirm({ title: 'Apply Promotion', message: `Apply promotion for ${item.employeeName}? Employee profile, salary, and timeline will be updated.`, confirmText: 'Apply', variant: 'warning', onConfirm: () => { applyMutation.mutate({ id: item.id }); } });
    };

    const handleReject = (item: PromotionItem) => { setRejectingId(item.id); setRejectionModalVisible(true); };
    const handleRejectSubmit = (note: string) => {
        rejectMutation.mutate({ id: rejectingId, data: { rejectionNote: note } }, { onSuccess: () => setRejectionModalVisible(false) });
    };
    const handleCancel = (item: PromotionItem) => {
        showConfirm({ title: 'Cancel Promotion', message: `Cancel promotion for ${item.employeeName}?`, confirmText: 'Cancel Promotion', variant: 'warning', onConfirm: () => { cancelMutation.mutate({ id: item.id }); } });
    };
    const handleCreate = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: PromotionItem; index: number }) => (
        <PromotionCard item={item} index={index}
            onApprove={() => handleApprove(item)} onApply={() => handleApply(item)}
            onReject={() => handleReject(item)} onCancel={() => handleCancel(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Employee Promotions</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} promotion{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or designation..." /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
                {STATUS_FILTERS.map(s => {
                    const active = s === statusFilter;
                    return (
                        <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{s}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load promotions" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim() || statusFilter !== 'All') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No promotions match your filters." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No promotions" message="Initiate a promotion to elevate employees." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Employee Promotions" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreatePromotionModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleCreate} isSaving={createMutation.isPending}
                employeeOptions={employeeOptions} designationOptions={designationOptions} gradeOptions={gradeOptions} />
            <RejectionNoteModal visible={rejectionModalVisible} onClose={() => setRejectionModalVisible(false)} onSubmit={handleRejectSubmit} isSubmitting={rejectMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    arrowCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.success[50], justifyContent: 'center', alignItems: 'center' },
    ctcRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.info[600], justifyContent: 'center', alignItems: 'center' },
    rejectActionBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200], justifyContent: 'center', alignItems: 'center' },
    cancelActionBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    rejectBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.danger[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
