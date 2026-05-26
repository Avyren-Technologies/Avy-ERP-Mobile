/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { DatePickerField } from '@/components/ui/date-picker';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';
import { useCreateWorkRequest } from '@/features/maintenance/api/use-maintenance-mutations';
import { useAssets } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const WR_TYPES = [
    { value: 'BREAKDOWN', label: 'Breakdown' },
    { value: 'PLANNED_SERVICE', label: 'Planned Service' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'REPLACEMENT', label: 'Replacement' },
    { value: 'SAFETY', label: 'Safety' },
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
];

// ============ ASSET SELECTOR (inline) ============

function AssetSelector({
    selectedAssetId,
    selectedAssetName,
    onSelect,
    isDark,
}: {
    selectedAssetId: string;
    selectedAssetName: string;
    onSelect: (id: string, name: string) => void;
    isDark: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const { data } = useAssets({ search: search.trim() || undefined, limit: 20 });
    const assets: any[] = (data as any)?.data ?? [];

    return (
        <View>
            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={[
                    formStyles.input,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                    expanded && { borderColor: colors.primary[400] },
                ]}
            >
                <Text className={`font-inter text-sm ${selectedAssetId ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                    {selectedAssetId ? selectedAssetName : 'Select an asset'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>

            {expanded ? (
                <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                    <TextInput
                        style={[formStyles.dropdownSearch, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                        placeholder="Search assets..."
                        placeholderTextColor={colors.neutral[400]}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                    />
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {assets.length === 0 ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <Text className="font-inter text-xs text-neutral-400">No assets found</Text>
                            </View>
                        ) : null}
                        {assets.map((a: any) => {
                            const isSelected = a.id === selectedAssetId;
                            return (
                                <Pressable
                                    key={a.id}
                                    onPress={() => { onSelect(a.id, a.name ?? a.assetNumber ?? ''); setExpanded(false); setSearch(''); }}
                                    style={[formStyles.dropdownItem, isSelected && { backgroundColor: colors.primary[50] }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text className={`font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`} numberOfLines={1}>
                                            {a.name}
                                        </Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">{a.assetNumber}</Text>
                                    </View>
                                    {isSelected ? (
                                        <Svg width={15} height={15} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

// ============ MAIN ============

export function WorkRequestCreateScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const createMutation = useCreateWorkRequest();

    const [assetId, setAssetId] = React.useState('');
    const [assetName, setAssetName] = React.useState('');
    const [requestType, setRequestType] = React.useState('');
    const [priority, setPriority] = React.useState('MEDIUM');
    const [description, setDescription] = React.useState('');
    const [locationDetail, setLocationDetail] = React.useState('');
    const [requestedByDate, setRequestedByDate] = React.useState('');
    const [safetyRisk, setSafetyRisk] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [duplicates, setDuplicates] = React.useState<any[]>([]);
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

    const clearError = (field: string) => {
        if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    };

    // Duplicate check on asset select
    const handleAssetSelect = async (id: string, name: string) => {
        setAssetId(id);
        setAssetName(name);
        clearError('assetId');
        setDuplicates([]);
        if (id) {
            try {
                const res = await maintenanceApi.checkDuplicateWR({ assetId: id });
                const dups = (res as any)?.data ?? [];
                if (Array.isArray(dups) && dups.length > 0) setDuplicates(dups);
            } catch {
                // ignore
            }
        }
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!assetId) e.assetId = 'Asset is required';
        if (!requestType) e.requestType = 'Request type is required';
        if (!description.trim()) e.description = 'Description is required';
        if (description.length > 500) e.description = 'Description must be 500 chars or less';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const data: Record<string, unknown> = {
            assetId,
            requestType,
            priority,
            description: description.trim(),
        };
        if (locationDetail.trim()) data.locationDetail = locationDetail.trim();
        if (requestedByDate.trim()) data.requestedByDate = requestedByDate.trim();
        if (safetyRisk) data.safetyRisk = true;

        createMutation.mutate(data, {
            onSuccess: () => {
                showSuccess('Work request submitted');
                router.back();
            },
            onError: () => showErrorMessage('Failed to create work request'),
        });
    };

    const renderPickerField = (
        label: string,
        dropdownName: string,
        selectedValue: string,
        placeholder: string,
        options: { value: string; label: string }[],
        onSelect: (v: string) => void,
        required?: boolean,
        errorKey?: string,
    ) => {
        const isOpen = openDropdown === dropdownName;
        const selectedLabel = options.find((o) => o.value === selectedValue)?.label;
        return (
            <View style={formStyles.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                    {label} {required ? <Text className="text-danger-500">*</Text> : null}
                </Text>
                <Pressable
                    onPress={() => setOpenDropdown(isOpen ? null : dropdownName)}
                    style={[
                        formStyles.input,
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                        isOpen && { borderColor: colors.primary[400] },
                        errorKey && errors[errorKey] ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                    ]}
                >
                    <Text className={`font-inter text-sm ${selectedValue ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                {errorKey && errors[errorKey] ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors[errorKey]}</Text> : null}
                {isOpen ? (
                    <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => {
                                const isSelected = opt.value === selectedValue;
                                return (
                                    <Pressable
                                        key={opt.value}
                                        onPress={() => { onSelect(opt.value); setOpenDropdown(null); if (errorKey) clearError(errorKey); }}
                                        style={[
                                            formStyles.dropdownItem,
                                            isSelected && { backgroundColor: colors.primary[50] },
                                            idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
                                        ]}
                                    >
                                        <Text className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                            {opt.label}
                                        </Text>
                                        {isSelected ? (
                                            <Svg width={15} height={15} viewBox="0 0 24 24">
                                                <Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        ) : null}
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
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}
            >
                <Pressable onPress={() => router.back()} style={headerStyles.backBtn} hitSlop={12}>
                    <Svg width={22} height={22} viewBox="0 0 24 24">
                        <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-white">New Work Request</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 80 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    {/* Asset Picker */}
                    <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Asset <Text className="text-danger-500">*</Text>
                            </Text>
                            <AssetSelector
                                selectedAssetId={assetId}
                                selectedAssetName={assetName}
                                onSelect={handleAssetSelect}
                                isDark={isDark}
                            />
                            {errors.assetId ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.assetId}</Text> : null}
                        </View>
                    </Animated.View>

                    {/* Duplicate warning */}
                    {duplicates.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300)}>
                            <View style={mainStyles.dupBanner}>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={colors.warning[700]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text className="flex-1 font-inter text-xs text-warning-700">
                                    {duplicates.length} existing open request{duplicates.length > 1 ? 's' : ''} found for this asset.
                                </Text>
                            </View>
                        </Animated.View>
                    ) : null}

                    {/* Request Type */}
                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        {renderPickerField('Request Type', 'requestType', requestType, 'Select type', WR_TYPES, (v) => setRequestType(v), true, 'requestType')}
                    </Animated.View>

                    {/* Priority */}
                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        {renderPickerField('Priority', 'priority', priority, 'Select priority', PRIORITIES, (v) => setPriority(v))}
                    </Animated.View>

                    {/* Description */}
                    <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                        <View style={formStyles.field}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Description <Text className="text-danger-500">*</Text>
                                </Text>
                                <Text className={`font-inter text-[10px] ${description.length > 500 ? 'text-danger-500' : 'text-neutral-400'}`}>
                                    {description.length}/500
                                </Text>
                            </View>
                            <TextInput
                                style={[
                                    formStyles.input,
                                    {
                                        height: 100,
                                        textAlignVertical: 'top',
                                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                        color: isDark ? colors.white : colors.primary[950],
                                    },
                                    errors.description ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                                ]}
                                placeholder="Describe the issue or work needed..."
                                placeholderTextColor={colors.neutral[400]}
                                value={description}
                                onChangeText={(v) => { setDescription(v); clearError('description'); }}
                                multiline
                                maxLength={500}
                            />
                            {errors.description ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.description}</Text> : null}
                        </View>
                    </Animated.View>

                    {/* Location Detail */}
                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Location Detail</Text>
                            <TextInput
                                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="e.g. Building A, Floor 2, Bay 3"
                                placeholderTextColor={colors.neutral[400]}
                                value={locationDetail}
                                onChangeText={setLocationDetail}
                            />
                        </View>
                    </Animated.View>

                    {/* Requested By Date */}
                    <Animated.View entering={FadeInUp.duration(300).delay(300)}>
                        <DatePickerField
                            label="Requested By Date"
                            value={requestedByDate}
                            onChange={setRequestedByDate}
                        />
                    </Animated.View>

                    {/* Safety Risk */}
                    <Animated.View entering={FadeInUp.duration(300).delay(350)}>
                        <View style={[formStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <View>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Safety Risk</Text>
                                <Text className="font-inter text-[10px] text-neutral-400">Mark if this poses a safety concern</Text>
                            </View>
                            <Switch
                                value={safetyRisk}
                                onValueChange={setSafetyRisk}
                                trackColor={{ false: colors.neutral[200], true: colors.danger[400] }}
                                thumbColor={safetyRisk ? colors.danger[600] : colors.neutral[100]}
                            />
                        </View>
                    </Animated.View>

                    {/* Submit */}
                    <Animated.View entering={FadeInUp.duration(300).delay(400)}>
                        <Pressable
                            style={({ pressed }) => [
                                formStyles.submitBtn,
                                pressed && { opacity: 0.85 },
                                createMutation.isPending && { opacity: 0.6 },
                            ]}
                            onPress={handleSubmit}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="font-inter text-base font-bold text-white">Submit Request</Text>
                            )}
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============ STYLES ============

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    dupBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.warning[50],
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
});

const headerStyles = StyleSheet.create({
    gradient: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const formStyles = StyleSheet.create({
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
    dropdownSearch: {
        fontSize: 13,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        margin: 8,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
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
        marginTop: 8,
    },
});
