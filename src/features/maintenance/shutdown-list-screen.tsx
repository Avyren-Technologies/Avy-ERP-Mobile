/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal as RNModal,
    Platform,
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
import { HelpDrawer } from '@/components/ui/help-drawer';
import { shutdownListHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useCreateShutdown } from '@/features/maintenance/api/use-maintenance-mutations';
import { useShutdowns } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { DatePickerField } from '@/components/ui/date-picker';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Constants ── */

const EVENT_TYPE_OPTIONS = [
    { key: 'all', label: 'All Types' },
    { key: 'PLANNED_OVERHAUL', label: 'Planned Overhaul' },
    { key: 'STATUTORY_INSPECTION', label: 'Statutory Inspection' },
    { key: 'CORRECTIVE_MAJOR', label: 'Corrective Major' },
    { key: 'COMMISSIONING', label: 'Commissioning' },
];

const STATUS_FILTERS = [
    { key: 'all', label: 'All Statuses' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    PLANNED_OVERHAUL: { label: 'Overhaul', bgColor: colors.info[50], textColor: colors.info[700] },
    STATUTORY_INSPECTION: { label: 'Statutory', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    CORRECTIVE_MAJOR: { label: 'Corrective', bgColor: colors.danger[50], textColor: colors.danger[700] },
    COMMISSIONING: { label: 'Commission', bgColor: '#ECFDF5', textColor: '#059669' },
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    DRAFT: { label: 'Draft', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    APPROVED: { label: 'Approved', bgColor: colors.info[50], textColor: colors.info[700] },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700] },
    COMPLETED: { label: 'Completed', bgColor: colors.success[50], textColor: colors.success[700] },
    CANCELLED: { label: 'Cancelled', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

/* ── Badges ── */

function Badge({ config, value }: { config: Record<string, { label: string; bgColor: string; textColor: string }>; value: string }) {
    const cfg = config[value] ?? { label: value, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Card ── */

function ShutdownCard({ item, index, isDark, onPress, fmt }: { item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter }) {
    const woCount = item._count?.workOrders ?? item.woCount ?? 0;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <View style={cardStyles.headerRow}>
                    <Badge config={TYPE_CONFIG} value={item.eventType ?? 'PLANNED_OVERHAUL'} />
                    <Badge config={STATUS_CONFIG} value={item.status ?? 'DRAFT'} />
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 8 }}>
                    {item.name ?? 'Untitled Shutdown'}
                </Text>

                <Text className="font-inter text-xs text-neutral-500" style={{ marginTop: 4 }}>
                    {item.location?.name ?? item.lineWorkCenter ?? '---'}
                </Text>

                <View style={cardStyles.statsRow}>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">WOs</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{woCount}</Text>
                    </View>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">Budget</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.estimatedCost ? Number(item.estimatedCost).toLocaleString() : '---'}</Text>
                    </View>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">Actual</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.actualCost ? Number(item.actualCost).toLocaleString() : '---'}</Text>
                    </View>
                </View>

                <View style={cardStyles.footerRow}>
                    <Text className="font-inter text-[10px] text-neutral-400">
                        {item.plannedStart ? fmt.date(item.plannedStart) : '---'} → {item.plannedEnd ? fmt.date(item.plannedEnd) : '---'}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Chevron icon ── */

function Chevron({ open }: { open: boolean }) {
    return (
        <Svg width={10} height={10} viewBox="0 0 24 24">
            <Path
                d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                stroke={colors.neutral[400]}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

/* ── Screen ── */

export function ShutdownListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [typeFilter, setTypeFilter] = React.useState('all');
    const [createVisible, setCreateVisible] = React.useState(false);
    const [openFilterDropdown, setOpenFilterDropdown] = React.useState<string | null>(null);

    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.eventType = typeFilter;

    const { data, isLoading, refetch, isRefetching } = useShutdowns(params);

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const shutdowns: any[] = (data as any)?.data ?? [];

    const createMutation = useCreateShutdown();

    const handleCreateSubmit = async (formData: any) => {
        try {
            await createMutation.mutateAsync(formData);
            showSuccess('Shutdown event created successfully.');
            setCreateVisible(false);
            refetch();
        } catch (err: any) {
            showErrorMessage(err?.message || 'Failed to create shutdown event');
        }
    };

    const renderDropdownFilter = (
        label: string,
        name: string,
        selectedValue: string,
        placeholder: string,
        options: { key: string; label: string }[],
        onSelect: (key: string) => void
    ) => {
        const isOpen = openFilterDropdown === name;
        const selectedLabel = options.find((o) => o.key === selectedValue)?.label;
        return (
            <View style={styles.filterField}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</Text>
                <Pressable
                    onPress={() => setOpenFilterDropdown(isOpen ? null : name)}
                    style={[
                        styles.filterInput,
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                        isOpen && { borderColor: colors.primary[400] },
                    ]}
                >
                    <Text className={`font-inter text-xs ${selectedValue !== 'all' ? 'text-primary-950 dark:text-white font-bold' : 'text-neutral-500'}`} numberOfLines={1}>
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Chevron open={isOpen} />
                </Pressable>
                {isOpen && (
                    <View
                        style={[
                            styles.filterDropdown,
                            {
                                backgroundColor: isDark ? '#1A1730' : '#fff',
                                borderColor: isDark ? colors.primary[800] : colors.primary[200],
                            },
                        ]}
                    >
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => {
                                        onSelect(opt.key);
                                        setOpenFilterDropdown(null);
                                    }}
                                    style={[
                                        styles.filterDropdownItem,
                                        opt.key === selectedValue && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                        idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                    ]}
                                >
                                    <Text
                                        className={`font-inter text-xs ${opt.key === selectedValue ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
                <AppTopHeader title="Shutdown Events" onMenuPress={toggle} rightSlot={<HelpDrawer help={shutdownListHelp} />} />

                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search shutdowns..." />
                </View>

                {/* Filters Row */}
                <View style={styles.filterRow}>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter('Status', 'status', statusFilter, 'All Statuses', STATUS_FILTERS, setStatusFilter)}
                    </View>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter('Event Type', 'eventType', typeFilter, 'All Types', EVENT_TYPE_OPTIONS, setTypeFilter)}
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
                ) : shutdowns.length === 0 ? (
                    <EmptyState icon="search" title="No shutdown events" message={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first shutdown event.'} />
                ) : (
                    <FlashList
                        data={shutdowns}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
                        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
                        renderItem={({ item, index }) => (
                            <ShutdownCard
                                item={item}
                                index={index}
                                isDark={isDark}
                                fmt={fmt}
                                onPress={() => router.push({ pathname: '/maintenance/shutdown-detail' as any, params: { id: item.id } })}
                            />
                        )}
                    />
                )}
            </View>

            <FAB onPress={() => setCreateVisible(true)} />

            <CreateShutdownSheet
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
                onSubmit={handleCreateSubmit}
                isSubmitting={createMutation.isPending}
                isDark={isDark}
            />
        </View>
    );
}

/* ── Create Shutdown Sheet ── */

function CreateShutdownSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
    isDark,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
    isDark: boolean;
}) {
    const insets = useSafeAreaInsets();

    const { data: locationsRaw } = useCompanyLocations();
    const locations = React.useMemo(() => {
        const raw = (locationsRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw.map((l: any) => ({ value: l.id ?? '', label: l.name ?? '' })) : [];
    }, [locationsRaw]);

    const [name, setName] = React.useState('');
    const [eventType, setEventType] = React.useState('PLANNED_OVERHAUL');
    const [plannedStart, setPlannedStart] = React.useState('');
    const [plannedEnd, setPlannedEnd] = React.useState('');
    const [estimatedBudget, setEstimatedBudget] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [locationId, setLocationId] = React.useState('');
    const [lineWorkCenter, setLineWorkCenter] = React.useState('');
    const [openTypeDropdown, setOpenTypeDropdown] = React.useState(false);
    const [openLocationDropdown, setOpenLocationDropdown] = React.useState(false);

    const EVENT_TYPE_CREATE = [
        { value: 'PLANNED_OVERHAUL', label: 'Planned Overhaul' },
        { value: 'STATUTORY_INSPECTION', label: 'Statutory Inspection' },
        { value: 'CORRECTIVE_MAJOR', label: 'Corrective Major' },
        { value: 'COMMISSIONING', label: 'Commissioning' },
    ];

    React.useEffect(() => {
        if (visible) {
            setName('');
            setEventType('PLANNED_OVERHAUL');
            setPlannedStart('');
            setPlannedEnd('');
            setEstimatedBudget('');
            setDescription('');
            setLocationId('');
            setLineWorkCenter('');
            setOpenTypeDropdown(false);
            setOpenLocationDropdown(false);
        }
    }, [visible]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit({
            name: name.trim(),
            eventType,
            plannedStart: plannedStart || undefined,
            plannedEnd: plannedEnd || undefined,
            estimatedCost: estimatedBudget ? Number(estimatedBudget) : undefined,
            description: description.trim() || undefined,
            locationId: locationId || undefined,
            lineWorkCenter: lineWorkCenter.trim() || undefined,
        });
    };

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white, flex: 1 }]}>
                    {/* Header */}
                    <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Create Shutdown Event</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Event Name */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Event Name *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g., Annual Overhaul 2026"
                                placeholderTextColor={colors.neutral[400]}
                                style={[
                                    sheetStyles.input,
                                    {
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950],
                                    },
                                ]}
                            />
                        </View>

                        {/* Event Type dropdown */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Event Type *</Text>
                            <Pressable
                                onPress={() => setOpenTypeDropdown(!openTypeDropdown)}
                                style={[
                                    sheetStyles.input,
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    },
                                    openTypeDropdown && { borderColor: colors.primary[400] },
                                ]}
                            >
                                <Text className="font-inter text-sm text-primary-950 dark:text-white">
                                    {EVENT_TYPE_CREATE.find((o) => o.value === eventType)?.label ?? 'Select type...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path
                                        d={openTypeDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                            {openTypeDropdown && (
                                <View
                                    style={[
                                        sheetStyles.dropdown,
                                        {
                                            backgroundColor: isDark ? '#1E1B4B' : colors.white,
                                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                            marginTop: 4,
                                        },
                                    ]}
                                >
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {EVENT_TYPE_CREATE.map((opt, idx) => (
                                            <Pressable
                                                key={opt.value}
                                                onPress={() => {
                                                    setEventType(opt.value);
                                                    setOpenTypeDropdown(false);
                                                }}
                                                style={[
                                                    sheetStyles.dropdownItem,
                                                    { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                                    opt.value === eventType && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                                ]}
                                            >
                                                <Text
                                                    className={`font-inter text-sm ${opt.value === eventType ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}
                                                >
                                                    {opt.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Location picker */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Location</Text>
                            <Pressable
                                onPress={() => {
                                    setOpenLocationDropdown(!openLocationDropdown);
                                    setOpenTypeDropdown(false);
                                }}
                                style={[
                                    sheetStyles.input,
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    },
                                    openLocationDropdown && { borderColor: colors.primary[400] },
                                ]}
                            >
                                <Text className="font-inter text-sm text-primary-950 dark:text-white">
                                    {locations.find((o) => o.value === locationId)?.label ?? 'Select location...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path
                                        d={openLocationDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                            {openLocationDropdown && (
                                <View
                                    style={[
                                        sheetStyles.dropdown,
                                        {
                                            backgroundColor: isDark ? '#1E1B4B' : colors.white,
                                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                            marginTop: 4,
                                        },
                                    ]}
                                >
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {locations.length === 0 ? (
                                            <View style={sheetStyles.dropdownItem}>
                                                <Text className="font-inter text-sm text-neutral-400">No locations available</Text>
                                            </View>
                                        ) : (
                                            locations.map((opt) => (
                                                <Pressable
                                                    key={opt.value}
                                                    onPress={() => {
                                                        setLocationId(opt.value);
                                                        setOpenLocationDropdown(false);
                                                    }}
                                                    style={[
                                                        sheetStyles.dropdownItem,
                                                        { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                                        opt.value === locationId && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                                    ]}
                                                >
                                                    <Text
                                                        className={`font-inter text-sm ${opt.value === locationId ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Production Line */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Production Line</Text>
                            <TextInput
                                value={lineWorkCenter}
                                onChangeText={setLineWorkCenter}
                                placeholder="e.g., Line 1, Packaging"
                                placeholderTextColor={colors.neutral[400]}
                                style={[
                                    sheetStyles.input,
                                    {
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950],
                                    },
                                ]}
                            />
                        </View>

                        {/* Planned Dates */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <DatePickerField
                                    label="Planned Start"
                                    value={plannedStart}
                                    onChange={setPlannedStart}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <DatePickerField
                                    label="Planned End"
                                    value={plannedEnd}
                                    onChange={setPlannedEnd}
                                />
                            </View>
                        </View>

                        {/* Estimated Budget */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Estimated Budget</Text>
                            <TextInput
                                value={estimatedBudget}
                                onChangeText={setEstimatedBudget}
                                placeholder="0.00"
                                placeholderTextColor={colors.neutral[400]}
                                keyboardType="numeric"
                                style={[
                                    sheetStyles.input,
                                    {
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950],
                                    },
                                ]}
                            />
                        </View>

                        {/* Description */}
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Describe the scope of this shutdown..."
                                placeholderTextColor={colors.neutral[400]}
                                multiline
                                numberOfLines={4}
                                style={[
                                    sheetStyles.input,
                                    {
                                        height: 90,
                                        textAlignVertical: 'top',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950],
                                    },
                                ]}
                            />
                        </View>
                    </ScrollView>

                    {/* Submit Footer */}
                    <View
                        style={[
                            sheetStyles.submitContainer,
                            {
                                paddingBottom: insets.bottom + 16,
                                borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
                                backgroundColor: isDark ? '#1A1730' : colors.white,
                            },
                        ]}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                sheetStyles.submitBtn,
                                { backgroundColor: colors.primary[600] },
                                pressed && { opacity: 0.85 },
                                (isSubmitting || !name.trim()) && { opacity: 0.5 },
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitting || !name.trim()}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="font-inter text-base font-bold text-white">Create Shutdown</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

/* ── Styles ── */

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        gap: 12,
    },
    filterField: { gap: 4 },
    filterInput: {
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    filterDropdown: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 50,
        borderRadius: 10,
        borderWidth: 1,
        padding: 4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    filterDropdownItem: {
        padding: 10,
        borderRadius: 6,
    },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    label: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

const cardStyles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    stat: { gap: 2 },
    footerRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
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
    field: { marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    dropdown: { borderRadius: 12, borderWidth: 1, padding: 8, marginTop: 4 },
    dropdownItem: { padding: 12, borderBottomWidth: 1 },
    submitContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    submitBtn: {
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
});
