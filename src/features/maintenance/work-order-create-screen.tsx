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
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { DatePickerField } from '@/components/ui/date-picker';
import { TimePickerField } from '@/components/ui/time-picker';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useCreateWorkOrder } from '@/features/maintenance/api/use-maintenance-mutations';
import { useAssets, useJobPlans } from '@/features/maintenance/api/use-maintenance-queries';
import { combineDateTimeToIsoWithDefault } from '@/features/maintenance/work-order-parts-labour';
import { useIsDark } from '@/hooks/use-is-dark';
import { DEFAULT_FORMAT_SETTINGS } from '@/lib/format/company-formatter';
import {
    MAINTENANCE_WO_PRIORITY_OPTIONS,
    MAINTENANCE_WO_TYPE_OPTIONS,
} from '@/features/maintenance/work-order-enums';

function AssetSelector({ selectedAssetId, selectedAssetName, onSelect, isDark }: {
    selectedAssetId: string; selectedAssetName: string; onSelect: (id: string, name: string) => void; isDark: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const { data } = useAssets({ search: search.trim() || undefined, limit: 20 });
    const assets: any[] = (data as any)?.data ?? [];

    return (
        <View>
            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }, expanded && { borderColor: colors.primary[400] }]}
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
                        placeholder="Search assets..." placeholderTextColor={colors.neutral[400]} value={search} onChangeText={setSearch} autoCapitalize="none"
                    />
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {assets.length === 0 ? <View style={{ padding: 16, alignItems: 'center' }}><Text className="font-inter text-xs text-neutral-400">No assets found</Text></View> : null}
                        {assets.map((a: any) => {
                            const isSelected = a.id === selectedAssetId;
                            return (
                                <Pressable key={a.id} onPress={() => { onSelect(a.id, a.name ?? a.assetNumber ?? ''); setExpanded(false); setSearch(''); }} style={[formStyles.dropdownItem, isSelected && { backgroundColor: colors.primary[50] }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className={`font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`} numberOfLines={1}>{a.name}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">{a.assetNumber}</Text>
                                    </View>
                                    {isSelected ? <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

export function WorkOrderCreateScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const createMutation = useCreateWorkOrder();

    const { data: settingsData } = useCompanySettings();
    const timezone =
        (settingsData as { data?: { timezone?: string } } | undefined)?.data?.timezone ??
        DEFAULT_FORMAT_SETTINGS.timezone;

    const [assetId, setAssetId] = React.useState('');
    const [assetName, setAssetName] = React.useState('');
    const [woType, setWoType] = React.useState('');
    const [priority, setPriority] = React.useState('MEDIUM');
    const [jobPlanId, setJobPlanId] = React.useState('');
    const [plannedStartDate, setPlannedStartDate] = React.useState('');
    const [plannedStartTime, setPlannedStartTime] = React.useState('');
    const [plannedEndDate, setPlannedEndDate] = React.useState('');
    const [plannedEndTime, setPlannedEndTime] = React.useState('');
    const [estimatedHours, setEstimatedHours] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

    const { data: jobPlansRaw } = useJobPlans({ limit: 100 });
    const jobPlans: any[] = React.useMemo(() => {
        const raw = (jobPlansRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [jobPlansRaw]);

    const scrollBottomPadding = insets.bottom + 120;

    const clearError = (field: string) => {
        if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!assetId) e.assetId = 'Asset is required';
        if (!woType) e.woType = 'Work order type is required';
        if (plannedStartDate && plannedEndDate && plannedStartDate > plannedEndDate) {
            e.plannedEndDate = 'Planned end must be on or after planned start';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const plannedStartIso = combineDateTimeToIsoWithDefault(
            plannedStartDate,
            plannedStartTime,
            timezone,
            '09:00',
        );
        const plannedEndIso = combineDateTimeToIsoWithDefault(
            plannedEndDate,
            plannedEndTime,
            timezone,
            '17:00',
        );

        if (plannedStartDate && !plannedStartIso) {
            showErrorMessage('Invalid planned start date or time');
            return;
        }
        if (plannedEndDate && !plannedEndIso) {
            showErrorMessage('Invalid planned end date or time');
            return;
        }

        const data: Record<string, unknown> = { assetId, woType, priority };
        if (jobPlanId) data.jobPlanId = jobPlanId;
        if (plannedStartIso) data.plannedStart = plannedStartIso;
        if (plannedEndIso) data.plannedEnd = plannedEndIso;
        if (estimatedHours.trim()) data.estimatedHours = Number(estimatedHours);
        if (notes.trim()) data.description = notes.trim();

        createMutation.mutate(data, {
            onSuccess: () => { showSuccess('Work order created'); router.back(); },
            onError: () => showErrorMessage('Failed to create work order'),
        });
    };

    const renderPickerField = (label: string, dropdownName: string, selectedValue: string, placeholder: string, options: readonly { value: string; label: string }[], onSelect: (v: string) => void, required?: boolean, errorKey?: string) => {
        const isOpen = openDropdown === dropdownName;
        const selectedLabel = options.find((o) => o.value === selectedValue)?.label;
        return (
            <View style={formStyles.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                    {label} {required ? <Text className="text-danger-500">*</Text> : null}
                </Text>
                <Pressable
                    onPress={() => setOpenDropdown(isOpen ? null : dropdownName)}
                    style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }, isOpen && { borderColor: colors.primary[400] }, errorKey && errors[errorKey] ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]}
                >
                    <Text className={`font-inter text-sm ${selectedValue ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{selectedLabel ?? placeholder}</Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                {errorKey && errors[errorKey] ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors[errorKey]}</Text> : null}
                {isOpen ? (
                    <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => {
                                const isSelected = opt.value === selectedValue;
                                return (
                                    <Pressable key={opt.value} onPress={() => { onSelect(opt.value); setOpenDropdown(null); if (errorKey) clearError(errorKey); }} style={[formStyles.dropdownItem, isSelected && { backgroundColor: colors.primary[50] }, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                                        <Text className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                        {isSelected ? <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : null}
            </View>
        );
    };

    const jobPlanOptions = jobPlans.map((jp: any) => {
        const code = typeof jp.code === 'string' ? jp.code.trim() : '';
        const name = typeof jp.name === 'string' ? jp.name.trim() : '';
        const label = code && name ? `${code} - ${name}` : (name || code || jp.id);
        return { value: jp.id, label };
    });

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}
            >
                <Pressable onPress={() => router.back()} style={headerStyles.backBtn} hitSlop={12}>
                    <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-white">New Work Order</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={mainStyles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <ScrollView
                    style={mainStyles.flex}
                    contentContainerStyle={[mainStyles.scrollContent, { paddingBottom: scrollBottomPadding }]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                    alwaysBounceVertical
                >
                    <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Asset <Text className="text-danger-500">*</Text></Text>
                            <AssetSelector selectedAssetId={assetId} selectedAssetName={assetName} onSelect={(id, name) => { setAssetId(id); setAssetName(name); clearError('assetId'); }} isDark={isDark} />
                            {errors.assetId ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.assetId}</Text> : null}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        {renderPickerField('Work Order Type', 'woType', woType, 'Select type', MAINTENANCE_WO_TYPE_OPTIONS, setWoType, true, 'woType')}
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        {renderPickerField('Priority', 'priority', priority, 'Select priority', MAINTENANCE_WO_PRIORITY_OPTIONS, setPriority)}
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                        {renderPickerField('Job Plan', 'jobPlan', jobPlanId, 'Select job plan (optional)', jobPlanOptions, setJobPlanId)}
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <View style={formStyles.field}>
                            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500">Scheduling</Text>
                            <View style={formStyles.scheduleRow}>
                                <View style={formStyles.scheduleDate}>
                                    <DatePickerField
                                        label="Planned Start"
                                        value={plannedStartDate}
                                        onChange={(v) => { setPlannedStartDate(v); clearError('plannedEndDate'); }}
                                    />
                                </View>
                                <View style={formStyles.scheduleTime}>
                                    <TimePickerField
                                        label="Start Time"
                                        value={plannedStartTime}
                                        onChange={setPlannedStartTime}
                                        hint="Default 9:00 AM if empty"
                                    />
                                </View>
                            </View>
                            <View style={[formStyles.scheduleRow, { marginTop: 12 }]}>
                                <View style={formStyles.scheduleDate}>
                                    <DatePickerField
                                        label="Planned End"
                                        value={plannedEndDate}
                                        onChange={(v) => { setPlannedEndDate(v); clearError('plannedEndDate'); }}
                                        error={errors.plannedEndDate}
                                    />
                                </View>
                                <View style={formStyles.scheduleTime}>
                                    <TimePickerField
                                        label="End Time"
                                        value={plannedEndTime}
                                        onChange={setPlannedEndTime}
                                        hint="Default 5:00 PM if empty"
                                    />
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(350)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Estimated Hours</Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 4" placeholderTextColor={colors.neutral[400]} value={estimatedHours} onChangeText={setEstimatedHours} keyboardType="numeric" />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(400)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                            <TextInput style={[formStyles.input, { height: 88, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Describe the work to be done..." placeholderTextColor={colors.neutral[400]} value={notes} onChangeText={setNotes} multiline />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(450)}>
                        <View style={formStyles.actionsRow}>
                            <Pressable
                                style={({ pressed }) => [
                                    formStyles.cancelBtn,
                                    {
                                        backgroundColor: isDark ? colors.neutral[800] : colors.white,
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[300],
                                    },
                                    pressed && { opacity: 0.85 },
                                ]}
                                onPress={() => router.back()}
                                disabled={createMutation.isPending}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    formStyles.submitBtn,
                                    { flex: 1 },
                                    pressed && { opacity: 0.85 },
                                    createMutation.isPending && { opacity: 0.6 },
                                ]}
                                onPress={handleSubmit}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Create Work Order</Text>
                                )}
                            </Pressable>
                        </View>
                        <View style={{ height: 24 }} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
    field: { marginBottom: 20 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    dropdown: { borderRadius: 10, borderWidth: 1, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, overflow: 'hidden' },
    dropdownSearch: { fontSize: 13, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, margin: 8 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    scheduleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    scheduleDate: { flex: 1.15 },
    scheduleTime: { flex: 0.85 },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
    cancelBtn: {
        minWidth: 110,
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
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
