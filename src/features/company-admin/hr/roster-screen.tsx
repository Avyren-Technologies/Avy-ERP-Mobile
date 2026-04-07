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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateRoster,
    useDeleteRoster,
    useUpdateRoster,
} from '@/features/company-admin/api/use-attendance-mutations';
import { useRosters } from '@/features/company-admin/api/use-attendance-queries';

// ============ TYPES ============

type RosterPattern = 'Mon-Fri' | 'Mon-Sat' | 'Mon-Sat Alt' | 'Custom';

const PATTERNS: RosterPattern[] = ['Mon-Fri', 'Mon-Sat', 'Mon-Sat Alt', 'Custom'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface RosterItem {
    id: string;
    name: string;
    pattern: RosterPattern;
    weekOff1: string;
    weekOff2: string;
    applicableTypes: string[];
    effectiveFrom: string;
    isDefault: boolean;
}

const PATTERN_COLORS: Record<RosterPattern, { bg: string; text: string }> = {
    'Mon-Fri': { bg: colors.success[50], text: 'text-success-700' },
    'Mon-Sat': { bg: colors.info[50], text: 'text-info-700' },
    'Mon-Sat Alt': { bg: colors.warning[50], text: 'text-warning-700' },
    Custom: { bg: colors.accent[50], text: 'text-accent-700' },
};

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

function MultiChipSelector({ label, options, values, onToggle }: { label: string; options: string[]; values: string[]; onToggle: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = values.includes(opt);
                    return (
                        <Pressable key={opt} onPress={() => onToggle(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ PATTERN BADGE ============

function PatternBadge({ pattern }: { pattern: RosterPattern }) {
    const c = PATTERN_COLORS[pattern] ?? PATTERN_COLORS.Custom;
    return (
        <View style={[styles.patternBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{pattern}</Text>
        </View>
    );
}

// ============ FORM MODAL ============

function RosterFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<RosterItem, 'id'>) => void;
    initialData?: RosterItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [pattern, setPattern] = React.useState<RosterPattern>('Mon-Fri');
    const [weekOff1, setWeekOff1] = React.useState('Sunday');
    const [weekOff2, setWeekOff2] = React.useState('');
    const [applicableTypes, setApplicableTypes] = React.useState<string[]>([]);
    const [effectiveFrom, setEffectiveFrom] = React.useState('');
    const [isDefault, setIsDefault] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setPattern(initialData.pattern);
                setWeekOff1(initialData.weekOff1);
                setWeekOff2(initialData.weekOff2);
                setApplicableTypes(initialData.applicableTypes);
                setEffectiveFrom(initialData.effectiveFrom);
                setIsDefault(initialData.isDefault);
            } else {
                setName(''); setPattern('Mon-Fri'); setWeekOff1('Sunday'); setWeekOff2('');
                setApplicableTypes([]); setEffectiveFrom(''); setIsDefault(false);
            }
        }
    }, [visible, initialData]);

    const toggleType = (t: string) => {
        setApplicableTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            pattern,
            weekOff1,
            weekOff2,
            applicableTypes,
            effectiveFrom: effectiveFrom.trim(),
            isDefault,
        });
    };

    const isValid = name.trim().length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Roster' : 'Add Roster'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Standard Weekday"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        {/* Pattern */}
                        <ChipSelector label="Pattern" options={PATTERNS} value={pattern} onSelect={v => setPattern(v as RosterPattern)} />
                        {/* Week Off 1 */}
                        <ChipSelector label="Week Off 1" options={DAY_SHORT} value={DAY_SHORT[DAYS.indexOf(weekOff1)] ?? weekOff1} onSelect={v => setWeekOff1(DAYS[DAY_SHORT.indexOf(v)] ?? v)} />
                        {/* Week Off 2 */}
                        <ChipSelector label="Week Off 2 (optional)" options={['None', ...DAY_SHORT]} value={weekOff2 ? (DAY_SHORT[DAYS.indexOf(weekOff2)] ?? weekOff2) : 'None'} onSelect={v => setWeekOff2(v === 'None' ? '' : (DAYS[DAY_SHORT.indexOf(v)] ?? v))} />
                        {/* Applicable Employee Types */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Applicable Employee Types</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Comma-separated types" placeholderTextColor={colors.neutral[400]} value={applicableTypes.join(', ')} onChangeText={v => setApplicableTypes(v.split(',').map(s => s.trim()).filter(Boolean))} /></View>
                        </View>
                        {/* Effective From */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective From</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveFrom} onChangeText={setEffectiveFrom} /></View>
                        </View>
                        {/* Default Toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">Default Roster</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500">Applied to new employees by default</Text>
                            </View>
                            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isDefault ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Roster'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ROSTER CARD ============

function RosterCard({ item, index, onEdit, onDelete }: { item: RosterItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <PatternBadge pattern={item.pattern} />
                            {item.isDefault && (
                                <View style={[styles.patternBadge, { backgroundColor: colors.primary[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-primary-700">Default</Text>
                                </View>
                            )}
                        </View>
                        {item.effectiveFrom ? (
                            <Text className="mt-1 font-inter text-xs text-neutral-500">Effective: {item.effectiveFrom}</Text>
                        ) : null}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Off: {item.weekOff1}{item.weekOff2 ? `, ${item.weekOff2}` : ''}</Text>
                    </View>
                    {item.applicableTypes.length > 0 && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">Types: {item.applicableTypes.join(', ')}</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function RosterScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useRosters();
    const createMutation = useCreateRoster();
    const updateMutation = useUpdateRoster();
    const deleteMutation = useDeleteRoster();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<RosterItem | null>(null);
    const [search, setSearch] = React.useState('');

    const rosters: RosterItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            pattern: item.pattern ?? 'Custom',
            weekOff1: item.weekOff1 ?? item.weekOffDay1 ?? 'Sunday',
            weekOff2: item.weekOff2 ?? item.weekOffDay2 ?? '',
            applicableTypes: item.applicableTypes ?? item.employeeTypes ?? [],
            effectiveFrom: item.effectiveFrom ?? item.effectiveDate ?? '',
            isDefault: item.isDefault ?? false,
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return rosters;
        const q = search.toLowerCase();
        return rosters.filter(r => r.name.toLowerCase().includes(q) || r.pattern.toLowerCase().includes(q));
    }, [rosters, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: RosterItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: RosterItem) => {
        showConfirm({
            title: 'Delete Roster',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<RosterItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: RosterItem; index: number }) => (
        <RosterCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Rosters</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{rosters.length} roster{rosters.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search rosters..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load rosters" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No rosters match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No rosters yet" message="Add your first roster to define work schedules." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Roster Management" onMenuPress={toggle} />
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
            <FAB onPress={handleAdd} />
            <RosterFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
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
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    patternBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
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
