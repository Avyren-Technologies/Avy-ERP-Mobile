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
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCloneHolidays,
    useCreateHoliday,
    useDeleteHoliday,
    useUpdateHoliday,
} from '@/features/company-admin/api/use-attendance-mutations';
import { useHolidays } from '@/features/company-admin/api/use-attendance-queries';
import { useCanPerform } from '@/hooks/use-can-perform';

// ============ TYPES ============

type HolidayType = 'National' | 'Regional' | 'Company' | 'Optional' | 'Restricted';

interface HolidayItem {
    id: string;
    name: string;
    date: string;
    type: HolidayType;
    branchScope: string[];
    description: string;
    isOptional: boolean;
    year: number;
}

const HOLIDAY_TYPES: HolidayType[] = ['National', 'Regional', 'Company', 'Optional', 'Restricted'];

const TYPE_COLORS: Record<HolidayType, { bg: string; text: string }> = {
    National: { bg: colors.info[50], text: 'text-info-700' },
    Regional: { bg: colors.primary[50], text: 'text-primary-700' },
    Company: { bg: colors.success[50], text: 'text-success-700' },
    Optional: { bg: colors.warning[50], text: 'text-warning-700' },
    Restricted: { bg: colors.danger[50], text: 'text-danger-600' },
};

const YEARS = [2025, 2026, 2027];

// ============ HELPERS ============

// formatHolidayDate removed — use fmt.date() from useCompanyFormatter inside components

// ============ TYPE BADGE ============

function TypeBadge({ type }: { type: HolidayType }) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.National;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{type}</Text>
        </View>
    );
}

// ============ CHIP SELECTOR ============

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

// ============ YEAR SELECTOR ============

