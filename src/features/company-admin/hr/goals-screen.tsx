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

import { useGoals, useAppraisalCycles } from '@/features/company-admin/api/use-performance-queries';
import {
    useCreateGoal,
    useUpdateGoal,
    useDeleteGoal,
} from '@/features/company-admin/api/use-performance-mutations';

// ============ TYPES ============

type GoalLevel = 'Company' | 'Department' | 'Individual';
type GoalStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';

interface GoalItem {
    id: string;
    cycleId: string;
    cycleName: string;
    level: GoalLevel;
    employeeName: string;
    departmentName: string;
    title: string;
    description: string;
    kpiMetric: string;
    targetValue: number;
    achievedValue: number;
    weightage: number;
    selfRating: number;
    managerRating: number;
    parentGoalId: string;
    status: GoalStatus;
}

// ============ CONSTANTS ============

const LEVELS: GoalLevel[] = ['Company', 'Department', 'Individual'];

const LEVEL_COLORS: Record<GoalLevel, { bg: string; text: string }> = {
    Company: { bg: colors.primary[50], text: colors.primary[700] },
    Department: { bg: colors.accent[50], text: colors.accent[700] },
    Individual: { bg: colors.info[50], text: colors.info[700] },
};

const STATUS_COLORS: Record<GoalStatus, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Active: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Completed: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    Cancelled: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

// ============ SHARED ATOMS ============

