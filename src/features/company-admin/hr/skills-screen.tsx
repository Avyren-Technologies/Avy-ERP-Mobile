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
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useSkills,
    useSkillMappings,
    useSkillGapAnalysis,
} from '@/features/company-admin/api/use-performance-queries';
import {
    useCreateSkill,
    useUpdateSkill,
    useDeleteSkill,
    useCreateSkillMapping,
    useUpdateSkillMapping,
    useDeleteSkillMapping,
} from '@/features/company-admin/api/use-performance-mutations';

// ============ TYPES ============

// Backend: category is a free-text String. Web uses: TECHNICAL, SOFT_SKILL, LEADERSHIP, DOMAIN, TOOL, LANGUAGE, OTHER
type SkillCategory = 'TECHNICAL' | 'SOFT_SKILL' | 'LEADERSHIP' | 'DOMAIN' | 'TOOL' | 'LANGUAGE' | 'OTHER';
// Backend: currentLevel/requiredLevel are Int (1-5)
type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

interface SkillItem {
    id: string;
    name: string;
    category: SkillCategory;
    description: string;
    isActive: boolean;
    mappingsCount: number;
}

interface SkillMappingItem {
    id: string;
    skillId: string;
    skillName: string;
    employeeId: string;
    employeeName: string;
    requiredLevel: ProficiencyLevel;
    currentLevel: ProficiencyLevel;
    gap: number;
    certifiedDate: string;
}

// ============ CONSTANTS ============

const CATEGORY_LABELS: Record<SkillCategory, string> = {
    TECHNICAL: 'Technical',
    SOFT_SKILL: 'Soft Skill',
    LEADERSHIP: 'Leadership',
    DOMAIN: 'Domain',
    TOOL: 'Tool / Software',
    LANGUAGE: 'Language',
    OTHER: 'Other',
};

const CATEGORIES: SkillCategory[] = ['TECHNICAL', 'SOFT_SKILL', 'LEADERSHIP', 'DOMAIN', 'TOOL', 'LANGUAGE', 'OTHER'];

const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
};

const PROFICIENCY_LEVELS: ProficiencyLevel[] = [1, 2, 3, 4, 5];

const CATEGORY_COLORS: Record<SkillCategory, { bg: string; text: string }> = {
    TECHNICAL: { bg: colors.primary[50], text: colors.primary[700] },
    SOFT_SKILL: { bg: colors.accent[50], text: colors.accent[700] },
    LEADERSHIP: { bg: colors.warning[50], text: colors.warning[700] },
    DOMAIN: { bg: colors.info[50], text: colors.info[700] },
    TOOL: { bg: colors.success[50], text: colors.success[700] },
    LANGUAGE: { bg: colors.neutral[100], text: colors.neutral[700] },
    OTHER: { bg: colors.neutral[100], text: colors.neutral[700] },
};

const PROFICIENCY_COLORS: Record<ProficiencyLevel, string> = {
    1: colors.danger[500],
    2: colors.info[500],
    3: colors.warning[500],
    4: colors.primary[500],
    5: colors.success[500],
};

// ============ SHARED ATOMS ============

function CategoryBadge({ category }: { category: SkillCategory }) {
    const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{CATEGORY_LABELS[category] ?? category}</Text>
        </View>
    );
}

