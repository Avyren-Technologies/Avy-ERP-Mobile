/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    Switch,
    Modal as RNModal,
    ScrollView,
    Text as RNText,
    StyleSheet,
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
import { failureCodesHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { DropdownField } from '@/components/ui/dropdown-field';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateActionCode,
    useCreateFailureCause,
    useCreateFailureCodeSet,
    useCreateFailureMode,
    useDeleteActionCode,
    useDeleteFailureCause,
    useDeleteFailureCodeSet,
    useDeleteFailureMode,
    useUpdateActionCode,
    useUpdateFailureCause,
    useUpdateFailureCodeSet,
    useUpdateFailureMode,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
    useActionCodes,
    useFailureCauses,
    useFailureCodeSets,
    useFailureModes,
} from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type DrillLevel = 'sets' | 'modes' | 'causes' | 'actions';
type FormValue = string | boolean;
type FormFieldConfig = {
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    type?: 'text' | 'select' | 'toggle';
    options?: { label: string; value: string }[];
};

const ASSET_CLASS_OPTIONS: { label: string; value: string }[] = [
    { value: '', label: 'All Asset Classes' },
    { value: 'MACHINE', label: 'Machine' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'GARDEN', label: 'Garden' },
    { value: 'LAB_EQUIPMENT', label: 'Lab Equipment' },
    { value: 'TOOLING', label: 'Tooling' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
    { value: 'PROJECT_SITE', label: 'Project Site' },
    { value: 'WAREHOUSE_EQUIPMENT', label: 'Warehouse Equipment' },
];

// ============ SIMPLE FORM SHEET ============

function SimpleFormSheet({
    visible,
    onClose,
    title,
    fields,
    initialValues,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    fields: FormFieldConfig[];
    initialValues?: Record<string, FormValue>;
    onSubmit: (values: Record<string, FormValue>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [values, setValues] = React.useState<Record<string, FormValue>>({});
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            const init: Record<string, FormValue> = {};
            fields.forEach((f) => {
                if (f.type === 'toggle') {
                    init[f.key] = typeof initialValues?.[f.key] === 'boolean' ? initialValues[f.key] : true;
                    return;
                }
                init[f.key] = typeof initialValues?.[f.key] === 'string' ? initialValues[f.key] : '';
            });
            setValues(init);
            setErrors({});
        }
    }, [visible, initialValues, fields]);

    const validate = () => {
        const e: Record<string, string> = {};
        fields.forEach((f) => {
            if (!f.required) return;
            const value = values[f.key];
            if (typeof value !== 'string' || !value.trim()) e[f.key] = `${f.label} is required`;
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const trimmed: Record<string, FormValue> = {};
        Object.entries(values).forEach(([k, v]) => {
            if (typeof v === 'boolean') {
                trimmed[k] = v;
                return;
            }
            if (v.trim()) trimmed[k] = v.trim();
        });
        onSubmit(trimmed);
    };

    return (
        <RNModal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[sheetStyles.container, { paddingTop: Math.max(insets.top, 24), backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{title}</Text>
                        <View style={{ width: 52 }} />
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                        {fields.map((f) => (
                            <View key={f.key} style={sheetStyles.field}>
                                {f.type === 'select' ? (
                                    <DropdownField
                                        label={f.label}
                                        required={f.required}
                                        options={(f.options ?? []).map((o) => ({ id: o.value, name: o.label }))}
                                        selected={typeof values[f.key] === 'string' ? values[f.key] : ''}
                                        onSelect={(id) => setValues((p) => ({ ...p, [f.key]: id }))}
                                        placeholder={f.placeholder ?? 'Select...'}
                                        error={errors[f.key]}
                                    />
                                ) : (
                                    <>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                            {f.label} {f.required ? <Text className="text-danger-500">*</Text> : null}
                                        </Text>
                                        {f.type === 'toggle' ? (
                                    <View style={[sheetStyles.toggleRow, { borderColor: isDark ? colors.neutral[700] : colors.neutral[200], backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50] }]}>
                                        <RNText style={{ color: isDark ? colors.white : colors.primary[950], fontSize: 13, fontWeight: '600' }}>
                                            {typeof values[f.key] === 'boolean' && values[f.key] ? 'Active' : 'Inactive'}
                                        </RNText>
                                        <Switch
                                            value={Boolean(values[f.key])}
                                            onValueChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
                                            trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                                            thumbColor={colors.white}
                                        />
                                    </View>
                                ) : (
                                    <TextInput
                                        style={[
                                            sheetStyles.input,
                                            {
                                                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                                color: isDark ? colors.white : colors.primary[950],
                                            },
                                            f.multiline ? { height: 80, textAlignVertical: 'top' } : undefined,
                                            errors[f.key] ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                                        ]}
                                        placeholder={f.placeholder}
                                        placeholderTextColor={colors.neutral[400]}
                                        value={typeof values[f.key] === 'string' ? values[f.key] : ''}
                                        onChangeText={(v) => { setValues((p) => ({ ...p, [f.key]: v })); if (errors[f.key]) setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; }); }}
                                        multiline={f.multiline}
                                    />
                                )}
                                    </>
                                )}
                                {errors[f.key] ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors[f.key]}</Text> : null}
                            </View>
                        ))}
                    </ScrollView>
                    <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable
                            style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                                <Text className="font-inter text-base font-bold text-white">Save</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// ============ ITEM CARD ============

function ItemCard({
    item,
    index,
    isDark,
    onPress,
    onEdit,
    onDelete,
    showChevron,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    showChevron?: boolean;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 40)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.row}>
                    <View style={{ flex: 1 }}>
                        {item.code ? (
                            <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                                <Text className="font-inter text-[10px] font-bold text-info-700">{item.code}</Text>
                            </View>
                        ) : null}
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description ? (
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 2 }}>
                                {item.description}
                            </Text>
                        ) : null}
                        {item.mechanism ? (
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 2 }}>
                                {item.mechanism}
                            </Text>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Pressable onPress={onEdit} style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]} hitSlop={8}>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        <Pressable onPress={onDelete} style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]} hitSlop={8}>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        {showChevron ? (
                            <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginLeft: 4 }}>
                                <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        ) : null}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function FailureCodesScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const [level, setLevel] = React.useState<DrillLevel>('sets');
    const [search, setSearch] = React.useState('');
    const [activeTab, setActiveTab] = React.useState<'failure' | 'action'>('failure');

    // Drill-down state
    const [selectedSetId, setSelectedSetId] = React.useState('');
    const [selectedSetName, setSelectedSetName] = React.useState('');
    const [selectedModeId, setSelectedModeId] = React.useState('');
    const [selectedModeName, setSelectedModeName] = React.useState('');

    // Form sheet
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any>(null);

    // Queries
    const { data: setsRes, isLoading: setsLoading, refetch: refetchSets, isFetching: setsFetching } = useFailureCodeSets({ search: search.trim() || undefined });
    const { data: modesRes, isLoading: modesLoading, refetch: refetchModes, isFetching: modesFetching } = useFailureModes(selectedSetId);
    const { data: causesRes, isLoading: causesLoading, refetch: refetchCauses, isFetching: causesFetching } = useFailureCauses(selectedModeId);
    const { data: actionsRes, isLoading: actionsLoading, refetch: refetchActions, isFetching: actionsFetching } = useActionCodes({ search: search.trim() || undefined });

    const sets: any[] = React.useMemo(() => { const d = (setsRes as any)?.data ?? []; return Array.isArray(d) ? d : []; }, [setsRes]);
    const modes: any[] = React.useMemo(() => { const d = (modesRes as any)?.data ?? []; return Array.isArray(d) ? d : []; }, [modesRes]);
    const causes: any[] = React.useMemo(() => { const d = (causesRes as any)?.data ?? []; return Array.isArray(d) ? d : []; }, [causesRes]);
    const actions: any[] = React.useMemo(() => { const d = (actionsRes as any)?.data ?? []; return Array.isArray(d) ? d : []; }, [actionsRes]);

    // Mutations
    const createSet = useCreateFailureCodeSet();
    const updateSet = useUpdateFailureCodeSet();
    const deleteSet = useDeleteFailureCodeSet();
    const createMode = useCreateFailureMode();
    const updateMode = useUpdateFailureMode();
    const deleteMode = useDeleteFailureMode();
    const createCause = useCreateFailureCause();
    const updateCause = useUpdateFailureCause();
    const deleteCause = useDeleteFailureCause();
    const createAction = useCreateActionCode();
    const updateAction = useUpdateActionCode();
    const deleteAction = useDeleteActionCode();

    // Navigation handlers
    const goToModes = (set: any) => {
        setSelectedSetId(set.id);
        setSelectedSetName(set.name);
        setLevel('modes');
    };

    const goToCauses = (mode: any) => {
        setSelectedModeId(mode.id);
        setSelectedModeName(mode.name);
        setLevel('causes');
    };

    const goBack = () => {
        if (level === 'causes') setLevel('modes');
        else if (level === 'modes') setLevel('sets');
    };

    // Form fields config
    const getFormFields = () => {
        if (activeTab === 'action') {
            const fields: FormFieldConfig[] = [
                { key: 'code', label: 'Code', placeholder: 'e.g. ACT-001', required: true },
                { key: 'name', label: 'Name', placeholder: 'Action name', required: true },
                { key: 'description', label: 'Description', placeholder: 'Description', multiline: true },
            ];
            if (editingItem) fields.push({ key: 'isActive', label: 'Active', type: 'toggle' });
            return fields;
        }
        switch (level) {
            case 'sets': {
                const fields: FormFieldConfig[] = [
                    { key: 'name', label: 'Name', placeholder: 'e.g. Electrical Failures', required: true },
                    { key: 'description', label: 'Description', placeholder: 'Description', multiline: true },
                    { key: 'assetClass', label: 'Asset Class', type: 'select', options: ASSET_CLASS_OPTIONS },
                ];
                if (editingItem) fields.push({ key: 'isActive', label: 'Active', type: 'toggle' });
                return fields;
            }
            case 'modes': {
                const fields: FormFieldConfig[] = [
                    { key: 'code', label: 'Code', placeholder: 'e.g. FM-001', required: true },
                    { key: 'name', label: 'Name', placeholder: 'Failure mode name', required: true },
                    { key: 'description', label: 'Description', placeholder: 'Description', multiline: true },
                ];
                if (editingItem) fields.push({ key: 'isActive', label: 'Active', type: 'toggle' });
                return fields;
            }
            case 'causes': {
                const fields: FormFieldConfig[] = [
                    { key: 'code', label: 'Code', placeholder: 'e.g. FC-001', required: true },
                    { key: 'name', label: 'Name', placeholder: 'Cause name', required: true },
                    { key: 'mechanism', label: 'Mechanism', placeholder: 'Failure mechanism', multiline: true },
                ];
                if (editingItem) fields.push({ key: 'isActive', label: 'Active', type: 'toggle' });
                return fields;
            }
            default: return [];
        }
    };

    const getFormTitle = () => {
        const prefix = editingItem ? 'Edit' : 'Add';
        if (activeTab === 'action') return `${prefix} Action Code`;
        switch (level) {
            case 'sets': return `${prefix} Failure Code Set`;
            case 'modes': return `${prefix} Failure Mode`;
            case 'causes': return `${prefix} Failure Cause`;
            default: return prefix;
        }
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormVisible(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setFormVisible(true);
    };

    const handleDelete = (item: any) => {
        const label = item.name ?? item.code ?? '';
        confirmModal.show({
            title: 'Delete',
            message: `Delete "${label}"? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                if (activeTab === 'action') {
                    deleteAction.mutate(item.id, { onSuccess: () => refetchActions(), onError: () => showErrorMessage('Failed to delete') });
                } else if (level === 'sets') {
                    deleteSet.mutate(item.id, { onSuccess: () => refetchSets(), onError: () => showErrorMessage('Failed to delete') });
                } else if (level === 'modes') {
                    deleteMode.mutate({ setId: selectedSetId, id: item.id }, { onSuccess: () => refetchModes(), onError: () => showErrorMessage('Failed to delete') });
                } else if (level === 'causes') {
                    deleteCause.mutate({ modeId: selectedModeId, id: item.id }, { onSuccess: () => refetchCauses(), onError: () => showErrorMessage('Failed to delete') });
                }
            },
        });
    };

    const handleFormSubmit = (values: Record<string, FormValue>) => {
        const payload = { ...values } as Record<string, FormValue>;
        if (payload.assetClass === '') delete payload.assetClass;
        const onSuccess = () => { setFormVisible(false); showSuccess(editingItem ? 'Updated' : 'Created'); };
        const onError = () => showErrorMessage('Failed to save');

        if (activeTab === 'action') {
            if (editingItem) {
                updateAction.mutate({ id: editingItem.id, data: payload }, { onSuccess: () => { onSuccess(); refetchActions(); }, onError });
            } else {
                createAction.mutate(payload, { onSuccess: () => { onSuccess(); refetchActions(); }, onError });
            }
        } else if (level === 'sets') {
            if (editingItem) {
                updateSet.mutate({ id: editingItem.id, data: payload }, { onSuccess: () => { onSuccess(); refetchSets(); }, onError });
            } else {
                createSet.mutate(payload, { onSuccess: () => { onSuccess(); refetchSets(); }, onError });
            }
        } else if (level === 'modes') {
            if (editingItem) {
                updateMode.mutate({ setId: selectedSetId, id: editingItem.id, data: payload }, { onSuccess: () => { onSuccess(); refetchModes(); }, onError });
            } else {
                createMode.mutate({ setId: selectedSetId, data: { ...payload, failureCodeSetId: selectedSetId } }, { onSuccess: () => { onSuccess(); refetchModes(); }, onError });
            }
        } else if (level === 'causes') {
            if (editingItem) {
                updateCause.mutate({ modeId: selectedModeId, id: editingItem.id, data: payload }, { onSuccess: () => { onSuccess(); refetchCauses(); }, onError });
            } else {
                createCause.mutate({ modeId: selectedModeId, data: { ...payload, failureModeId: selectedModeId } }, { onSuccess: () => { onSuccess(); refetchCauses(); }, onError });
            }
        }
    };

    const isSubmitting = createSet.isPending || updateSet.isPending || createMode.isPending || updateMode.isPending || createCause.isPending || updateCause.isPending || createAction.isPending || updateAction.isPending;

    // Determine current data
    let currentItems: any[] = [];
    let currentLoading = false;
    let currentFetching = false;
    let currentRefetch: () => void = () => {};

    if (activeTab === 'action') {
        currentItems = actions;
        currentLoading = actionsLoading;
        currentFetching = actionsFetching;
        currentRefetch = refetchActions;
    } else {
        switch (level) {
            case 'sets': currentItems = sets; currentLoading = setsLoading; currentFetching = setsFetching; currentRefetch = refetchSets; break;
            case 'modes': currentItems = modes; currentLoading = modesLoading; currentFetching = modesFetching; currentRefetch = refetchModes; break;
            case 'causes': currentItems = causes; currentLoading = causesLoading; currentFetching = causesFetching; currentRefetch = refetchCauses; break;
        }
    }

    const breadcrumb = React.useMemo(() => {
        if (activeTab === 'action') return 'Action Codes';
        if (level === 'sets') return 'Failure Code Sets';
        if (level === 'modes') return `${selectedSetName} / Modes`;
        if (level === 'causes') return `${selectedModeName} / Causes`;
        return '';
    }, [activeTab, level, selectedSetName, selectedModeName]);

    const drilldownAction = React.useMemo(() => {
        if (activeTab !== 'failure') return null;
        if (level === 'modes') {
            return {
                title: selectedSetName ? `${selectedSetName} Modes` : 'Failure Modes',
                subtitle: 'Add and manage failure modes for this set',
                buttonLabel: 'Add Mode',
            };
        }
        if (level === 'causes') {
            return {
                title: selectedModeName ? `${selectedModeName} Causes` : 'Failure Causes',
                subtitle: 'Add and manage causes for this mode',
                buttonLabel: 'Add Cause',
            };
        }
        return null;
    }, [activeTab, level, selectedSetName, selectedModeName]);

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <ItemCard
            item={item}
            index={index}
            isDark={isDark}
            onPress={activeTab === 'failure' && level === 'sets' ? () => goToModes(item) : activeTab === 'failure' && level === 'modes' ? () => goToCauses(item) : undefined}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
            showChevron={activeTab === 'failure' && (level === 'sets' || level === 'modes')}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Failure Codes"
                    subtitle={breadcrumb}
                    onMenuPress={toggle}
                    rightSlot={<HelpDrawer help={failureCodesHelp} />}
                />
            </Animated.View>

            {/* Tab bar */}
            <Animated.View entering={FadeIn.duration(400).delay(100)} style={{ paddingHorizontal: 24, paddingTop: 16 }}>
                <View style={tabStyles.tabBar}>
                    <Pressable
                        onPress={() => { setActiveTab('failure'); setLevel('sets'); setSearch(''); }}
                        style={[tabStyles.tab, activeTab === 'failure' && tabStyles.tabActive]}
                    >
                        <Text className={`font-inter text-xs font-bold ${activeTab === 'failure' ? 'text-white' : 'text-neutral-600'}`}>Failure Codes</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => { setActiveTab('action'); setSearch(''); }}
                        style={[tabStyles.tab, activeTab === 'action' && tabStyles.tabActive]}
                    >
                        <Text className={`font-inter text-xs font-bold ${activeTab === 'action' ? 'text-white' : 'text-neutral-600'}`}>Action Codes</Text>
                    </Pressable>
                </View>
            </Animated.View>

            {/* Back button for drill-down */}
            {activeTab === 'failure' && level !== 'sets' ? (
                <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
                    <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-primary-600">Back</Text>
                    </Pressable>
                </Animated.View>
            ) : null}

            {/* Search (for sets and actions only) */}
            {(activeTab === 'action' || (activeTab === 'failure' && level === 'sets')) ? (
                <Animated.View entering={FadeIn.duration(400).delay(150)} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search..." />
                </Animated.View>
            ) : null}

            {drilldownAction ? (
                <Animated.View entering={FadeIn.duration(300).delay(120)} style={{ paddingHorizontal: 24, paddingBottom: 10 }}>
                    <View
                        style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isDark ? colors.primary[900] : colors.primary[100],
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                {drilldownAction.title}
                            </Text>
                            <Text className="mt-0.5 font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                                {drilldownAction.subtitle}
                            </Text>
                        </View>
                        <Pressable
                            onPress={handleAdd}
                            style={({ pressed }) => [
                                {
                                    backgroundColor: colors.primary[600],
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    opacity: pressed ? 0.85 : 1,
                                },
                            ]}
                        >
                            <Text className="font-inter text-xs font-bold text-white">{drilldownAction.buttonLabel}</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            ) : null}
        </>
    );

    const renderEmpty = () => {
        if (currentLoading) {
            return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        }
        return <EmptyState icon="search" title="No items found" message="Add a new item to get started." />;
    };

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <FlashList
                data={currentItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}

                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={currentFetching && !currentLoading}
                        onRefresh={() => currentRefetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />

            {(activeTab === 'action' || (activeTab === 'failure' && level === 'sets')) ? (
                <FAB onPress={handleAdd} />
            ) : null}

            <SimpleFormSheet
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                title={getFormTitle()}
                fields={getFormFields()}
                initialValues={editingItem ?? undefined}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
            />

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const mainStyles = StyleSheet.create({ container: { flex: 1 } });

const tabStyles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.neutral[100],
        borderRadius: 12,
        padding: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: colors.primary[600],
    },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    codeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    actionBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    field: { marginBottom: 20 },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    toggleRow: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    submitContainer: {
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
