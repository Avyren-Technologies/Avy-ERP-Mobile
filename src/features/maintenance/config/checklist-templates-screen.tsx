/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    Modal as RNModal,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { checklistTemplatesHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateChecklistTemplate,
    useDeleteChecklistTemplate,
    useUpdateChecklistTemplate,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
    useChecklistTemplates,
} from '@/features/maintenance/api/use-maintenance-queries';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';
import { useIsDark } from '@/hooks/use-is-dark';

// ─── Constants ──────────────────────────────────────────────────────────────

const FIELD_TYPES = [
    { value: 'YES_NO', label: 'Yes / No' },
    { value: 'PASS_FAIL', label: 'Pass / Fail' },
    { value: 'NUMERIC', label: 'Numeric' },
    { value: 'TEXT', label: 'Text' },
    { value: 'PHOTO', label: 'Photo' },
    { value: 'SIGNATURE', label: 'Signature' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'DATE_TIME', label: 'Date & Time' },
    { value: 'BARCODE_SCAN', label: 'Barcode Scan' },
    { value: 'RISK_RATING', label: 'Risk Rating' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface FieldForm {
    label: string;
    fieldType: string;
    isMandatory: boolean;
    config: string;
}

interface SectionForm {
    name: string;
    isMandatory: boolean;
    passThreshold: string;
    description: string;
    fields: FieldForm[];
    collapsed: boolean;
}

function newField(): FieldForm {
    return { label: '', fieldType: 'YES_NO', isMandatory: false, config: '' };
}

function newSection(): SectionForm {
    return { name: '', isMandatory: false, passThreshold: '', description: '', fields: [newField()], collapsed: false };
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
    item,
    index,
    isDark,
    onEdit,
    onDelete,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isActive = item.isActive !== false;
    const sectionCount = item.sections?.length ?? item._count?.sections ?? 0;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onEdit}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description ? (
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2} style={{ marginTop: 2 }}>
                                {item.description}
                            </Text>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {/* Edit */}
                        <Pressable onPress={onEdit} style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]} hitSlop={8}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        {/* Delete */}
                        <Pressable onPress={onDelete} style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]} hitSlop={8}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                </View>

                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.info[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {item.version ? (
                        <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">v{item.version}</Text>
                        </View>
                    ) : null}
                    <View style={[cardStyles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
                        <View style={[cardStyles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
                        <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ─── Field Type Picker ────────────────────────────────────────────────────────

function FieldTypePicker({
    value,
    onChange,
    isDark,
}: {
    value: string;
    onChange: (v: string) => void;
    isDark: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const label = FIELD_TYPES.find((t) => t.value === value)?.label ?? value;

    return (
        <View>
            <Pressable
                onPress={() => setOpen(!open)}
                style={[
                    pickerStyles.trigger,
                    {
                        backgroundColor: isDark ? '#0F0D1A' : colors.white,
                        borderColor: open ? colors.primary[400] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                    },
                ]}
            >
                <Text className="font-inter text-[11px] text-primary-950 dark:text-white" numberOfLines={1}>{label}</Text>
                <Svg width={10} height={10} viewBox="0 0 24 24">
                    <Path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {open && (
                <View style={[pickerStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {FIELD_TYPES.map((t, idx) => (
                            <Pressable
                                key={t.value}
                                onPress={() => { onChange(t.value); setOpen(false); }}
                                style={[
                                    pickerStyles.item,
                                    { borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                    idx > 0 && { borderTopWidth: 1 },
                                    t.value === value && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                ]}
                            >
                                <Text className={`font-inter text-xs ${t.value === value ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}>
                                    {t.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

// ─── Builder Sheet ────────────────────────────────────────────────────────────

function BuilderSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
    isDark,
    editingId,
    initialName,
    initialDescription,
    initialSections,
    initialIsActive,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string; sections: SectionForm[]; isActive: boolean }) => void;
    isSubmitting: boolean;
    isDark: boolean;
    editingId: string | null;
    initialName: string;
    initialDescription: string;
    initialSections: SectionForm[];
    initialIsActive: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState(initialName);
    const [description, setDescription] = React.useState(initialDescription);
    const [sections, setSections] = React.useState<SectionForm[]>(initialSections.length > 0 ? initialSections : [newSection()]);
    const [isActive, setIsActive] = React.useState(initialIsActive);

    React.useEffect(() => {
        if (visible) {
            setName(initialName);
            setDescription(initialDescription);
            setSections(initialSections.length > 0 ? initialSections : [newSection()]);
            setIsActive(initialIsActive);
        }
    }, [visible, initialName, initialDescription, initialSections, initialIsActive]);

    // ── Section helpers
    const addSection = () => setSections((s) => [...s, newSection()]);

    const updateSection = (idx: number, updates: Partial<SectionForm>) =>
        setSections((s) => s.map((sec, i) => (i === idx ? { ...sec, ...updates } : sec)));

    const removeSection = (idx: number) => {
        if (sections.length <= 1) { showErrorMessage('At least one section is required'); return; }
        setSections((s) => s.filter((_, i) => i !== idx));
    };

    // ── Field helpers
    const addField = (sIdx: number) =>
        setSections((s) => s.map((sec, i) => (i === sIdx ? { ...sec, fields: [...sec.fields, newField()] } : sec)));

    const updateField = (sIdx: number, fIdx: number, updates: Partial<FieldForm>) =>
        setSections((s) =>
            s.map((sec, i) =>
                i === sIdx
                    ? { ...sec, fields: sec.fields.map((f, j) => (j === fIdx ? { ...f, ...updates } : f)) }
                    : sec
            )
        );

    const removeField = (sIdx: number, fIdx: number) =>
        setSections((s) =>
            s.map((sec, i) => {
                if (i !== sIdx) return sec;
                if (sec.fields.length <= 1) { showErrorMessage('At least one field per section'); return sec; }
                return { ...sec, fields: sec.fields.filter((_, j) => j !== fIdx) };
            })
        );

    // ── Submit
    const handleSubmit = () => {
        if (!name.trim()) { showErrorMessage('Template name is required'); return; }
        for (const sec of sections) {
            if (!sec.name.trim()) { showErrorMessage('All sections must have a name'); return; }
            for (const f of sec.fields) {
                if (!f.label.trim()) { showErrorMessage('All fields must have a label'); return; }
            }
        }
        onSubmit({ name, description, sections, isActive });
    };

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[builderStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>

                    {/* Header */}
                    <View style={[builderStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose} hitSlop={12} style={builderStyles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
                            {editingId ? 'Edit Template' : 'New Template'}
                        </Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── Template Info ── */}
                        <View style={builderStyles.section}>
                            <Text className="mb-3 font-inter text-[10px] font-bold uppercase tracking-widest text-neutral-400">Template Info</Text>

                            <View style={builderStyles.field}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Name <Text className="text-danger-500">*</Text>
                                </Text>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. Monthly Pump Inspection"
                                    placeholderTextColor={colors.neutral[400]}
                                    style={[builderStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                />
                            </View>

                            <View style={builderStyles.field}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Optional description"
                                    placeholderTextColor={colors.neutral[400]}
                                    multiline
                                    numberOfLines={2}
                                    style={[builderStyles.input, { height: 64, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                />
                            </View>

                            {/* isActive — shown for both create and edit */}
                            <View style={[builderStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Active</Text>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
                                    thumbColor={colors.white}
                                />
                            </View>
                        </View>

                        {/* ── Sections ── */}
                        <View style={{ marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-widest text-neutral-400">Sections</Text>
                                <Pressable onPress={addSection} hitSlop={8}>
                                    <Text className="font-inter text-xs font-bold text-primary-600">+ Add Section</Text>
                                </Pressable>
                            </View>

                            {sections.map((sec, si) => (
                                <View key={si} style={[sectionStyles.card, { backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50], borderColor: isDark ? colors.neutral[800] : colors.neutral[200] }]}>
                                    {/* Section header row */}
                                    <View style={sectionStyles.headerRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="mb-1.5 font-inter text-[11px] font-bold text-primary-900 dark:text-primary-100">
                                                Section Name <Text className="text-danger-500">*</Text>
                                            </Text>
                                            <View style={[sectionStyles.sectionNameBox, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[700] : colors.primary[200] }]}>
                                                <TextInput
                                                    value={sec.name}
                                                    onChangeText={(v) => updateSection(si, { name: v })}
                                                    placeholder="Enter section name"
                                                    placeholderTextColor={colors.neutral[400]}
                                                    style={[sectionStyles.sectionNameInput, { color: isDark ? colors.white : colors.primary[950] }]}
                                                />
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 22 }}>
                                            {/* Collapse toggle */}
                                            <Pressable onPress={() => updateSection(si, { collapsed: !sec.collapsed })} hitSlop={8}>
                                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                                    <Path d={sec.collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </Pressable>
                                            {/* Remove section */}
                                            <Pressable onPress={() => removeSection(si)} hitSlop={8}>
                                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                                    <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </Pressable>
                                        </View>
                                    </View>

                                    {/* Section meta: Required + Pass % */}
                                    <View style={sectionStyles.metaRow}>
                                        <Pressable onPress={() => updateSection(si, { isMandatory: !sec.isMandatory })} style={sectionStyles.checkRow}>
                                            <View style={[sectionStyles.checkbox, { backgroundColor: sec.isMandatory ? colors.primary[600] : 'transparent', borderColor: sec.isMandatory ? colors.primary[600] : colors.neutral[300] }]}>
                                                {sec.isMandatory && (
                                                    <Svg width={10} height={10} viewBox="0 0 24 24">
                                                        <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    </Svg>
                                                )}
                                            </View>
                                            <Text className="font-inter text-[11px] text-neutral-500">Required</Text>
                                        </Pressable>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text className="font-inter text-[11px] font-semibold text-neutral-500">Pass %</Text>
                                            <TextInput
                                                value={sec.passThreshold}
                                                onChangeText={(v) => updateSection(si, { passThreshold: v })}
                                                placeholder="0-100"
                                                placeholderTextColor={colors.neutral[400]}
                                                keyboardType="numeric"
                                                maxLength={3}
                                                style={[sectionStyles.passInput, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                            />
                                        </View>
                                    </View>

                                    {/* Fields */}
                                    {!sec.collapsed && (
                                        <View style={{ marginTop: 10 }}>
                                            {sec.fields.map((f, fi) => (
                                                <View key={fi} style={[fieldStyles.fieldBlock, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                                                    <View style={fieldStyles.row}>
                                                        {/* Field label */}
                                                        <TextInput
                                                            value={f.label}
                                                            onChangeText={(v) => updateField(si, fi, { label: v })}
                                                            placeholder="Field label"
                                                            placeholderTextColor={colors.neutral[400]}
                                                            style={[fieldStyles.labelInput, { color: isDark ? colors.white : colors.primary[950] }]}
                                                        />

                                                        {/* Field type picker */}
                                                        <View style={{ width: 110 }}>
                                                            <FieldTypePicker
                                                                value={f.fieldType}
                                                                onChange={(v) => updateField(si, fi, { fieldType: v })}
                                                                isDark={isDark}
                                                            />
                                                        </View>

                                                        {/* Mandatory toggle */}
                                                        <Pressable onPress={() => updateField(si, fi, { isMandatory: !f.isMandatory })} hitSlop={8}>
                                                            <View style={[fieldStyles.reqChk, { backgroundColor: f.isMandatory ? colors.danger[500] : 'transparent', borderColor: f.isMandatory ? colors.danger[500] : colors.neutral[300] }]}>
                                                                {f.isMandatory && (
                                                                    <Svg width={9} height={9} viewBox="0 0 24 24">
                                                                        <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </Svg>
                                                                )}
                                                            </View>
                                                        </Pressable>

                                                        {/* Remove field */}
                                                        <Pressable onPress={() => removeField(si, fi)} hitSlop={8}>
                                                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                                                <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                            </Svg>
                                                        </Pressable>
                                                    </View>
                                                    {f.fieldType === 'DROPDOWN' ? (
                                                        <TextInput
                                                            value={f.config}
                                                            onChangeText={(v) => updateField(si, fi, { config: v })}
                                                            placeholder="Options (comma separated)"
                                                            placeholderTextColor={colors.neutral[400]}
                                                            style={[fieldStyles.configInput, { backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                                        />
                                                    ) : null}
                                                </View>
                                            ))}

                                            <Pressable onPress={() => addField(si)} hitSlop={8} style={{ marginTop: 8 }}>
                                                <Text className="font-inter text-xs font-bold text-primary-600">+ Add Field</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Submit */}
                    <View style={[builderStyles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable
                            style={({ pressed }) => [builderStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.5 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="font-inter text-base font-bold text-white">
                                    {editingId ? 'Update Template' : 'Create Template'}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ChecklistTemplatesScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [builderVisible, setBuilderVisible] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');
    const [editDesc, setEditDesc] = React.useState('');
    const [editSections, setEditSections] = React.useState<SectionForm[]>([]);
    const [editIsActive, setEditIsActive] = React.useState(true);

    const { data: response, isLoading, error, refetch, isFetching } = useChecklistTemplates({
        search: search.trim() || undefined,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const createMutation = useCreateChecklistTemplate();
    const updateMutation = useUpdateChecklistTemplate();
    const deleteMutation = useDeleteChecklistTemplate();

    // ── Open create
    const openCreate = () => {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
        setEditSections([newSection()]);
        setEditIsActive(true);
        setBuilderVisible(true);
    };

    // ── Open edit
    const openEdit = async (t: any) => {
        let source = t;
        try {
            const full = await maintenanceApi.getChecklistTemplate(t.id);
            source = full?.data ?? t;
        } catch {
            // Fallback to list data if detail fetch fails.
        }

        setEditingId(source.id);
        setEditName(source.name ?? '');
        setEditDesc(source.description ?? '');
        setEditIsActive(source.isActive ?? true);
        const sections: SectionForm[] = (source.sections ?? []).map((sec: any) => ({
            name: sec.name ?? '',
            isMandatory: sec.isMandatory ?? false,
            passThreshold: sec.passThreshold != null ? String(sec.passThreshold) : '',
            description: sec.description ?? '',
            collapsed: false,
            fields: (sec.fields ?? []).map((f: any) => {
                const dropdownOptions = Array.isArray(f?.config?.options) ? f.config.options.join(', ') : '';
                return {
                    label: f.label ?? '',
                    fieldType: f.fieldType ?? 'YES_NO',
                    isMandatory: f.isMandatory ?? false,
                    config: f.fieldType === 'DROPDOWN'
                        ? dropdownOptions
                        : (f.config ? JSON.stringify(f.config) : ''),
                };
            }),
        }));
        setEditSections(sections.length > 0 ? sections : [newSection()]);
        setBuilderVisible(true);
    };

    // ── Submit create / update
    const handleSubmit = async (data: { name: string; description: string; sections: SectionForm[]; isActive: boolean }) => {
        const parseFieldConfig = (field: FieldForm) => {
            const raw = field.config.trim();
            if (!raw) return undefined;
            if (field.fieldType === 'DROPDOWN') {
                if (raw.startsWith('{') || raw.startsWith('[')) {
                    try { return JSON.parse(raw); } catch { /* ignore parse */ }
                }
                const options = raw.split(',').map((v) => v.trim()).filter(Boolean);
                return options.length > 0 ? { options } : undefined;
            }
            try { return JSON.parse(raw); } catch { return undefined; }
        };

        const payload: any = {
            name: data.name.trim(),
            description: data.description.trim() || undefined,
            sections: data.sections.map((sec, si) => ({
                name: sec.name.trim(),
                sortOrder: si,
                isMandatory: sec.isMandatory,
                passThreshold: sec.passThreshold ? Number(sec.passThreshold) : undefined,
                description: sec.description.trim() || undefined,
                fields: sec.fields.map((f, fi) => ({
                    label: f.label.trim(),
                    fieldType: f.fieldType,
                    sortOrder: fi,
                    isMandatory: f.isMandatory,
                    config: parseFieldConfig(f),
                })),
            })),
        };

        try {
            if (editingId) {
                await updateMutation.mutateAsync({ id: editingId, data: { ...payload, isActive: data.isActive } });
                showSuccess('Template updated');
            } else {
                await createMutation.mutateAsync(payload);
                showSuccess('Template created');
            }
            setBuilderVisible(false);
            refetch();
        } catch {
            showErrorMessage(editingId ? 'Failed to update template' : 'Failed to create template');
        }
    };

    // ── Delete
    const handleDelete = (item: any) => {
        confirmModal.show({
            title: 'Delete Template',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(item.id, {
                    onSuccess: () => { showSuccess('Template deleted'); refetch(); },
                    onError: () => showErrorMessage('Failed to delete'),
                });
            },
        });
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <TemplateCard
            item={item}
            index={index}
            isDark={isDark}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Checklists" subtitle={`${totalCount} template${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} rightSlot={<HelpDrawer help={checklistTemplatesHelp} />} />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search checklists..." />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        if (error) return (
            <View style={{ paddingTop: 40 }}>
                <EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} />
            </View>
        );
        return <EmptyState icon="search" title="No checklists found" message="Create a checklist template to get started." />;
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <FlashList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />

            <FAB onPress={openCreate} />

            <BuilderSheet
                visible={builderVisible}
                onClose={() => setBuilderVisible(false)}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isDark={isDark}
                editingId={editingId}
                initialName={editName}
                initialDescription={editDesc}
                initialSections={editSections}
                initialIsActive={editIsActive}
            />

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
    },
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
        marginLeft: 'auto',
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const builderStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    cancelBtn: {
        width: 60,
    },
    section: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    field: { marginBottom: 14 },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    submitBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

const sectionStyles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    sectionNameBox: {
        borderRadius: 10,
        borderWidth: 1.5,
        paddingHorizontal: 10,
        minHeight: 38,
        justifyContent: 'center',
    },
    sectionNameInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        paddingVertical: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passInput: {
        width: 64,
        height: 34,
        borderRadius: 8,
        borderWidth: 1.5,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '700',
        paddingHorizontal: 6,
        paddingVertical: 0,
        includeFontPadding: false,
    },
});

const fieldStyles = StyleSheet.create({
    fieldBlock: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelInput: {
        flex: 1,
        fontSize: 12,
        paddingVertical: 2,
    },
    configInput: {
        marginTop: 8,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 12,
    },
    reqChk: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const pickerStyles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    dropdown: {
        position: 'absolute',
        top: 34,
        right: 0,
        width: 140,
        zIndex: 100,
        borderRadius: 10,
        borderWidth: 1,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    item: {
        padding: 9,
        borderRadius: 6,
    },
});
