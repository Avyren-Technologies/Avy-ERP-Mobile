/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
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
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateGrievanceCase,
    useCreateGrievanceCategory,
    useDeleteGrievanceCategory,
    useUpdateGrievanceCase,
    useUpdateGrievanceCategory,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useGrievanceCases, useGrievanceCategories } from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type CaseStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed' | 'Escalated';

interface GrievanceCategoryItem {
    id: string;
    name: string;
    slaHours: number;
    autoEscalateTo: string;
    caseCount: number;
}

interface GrievanceCaseItem {
    id: string;
    categoryId: string;
    categoryName: string;
    description: string;
    anonymous: boolean;
    status: CaseStatus;
    createdAt: string;
    resolvedAt: string;
}

// ============ CONSTANTS ============

const CASE_STATUS_COLORS: Record<CaseStatus, { bg: string; text: string; dot: string }> = {
    Open: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Investigating: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Resolved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Closed: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    Escalated: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

const STATUS_TRANSITIONS: Partial<Record<CaseStatus, { label: string; next: CaseStatus; color: string }[]>> = {
    Open: [
        { label: 'Investigate', next: 'Investigating', color: colors.warning[600] },
        { label: 'Escalate', next: 'Escalated', color: colors.danger[600] },
    ],
    Investigating: [
        { label: 'Resolve', next: 'Resolved', color: colors.success[600] },
        { label: 'Escalate', next: 'Escalated', color: colors.danger[600] },
    ],
    Resolved: [
        { label: 'Close', next: 'Closed', color: colors.neutral[600] },
    ],
    Escalated: [
        { label: 'Investigate', next: 'Investigating', color: colors.warning[600] },
        { label: 'Resolve', next: 'Resolved', color: colors.success[600] },
    ],
};

// ============ SHARED ATOMS ============

function CaseStatusBadge({ status }: { status: CaseStatus }) {
    const s = CASE_STATUS_COLORS[status] ?? CASE_STATUS_COLORS.Open;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
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
                            {filteredOptions.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CATEGORY FORM MODAL ============

function CategoryFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: GrievanceCategoryItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [slaHours, setSlaHours] = React.useState('');
    const [autoEscalateTo, setAutoEscalateTo] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setSlaHours(String(initialData.slaHours || ''));
                setAutoEscalateTo(initialData.autoEscalateTo);
            } else {
                setName(''); setSlaHours(''); setAutoEscalateTo('');
            }
        }
    }, [visible, initialData]);

    const isValid = name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">{initialData ? 'Edit Category' : 'New Category'}</Text>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Category Name <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Harassment" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">SLA (hours)</Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 48" placeholderTextColor={colors.neutral[400]} value={slaHours} onChangeText={setSlaHours} keyboardType="number-pad" /></View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Auto-Escalate To</Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. HR Head" placeholderTextColor={colors.neutral[400]} value={autoEscalateTo} onChangeText={setAutoEscalateTo} /></View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name: name.trim(), slaHours: Number(slaHours) || 0, autoEscalateTo: autoEscalateTo.trim() })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CASE FORM MODAL ============

