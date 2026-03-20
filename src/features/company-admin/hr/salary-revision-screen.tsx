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
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useSalaryRevisions, useSalaryRevision } from '@/features/company-admin/api/use-payroll-run-queries';
import { useCreateSalaryRevision, useApproveSalaryRevision, useApplySalaryRevision } from '@/features/company-admin/api/use-payroll-run-mutations';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type RevisionStatus = 'Draft' | 'Approved' | 'Applied';

interface SalaryRevisionItem {
    id: string;
    employeeId: string;
    employeeName: string;
    oldCTC: number;
    newCTC: number;
    incrementPercent: number;
    effectiveDate: string;
    status: RevisionStatus;
    arrearsAmount: number;
    arrearBreakdown: { month: string; amount: number }[];
    componentBreakup: string;
    createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_COLORS: Record<RevisionStatus, { bg: string; text: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[600] },
    Approved: { bg: colors.info[50], text: colors.info[700] },
    Applied: { bg: colors.success[50], text: colors.success[700] },
};

const STATUS_FILTERS: (RevisionStatus | 'All')[] = ['All', 'Draft', 'Approved', 'Applied'];

// ============ HELPERS ============

const formatCurrency = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;

const formatDate = (d: string) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

// ============ ATOMS ============

function RevisionStatusBadge({ status }: { status: RevisionStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
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

function Dropdown({ label, value, options, onSelect, placeholder, searchable }: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; searchable?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const filtered = searchable && q.trim()
        ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
        : options;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); setQ(''); }}
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

// ============ CREATE MODAL ============

