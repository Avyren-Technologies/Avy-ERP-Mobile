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
import { strategiesHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateStrategy,
    useDeleteStrategy,
    useUpdateStrategy,
} from '@/features/maintenance/api/use-maintenance-mutations';
import { useStrategies } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const STRATEGY_TYPES = [
    { value: 'PREVENTIVE_CALENDAR', label: 'Preventive (Calendar)' },
    { value: 'PREVENTIVE_METER', label: 'Preventive (Meter)' },
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'CONDITION_BASED', label: 'Condition Based' },
    { value: 'PREDICTIVE', label: 'Predictive' },
    { value: 'SEASONAL', label: 'Seasonal' },
    { value: 'STATUTORY', label: 'Statutory' },
    { value: 'AMC_MANAGED', label: 'AMC Managed' },
    { value: 'RUN_TO_FAILURE', label: 'Run to Failure' },
    { value: 'SHUTDOWN_OVERHAUL', label: 'Shutdown / Overhaul' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    PREVENTIVE_CALENDAR: { bg: colors.success[50], text: colors.success[700] },
    PREVENTIVE_METER: { bg: colors.success[50], text: colors.success[700] },
    CORRECTIVE: { bg: colors.danger[50], text: colors.danger[700] },
    CONDITION_BASED: { bg: colors.info[50], text: colors.info[700] },
    PREDICTIVE: { bg: colors.accent[50], text: colors.accent[700] },
    SEASONAL: { bg: colors.warning[50], text: colors.warning[700] },
    STATUTORY: { bg: '#EFF6FF', text: '#1D4ED8' },
    AMC_MANAGED: { bg: colors.neutral[100], text: colors.neutral[600] },
    RUN_TO_FAILURE: { bg: colors.neutral[100], text: colors.neutral[600] },
    SHUTDOWN_OVERHAUL: { bg: colors.warning[50], text: colors.warning[700] },
};