function LevelBadge({ level }: { level: GoalLevel }) {
    const c = LEVEL_COLORS[level];
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{level}</Text>
        </View>
    );
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
    const s = STATUS_COLORS[status];
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barColor = pct >= 100 ? colors.success[500] : pct >= 60 ? colors.primary[500] : pct >= 30 ? colors.warning[500] : colors.danger[500];
    return (
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
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

// ============ FILTER BAR ============

function FilterBar({
    selectedCycleId, onCycleChange, selectedLevel, onLevelChange, search, onSearchChange, cycleOptions,
}: {
    selectedCycleId: string; onCycleChange: (id: string) => void;
    selectedLevel: string; onLevelChange: (l: string) => void;
    search: string; onSearchChange: (s: string) => void;
    cycleOptions: { id: string; name: string }[];
}) {
    const [cycleModalVisible, setCycleModalVisible] = React.useState(false);
    const selectedCycleName = cycleOptions.find(c => c.id === selectedCycleId)?.name ?? 'All Cycles';

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Goals & OKRs</Text>

            {/* Cycle selector */}
            <Pressable onPress={() => setCycleModalVisible(true)} style={styles.dropdownBtn}>
                <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>{selectedCycleName}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={cycleModalVisible} transparent animationType="slide" onRequestClose={() => setCycleModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCycleModalVisible(false)} />
                    <View style={[styles.pickerSheet, { maxHeight: '50%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Cycle</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Pressable onPress={() => { onCycleChange(''); setCycleModalVisible(false); }}
                                style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: !selectedCycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                <Text className={`font-inter text-sm ${!selectedCycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>All Cycles</Text>
                            </Pressable>
                            {cycleOptions.map(c => (
                                <Pressable key={c.id} onPress={() => { onCycleChange(c.id); setCycleModalVisible(false); }}
                                    style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: c.id === selectedCycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                    <Text className={`font-inter text-sm ${c.id === selectedCycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{c.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Level chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {['All', ...LEVELS].map(l => {
                    const sel = l === selectedLevel;
                    return (
                        <Pressable key={l} onPress={() => onLevelChange(l)} style={[styles.chip, sel && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{l}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={onSearchChange} placeholder="Search goals or employees..." /></View>
        </Animated.View>
    );
}

// ============ FORM MODAL ============

interface GoalForm {
    cycleId: string;
    level: GoalLevel;
    employeeName: string;
    departmentName: string;
    title: string;
    description: string;
    kpiMetric: string;
    targetValue: string;
    weightage: string;
    parentGoalId: string;
}

const EMPTY_FORM: GoalForm = {
    cycleId: '', level: 'Individual', employeeName: '', departmentName: '',
    title: '', description: '', kpiMetric: '', targetValue: '', weightage: '', parentGoalId: '',
};

function GoalFormModal({
    visible, onClose, onSave, initialData, isSaving, cycleOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: GoalItem | null; isSaving: boolean;
    cycleOptions: { id: string; name: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<GoalForm>(EMPTY_FORM);
    const [cyclePickerVisible, setCyclePickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setForm({
                    cycleId: initialData.cycleId,
                    level: initialData.level,
                    employeeName: initialData.employeeName,
                    departmentName: initialData.departmentName,
                    title: initialData.title,
                    description: initialData.description,
                    kpiMetric: initialData.kpiMetric,
                    targetValue: String(initialData.targetValue),
                    weightage: String(initialData.weightage),
                    parentGoalId: initialData.parentGoalId,
                });
            } else {
                setForm(EMPTY_FORM);
            }
        }
    }, [visible, initialData]);

    const update = <K extends keyof GoalForm>(key: K, val: GoalForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const selectedCycleName = cycleOptions.find(c => c.id === form.cycleId)?.name ?? '';
    const isValid = form.title.trim() && form.cycleId;

    const handleSave = () => {
        if (!isValid) return;
        onSave({
            ...form,
            targetValue: Number(form.targetValue) || 0,
            weightage: Number(form.weightage) || 0,
        } as unknown as Record<string, unknown>);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Goal' : 'Add Goal'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {/* Cycle */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Cycle <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setCyclePickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${selectedCycleName ? 'font-semibold text-primary-950' : 'text-neutral-400'}`}>{selectedCycleName || 'Select cycle...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={cyclePickerVisible} transparent animationType="slide" onRequestClose={() => setCyclePickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCyclePickerVisible(false)} />
                                    <View style={[styles.pickerSheet, { maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Cycle</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {cycleOptions.map(c => (
                                                <Pressable key={c.id} onPress={() => { update('cycleId', c.id); setCyclePickerVisible(false); }}
                                                    style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: c.id === form.cycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                                    <Text className={`font-inter text-sm ${c.id === form.cycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{c.name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        <ChipSelector label="Level" options={LEVELS} value={form.level} onSelect={v => update('level', v as GoalLevel)} />

                        {form.level === 'Individual' && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Employee</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Search employee..." placeholderTextColor={colors.neutral[400]} value={form.employeeName} onChangeText={v => update('employeeName', v)} /></View>
                            </View>
                        )}
                        {form.level === 'Department' && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Department name..." placeholderTextColor={colors.neutral[400]} value={form.departmentName} onChangeText={v => update('departmentName', v)} /></View>
                            </View>
                        )}

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Title <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Goal title..." placeholderTextColor={colors.neutral[400]} value={form.title} onChangeText={v => update('title', v)} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}><TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Describe the goal..." placeholderTextColor={colors.neutral[400]} value={form.description} onChangeText={v => update('description', v)} multiline /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">KPI Metric</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Revenue in Lakhs"' placeholderTextColor={colors.neutral[400]} value={form.kpiMetric} onChangeText={v => update('kpiMetric', v)} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Target Value</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="100" placeholderTextColor={colors.neutral[400]} value={form.targetValue} onChangeText={v => update('targetValue', v)} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Weightage (%)</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="20" placeholderTextColor={colors.neutral[400]} value={form.weightage} onChangeText={v => update('weightage', v)} keyboardType="number-pad" /></View>
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Parent Goal ID (for cascade)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Optional parent goal ID" placeholderTextColor={colors.neutral[400]} value={form.parentGoalId} onChangeText={v => update('parentGoalId', v)} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Goal'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ GOAL CARD ============

function GoalCard({ item, index, onEdit, onDelete }: { item: GoalItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <LevelBadge level={item.level} />
                            <GoalStatusBadge status={item.status} />
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {item.level === 'Individual' && item.employeeName ? (
                    <Text className="mt-1 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <Text className="font-inter text-xs text-neutral-500">W: {item.weightage}%</Text>
                    <Text className="font-inter text-xs text-neutral-500">Target: {item.targetValue}</Text>
                    <Text className="font-inter text-xs font-semibold text-primary-600">Achieved: {item.achievedValue}</Text>
                </View>
                <View style={{ marginTop: 8 }}><ProgressBar value={item.achievedValue} max={item.targetValue} /></View>
                {(item.selfRating > 0 || item.managerRating > 0) && (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        {item.selfRating > 0 && <Text className="font-inter text-xs text-neutral-500">Self: {item.selfRating}</Text>}
                        {item.managerRating > 0 && <Text className="font-inter text-xs text-neutral-500">Manager: {item.managerRating}</Text>}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function GoalsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: cyclesResponse } = useAppraisalCycles();
    const cycleOptions = React.useMemo(() => {
        const raw = (cyclesResponse as any)?.data ?? cyclesResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' }));
    }, [cyclesResponse]);

    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const [selectedLevel, setSelectedLevel] = React.useState('All');
    const [search, setSearch] = React.useState('');

    const { data: response, isLoading, error, refetch, isFetching } = useGoals(
        selectedCycleId ? { cycleId: selectedCycleId } as any : undefined,
    );
    const createMutation = useCreateGoal();
    const updateMutation = useUpdateGoal();
    const deleteMutation = useDeleteGoal();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<GoalItem | null>(null);

    const goals: GoalItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            cycleId: item.cycleId ?? '',
            cycleName: item.cycleName ?? '',
            level: item.level ?? 'Individual',
            employeeName: item.employeeName ?? '',
            departmentName: item.departmentName ?? '',
            title: item.title ?? '',
            description: item.description ?? '',
            kpiMetric: item.kpiMetric ?? '',
            targetValue: item.targetValue ?? 0,
            achievedValue: item.achievedValue ?? 0,
            weightage: item.weightage ?? 0,
            selfRating: item.selfRating ?? 0,
            managerRating: item.managerRating ?? 0,
            parentGoalId: item.parentGoalId ?? '',
            status: item.status ?? 'Draft',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        let list = goals;
        if (selectedLevel !== 'All') list = list.filter(g => g.level === selectedLevel);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(g => g.title.toLowerCase().includes(q) || g.employeeName.toLowerCase().includes(q));
        }
        return list;
    }, [goals, selectedLevel, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: GoalItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: GoalItem) => {
        showConfirm({
            title: 'Delete Goal', message: `Delete "${item.title}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: GoalItem; index: number }) => (
        <GoalCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No goals match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No goals" message="Add your first goal to get started." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Goals & OKRs</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={() => (
                    <FilterBar selectedCycleId={selectedCycleId} onCycleChange={setSelectedCycleId}
                        selectedLevel={selectedLevel} onLevelChange={setSelectedLevel}
                        search={search} onSearchChange={setSearch} cycleOptions={cycleOptions} />
                )}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <GoalFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} cycleOptions={cycleOptions} />
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    progressTrack: { height: 4, backgroundColor: colors.neutral[200], borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
    },
    pickerSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