function CreateRevisionModal({ visible, onClose, onSave, isSaving, employeeOptions }: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [newCTC, setNewCTC] = React.useState('');
    const [effectiveDate, setEffectiveDate] = React.useState('');
    const [componentBreakup, setComponentBreakup] = React.useState('');

    React.useEffect(() => {
        if (visible) { setEmployeeId(''); setNewCTC(''); setEffectiveDate(''); setComponentBreakup(''); }
    }, [visible]);

    const isValid = employeeId && Number(newCTC) > 0 && effectiveDate.trim();

    const handleSave = () => {
        if (!isValid) return;
        onSave({
            employeeId, newCTC: Number(newCTC), effectiveDate: effectiveDate.trim(),
            componentBreakup: componentBreakup.trim() || undefined,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New Salary Revision</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." searchable />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">New CTC <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500">{'\u20B9'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="1200000" placeholderTextColor={colors.neutral[400]} value={newCTC} onChangeText={setNewCTC} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveDate} onChangeText={setEffectiveDate} />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Component Breakup (JSON)</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder='{"basic": 50, "hra": 40, ...}' placeholderTextColor={colors.neutral[400]} value={componentBreakup} onChangeText={setComponentBreakup} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Revision'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DETAIL VIEW ============

function RevisionDetail({ item, onBack, onApprove, onApply, isApproving, isApplying }: {
    item: SalaryRevisionItem; onBack: () => void;
    onApprove: () => void; onApply: () => void;
    isApproving: boolean; isApplying: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Revision Detail</Text>
                <RevisionStatusBadge status={item.status} />
            </View>
            <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    {/* Employee info */}
                    <View style={styles.detailCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <AvatarCircle name={item.employeeName} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text className="font-inter text-base font-bold text-primary-950">{item.employeeName}</Text>
                                <Text className="font-inter text-xs text-neutral-500">Effective: {formatDate(item.effectiveDate)}</Text>
                            </View>
                        </View>
                        {/* CTC comparison */}
                        <View style={styles.ctcCompare}>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">Old CTC</Text>
                                <Text className="font-inter text-lg font-bold text-neutral-600">{formatCurrency(item.oldCTC)}</Text>
                            </View>
                            <View style={styles.arrowCircle}>
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">New CTC</Text>
                                <Text className="font-inter text-lg font-bold text-success-700">{formatCurrency(item.newCTC)}</Text>
                            </View>
                        </View>
                        <View style={styles.incrementBadge}>
                            <Text className="font-inter text-sm font-bold text-success-700">+{item.incrementPercent.toFixed(1)}% Increment</Text>
                        </View>
                    </View>

                    {/* Arrears */}
                    {item.arrearsAmount > 0 && (
                        <View style={styles.detailCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Arrear Breakdown</Text>
                            <View style={styles.arrearTotal}>
                                <Text className="font-inter text-xs text-neutral-500">Total Arrears</Text>
                                <Text className="font-inter text-xl font-bold text-primary-800">{formatCurrency(item.arrearsAmount)}</Text>
                            </View>
                            {(item.arrearBreakdown ?? []).map((entry, idx) => (
                                <View key={idx} style={styles.arrearRow}>
                                    <Text className="font-inter text-xs text-neutral-600 flex-1">{entry.month}</Text>
                                    <Text className="font-inter text-xs font-semibold text-primary-950">{formatCurrency(entry.amount)}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Actions */}
                    {item.status === 'Draft' && (
                        <Pressable onPress={onApprove} disabled={isApproving} style={[styles.primaryActionBtn, { backgroundColor: colors.info[600] }, isApproving && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isApproving ? 'Approving...' : 'Approve Revision'}</Text>
                        </Pressable>
                    )}
                    {item.status === 'Approved' && (
                        <Pressable onPress={onApply} disabled={isApplying} style={[styles.primaryActionBtn, { backgroundColor: colors.success[600] }, isApplying && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isApplying ? 'Applying...' : 'Apply Revision & Compute Arrears'}</Text>
                        </Pressable>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ============ CARD ============

function RevisionCard({ item, index, onPress }: { item: SalaryRevisionItem; index: number; onPress: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                                <RevisionStatusBadge status={item.status} />
                            </View>
                            <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">Effective {formatDate(item.effectiveDate)}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">{formatCurrency(item.oldCTC)}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400 mx-1">{'\u2192'}</Text>
                        <Text className="font-inter text-[10px] font-bold text-success-700">{formatCurrency(item.newCTC)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] font-bold text-success-600">+{item.incrementPercent.toFixed(1)}%</Text>
                    </View>
                    {item.arrearsAmount > 0 && (
                        <View style={[styles.metaChip, { backgroundColor: colors.warning[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-warning-700">Arrears: {formatCurrency(item.arrearsAmount)}</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function SalaryRevisionScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useSalaryRevisions();
    const { data: empResponse } = useEmployees();
    const createMutation = useCreateSalaryRevision();
    const approveMutation = useApproveSalaryRevision();
    const applyMutation = useApplySalaryRevision();

    const [formVisible, setFormVisible] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<RevisionStatus | 'All'>('All');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    const { data: detailResponse } = useSalaryRevision(selectedId ?? '');

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const items: SalaryRevisionItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            oldCTC: item.oldCTC ?? 0,
            newCTC: item.newCTC ?? 0,
            incrementPercent: item.incrementPercent ?? 0,
            effectiveDate: item.effectiveDate ?? '',
            status: item.status ?? 'Draft',
            arrearsAmount: item.arrearsAmount ?? 0,
            arrearBreakdown: Array.isArray(item.arrearBreakdown) ? item.arrearBreakdown : [],
            componentBreakup: item.componentBreakup ?? '',
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const selectedItem: SalaryRevisionItem | null = React.useMemo(() => {
        if (!selectedId) return null;
        const raw = (detailResponse as any)?.data ?? detailResponse;
        if (raw) return {
            id: raw.id ?? '',
            employeeId: raw.employeeId ?? '',
            employeeName: raw.employeeName ?? '',
            oldCTC: raw.oldCTC ?? 0,
            newCTC: raw.newCTC ?? 0,
            incrementPercent: raw.incrementPercent ?? 0,
            effectiveDate: raw.effectiveDate ?? '',
            status: raw.status ?? 'Draft',
            arrearsAmount: raw.arrearsAmount ?? 0,
            arrearBreakdown: Array.isArray(raw.arrearBreakdown) ? raw.arrearBreakdown : [],
            componentBreakup: raw.componentBreakup ?? '',
            createdAt: raw.createdAt ?? '',
        };
        return items.find(i => i.id === selectedId) ?? null;
    }, [selectedId, detailResponse, items]);

    const filtered = React.useMemo(() => {
        let result = items;
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(i => i.employeeName.toLowerCase().includes(q));
        }
        return result;
    }, [items, search, statusFilter]);

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const handleApprove = () => {
        if (!selectedId) return;
        showConfirm({
            title: 'Approve Revision',
            message: `Approve salary revision for ${selectedItem?.employeeName}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => { approveMutation.mutate(selectedId); },
        });
    };

    const handleApply = () => {
        if (!selectedId) return;
        showConfirm({
            title: 'Apply Revision',
            message: `Apply revision for ${selectedItem?.employeeName}? This will update salary and compute arrears.`,
            confirmText: 'Apply', variant: 'warning',
            onConfirm: () => { applyMutation.mutate(selectedId); },
        });
    };

    // Detail view
    if (selectedItem) {
        return (
            <>
                <RevisionDetail item={selectedItem} onBack={() => setSelectedId(null)} onApprove={handleApprove} onApply={handleApply} isApproving={approveMutation.isPending} isApplying={applyMutation.isPending} />
                <ConfirmModal {...confirmModalProps} />
            </>
        );
    }

    // List view
    const renderItem = ({ item, index }: { item: SalaryRevisionItem; index: number }) => (
        <RevisionCard item={item} index={index} onPress={() => setSelectedId(item.id)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Salary Revisions</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} revision{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name..." /></View>
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
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load revisions" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim() || statusFilter !== 'All') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No revisions match your filters." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No salary revisions" message="Create a revision to update employee salary." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Salary Revisions</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateRevisionModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending} employeeOptions={employeeOptions} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    // Detail
    detailCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    ctcCompare: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    arrowCircle: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50],
        justifyContent: 'center', alignItems: 'center',
    },
    incrementBadge: {
        backgroundColor: colors.success[50], borderRadius: 10, paddingVertical: 8,
        alignItems: 'center',
    },
    arrearTotal: {
        backgroundColor: colors.primary[50], borderRadius: 12, padding: 14,
        alignItems: 'center', marginBottom: 12,
    },
    arrearRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    primaryActionBtn: {
        height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8,
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    // Form
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