function ProficiencyBadge({ level }: { level: ProficiencyLevel }) {
    const color = PROFICIENCY_COLORS[level] ?? colors.neutral[500];
    return (
        <View style={[styles.badge, { backgroundColor: color + '15' }]}>
            <Text style={{ color, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{level} - {PROFICIENCY_LABELS[level] ?? 'Unknown'}</Text>
        </View>
    );
}

function ProficiencyBar({ current, required }: { current: ProficiencyLevel; required: ProficiencyLevel }) {
    const curVal = typeof current === 'number' ? current : 1;
    const reqVal = typeof required === 'number' ? required : 1;
    const curPct = (curVal / 5) * 100;
    const reqPct = (reqVal / 5) * 100;
    const gap = reqVal - curVal;
    const barColor = gap <= 0 ? colors.success[500] : gap === 1 ? colors.warning[500] : colors.danger[500];

    return (
        <View style={{ marginTop: 6 }}>
            <View style={styles.profTrack}>
                <View style={[styles.profFill, { width: `${curPct}%`, backgroundColor: barColor }]} />
                <View style={[styles.profTarget, { left: `${reqPct}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text className="font-inter text-[10px] text-neutral-400">Current: {PROFICIENCY_LABELS[current] ?? current}</Text>
                <Text className="font-inter text-[10px] text-neutral-400">Required: {PROFICIENCY_LABELS[required] ?? required}</Text>
            </View>
        </View>
    );
}

// ============ SKILL FORM MODAL ============

interface SkillForm {
    name: string;
    category: SkillCategory;
    description: string;
}

const EMPTY_SKILL_FORM: SkillForm = { name: '', category: 'TECHNICAL', description: '' };

function SkillFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: SkillItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<SkillForm>(EMPTY_SKILL_FORM);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setForm({ name: initialData.name, category: initialData.category, description: initialData.description });
            } else {
                setForm(EMPTY_SKILL_FORM);
            }
        }
    }, [visible, initialData]);

    const update = <K extends keyof SkillForm>(key: K, val: SkillForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const isValid = form.name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.sheetModal, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 100 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Skill' : 'Add Skill'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Skill Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. React Native" placeholderTextColor={colors.neutral[400]} value={form.name} onChangeText={v => update('name', v)} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Category</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {CATEGORIES.map(cat => {
                                    const sel = cat === form.category;
                                    return (
                                        <Pressable key={cat} onPress={() => update('category', cat)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{CATEGORY_LABELS[cat]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Skill description..." placeholderTextColor={colors.neutral[400]} value={form.description} onChangeText={v => update('description', v)} multiline />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => isValid && onSave({ ...form })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Skill'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MAPPING FORM MODAL ============

interface MappingForm {
    skillId: string;
    employeeName: string;
    requiredLevel: ProficiencyLevel;
    currentLevel: ProficiencyLevel;
}

const EMPTY_MAPPING_FORM: MappingForm = { skillId: '', employeeName: '', requiredLevel: 3, currentLevel: 1 };

function MappingFormModal({
    visible, onClose, onSave, isSaving, skillOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    isSaving: boolean;
    skillOptions: { id: string; name: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<MappingForm>(EMPTY_MAPPING_FORM);
    const [skillPickerVisible, setSkillPickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) setForm(EMPTY_MAPPING_FORM);
    }, [visible]);

    const update = <K extends keyof MappingForm>(key: K, val: MappingForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const selectedSkillName = skillOptions.find(s => s.id === form.skillId)?.name ?? '';
    const isValid = form.skillId && form.employeeName.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.sheetModal, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 80 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">Map Skill</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {/* Skill picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Skill <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setSkillPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${selectedSkillName ? 'font-semibold text-primary-950' : 'text-neutral-400'}`}>{selectedSkillName || 'Select skill...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={skillPickerVisible} transparent animationType="slide" onRequestClose={() => setSkillPickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSkillPickerVisible(false)} />
                                    <View style={[styles.pickerSheet, { maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Skill</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {skillOptions.map(s => (
                                                <Pressable key={s.id} onPress={() => { update('skillId', s.id); setSkillPickerVisible(false); }}
                                                    style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: s.id === form.skillId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                                    <Text className={`font-inter text-sm ${s.id === form.skillId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{s.name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Employee <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Employee name..." placeholderTextColor={colors.neutral[400]} value={form.employeeName} onChangeText={v => update('employeeName', v)} /></View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Required Level</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {PROFICIENCY_LEVELS.map(l => {
                                    const sel = l === form.requiredLevel;
                                    return (
                                        <Pressable key={String(l)} onPress={() => update('requiredLevel', l)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{l} - {PROFICIENCY_LABELS[l]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Current Level</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {PROFICIENCY_LEVELS.map(l => {
                                    const sel = l === form.currentLevel;
                                    return (
                                        <Pressable key={String(l)} onPress={() => update('currentLevel', l)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{l} - {PROFICIENCY_LABELS[l]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => isValid && onSave({ ...form })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Map Skill'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SKILL CARD ============

function SkillCard({ item, index, onEdit, onDelete }: { item: SkillItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                        {item.description ? <Text className="mt-1 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.description}</Text> : null}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <CategoryBadge category={item.category} />
                    <Text className="font-inter text-xs text-neutral-500">{item.mappingsCount} mapping{item.mappingsCount !== 1 ? 's' : ''}</Text>
                    {!item.isActive && (
                        <View style={[styles.badge, { backgroundColor: colors.danger[50] }]}>
                            <Text style={{ color: colors.danger[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Inactive</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAPPING CARD ============

function MappingCard({ item, index, onDelete }: { item: SkillMappingItem; index: number; onDelete: () => void }) {
    const gapColor = item.gap <= 0 ? colors.success[600] : item.gap === 1 ? colors.warning[600] : colors.danger[600];
    const gapLabel = item.gap <= 0 ? 'Met' : `Gap: ${item.gap}`;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.skillName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.badge, { backgroundColor: gapColor + '15' }]}>
                            <Text style={{ color: gapColor, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{gapLabel}</Text>
                        </View>
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    </View>
                </View>
                <ProficiencyBar current={item.currentLevel} required={item.requiredLevel} />
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

type TabKey = 'library' | 'mappings';

export function SkillsScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<TabKey>('library');
    const [search, setSearch] = React.useState('');
    const [skillFormVisible, setSkillFormVisible] = React.useState(false);
    const [editingSkill, setEditingSkill] = React.useState<SkillItem | null>(null);
    const [mappingFormVisible, setMappingFormVisible] = React.useState(false);

    // Skills
    const { data: skillsResponse, isLoading: skillsLoading, error: skillsError, refetch: refetchSkills, isFetching: skillsFetching } = useSkills();
    const createSkillMut = useCreateSkill();
    const updateSkillMut = useUpdateSkill();
    const deleteSkillMut = useDeleteSkill();

    // Mappings
    const { data: mappingsResponse, isLoading: mappingsLoading, error: mappingsError, refetch: refetchMappings, isFetching: mappingsFetching } = useSkillMappings();
    const createMappingMut = useCreateSkillMapping();
    const deleteMappingMut = useDeleteSkillMapping();

    const skills: SkillItem[] = React.useMemo(() => {
        const raw = (skillsResponse as any)?.data ?? skillsResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            category: item.category ?? 'OTHER',
            description: item.description ?? '',
            isActive: item.isActive ?? true,
            mappingsCount: item.mappingsCount ?? item._count?.mappings ?? 0,
        }));
    }, [skillsResponse]);

    const mappings: SkillMappingItem[] = React.useMemo(() => {
        const raw = (mappingsResponse as any)?.data ?? mappingsResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            skillId: item.skillId ?? '',
            skillName: item.skillName ?? item.skill?.name ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? item.employee?.name ?? '',
            requiredLevel: item.requiredLevel ?? 3,
            currentLevel: item.currentLevel ?? 1,
            gap: item.gap ?? (item.requiredLevel ?? 3) - (item.currentLevel ?? 1),
            certifiedDate: item.certifiedDate ?? '',
        }));
    }, [mappingsResponse]);

    const skillOptions = React.useMemo(() => skills.map(s => ({ id: s.id, name: s.name })), [skills]);

    const filteredSkills = React.useMemo(() => {
        if (!search.trim()) return skills;
        const q = search.toLowerCase();
        return skills.filter(s => s.name.toLowerCase().includes(q) || (CATEGORY_LABELS[s.category] ?? s.category).toLowerCase().includes(q));
    }, [skills, search]);

    const filteredMappings = React.useMemo(() => {
        if (!search.trim()) return mappings;
        const q = search.toLowerCase();
        return mappings.filter(m => m.employeeName.toLowerCase().includes(q) || m.skillName.toLowerCase().includes(q));
    }, [mappings, search]);

    // Gap summary stats
    const gapStats = React.useMemo(() => {
        if (mappings.length === 0) return null;
        const met = mappings.filter(m => m.gap <= 0).length;
        const gaps = mappings.filter(m => m.gap > 0);
        const avgGap = gaps.length > 0 ? gaps.reduce((s, m) => s + m.gap, 0) / gaps.length : 0;
        return { total: mappings.length, met, gaps: gaps.length, avgGap };
    }, [mappings]);

    const isLoading = activeTab === 'library' ? skillsLoading : mappingsLoading;
    const hasError = activeTab === 'library' ? skillsError : mappingsError;
    const isFetching = activeTab === 'library' ? skillsFetching : mappingsFetching;
    const refetch = activeTab === 'library' ? refetchSkills : refetchMappings;

    const handleAddSkill = () => { setEditingSkill(null); setSkillFormVisible(true); };
    const handleEditSkill = (item: SkillItem) => { setEditingSkill(item); setSkillFormVisible(true); };

    const handleDeleteSkill = (item: SkillItem) => {
        showConfirm({ title: 'Delete Skill', message: `Delete "${item.name}"?`, confirmText: 'Delete', variant: 'danger', onConfirm: () => deleteSkillMut.mutate(item.id) });
    };

    const handleDeleteMapping = (item: SkillMappingItem) => {
        showConfirm({ title: 'Remove Mapping', message: `Remove ${item.skillName} mapping for ${item.employeeName}?`, confirmText: 'Remove', variant: 'danger', onConfirm: () => deleteMappingMut.mutate(item.id) });
    };

    const handleSaveSkill = (data: Record<string, unknown>) => {
        if (editingSkill) {
            updateSkillMut.mutate({ id: editingSkill.id, data }, { onSuccess: () => setSkillFormVisible(false) });
        } else {
            createSkillMut.mutate(data, { onSuccess: () => setSkillFormVisible(false) });
        }
    };

    const handleSaveMapping = (data: Record<string, unknown>) => {
        createMappingMut.mutate(data, { onSuccess: () => setMappingFormVisible(false) });
    };

    const renderSkillItem = ({ item, index }: { item: SkillItem; index: number }) => (
        <SkillCard item={item} index={index} onEdit={() => handleEditSkill(item)} onDelete={() => handleDeleteSkill(item)} />
    );

    const renderMappingItem = ({ item, index }: { item: SkillMappingItem; index: number }) => (
        <MappingCard item={item} index={index} onDelete={() => handleDeleteMapping(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Skills & Mapping</Text>

            {/* Tab switch */}
            <View style={styles.tabBar}>
                <Pressable onPress={() => { setActiveTab('library'); setSearch(''); }} style={[styles.tab, activeTab === 'library' && styles.tabActive]}>
                    <Text className={`font-inter text-sm font-semibold ${activeTab === 'library' ? 'text-white' : 'text-neutral-600'}`}>Skill Library</Text>
                </Pressable>
                <Pressable onPress={() => { setActiveTab('mappings'); setSearch(''); }} style={[styles.tab, activeTab === 'mappings' && styles.tabActive]}>
                    <Text className={`font-inter text-sm font-semibold ${activeTab === 'mappings' ? 'text-white' : 'text-neutral-600'}`}>Mappings</Text>
                </Pressable>
            </View>

            {/* Gap analysis summary */}
            {activeTab === 'mappings' && gapStats && (
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-primary-600">{gapStats.total}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Total</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-success-600">{gapStats.met}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Met</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-danger-600">{gapStats.gaps}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Gaps</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-warning-600">{gapStats.avgGap.toFixed(1)}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Avg Gap</Text>
                    </View>
                </View>
            )}

            <View style={{ marginTop: 12 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder={activeTab === 'library' ? 'Search skills...' : 'Search mappings...'} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (hasError) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No results for "${search}".`} /></View>;
        if (activeTab === 'library') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No skills" message="Add your first skill to the library." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No mappings" message="Map skills to employees to start tracking." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRowTop}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">Skills & Mapping</Text>
                </View>
            </LinearGradient>
            {activeTab === 'library' ? (
                <FlatList
                    data={filteredSkills}
                    renderItem={renderSkillItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            ) : (
                <FlatList
                    data={filteredMappings}
                    renderItem={renderMappingItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            )}
            <FAB onPress={activeTab === 'library' ? handleAddSkill : () => setMappingFormVisible(true)} />
            <SkillFormModal visible={skillFormVisible} onClose={() => setSkillFormVisible(false)} onSave={handleSaveSkill} initialData={editingSkill} isSaving={createSkillMut.isPending || updateSkillMut.isPending} />
            <MappingFormModal visible={mappingFormVisible} onClose={() => setMappingFormVisible(false)} onSave={handleSaveMapping} isSaving={createMappingMut.isPending} skillOptions={skillOptions} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    gradientHeader: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRowTop: { flexDirection: 'row', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tabBar: { flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: colors.neutral[100], borderRadius: 14, padding: 4 },
    tab: { flex: 1, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary[600] },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.primary[50] },
    profTrack: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden', position: 'relative' },
    profFill: { height: '100%', borderRadius: 3 },
    profTarget: { position: 'absolute', top: -2, width: 2, height: 10, backgroundColor: colors.primary[900], borderRadius: 1 },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6,
    },
    pickerSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    sheetModal: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
