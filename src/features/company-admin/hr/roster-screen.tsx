/* eslint-disable better-tailwindcss/no-unknown-classes */
/* eslint-disable react-hooks/exhaustive-deps */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
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

type RosterPattern = 'MON_FRI' | 'MON_SAT' | 'MON_SAT_ALT' | 'CUSTOM';

const PATTERNS: RosterPattern[] = ['MON_FRI', 'MON_SAT', 'MON_SAT_ALT', 'CUSTOM'];
const PATTERN_LABELS: Record<RosterPattern, string> = {
    MON_FRI: 'Mon-Fri',
    MON_SAT: 'Mon-Sat',
    MON_SAT_ALT: 'Mon-Sat Alt',
    CUSTOM: 'Custom',
};
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = {
    SUNDAY: 'Sun', MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat',
};

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
    MON_FRI: { bg: colors.success[50], text: 'text-success-700' },
    MON_SAT: { bg: colors.info[50], text: 'text-info-700' },
    MON_SAT_ALT: { bg: colors.warning[50], text: 'text-warning-700' },
    CUSTOM: { bg: colors.neutral[100], text: 'text-neutral-600' },
};

// ============ HELPERS ============

// ============ SHARED ATOMS ============

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt.toUpperCase()}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function PatternBadge({ pattern }: { pattern: RosterPattern }) {
    const c = PATTERN_COLORS[pattern] ?? PATTERN_COLORS.CUSTOM;
    return (
        <View style={[styles.patternBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{PATTERN_LABELS[pattern] || pattern}</Text>
        </View>
    );
}

// ============ TOAST COMPONENT ============

function StatusToast({ message, visible, type = 'success' }: { readonly message: string; readonly visible: boolean; readonly type?: 'success' | 'error' }) {
    if (!visible) return null;
    const isError = type === 'error';
    const bgColors: [string, string] = isError ? [colors.danger[500], colors.danger[600]] : [colors.success[500], colors.success[600]];

    return (
        <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeInDown} style={styles.toastContainer}>
            <LinearGradient colors={bgColors} style={styles.toastGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    {isError ? (
                        <Path d="M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </Svg>
                <Text className="ml-2 font-inter text-sm font-bold text-white">{message}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============ FORM MODAL ============

function RosterFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    readonly visible: boolean; readonly onClose: () => void;
    readonly onSave: (data: Omit<RosterItem, 'id'>) => void;
    readonly initialData?: RosterItem | null; readonly isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [pattern, setPattern] = React.useState<RosterPattern>('MON_FRI');
    const [weekOff1, setWeekOff1] = React.useState('SUNDAY');
    const [weekOff2, setWeekOff2] = React.useState('');
    const [applicableTypes, setApplicableTypes] = React.useState<string[]>([]);
    const [effectiveFrom, setEffectiveFrom] = React.useState('');
    const [isDefault, setIsDefault] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const resetForm = React.useCallback(() => {
        setName(''); setPattern('MON_FRI'); setWeekOff1('SUNDAY'); setWeekOff2('');
        setApplicableTypes([]); setEffectiveFrom(''); setIsDefault(false);
        setErrors({});
    }, []);

    const populateForm = React.useCallback((data: RosterItem) => {
        setName(data.name); 
        // Handle incoming pattern cases
        const p = String(data.pattern).toUpperCase().replace('-', '_').replace(' ', '_') as RosterPattern;
        setPattern(PATTERNS.includes(p) ? p : 'MON_FRI');
        setWeekOff1((data.weekOff1 || 'SUNDAY').toUpperCase()); 
        setWeekOff2(data.weekOff2 ? data.weekOff2.toUpperCase() : '');
        setApplicableTypes(data.applicableTypes || []);
        setEffectiveFrom(data.effectiveFrom || ''); setIsDefault(data.isDefault || false);
    }, []);

    React.useEffect(() => {
        if (visible) {
            setErrors({});
            if (initialData) {
                populateForm(initialData);
            } else {
                resetForm();
            }
        }
    }, [visible, initialData, populateForm, resetForm]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Roster Name is required';
        if (weekOff1 && weekOff2 && weekOff1 === weekOff2) {
            newErrors.weekOff2 = 'Week Off 1 and 2 must be different days';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        // Backend typically expects these specific keys
        onSave({
            name: name.trim(),
            pattern,
            weekOff1,
            weekOff2: weekOff2 || undefined, // Backend schema says .optional(), so undefined is better than null for enums
            applicableTypeIds: applicableTypes.length > 0 ? applicableTypes : [],
            effectiveFrom: effectiveFrom.trim() || new Date().toISOString().split('T')[0],
            isDefault,
        } as any);
    };

    return (
        <Modal 
            visible={visible} 
            transparent={false} 
            animationType="slide" 
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: colors.white }}>
                <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />
                
                {/* Header */}
                <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950">
                            {initialData ? 'Edit Roster' : 'New Roster'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500"> Configure work schedules and off patterns </Text>
                    </View>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Roster Name <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                                <TextInput style={styles.textInput} placeholder='E.G. "STANDARD WEEKDAY"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(val) => { setName(val); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} />
                            </View>
                            {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Pattern</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {PATTERNS.map(opt => {
                                    const selected = opt === pattern;
                                    return (
                                        <Pressable key={opt} onPress={() => setPattern(opt)} style={[styles.chip, selected && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{PATTERN_LABELS[opt].toUpperCase()}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <ChipSelector label="Week Off 1" options={DAY_SHORT} value={DAY_SHORT[DAYS.indexOf(weekOff1)] ?? weekOff1} onSelect={v => setWeekOff1(DAYS[DAY_SHORT.indexOf(v)] ?? v)} />
                            </View>
                        </View>
                        
                        <View style={styles.fieldWrap}>
                            <ChipSelector label="Week Off 2" options={['NONE', ...DAY_SHORT]} value={weekOff2 ? (DAY_SHORT[DAYS.indexOf(weekOff2)] ?? weekOff2) : 'NONE'} onSelect={v => setWeekOff2(v === 'NONE' ? '' : (DAYS[DAY_SHORT.indexOf(v)] ?? v))} />
                            {!!errors.weekOff2 && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.weekOff2}</Text>}
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Applicable Employee Types</Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder='E.G. "FULL-TIME, CONTRACT"' placeholderTextColor={colors.neutral[400]} value={applicableTypes.join(', ')} onChangeText={v => setApplicableTypes(v.split(',').map(s => s.trim()).filter(Boolean))} />
                            </View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Effective From</Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder='E.G. "2024-01-01"' placeholderTextColor={colors.neutral[400]} value={effectiveFrom} onChangeText={setEffectiveFrom} />
                            </View>
                        </View>

                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 uppercase tracking-tight">Set as Default Roster</Text>
                                <Text className="mt-0.5 font-inter text-[11px] text-neutral-500">Auto-assigned to new employees during onboarding</Text>
                            </View>
                            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isDefault ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer */}
                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    <Pressable onPress={onClose} style={styles.discardBtn} hitSlop={8}>
                        <Text className="font-inter text-sm font-bold text-neutral-500">DISCARD</Text>
                    </Pressable>
                    <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => [styles.primaryBtn, isSaving && { opacity: 0.7 }, pressed && { transform: [{ scale: 0.98 }] }]}>
                        <Text className="font-inter text-sm font-bold text-white uppercase">{isSaving ? 'Processing...' : initialData ? 'Update Roster' : 'Save Roster'}</Text>
                        {!isSaving && <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}><Path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ ROSTER CARD ============

function RosterCard({ item, index, onEdit, onDelete }: { readonly item: RosterItem; readonly index: number; readonly onEdit: () => void; readonly onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <PatternBadge pattern={item.pattern} />
                            {item.isDefault && (
                                <View style={[styles.patternBadge, { backgroundColor: colors.success[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-success-700">DEFAULT</Text>
                                </View>
                            )}
                        </View>
                        {item.effectiveFrom ? (
                            <Text className="mt-1 font-inter text-[11px] font-medium text-neutral-400 uppercase">EFFECTIVE: {item.effectiveFrom}</Text>
                        ) : null}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteIconBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                            <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 font-medium">OFF: {DAY_LABELS[item.weekOff1?.toUpperCase()] || item.weekOff1}{item.weekOff2 && item.weekOff2 !== 'NONE' ? `, ${DAY_LABELS[item.weekOff2.toUpperCase()] || item.weekOff2}` : ''}</Text>
                    </View>
                    {item.applicableTypes && item.applicableTypes.length > 0 && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 font-medium">TYPES: {item.applicableTypes.join(', ').toUpperCase()}</Text>
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
    
    const [toastVisible, setToastVisible] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
    const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg); setToastType(type); setToastVisible(true);
        toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
    };

    const rosters: RosterItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            pattern: (item.pattern ?? 'CUSTOM').toUpperCase().replace('-', '_').replace(' ', '_') as RosterPattern,
            weekOff1: (item.weekOff1 ?? item.weekOffDay1 ?? 'SUNDAY').toUpperCase(),
            weekOff2: (item.weekOff2 ?? item.weekOffDay2 ?? '').toUpperCase(),
            applicableTypes: item.applicableTypeIds ?? item.employeeTypes ?? item.applicableTypes ?? [],
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
            title: 'Delete Roster', message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { 
                deleteMutation.mutate(item.id, {
                    onSuccess: () => triggerToast('Roster deleted successfully'),
                    onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to delete roster', 'error'),
                }); 
            },
        });
    };

    const handleSave = (data: Omit<RosterItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { 
                onSuccess: () => { setFormVisible(false); triggerToast('Roster updated successfully'); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to update roster', 'error'),
            });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { 
                onSuccess: () => { setFormVisible(false); triggerToast('Roster created successfully'); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to create roster', 'error'),
            });
        }
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search rosters..." />
        </Animated.View>
    );

    const renderItem = ({ item, index }: { item: RosterItem; index: number }) => (
        <RosterCard
            item={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24, paddingHorizontal: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load rosters" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No rosters match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No rosters yet" message="Add your first roster to define work schedules." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />
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
            <StatusToast message={toastMessage} visible={toastVisible} type={toastType} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 24, padding: 20, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[50] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    patternBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    deleteIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger[50], justifyContent: 'center', alignItems: 'center' },
    
    toastContainer: { position: 'absolute', top: 100, left: 24, right: 24, zIndex: 9999 },
    toastGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 10 },
    
    modalFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.white },
    discardBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    primaryBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[600], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