function getTypeLabel(type: string): string {
    return STRATEGY_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

const STRATEGY_TEMPLATES: Record<string, string> = {
    PREVENTIVE_CALENDAR: JSON.stringify({ intervalDays: 30, nonWorkingDayRule: "MOVE_LATER" }, null, 2),
    PREVENTIVE_METER: JSON.stringify({ meterType: "RUNTIME_HOURS", intervalValue: 250, limitValue: 5000 }, null, 2),
    CORRECTIVE: JSON.stringify({ triggerOnFailure: true }, null, 2),
    CONDITION_BASED: JSON.stringify({ metric: "TEMPERATURE", operator: "GREATER_THAN", threshold: 80 }, null, 2),
    PREDICTIVE: JSON.stringify({ anomalyThreshold: 0.85, windowDays: 7 }, null, 2),
    SEASONAL: JSON.stringify({ season: "SUMMER", startMonth: 5, endMonth: 8 }, null, 2),
    STATUTORY: JSON.stringify({ regulatoryBody: "OSHA", inspectionIntervalMonths: 12 }, null, 2),
    AMC_MANAGED: JSON.stringify({ contractId: "AMC-100", visitFrequency: "QUARTERLY" }, null, 2),
    RUN_TO_FAILURE: JSON.stringify({ allowBreakdown: true }, null, 2),
    SHUTDOWN_OVERHAUL: JSON.stringify({ shutdownEventId: "MAJOR_SHUTDOWN", requireOverhaul: true }, null, 2),
};

// ============ STRATEGY CARD ============

function StrategyCard({
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
    const typeColor = TYPE_COLORS[item.strategyType] ?? { bg: colors.neutral[100], text: colors.neutral[600] };
    const isActive = item.isActive !== false;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <View
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
                    <View style={{ flexDirection: 'row', gap: 6 }}>
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
                    </View>
                </View>

                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={{ color: typeColor.text }} className="font-inter text-[10px] font-bold">
                            {getTypeLabel(item.strategyType)}
                        </Text>
                    </View>
                    <View style={[cardStyles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
                        <View style={[cardStyles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
                        <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ FORM SHEET ============

function StrategyFormSheet({
    visible,
    onClose,
    strategy,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    strategy?: any;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const isEdit = !!strategy;

    const [name, setName] = React.useState('');
    const [strategyType, setStrategyType] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [triggerConfig, setTriggerConfig] = React.useState('');
    const [isActive, setIsActive] = React.useState(true);
    const [openDropdown, setOpenDropdown] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            setName(strategy?.name ?? '');
            setStrategyType(strategy?.strategyType ?? '');
            setDescription(strategy?.description ?? '');
            setTriggerConfig(strategy?.triggerConfig ? JSON.stringify(strategy.triggerConfig, null, 2) : '');
            setIsActive(strategy?.isActive !== false);
            setOpenDropdown(false);
            setErrors({});
        }
    }, [visible, strategy]);

    const handleTypeChange = (type: string) => {
        setStrategyType(type);
        const isCurrentTemplateOrEmpty = !triggerConfig.trim() || Object.values(STRATEGY_TEMPLATES).includes(triggerConfig);
        if (isCurrentTemplateOrEmpty) {
            setTriggerConfig(STRATEGY_TEMPLATES[type] ?? '');
        }
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!strategyType) e.strategyType = 'Strategy type is required';
        if (triggerConfig.trim()) {
            try {
                JSON.parse(triggerConfig);
            } catch {
                e.triggerConfig = 'Invalid JSON in trigger config';
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const data: Record<string, unknown> = { name: name.trim(), strategyType };
        if (description.trim()) {
            data.description = description.trim();
        } else {
            data.description = null;
        }
        if (triggerConfig.trim()) {
            try {
                data.triggerConfig = JSON.parse(triggerConfig);
            } catch {
                // already verified by validate()
            }
        } else {
            data.triggerConfig = null;
        }
        if (isEdit) {
            data.isActive = isActive;
        }
        onSubmit(data);
    };

    const selectedTypeLabel = STRATEGY_TYPES.find((t) => t.value === strategyType)?.label;

    return (
        <RNModal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[formStyles.container, { paddingTop: Math.max(insets.top, 24), backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[formStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose} style={{ position: 'absolute', left: 20, height: '100%', justifyContent: 'center' }}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ textAlign: 'center', paddingHorizontal: 75 }}>
                            {isEdit ? 'Edit Strategy' : 'Add Strategy'}
                        </Text>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                        {/* Name */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <TextInput
                                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.name ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]}
                                placeholder="Strategy name"
                                placeholderTextColor={colors.neutral[400]}
                                value={name}
                                onChangeText={(v) => { setName(v); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}
                            />
                            {errors.name ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.name}</Text> : null}
                        </View>

                        {/* Type */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Strategy Type <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable
                                onPress={() => setOpenDropdown(!openDropdown)}
                                style={[
                                    formStyles.input,
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    },
                                    openDropdown && { borderColor: colors.primary[400] },
                                    errors.strategyType ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                                ]}
                            >
                                <Text className={`font-inter text-sm ${strategyType ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                                    {selectedTypeLabel ?? 'Select type'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d={openDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                            {errors.strategyType ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.strategyType}</Text> : null}
                            {openDropdown ? (
                                <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
                                        {STRATEGY_TYPES.map((opt, idx) => {
                                            const isSelected = opt.value === strategyType;
                                            return (
                                                <Pressable
                                                    key={opt.value}
                                                    onPress={() => { handleTypeChange(opt.value); setOpenDropdown(false); if (errors.strategyType) setErrors((p) => { const n = { ...p }; delete n.strategyType; return n; }); }}
                                                    style={[formStyles.dropdownItem, isSelected && { backgroundColor: colors.primary[50] }, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}
                                                >
                                                    <Text className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                                        {opt.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            ) : null}
                        </View>

                        {/* Description */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                            <TextInput
                                style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Description"
                                placeholderTextColor={colors.neutral[400]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        {/* Trigger Config (JSON) */}
                        <View style={formStyles.field}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Trigger Config (JSON)
                                </Text>
                                <Pressable onPress={() => setTriggerConfig(STRATEGY_TEMPLATES[strategyType] ?? '')} hitSlop={8}>
                                    <Text className="font-inter text-xs font-bold text-primary-600 dark:text-primary-400">
                                        Load Template
                                    </Text>
                                </Pressable>
                            </View>
                            <TextInput
                                style={[
                                    formStyles.input,
                                    {
                                        height: 100,
                                        textAlignVertical: 'top',
                                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950]
                                    },
                                    errors.triggerConfig ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined
                                ]}
                                placeholder='{"intervalDays": 30}'
                                placeholderTextColor={colors.neutral[400]}
                                value={triggerConfig}
                                onChangeText={(v) => { setTriggerConfig(v); if (errors.triggerConfig) setErrors((p) => { const n = { ...p }; delete n.triggerConfig; return n; }); }}
                                multiline
                            />
                            {errors.triggerConfig ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.triggerConfig}</Text> : null}
                        </View>

                        {/* Active Switch (Edit mode only) */}
                        {isEdit && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 20 }}>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                    thumbColor={isActive ? colors.primary[600] : colors.neutral[300]}
                                />
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Active</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable
                            style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                                <Text className="font-inter text-base font-bold text-white">{isEdit ? 'Update' : 'Create'}</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// ============ MAIN ============

export function StrategiesScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any>(null);

    const typeParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useStrategies({
        search: search.trim() || undefined,
        strategyType: typeParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const filterChips = React.useMemo(() => [
        { key: 'all', label: 'All', count: totalCount },
        { key: 'PREVENTIVE_CALENDAR', label: 'Preventive' },
        { key: 'CORRECTIVE', label: 'Corrective' },
        { key: 'CONDITION_BASED', label: 'Condition' },
        { key: 'PREDICTIVE', label: 'Predictive' },
    ], [totalCount]);

    const createMutation = useCreateStrategy();
    const updateMutation = useUpdateStrategy();
    const deleteMutation = useDeleteStrategy();

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: any) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: any) => {
        confirmModal.show({
            title: 'Delete Strategy',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(item.id, {
                    onSuccess: () => refetch(),
                    onError: () => showErrorMessage('Failed to delete'),
                });
            },
        });
    };

    const handleSubmit = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, {
                onSuccess: () => { setFormVisible(false); showSuccess('Strategy updated'); refetch(); },
                onError: () => showErrorMessage('Failed to update'),
            });
        } else {
            createMutation.mutate(data, {
                onSuccess: () => { setFormVisible(false); showSuccess('Strategy created'); refetch(); },
                onError: () => showErrorMessage('Failed to create'),
            });
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <StrategyCard item={item} index={index} isDark={isDark} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Strategies" subtitle={`${totalCount} strateg${totalCount !== 1 ? 'ies' : 'y'}`} onMenuPress={toggle} rightSlot={<HelpDrawer help={strategiesHelp} />} />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search strategies..." filters={filterChips} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <EmptyState icon="search" title="No strategies found" message="Add a strategy to get started." />;
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
            <FAB onPress={handleAdd} />
            <StrategyFormSheet visible={formVisible} onClose={() => setFormVisible(false)} strategy={editingItem} onSubmit={handleSubmit} isSubmitting={createMutation.isPending || updateMutation.isPending} />
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

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
    typeBadge: {
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

const formStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        minHeight: 56,
        position: 'relative',
    },
    field: { marginBottom: 20 },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    dropdown: {
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
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
