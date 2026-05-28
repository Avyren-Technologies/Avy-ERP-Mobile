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
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useCreatePTW } from '@/features/maintenance/api/use-maintenance-mutations';
import { usePTWList, useAssets } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Class badge ── */

const CLASS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    HOT_WORK: { label: 'Hot Work', bgColor: colors.danger[50], textColor: colors.danger[700] },
    CONFINED_SPACE: { label: 'Confined Space', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    ELECTRICAL_ISOLATION: { label: 'Electrical', bgColor: colors.warning[50], textColor: colors.warning[700] },
    PRESSURE_RELEASE: { label: 'Pressure', bgColor: '#ECFEFF', textColor: '#0E7490' },
    GENERAL_WORK: { label: 'General', bgColor: colors.info[50], textColor: colors.info[700] },
};

function PTWClassBadge({ ptwClass }: { ptwClass: string }) {
    const cfg = CLASS_CONFIG[ptwClass] ?? { label: ptwClass, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Status badge ── */

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    REQUESTED: { label: 'Requested', bgColor: colors.info[50], textColor: colors.info[700] },
    UNDER_REVIEW: { label: 'Under Review', bgColor: colors.warning[50], textColor: colors.warning[700] },
    ISSUED: { label: 'Issued', bgColor: colors.success[50], textColor: colors.success[700] },
    ACTIVE: { label: 'Active', bgColor: '#ECFDF5', textColor: '#059669' },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    EXPIRED: { label: 'Expired', bgColor: colors.neutral[100], textColor: colors.neutral[500] },
    REVOKED: { label: 'Revoked', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

function PTWStatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.REQUESTED;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Filters ── */

const STATUS_FILTERS = [
    { key: 'all', label: 'All Statuses' },
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'UNDER_REVIEW', label: 'Under Review' },
    { key: 'ISSUED', label: 'Issued' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'CLOSED', label: 'Closed' },
    { key: 'REVOKED', label: 'Revoked' },
];

const CLASS_FILTERS = [
    { key: 'all', label: 'All Classes' },
    { key: 'GENERAL_WORK', label: 'General Work' },
    { key: 'HOT_WORK', label: 'Hot Work' },
    { key: 'CONFINED_SPACE', label: 'Confined Space' },
    { key: 'ELECTRICAL_ISOLATION', label: 'Electrical Isolation' },
    { key: 'PRESSURE_RELEASE', label: 'Pressure Release' },
];

/* ── Card ── */

function PTWCard({ item, index, isDark, onPress, fmt }: { item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-primary-700">{item.permitNumber ?? `PTW-${(item.id ?? '').slice(0, 6)}`}</Text>
                    </View>
                    <PTWStatusBadge status={item.status ?? 'REQUESTED'} />
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={2} style={{ marginTop: 8 }}>
                    {item.description || 'No description'}
                </Text>

                <View style={cardStyles.metaRow}>
                    <PTWClassBadge ptwClass={item.ptwClass ?? 'GENERAL_WORK'} />
                    {item.asset?.name ? (
                        <Text className="font-inter text-[10px] text-neutral-500" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>
                            {item.asset.name}
                        </Text>
                    ) : null}
                </View>

                <View style={cardStyles.footerRow}>
                    <Text className="font-inter text-[10px] text-neutral-400">Requested: {item.createdAt ? fmt.date(item.createdAt) : '---'}</Text>
                    {item.issuedAt && <Text className="font-inter text-[10px] text-success-600">Issued: {fmt.date(item.issuedAt)}</Text>}
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function PTWListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [classFilter, setClassFilter] = React.useState('all');
    const [createVisible, setCreateVisible] = React.useState(false);
    const [openFilterDropdown, setOpenFilterDropdown] = React.useState<string | null>(null);

    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (classFilter !== 'all') params.ptwClass = classFilter;

    const { data, isLoading, refetch, isRefetching } = usePTWList(params);

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const permits: any[] = (data as any)?.data ?? [];

    const createMutation = useCreatePTW();

    const handleCreateSubmit = async (formData: any) => {
        try {
            await createMutation.mutateAsync(formData);
            showSuccess('Permit to Work created successfully.');
            setCreateVisible(false);
            refetch();
        } catch (err: any) {
            showErrorMessage(err?.message || 'Failed to create Permit to Work');
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
                    <Svg width={10} height={10} viewBox="0 0 24 24">
                        <Path
                            d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                            stroke={colors.neutral[400]}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
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
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
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
            
            {/* Main scrollable view wrapping list & top headers */}
            <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
                <AppTopHeader title="Permit to Work" onMenuPress={toggle} />

                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search permits..." />
                </View>

                {/* Filters Row */}
                <View style={styles.filterRow}>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter(
                            'Status',
                            'status',
                            statusFilter,
                            'All Statuses',
                            STATUS_FILTERS,
                            setStatusFilter
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter(
                            'PTW Class',
                            'ptwClass',
                            classFilter,
                            'All Classes',
                            CLASS_FILTERS,
                            setClassFilter
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
                ) : permits.length === 0 ? (
                    <EmptyState icon="search" title="No permits found" message={search || statusFilter !== 'all' || classFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first Permit to Work.'} />
                ) : (
                    <FlashList
                        data={permits}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
                        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
                        renderItem={({ item, index }) => (
                            <PTWCard item={item} index={index} isDark={isDark} fmt={fmt} onPress={() => router.push({ pathname: '/maintenance/ptw-detail' as any, params: { id: item.id } })} />
                        )}
                    />
                )}
            </View>

            <FAB onPress={() => setCreateVisible(true)} />

            <CreatePTWSheet
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
                onSubmit={handleCreateSubmit}
                isSubmitting={createMutation.isPending}
                isDark={isDark}
            />
        </View>
    );
}

/* ── Create PTW sliding Modal Sheet ── */

function CreatePTWSheet({
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
    const [ptwClass, setPtwClass] = React.useState('GENERAL_WORK');
    const [assetId, setAssetId] = React.useState('');
    const [assetName, setAssetName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [hazards, setHazards] = React.useState('');
    const [precautions, setPrecautions] = React.useState('');
    const [emergencyContact, setEmergencyContact] = React.useState('');
    const [isolationDetails, setIsolationDetails] = React.useState('');
    const [showAssetPicker, setShowAssetPicker] = React.useState(false);
    const [assetSearch, setAssetSearch] = React.useState('');
    const [openClassDropdown, setOpenClassDropdown] = React.useState(false);

    const { data: assetsData } = useAssets({ search: assetSearch || undefined, limit: 20 });
    const assets: any[] = (assetsData as any)?.data ?? [];

    React.useEffect(() => {
        if (visible) {
            setPtwClass('GENERAL_WORK');
            setAssetId('');
            setAssetName('');
            setDescription('');
            setHazards('');
            setPrecautions('');
            setEmergencyContact('');
            setIsolationDetails('');
            setShowAssetPicker(false);
            setAssetSearch('');
            setOpenClassDropdown(false);
        }
    }, [visible]);

    const handleSubmit = () => {
        onSubmit({
            ptwClass,
            assetId: assetId || undefined,
            description: description.trim() || undefined,
            hazards: hazards.trim() || undefined,
            precautions: precautions.trim() || undefined,
            emergencyContact: emergencyContact.trim() || undefined,
            isolationDetails: isolationDetails.trim() || undefined,
        });
    };

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white, flex: 1 }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose} hitSlop={12}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Create Permit to Work</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* PTW Class options dropdown */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">PTW Class *</Text>
                        <Pressable
                            onPress={() => setOpenClassDropdown(!openClassDropdown)}
                            style={[
                                sheetStyles.input,
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                },
                                openClassDropdown && { borderColor: colors.primary[400] },
                            ]}
                        >
                            <Text className="font-inter text-sm text-primary-950 dark:text-white">
                                {
                                    [
                                        { value: 'GENERAL_WORK', label: 'General Work' },
                                        { value: 'HOT_WORK', label: 'Hot Work' },
                                        { value: 'CONFINED_SPACE', label: 'Confined Space' },
                                        { value: 'ELECTRICAL_ISOLATION', label: 'Electrical Isolation' },
                                        { value: 'PRESSURE_RELEASE', label: 'Pressure Release' },
                                    ].find((o) => o.value === ptwClass)?.label ?? 'Select class...'
                                }
                            </Text>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path
                                    d={openClassDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                    stroke={colors.neutral[400]}
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        </Pressable>
                        {openClassDropdown && (
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
                                    {[
                                        { value: 'GENERAL_WORK', label: 'General Work' },
                                        { value: 'HOT_WORK', label: 'Hot Work' },
                                        { value: 'CONFINED_SPACE', label: 'Confined Space' },
                                        { value: 'ELECTRICAL_ISOLATION', label: 'Electrical Isolation' },
                                        { value: 'PRESSURE_RELEASE', label: 'Pressure Release' },
                                    ].map((opt, idx) => (
                                        <Pressable
                                            key={opt.value}
                                            onPress={() => {
                                                setPtwClass(opt.value);
                                                setOpenClassDropdown(false);
                                            }}
                                            style={[
                                                sheetStyles.dropdownItem,
                                                { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                                opt.value === ptwClass && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                            ]}
                                        >
                                            <Text
                                                className={`font-inter text-sm ${opt.value === ptwClass ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Linked Asset */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Linked Asset</Text>
                        <Pressable
                            onPress={() => setShowAssetPicker(!showAssetPicker)}
                            style={[
                                sheetStyles.input,
                                {
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                },
                            ]}
                        >
                            <Text
                                className="font-inter text-sm"
                                style={{ color: assetName ? (isDark ? colors.white : colors.primary[950]) : colors.neutral[400] }}
                            >
                                {assetName || 'Select an asset to link...'}
                            </Text>
                        </Pressable>
                        {showAssetPicker && (
                            <View style={[sheetStyles.dropdown, { backgroundColor: isDark ? '#1E1B4B' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                                <TextInput
                                    value={assetSearch}
                                    onChangeText={setAssetSearch}
                                    placeholder="Search assets..."
                                    placeholderTextColor={colors.neutral[400]}
                                    style={[
                                        sheetStyles.dropdownSearchInput,
                                        {
                                            backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                                            color: isDark ? colors.white : colors.primary[950],
                                            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
                                        },
                                    ]}
                                />
                                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                    {assets.map((a: any) => (
                                        <Pressable
                                            key={a.id}
                                            onPress={() => {
                                                setAssetId(a.id);
                                                setAssetName(`${a.name} (${a.assetNumber})`);
                                                setShowAssetPicker(false);
                                            }}
                                            style={[sheetStyles.dropdownItem, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}
                                        >
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{a.name}</Text>
                                            <Text className="font-inter text-[10px] text-neutral-400">{a.assetNumber}</Text>
                                        </Pressable>
                                    ))}
                                    {assets.length === 0 && (
                                        <Text className="font-inter text-xs text-neutral-400 text-center py-4">No assets found</Text>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Describe the work to be performed..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={3}
                            style={[
                                sheetStyles.input,
                                {
                                    height: 80,
                                    textAlignVertical: 'top',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    color: isDark ? colors.white : colors.primary[950],
                                },
                            ]}
                        />
                    </View>

                    {/* Hazards */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Hazards</Text>
                        <TextInput
                            value={hazards}
                            onChangeText={setHazards}
                            placeholder="Identify potential hazards..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={2}
                            style={[
                                sheetStyles.input,
                                {
                                    height: 60,
                                    textAlignVertical: 'top',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    color: isDark ? colors.white : colors.primary[950],
                                },
                            ]}
                        />
                    </View>

                    {/* Precautions */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Precautions</Text>
                        <TextInput
                            value={precautions}
                            onChangeText={setPrecautions}
                            placeholder="Safety precautions to follow..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={2}
                            style={[
                                sheetStyles.input,
                                {
                                    height: 60,
                                    textAlignVertical: 'top',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    color: isDark ? colors.white : colors.primary[950],
                                },
                            ]}
                        />
                    </View>

                    {/* Emergency Contact */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Emergency Contact</Text>
                        <TextInput
                            value={emergencyContact}
                            onChangeText={setEmergencyContact}
                            placeholder="Phone or name"
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

                    {/* Isolation Details */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Isolation Details</Text>
                        <TextInput
                            value={isolationDetails}
                            onChangeText={setIsolationDetails}
                            placeholder="LOTO, switches..."
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
                </ScrollView>
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
                            isSubmitting && { opacity: 0.5 },
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-inter text-base font-bold text-white">Create Permit</Text>
                        )}
                    </Pressable>
                </View>
            </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        gap: 12,
    },
    filterField: {
        gap: 4,
    },
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
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
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
    optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
    dropdown: { borderRadius: 12, borderWidth: 1, padding: 8, marginTop: 4 },
    dropdownSearchInput: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, fontSize: 14, marginBottom: 8 },
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
