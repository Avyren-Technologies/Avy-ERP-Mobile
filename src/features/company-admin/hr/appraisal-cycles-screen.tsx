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
    useActivateAppraisalCycle,
    useCloseAppraisalCycle,
    useCreateAppraisalCycle,
    useDeleteAppraisalCycle,
    usePublishAppraisalCycle,
    useUpdateAppraisalCycle,
} from '@/features/company-admin/api/use-performance-mutations';
import { useAppraisalCycles } from '@/features/company-admin/api/use-performance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type CycleStatus = 'DRAFT' | 'ACTIVE' | 'REVIEW' | 'CALIBRATION' | 'PUBLISHED' | 'CLOSED';
type Frequency = 'Annual' | 'Semi-Annual' | 'Quarterly';
type RatingScale = '1-5' | '1-10';

interface AppraisalCycleItem {
    id: string;
    name: string;
    frequency: Frequency;
    startDate: string;
    endDate: string;
    ratingScale: RatingScale;
    kraWeightage: number;
    competencyWeightage: number;
    bellCurveEnabled: boolean;
    bellCurveDistribution: { label: string; percentage: number }[];
    midYearReview: boolean;
    forcedDistribution: boolean;
    status: CycleStatus;
    entriesCount: number;
}

// ============ CONSTANTS ============

const FREQUENCIES: Frequency[] = ['Annual', 'Semi-Annual', 'Quarterly'];
const RATING_SCALES: RatingScale[] = ['1-5', '1-10'];

const STATUS_COLORS: Record<CycleStatus, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    ACTIVE: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    REVIEW: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    CALIBRATION: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    PUBLISHED: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    CLOSED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

const FREQUENCY_COLORS: Record<Frequency, { bg: string; text: string }> = {
    Annual: { bg: colors.primary[50], text: colors.primary[700] },
    'Semi-Annual': { bg: colors.accent[50], text: colors.accent[700] },
    Quarterly: { bg: colors.warning[50], text: colors.warning[700] },
};

