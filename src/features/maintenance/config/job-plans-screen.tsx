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
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateJobPlan,
    useDeleteJobPlan,
    useUpdateJobPlan,
} from '@/features/maintenance/api/use-maintenance-mutations';
import { useJobPlans } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const ASSET_CLASSES = [
    { value: 'MACHINE', label: 'Machine' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'TOOLING', label: 'Tooling' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
    { value: 'LAB_EQUIPMENT', label: 'Lab Equipment' },
    { value: 'GARDEN', label: 'Garden' },
    { value: 'PROJECT_SITE', label: 'Project Site' },
    { value: 'WAREHOUSE_EQUIPMENT', label: 'Warehouse Equipment' },
];

const WO_TYPES = [
    { value: 'PM', label: 'PM' },
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'BREAKDOWN', label: 'Breakdown' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'OVERHAUL', label: 'Overhaul' },
    { value: 'SHUTDOWN', label: 'Shutdown' },
    { value: 'VENDOR_SERVICE', label: 'Vendor Service' },
    { value: 'CALIBRATION', label: 'Calibration' },
];

// ============ JOB PLAN CARD ============

function JobPlanCard({
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
                        <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-info-700">{item.code}</Text>
                        </View>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.name}
                        </Text>
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
                    {item.assetClass ? (
                        <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">{item.assetClass.replace(/_/g, ' ')}</Text>
                        </View>
                    ) : null}
                    {item.woType ? (
                        <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.info[900] : colors.info[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-info-700">{item.woType}</Text>
                        </View>
                    ) : null}
                    {item.estimatedHours ? (
                        <Text className="font-inter text-[10px] text-neutral-500">{Number(item.estimatedHours)}h</Text>
                    ) : null}
                    {item.permitRequired ? (
                        <View style={[cardStyles.tagBadge, { backgroundColor: colors.danger[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-danger-700">Permit</Text>
                        </View>
                    ) : null}
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

function JobPlanFormSheet({
    visible,
    onClose,
    jobPlan,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    jobPlan?: any;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const isEdit = !!jobPlan;

    const [code, setCode] = React.useState('');
    const [name, setName] = React.useState('');
    const [assetClass, setAssetClass] = React.useState('');
    const [woType, setWoType] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [estimatedHours, setEstimatedHours] = React.useState('');
    const [crewSize, setCrewSize] = React.useState('');
    const [permitRequired, setPermitRequired] = React.useState(false);
    const [isolationRequired, setIsolationRequired] = React.useState(false);
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            setCode(jobPlan?.code ?? '');
            setName(jobPlan?.name ?? '');
            setAssetClass(jobPlan?.assetClass ?? '');
            setWoType(jobPlan?.woType ?? '');
            setDescription(jobPlan?.description ?? '');
            setEstimatedHours(jobPlan?.estimatedHours ? String(Number(jobPlan.estimatedHours)) : '');
            setCrewSize(jobPlan?.crewSize ? String(jobPlan.crewSize) : '');
            setPermitRequired(jobPlan?.permitRequired ?? false);
            setIsolationRequired(jobPlan?.isolationRequired ?? false);
            setOpenDropdown(null);
            setErrors({});
        }
    }, [visible, jobPlan]);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = 'Code is required';
        if (!name.trim()) e.name = 'Name is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const data: Record<string, unknown> = {
            code: code.trim(),
            name: name.trim(),
        };
        if (assetClass) data.assetClass = assetClass;
        if (woType) data.woType = woType;
        if (description.trim()) data.description = description.trim();
        if (estimatedHours.trim()) data.estimatedHours = parseFloat(estimatedHours);
        if (crewSize.trim()) data.crewSize = parseInt(crewSize, 10);
        data.permitRequired = permitRequired;
        data.isolationRequired = isolationRequired;
        onSubmit(data);
    };

    const renderDropdown = (
        label: string,
        ddName: string,
        value: string,
        placeholder: string,
        options: { value: string; label: string }[],
        onSelect: (v: string) => void,
    ) => {
        const isOpen = openDropdown === ddName;
        const selectedLabel = options.find((o) => o.value === value)?.label;
        return (
            <View style={formStyles.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
                <Pressable
                    onPress={() => setOpenDropdown(isOpen ? null : ddName)}
                    style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }, isOpen && { borderColor: colors.primary[400] }]}
                >
                    <Text className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{selectedLabel ?? placeholder}</Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                {isOpen ? (
                    <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            <Pressable onPress={() => { onSelect(''); setOpenDropdown(null); }} style={[formStyles.dropdownItem]}>
                                <Text className="font-inter text-sm text-neutral-400">None</Text>
                            </Pressable>
                            {options.map((opt, idx) => {
                                const isSelected = opt.value === value;
                                return (
                                    <Pressable key={opt.value} onPress={() => { onSelect(opt.value); setOpenDropdown(null); }} style={[formStyles.dropdownItem, isSelected && { backgroundColor: colors.primary[50] }, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                                        <Text className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <RNModal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[formStyles.container, { paddingTop: Math.max(insets.top, 24), backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[formStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{isEdit ? 'Edit Job Plan' : 'Add Job Plan'}</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                        {/* Code */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Code <Text className="text-danger-500">*</Text></Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.code ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]} placeholder="e.g. JP-001" placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(v) => { setCode(v); if (errors.code) setErrors((p) => { const n = { ...p }; delete n.code; return n; }); }} autoCapitalize="characters" />
                            {errors.code ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.code}</Text> : null}
                        </View>

                        {/* Name */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Name <Text className="text-danger-500">*</Text></Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.name ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]} placeholder="Job plan name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} />
                            {errors.name ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.name}</Text> : null}
                        </View>

                        {renderDropdown('Asset Class', 'assetClass', assetClass, 'Select asset class', ASSET_CLASSES, setAssetClass)}
                        {renderDropdown('WO Type', 'woType', woType, 'Select WO type', WO_TYPES, setWoType)}

                        {/* Description */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                            <TextInput style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Description" placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline />
                        </View>

                        {/* Estimated Hours */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Estimated Hours</Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 4.5" placeholderTextColor={colors.neutral[400]} value={estimatedHours} onChangeText={setEstimatedHours} keyboardType="decimal-pad" />
                        </View>

                        {/* Crew Size */}
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Crew Size</Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 2" placeholderTextColor={colors.neutral[400]} value={crewSize} onChangeText={setCrewSize} keyboardType="number-pad" />
                        </View>

                        {/* Toggles */}
                        <View style={[formStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Permit Required</Text>
                            <Switch value={permitRequired} onValueChange={setPermitRequired} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={permitRequired ? colors.primary[600] : colors.neutral[100]} />
                        </View>

                        <View style={[formStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Isolation Required</Text>
                            <Switch value={isolationRequired} onValueChange={setIsolationRequired} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isolationRequired ? colors.primary[600] : colors.neutral[100]} />
                        </View>
                    </ScrollView>

                    <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">{isEdit ? 'Update' : 'Create'}</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// ============ MAIN ============

export function JobPlansScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any>(null);

    const assetClassParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useJobPlans({
        search: search.trim() || undefined,
        assetClass: assetClassParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const filterChips = React.useMemo(() => [
        { key: 'all', label: 'All', count: totalCount },
        { key: 'MACHINE', label: 'Machine' },
        { key: 'VEHICLE', label: 'Vehicle' },
        { key: 'BUILDING', label: 'Building' },
    ], [totalCount]);

    const createMutation = useCreateJobPlan();
    const updateMutation = useUpdateJobPlan();
    const deleteMutation = useDeleteJobPlan();

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: any) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: any) => {
        confirmModal.show({
            title: 'Delete Job Plan',
            message: `Delete "${item.name}" (${item.code})? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(item.id, { onSuccess: () => refetch(), onError: () => showErrorMessage('Failed to delete') });
            },
        });
    };

    const handleSubmit = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, {
                onSuccess: () => { setFormVisible(false); showSuccess('Job plan updated'); refetch(); },
                onError: () => showErrorMessage('Failed to update'),
            });
        } else {
            createMutation.mutate(data, {
                onSuccess: () => { setFormVisible(false); showSuccess('Job plan created'); refetch(); },
                onError: () => showErrorMessage('Failed to create'),
            });
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <JobPlanCard item={item} index={index} isDark={isDark} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Job Plans" subtitle={`${totalCount} plan${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search job plans..." filters={filterChips} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <EmptyState icon="search" title="No job plans found" message="Add a job plan to get started." />;
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
            <JobPlanFormSheet visible={formVisible} onClose={() => setFormVisible(false)} jobPlan={editingItem} onSubmit={handleSubmit} isSubmitting={createMutation.isPending || updateMutation.isPending} />
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
    codeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
        flexWrap: 'wrap',
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

const formStyles = StyleSheet.create({
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
