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
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useDesignations, useEmployeeTypes, useGrades } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateSalaryStructure,
    useDeleteSalaryStructure,
    useUpdateSalaryStructure,
} from '@/features/company-admin/api/use-payroll-mutations';
import { useSalaryComponents, useSalaryStructures } from '@/features/company-admin/api/use-payroll-queries';

// ============ TYPES ============

type CTCBasis = 'CTC' | 'Take Home';
type CalcMethod = 'Fixed' | '% of Basic' | '% of Gross' | 'Formula';

interface StructureComponent {
    componentId: string;
    componentName: string;
    calculationMethod: CalcMethod;
    value: number;
    formula: string;
}

interface SalaryStructureItem {
    id: string;
    name: string;
    code: string;
    ctcBasis: CTCBasis;
    applicableGrades: string[];
    applicableDesignations: string[];
    applicableEmployeeTypes: string[];
    components: StructureComponent[];
}

// ============ CONSTANTS ============

const CTC_OPTIONS: CTCBasis[] = ['CTC', 'Take Home'];
const CALC_METHODS: CalcMethod[] = ['Fixed', '% of Basic', '% of Gross', 'Formula'];

// ============ SHARED ATOMS ============

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

function MultiChipSelector({ label, options, value, onToggle }: { label: string; options: { id: string; label: string }[]; value: string[]; onToggle: (id: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = value.includes(opt.id);
                    return (
                        <Pressable key={opt.id} onPress={() => onToggle(opt.id)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function Dropdown({ label, value, options, onSelect, placeholder }: { label: string; value: string; options: { id: string; label: string }[]; onSelect: (id: string) => void; placeholder?: string }) {
    const [open, setOpen] = React.useState(false);
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
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
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

// ============ FORM (full screen) ============

function SalaryStructureForm({
    visible, onClose, onSave, initialData, isSaving, gradeOptions, designationOptions, employeeTypeOptions, componentOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<SalaryStructureItem, 'id'>) => void;
    initialData?: SalaryStructureItem | null; isSaving: boolean;
    gradeOptions: { id: string; label: string }[];
    designationOptions: { id: string; label: string }[];
    employeeTypeOptions: { id: string; label: string }[];
    componentOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [ctcBasis, setCtcBasis] = React.useState<CTCBasis>('CTC');
    const [grades, setGrades] = React.useState<string[]>([]);
    const [designations, setDesignations] = React.useState<string[]>([]);
    const [empTypes, setEmpTypes] = React.useState<string[]>([]);
    const [components, setComponents] = React.useState<StructureComponent[]>([]);
    const [sampleCTC, setSampleCTC] = React.useState('1000000');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setCode(initialData.code);
                setCtcBasis(initialData.ctcBasis);
                setGrades(initialData.applicableGrades);
                setDesignations(initialData.applicableDesignations);
                setEmpTypes(initialData.applicableEmployeeTypes);
                setComponents(initialData.components);
            } else {
                setName(''); setCode(''); setCtcBasis('CTC');
                setGrades([]); setDesignations([]); setEmpTypes([]);
                setComponents([]);
            }
        }
    }, [visible, initialData]);

    const toggleArray = (arr: string[], setArr: (v: string[]) => void, id: string) => {
        setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
    };

    const addComponent = () => {
        setComponents(prev => [...prev, { componentId: '', componentName: '', calculationMethod: 'Fixed', value: 0, formula: '' }]);
    };

    const updateComponent = (index: number, updates: Partial<StructureComponent>) => {
        setComponents(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const removeComponent = (index: number) => {
        setComponents(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name.trim() || !code.trim()) return;
        onSave({
            name: name.trim(), code: code.trim().toUpperCase(), ctcBasis,
            applicableGrades: grades, applicableDesignations: designations,
            applicableEmployeeTypes: empTypes, components,
        });
    };

    const isValid = name.trim() && code.trim();

    // Preview calculation
    const ctcNum = Number(sampleCTC) || 0;
    const monthlyGross = Math.round(ctcNum / 12);
    const previewRows = React.useMemo(() => {
        return components.filter(c => c.componentId).map(c => {
            let monthly = 0;
            if (c.calculationMethod === 'Fixed') {
                monthly = c.value;
            } else if (c.calculationMethod === '% of Basic') {
                const basicComp = components.find(cc => cc.componentName?.toLowerCase().includes('basic'));
                const basicVal = basicComp?.calculationMethod === 'Fixed' ? basicComp.value : Math.round(monthlyGross * 0.4);
                monthly = Math.round(basicVal * (c.value / 100));
            } else if (c.calculationMethod === '% of Gross') {
                monthly = Math.round(monthlyGross * (c.value / 100));
            }
            return { name: c.componentName || componentOptions.find(o => o.id === c.componentId)?.label || 'Component', monthly };
        });
    }, [components, monthlyGross, componentOptions]);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={onClose} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                        {initialData ? 'Edit Structure' : 'Add Structure'}
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
                    {/* Basic */}
                    <Text className="mb-2 mt-2 font-inter text-xs font-bold text-neutral-500">Basic Information</Text>
                    <View style={styles.sectionCard}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Standard CTC"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "STD-CTC"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={setCode} autoCapitalize="characters" /></View>
                        </View>
                        <ChipSelector label="CTC Basis" options={CTC_OPTIONS} value={ctcBasis} onSelect={v => setCtcBasis(v as CTCBasis)} />
                    </View>

                    {/* Applicability */}
                    <Text className="mb-2 mt-4 font-inter text-xs font-bold text-neutral-500">Applicability</Text>
                    <View style={styles.sectionCard}>
                        {gradeOptions.length > 0 && <MultiChipSelector label="Grades" options={gradeOptions} value={grades} onToggle={id => toggleArray(grades, setGrades, id)} />}
                        {designationOptions.length > 0 && <MultiChipSelector label="Designations" options={designationOptions} value={designations} onToggle={id => toggleArray(designations, setDesignations, id)} />}
                        {employeeTypeOptions.length > 0 && <MultiChipSelector label="Employee Types" options={employeeTypeOptions} value={empTypes} onToggle={id => toggleArray(empTypes, setEmpTypes, id)} />}
                    </View>

                    {/* Components */}
                    <Text className="mb-2 mt-4 font-inter text-xs font-bold text-neutral-500">Components</Text>
                    {components.map((comp, idx) => (
                        <View key={idx} style={styles.sectionCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text className="font-inter text-xs font-bold text-primary-800">Component {idx + 1}</Text>
                                <Pressable onPress={() => removeComponent(idx)} hitSlop={8}>
                                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                </Pressable>
                            </View>
                            <Dropdown label="Salary Component" value={comp.componentId}
                                options={componentOptions}
                                onSelect={id => {
                                    const found = componentOptions.find(o => o.id === id);
                                    updateComponent(idx, { componentId: id, componentName: found?.label ?? '' });
                                }}
                                placeholder="Select component..."
                            />
                            <ChipSelector label="Calculation" options={CALC_METHODS} value={comp.calculationMethod} onSelect={v => updateComponent(idx, { calculationMethod: v as CalcMethod })} />
                            {comp.calculationMethod !== 'Formula' ? (
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                        {comp.calculationMethod === 'Fixed' ? 'Amount' : 'Percentage (%)'}
                                    </Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={comp.value ? String(comp.value) : ''} onChangeText={v => updateComponent(idx, { value: Number(v) || 0 })} keyboardType="decimal-pad" /></View>
                                </View>
                            ) : (
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Formula</Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "BASIC * 0.12"' placeholderTextColor={colors.neutral[400]} value={comp.formula} onChangeText={v => updateComponent(idx, { formula: v })} /></View>
                                </View>
                            )}
                        </View>
                    ))}
                    <Pressable onPress={addComponent} style={styles.addBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                        <Text className="ml-2 font-inter text-sm font-semibold text-primary-600">Add Component</Text>
                    </Pressable>

                    {/* Preview */}
                    {components.length > 0 && (
                        <>
                            <Text className="mb-2 mt-4 font-inter text-xs font-bold text-neutral-500">Monthly Breakup Preview</Text>
                            <View style={styles.sectionCard}>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Sample Annual CTC</Text>
                                    <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                        <Text className="mr-1 font-inter text-sm text-neutral-500">&#8377;</Text>
                                        <TextInput style={[styles.textInput, { flex: 1 }]} value={sampleCTC} onChangeText={setSampleCTC} keyboardType="number-pad" placeholder="1000000" placeholderTextColor={colors.neutral[400]} />
                                    </View>
                                </View>
                                {previewRows.map((row, idx) => (
                                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                        <Text className="font-inter text-xs text-neutral-600">{row.name}</Text>
                                        <Text className="font-inter text-xs font-semibold text-primary-950">&#8377;{row.monthly.toLocaleString('en-IN')}</Text>
                                    </View>
                                ))}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
                                    <Text className="font-inter text-xs font-bold text-primary-800">Monthly Gross</Text>
                                    <Text className="font-inter text-xs font-bold text-primary-800">&#8377;{monthlyGross.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* Save bar */}
                <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                    <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtnFull, (!isValid || isSaving) && { opacity: 0.5 }]}>
                        <Text className="font-inter text-base font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update Structure' : 'Create Structure'}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD ============

function SalaryStructureCard({ item, index, onEdit, onDelete }: { item: SalaryStructureItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <View style={[styles.ctcBadge, { backgroundColor: item.ctcBasis === 'CTC' ? colors.info[50] : colors.accent[50] }]}>
                                <Text style={{ color: item.ctcBasis === 'CTC' ? colors.info[700] : colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.ctcBasis}</Text>
                            </View>
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            {item.components.length} component{item.components.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {(item.applicableGrades.length > 0 || item.applicableDesignations.length > 0) && (
                    <View style={styles.cardMeta}>
                        {item.applicableGrades.map(g => (
                            <View key={g} style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{g}</Text></View>
                        ))}
                        {item.applicableDesignations.map(d => (
                            <View key={d} style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{d}</Text></View>
                        ))}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function SalaryStructureScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useSalaryStructures();
    const createMutation = useCreateSalaryStructure();
    const updateMutation = useUpdateSalaryStructure();
    const deleteMutation = useDeleteSalaryStructure();

    const { data: gradeResponse } = useGrades();
    const { data: desigResponse } = useDesignations();
    const { data: empTypeResponse } = useEmployeeTypes();
    const { data: compResponse } = useSalaryComponents();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<SalaryStructureItem | null>(null);
    const [search, setSearch] = React.useState('');

    const toOptions = (res: any) => {
        const raw = (res as any)?.data ?? res ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    };

    const gradeOptions = React.useMemo(() => toOptions(gradeResponse), [gradeResponse]);
    const designationOptions = React.useMemo(() => toOptions(desigResponse), [desigResponse]);
    const employeeTypeOptions = React.useMemo(() => toOptions(empTypeResponse), [empTypeResponse]);
    const componentOptions = React.useMemo(() => toOptions(compResponse), [compResponse]);

    const items: SalaryStructureItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            code: item.code ?? '',
            ctcBasis: item.ctcBasis ?? 'CTC',
            applicableGrades: item.applicableGrades ?? [],
            applicableDesignations: item.applicableDesignations ?? [],
            applicableEmployeeTypes: item.applicableEmployeeTypes ?? [],
            components: (item.components ?? []).map((c: any) => ({
                componentId: c.componentId ?? '',
                componentName: c.componentName ?? '',
                calculationMethod: c.calculationMethod ?? 'Fixed',
                value: c.value ?? 0,
                formula: c.formula ?? '',
            })),
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    }, [items, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: SalaryStructureItem) => { setEditingItem(item); setFormVisible(true); };
    const handleDelete = (item: SalaryStructureItem) => {
        showConfirm({
            title: 'Delete Structure',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };
    const handleSave = (data: Omit<SalaryStructureItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: SalaryStructureItem; index: number }) => (
        <SalaryStructureCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Salary Structures</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} structure{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load structures" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No structures match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No salary structures yet" message="Add your first salary structure to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Salary Structures" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <SalaryStructureForm visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem}
                isSaving={createMutation.isPending || updateMutation.isPending}
                gradeOptions={gradeOptions} designationOptions={designationOptions}
                employeeTypeOptions={employeeTypeOptions} componentOptions={componentOptions}
            />
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
    scrollContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    ctcBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', marginBottom: 12,
    },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveBtnFull: {
        height: 56, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
});