const DEFAULT_BELL_CURVE = [
    { label: 'Outstanding', percentage: 10 },
    { label: 'Exceeds', percentage: 20 },
    { label: 'Meets', percentage: 40 },
    { label: 'Below', percentage: 20 },
    { label: 'Needs Improvement', percentage: 10 },
];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: CycleStatus }) {
    const s = STATUS_COLORS[status];
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function FrequencyBadge({ frequency }: { frequency: Frequency }) {
    const c = FREQUENCY_COLORS[frequency] ?? FREQUENCY_COLORS.Annual;
    return (
        <View style={[styles.freqBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{frequency}</Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function ToggleRow({ label, subtitle, value, onChange }: { label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

function SectionHeader({ title }: { title: string }) {
    return <Text className="mb-2 mt-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>;
}

function SliderRow({ label, value, onChange, min, max }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
                <Text className="font-inter text-sm font-bold text-primary-600">{value}%</Text>
            </View>
            <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Pressable onPress={() => onChange(Math.max(min, value - 5))} style={styles.sliderBtn}>
                    <Text className="font-inter text-xs font-bold text-primary-600">-5</Text>
                </Pressable>
                <Pressable onPress={() => onChange(Math.min(max, value + 5))} style={styles.sliderBtn}>
                    <Text className="font-inter text-xs font-bold text-primary-600">+5</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ============ FORM MODAL ============

interface CycleForm {
    name: string;
    frequency: Frequency;
    startDate: string;
    endDate: string;
    ratingScale: RatingScale;
    kraWeightage: number;
    competencyWeightage: number;
    bellCurveEnabled: boolean;
    bellCurveDistribution: { label: string; percentage: number }[];
    midYearReview: boolean;
    forcedDistribution: boolean;
}

const EMPTY_FORM: CycleForm = {
    name: '', frequency: 'Annual', startDate: '', endDate: '',
    ratingScale: '1-5', kraWeightage: 60, competencyWeightage: 40,
    bellCurveEnabled: false, bellCurveDistribution: DEFAULT_BELL_CURVE,
    midYearReview: false, forcedDistribution: false,
};

function CycleFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: AppraisalCycleItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<CycleForm>(EMPTY_FORM);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setForm({
                    name: initialData.name,
                    frequency: initialData.frequency,
                    startDate: initialData.startDate,
                    endDate: initialData.endDate,
                    ratingScale: initialData.ratingScale,
                    kraWeightage: initialData.kraWeightage,
                    competencyWeightage: initialData.competencyWeightage,
                    bellCurveEnabled: initialData.bellCurveEnabled,
                    bellCurveDistribution: initialData.bellCurveDistribution.length > 0 ? initialData.bellCurveDistribution : DEFAULT_BELL_CURVE,
                    midYearReview: initialData.midYearReview,
                    forcedDistribution: initialData.forcedDistribution,
                });
            } else {
                setForm(EMPTY_FORM);
            }
        }
    }, [visible, initialData]);

    const update = <K extends keyof CycleForm>(key: K, val: CycleForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const updateKra = (v: number) => {
        setForm(prev => ({ ...prev, kraWeightage: v, competencyWeightage: 100 - v }));
    };

    const updateBellCurve = (idx: number, pct: number) => {
        setForm(prev => {
            const dist = [...prev.bellCurveDistribution];
            dist[idx] = { ...dist[idx], percentage: pct };
            return { ...prev, bellCurveDistribution: dist };
        });
    };

    const isValid = form.name.trim() && form.startDate.trim() && form.endDate.trim();

    const handleSave = () => {
        if (!isValid) return;
        onSave({ ...form } as unknown as Record<string, unknown>);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">
                        {initialData ? 'Edit Cycle' : 'New Appraisal Cycle'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <SectionHeader title="Basic Information" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Cycle Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "FY 2025-26 Annual"' placeholderTextColor={colors.neutral[400]} value={form.name} onChangeText={v => update('name', v)} /></View>
                        </View>
                        <ChipSelector label="Frequency" options={FREQUENCIES} value={form.frequency} onSelect={v => update('frequency', v as Frequency)} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Start Date <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={form.startDate} onChangeText={v => update('startDate', v)} /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">End Date <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={form.endDate} onChangeText={v => update('endDate', v)} /></View>
                            </View>
                        </View>
                        <ChipSelector label="Rating Scale" options={RATING_SCALES} value={form.ratingScale} onSelect={v => update('ratingScale', v as RatingScale)} />

                        <SectionHeader title="Weightage" />
                        <SliderRow label="KRA Weightage" value={form.kraWeightage} min={0} max={100} onChange={updateKra} />
                        <View style={styles.fieldWrap}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Competency Weightage</Text>
                                <Text className="font-inter text-sm font-bold text-primary-600">{form.competencyWeightage}%</Text>
                            </View>
                        </View>

                        <SectionHeader title="Distribution & Reviews" />
                        <ToggleRow label="Bell Curve" subtitle="Enable bell curve rating distribution" value={form.bellCurveEnabled} onChange={v => update('bellCurveEnabled', v)} />
                        {form.bellCurveEnabled && (
                            <View style={styles.bellCurveWrap}>
                                {form.bellCurveDistribution.map((item, idx) => (
                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400" style={{ flex: 1 }}>{item.label}</Text>
                                        <View style={[styles.inputWrapSmall, { width: 60 }]}>
                                            <TextInput style={styles.textInputSmall} value={String(item.percentage)} onChangeText={v => updateBellCurve(idx, Number(v) || 0)} keyboardType="number-pad" />
                                        </View>
                                        <Text className="font-inter text-xs text-neutral-400">%</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <ToggleRow label="Mid-Year Review" subtitle="Enable mid-year review checkpoint" value={form.midYearReview} onChange={v => update('midYearReview', v)} />
                        <ToggleRow label="Forced Distribution" subtitle="Enforce rating distribution limits" value={form.forcedDistribution} onChange={v => update('forcedDistribution', v)} />
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create Cycle'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CYCLE CARD ============

function CycleCard({ item, index, onEdit, onDelete, onLifecycle }: {
    item: AppraisalCycleItem; index: number; onEdit: () => void; onDelete: () => void;
    onLifecycle: (action: string) => void;
}) {
    const lifecycleAction = React.useMemo(() => {
        switch (item.status) {
            case 'DRAFT': return { label: 'Activate', color: colors.success[600] };
            case 'ACTIVE': return { label: 'Close Review', color: colors.info[600] };
            case 'REVIEW': return { label: 'Start Calibration', color: colors.warning[600] };
            case 'CALIBRATION': return { label: 'Publish', color: colors.primary[600] };
            case 'PUBLISHED': return { label: 'Close', color: colors.danger[600] };
            default: return null;
        }
    }, [item.status]);

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                            {item.startDate} - {item.endDate}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <FrequencyBadge frequency={item.frequency} />
                    <View style={[styles.scaleBadge]}>
                        <Text className="font-inter text-[10px] font-bold text-primary-600">Scale {item.ratingScale}</Text>
                    </View>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.entriesCount} entries</Text>
                </View>
                <View style={styles.cardFooter}>
                    {lifecycleAction && (
                        <Pressable onPress={() => onLifecycle(lifecycleAction.label)} style={[styles.lifecycleBtn, { backgroundColor: lifecycleAction.color }]}>
                            <Text className="font-inter text-[10px] font-bold text-white">{lifecycleAction.label}</Text>
                        </Pressable>
                    )}
                    {item.status === 'DRAFT' && (
                        <Pressable onPress={onDelete} hitSlop={8} style={{ marginLeft: 'auto' }}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function AppraisalCyclesScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useAppraisalCycles();
    const createMutation = useCreateAppraisalCycle();
    const updateMutation = useUpdateAppraisalCycle();
    const deleteMutation = useDeleteAppraisalCycle();
    const activateMutation = useActivateAppraisalCycle();
    const publishMutation = usePublishAppraisalCycle();
    const closeMutation = useCloseAppraisalCycle();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<AppraisalCycleItem | null>(null);
    const [search, setSearch] = React.useState('');

    const cycles: AppraisalCycleItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            frequency: item.frequency ?? 'Annual',
            startDate: item.startDate ?? '',
            endDate: item.endDate ?? '',
            ratingScale: item.ratingScale ?? '1-5',
            kraWeightage: item.kraWeightage ?? 60,
            competencyWeightage: item.competencyWeightage ?? 40,
            bellCurveEnabled: item.bellCurveEnabled ?? false,
            bellCurveDistribution: item.bellCurveDistribution ?? [],
            midYearReview: item.midYearReview ?? false,
            forcedDistribution: item.forcedDistribution ?? false,
            status: item.status ?? 'DRAFT',
            entriesCount: item.entriesCount ?? 0,
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return cycles;
        const q = search.toLowerCase();
        return cycles.filter(c => c.name.toLowerCase().includes(q));
    }, [cycles, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: AppraisalCycleItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: AppraisalCycleItem) => {
        showConfirm({
            title: 'Delete Cycle',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleLifecycle = (item: AppraisalCycleItem, action: string) => {
        showConfirm({
            title: action,
            message: `${action} the "${item.name}" cycle?`,
            confirmText: action,
            variant: action === 'Close' ? 'danger' : 'primary',
            onConfirm: () => {
                switch (action) {
                    case 'Activate': activateMutation.mutate(item.id); break;
                    case 'Publish': publishMutation.mutate(item.id); break;
                    case 'Close':
                    case 'Close Review': closeMutation.mutate(item.id); break;
                    case 'Start Calibration':
                        updateMutation.mutate({ id: item.id, data: { status: 'CALIBRATION' } });
                        break;
                }
            },
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: AppraisalCycleItem; index: number }) => (
        <CycleCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onLifecycle={action => handleLifecycle(item, action)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Appraisal Cycles</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{cycles.length} cycle{cycles.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search cycles..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No cycles match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No appraisal cycles" message="Create your first appraisal cycle." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Appraisal Cycles" onMenuPress={toggle} />
            <FlashList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <CycleFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
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
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    freqBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    scaleBadge: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    lifecycleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
    fullFormSheet: { flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    inputWrapSmall: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 8, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 10, height: 36, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    textInputSmall: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    bellCurveWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    sliderTrack: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden' },
    sliderFill: { height: '100%', backgroundColor: colors.primary[500], borderRadius: 3 },
    sliderBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