function CaseFormModal({
    visible, onClose, onSave, categoryOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    categoryOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [categoryId, setCategoryId] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [anonymous, setAnonymous] = React.useState(false);

    React.useEffect(() => {
        if (visible) { setCategoryId(''); setDescription(''); setAnonymous(false); }
    }, [visible]);

    const isValid = categoryId && description.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">File Grievance</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Category" value={categoryId} options={categoryOptions} onSelect={setCategoryId} placeholder="Select category..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 120 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Describe the grievance in detail..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline numberOfLines={5} />
                            </View>
                        </View>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">Anonymous</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500">File without revealing identity</Text>
                            </View>
                            <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={anonymous ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ categoryId, categoryName: categoryOptions.find(c => c.id === categoryId)?.label ?? '', description: description.trim(), anonymous, status: 'Open' })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Filing...' : 'File Grievance'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD COMPONENTS ============

function CategoryCard({ item, index, onEdit, onDelete }: {
    item: GrievanceCategoryItem; index: number; onEdit: () => void; onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{item.name}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.caseCount} case{item.caseCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: colors.info[50] }]}>
                        <Text style={{ color: colors.info[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.slaHours}h SLA</Text>
                    </View>
                </View>
                {item.autoEscalateTo ? (
                    <Text className="mt-1 font-inter text-xs text-neutral-400">Escalates to: {item.autoEscalateTo}</Text>
                ) : null}
                <View style={styles.cardFooter}>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function CaseCard({ item, index, onTransition }: {
    item: GrievanceCaseItem; index: number;
    onTransition: (next: CaseStatus) => void;
}) {
    const transitions = STATUS_TRANSITIONS[item.status] ?? [];

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.typeBadge, { backgroundColor: colors.accent[50] }]}>
                                <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.categoryName}</Text>
                            </View>
                            {item.anonymous && (
                                <View style={[styles.typeBadge, { backgroundColor: colors.neutral[100] }]}>
                                    <Text style={{ color: colors.neutral[600], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Anonymous</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <CaseStatusBadge status={item.status} />
                </View>
                <Text className="mt-2 font-inter text-xs text-neutral-600" numberOfLines={3}>{item.description}</Text>
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">Created: {item.createdAt}</Text>
                {transitions.length > 0 && (
                    <View style={styles.actionRow}>
                        {transitions.map(t => (
                            <Pressable key={t.next} onPress={() => onTransition(t.next)} style={[styles.transitionBtn, { backgroundColor: t.color }]}>
                                <Text className="font-inter text-[10px] font-bold text-white">{t.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function GrievancesScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [showCategories, setShowCategories] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const { data: catResponse, isLoading: catLoading, refetch: catRefetch, isFetching: catFetching } = useGrievanceCategories();
    const { data: caseResponse, isLoading: caseLoading, error: caseError, refetch: caseRefetch, isFetching: caseFetching } = useGrievanceCases();

    const createCat = useCreateGrievanceCategory();
    const updateCat = useUpdateGrievanceCategory();
    const deleteCat = useDeleteGrievanceCategory();
    const createCase = useCreateGrievanceCase();
    const updateCase = useUpdateGrievanceCase();

    const [catFormVisible, setCatFormVisible] = React.useState(false);
    const [editingCat, setEditingCat] = React.useState<GrievanceCategoryItem | null>(null);
    const [caseFormVisible, setCaseFormVisible] = React.useState(false);

    const categories: GrievanceCategoryItem[] = React.useMemo(() => {
        const raw = (catResponse as any)?.data ?? catResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', slaHours: item.slaHours ?? 0,
            autoEscalateTo: item.autoEscalateTo ?? '', caseCount: item.caseCount ?? 0,
        }));
    }, [catResponse]);

    const cases: GrievanceCaseItem[] = React.useMemo(() => {
        const raw = (caseResponse as any)?.data ?? caseResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', categoryId: item.categoryId ?? '', categoryName: item.categoryName ?? '',
            description: item.description ?? '', anonymous: item.anonymous ?? false,
            status: item.status ?? 'Open', createdAt: item.createdAt ?? '', resolvedAt: item.resolvedAt ?? '',
        }));
    }, [caseResponse]);

    const categoryOptions = React.useMemo(() => categories.map(c => ({ id: c.id, label: c.name })), [categories]);

    const filteredCategories = React.useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.toLowerCase();
        return categories.filter(c => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const filteredCases = React.useMemo(() => {
        if (!search.trim()) return cases;
        const q = search.toLowerCase();
        return cases.filter(c => c.categoryName.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }, [cases, search]);

    const handleSaveCategory = (data: Record<string, unknown>) => {
        if (editingCat) {
            updateCat.mutate({ id: editingCat.id, data }, { onSuccess: () => setCatFormVisible(false) });
        } else {
            createCat.mutate(data, { onSuccess: () => setCatFormVisible(false) });
        }
    };

    const handleDeleteCategory = (item: GrievanceCategoryItem) => {
        showConfirm({
            title: 'Delete Category', message: `Delete "${item.name}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteCat.mutate(item.id),
        });
    };

    const handleSaveCase = (data: Record<string, unknown>) => {
        createCase.mutate(data, { onSuccess: () => setCaseFormVisible(false) });
    };

    const handleCaseTransition = (item: GrievanceCaseItem, next: CaseStatus) => {
        showConfirm({
            title: `${next} Case`,
            message: `Change case status to "${next}"?`,
            confirmText: next, variant: next === 'Escalated' ? 'danger' : 'primary',
            onConfirm: () => updateCase.mutate({ id: item.id, data: { status: next, ...(next === 'Resolved' ? { resolvedAt: new Date().toISOString().split('T')[0] } : {}) } }),
        });
    };

    type ListItem = { type: 'section'; title: string; key: string } | { type: 'category'; item: GrievanceCategoryItem; key: string } | { type: 'case'; item: GrievanceCaseItem; key: string };

    const listData: ListItem[] = React.useMemo(() => {
        const items: ListItem[] = [];
        if (showCategories) {
            items.push({ type: 'section', title: `Categories (${filteredCategories.length})`, key: 'sec-cat' });
            filteredCategories.forEach(c => items.push({ type: 'category', item: c, key: `cat-${c.id}` }));
        }
        items.push({ type: 'section', title: `Cases (${filteredCases.length})`, key: 'sec-case' });
        filteredCases.forEach(c => items.push({ type: 'case', item: c, key: `case-${c.id}` }));
        return items;
    }, [showCategories, filteredCategories, filteredCases]);

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Grievances</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{cases.length} case{cases.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search grievances..." /></View>
            <Pressable onPress={() => setShowCategories(prev => !prev)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={showCategories ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <Text className="font-inter text-xs font-semibold text-primary-600">{showCategories ? 'Hide' : 'Show'} Categories</Text>
            </Pressable>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (caseLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (caseError) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => caseRefetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No grievances" message="No cases have been filed." /></View>;
    };

    const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
        if (item.type === 'section') {
            return (
                <Animated.View entering={FadeInDown.duration(300)} style={{ paddingTop: index > 0 ? 20 : 0, paddingBottom: 8 }}>
                    <Text className="font-inter text-sm font-bold text-neutral-600">{item.title}</Text>
                </Animated.View>
            );
        }
        if (item.type === 'category') {
            return <CategoryCard item={item.item} index={index} onEdit={() => { setEditingCat(item.item); setCatFormVisible(true); }} onDelete={() => handleDeleteCategory(item.item)} />;
        }
        return <CaseCard item={item.item} index={index} onTransition={next => handleCaseTransition(item.item, next)} />;
    };

    const handleFAB = () => {
        if (showCategories) { setEditingCat(null); setCatFormVisible(true); }
        else { setCaseFormVisible(true); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Grievances" onMenuPress={toggle} />
            <FlashList
                data={listData.length > 1 ? listData : []} renderItem={renderItem} keyExtractor={item => item.key}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={(caseFetching && !caseLoading) || (catFetching && !catLoading)} onRefresh={() => { caseRefetch(); catRefetch(); }} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <CategoryFormModal visible={catFormVisible} onClose={() => setCatFormVisible(false)} onSave={handleSaveCategory} initialData={editingCat} isSaving={createCat.isPending || updateCat.isPending} />
            <CaseFormModal visible={caseFormVisible} onClose={() => setCaseFormVisible(false)} onSave={handleSaveCase} categoryOptions={categoryOptions} isSaving={createCase.isPending} />
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
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    transitionBtn: { flex: 1, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 14 },
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