function YearSelector({ value, onSelect }: { value: number; onSelect: (y: number) => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {YEARS.map(y => {
                const active = y === value;
                return (
                    <Pressable key={y} onPress={() => onSelect(y)} style={[styles.chip, active && styles.chipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{y}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ============ CLONE MODAL ============

function CloneModal({
    visible,
    onClose,
    onClone,
    isCloning,
}: {
    visible: boolean;
    onClose: () => void;
    onClone: (fromYear: number, toYear: number) => void;
    isCloning: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [fromYear, setFromYear] = React.useState(2025);
    const [toYear, setToYear] = React.useState(2026);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Clone Holidays</Text>
                    <Text className="font-inter text-sm text-neutral-500 mb-4">Copy all holidays from one year to another.</Text>
                    <ChipSelector label="From Year" options={YEARS.map(String)} value={String(fromYear)} onSelect={v => setFromYear(Number(v))} />
                    <ChipSelector label="To Year" options={YEARS.map(String)} value={String(toYear)} onSelect={v => setToYear(Number(v))} />
                    {fromYear === toYear && (
                        <Text className="font-inter text-xs text-danger-500 mb-2">Source and target year must be different.</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable
                            onPress={() => onClone(fromYear, toYear)}
                            disabled={fromYear === toYear || isCloning}
                            style={[styles.saveBtn, (fromYear === toYear || isCloning) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isCloning ? 'Cloning...' : 'Clone'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ FORM MODAL ============

function HolidayFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<HolidayItem, 'id' | 'year'>) => void;
    initialData?: HolidayItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [date, setDate] = React.useState('');
    const [type, setType] = React.useState<HolidayType>('National');
    const [description, setDescription] = React.useState('');
    const [isOptional, setIsOptional] = React.useState(false);
    const [branchScope, setBranchScope] = React.useState('All');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setDate(initialData.date);
                setType(initialData.type);
                setDescription(initialData.description);
                setIsOptional(initialData.isOptional);
                setBranchScope(initialData.branchScope?.length ? initialData.branchScope.join(', ') : 'All');
            } else {
                setName('');
                setDate('');
                setType('National');
                setDescription('');
                setIsOptional(false);
                setBranchScope('All');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim() || !date.trim()) return;
        onSave({
            name: name.trim(),
            date: date.trim(),
            type,
            description: description.trim(),
            isOptional,
            branchScope: branchScope === 'All' ? ['All'] : branchScope.split(',').map(s => s.trim()).filter(Boolean),
        });
    };

    const isValid = name.trim() && date.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Holiday' : 'Add Holiday'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Republic Day"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        {/* Date */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={date} onChangeText={setDate} /></View>
                        </View>
                        {/* Type */}
                        <ChipSelector label="Type" options={HOLIDAY_TYPES} value={type} onSelect={v => setType(v as HolidayType)} />
                        {/* Branch Scope */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Branch Scope</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='All or comma-separated branches' placeholderTextColor={colors.neutral[400]} value={branchScope} onChangeText={setBranchScope} /></View>
                        </View>
                        {/* Description */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}><TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Optional description..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline /></View>
                        </View>
                        {/* Optional Toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">Optional Holiday</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500">Employees can choose to take this day off</Text>
                            </View>
                            <Switch value={isOptional} onValueChange={setIsOptional} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isOptional ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Holiday'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ HOLIDAY CARD ============

function HolidayCard({ item, index, onEdit, onDelete, readOnly }: { item: HolidayItem; index: number; onEdit: () => void; onDelete: () => void; readOnly?: boolean }) {
    const fmt = useCompanyFormatter();
    const formatHolidayDate = (d: string) => fmt.date(d);
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={readOnly ? undefined : onEdit} style={({ pressed }) => [styles.card, !readOnly && pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <TypeBadge type={item.type} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{formatHolidayDate(item.date)}</Text>
                    </View>
                    {!readOnly && (
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    )}
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Scope: {item.branchScope?.join(', ') || 'All'}</Text>
                    </View>
                    {item.isOptional && (
                        <View style={[styles.metaChip, { backgroundColor: colors.warning[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-warning-700">Optional</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function HolidayScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const canCreate = useCanPerform('hr:create') || useCanPerform('company:configure');
    const canUpdate = useCanPerform('hr:update') || useCanPerform('company:configure');

    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<HolidayItem | null>(null);
    const [cloneVisible, setCloneVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useHolidays({ year: selectedYear } as any);
    const createMutation = useCreateHoliday();
    const updateMutation = useUpdateHoliday();
    const deleteMutation = useDeleteHoliday();
    const cloneMutation = useCloneHolidays();

    const holidays: HolidayItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            date: item.date ?? '',
            type: item.type ?? 'National',
            branchScope: item.branchScope ?? item.branches ?? ['All'],
            description: item.description ?? '',
            isOptional: item.isOptional ?? false,
            year: item.year ?? selectedYear,
        }));
    }, [response, selectedYear]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return holidays;
        const q = search.toLowerCase();
        return holidays.filter(h => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q));
    }, [holidays, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: HolidayItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: HolidayItem) => {
        showConfirm({
            title: 'Delete Holiday',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<HolidayItem, 'id' | 'year'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: { ...data, year: selectedYear } as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate({ ...data, year: selectedYear } as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleClone = (fromYear: number, toYear: number) => {
        cloneMutation.mutate({ fromYear, toYear } as unknown as Record<string, unknown>, { onSuccess: () => setCloneVisible(false) });
    };

    const renderItem = ({ item, index }: { item: HolidayItem; index: number }) => (
        <HolidayCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} readOnly={!canUpdate} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Holidays</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">{holidays.length} holiday{holidays.length !== 1 ? 's' : ''}</Text>
                </View>
                {canCreate && (
                    <Pressable onPress={() => setCloneVisible(true)} style={styles.cloneBtn}>
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="ml-1 font-inter text-xs font-bold text-primary-600">Clone Year</Text>
                    </Pressable>
                )}
            </View>
            <View style={{ marginTop: 16 }}>
                <YearSelector value={selectedYear} onSelect={setSelectedYear} />
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search holidays..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load holidays" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No holidays match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No holidays yet" message={`Add holidays for ${selectedYear} to get started.`} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Holiday Calendar" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            {canCreate && <FAB onPress={handleAdd} />}
            <HolidayFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <CloneModal visible={cloneVisible} onClose={() => setCloneVisible(false)} onClone={handleClone} isCloning={cloneMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
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
    cloneBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary[50] },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
