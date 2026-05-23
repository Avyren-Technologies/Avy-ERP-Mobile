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
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useCreatePMSchedule } from '@/features/maintenance/api/use-maintenance-mutations';
import { useAssets, useJobPlans } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

const STRATEGY_TYPES = [
    { value: 'TIME_BASED', label: 'Time Based' },
    { value: 'METER_BASED', label: 'Meter Based' },
    { value: 'CONDITION_BASED', label: 'Condition Based' },
    { value: 'CALENDAR_BASED', label: 'Calendar Based' },
    { value: 'EVENT_BASED', label: 'Event Based' },
];

const FREQUENCY_UNITS = [
    { value: 'DAYS', label: 'Days' },
    { value: 'WEEKS', label: 'Weeks' },
    { value: 'MONTHS', label: 'Months' },
    { value: 'YEARS', label: 'Years' },
];

function AssetSelector({ selectedAssetId, selectedAssetName, onSelect, isDark }: {
    selectedAssetId: string; selectedAssetName: string; onSelect: (id: string, name: string) => void; isDark: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const { data } = useAssets({ search: search.trim() || undefined, limit: 20 });
    const assets: any[] = (data as any)?.data ?? [];

    return (
        <View>
            <Pressable onPress={() => setExpanded(!expanded)} style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }, expanded && { borderColor: colors.primary[400] }]}>
                <Text className={`font-inter text-sm ${selectedAssetId ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{selectedAssetId ? selectedAssetName : 'Select an asset'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            {expanded ? (
                <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                    <TextInput style={[formStyles.dropdownSearch, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Search assets..." placeholderTextColor={colors.neutral[400]} value={search} onChangeText={setSearch} autoCapitalize="none" />
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {assets.map((a: any) => (
                            <Pressable key={a.id} onPress={() => { onSelect(a.id, a.name ?? a.assetNumber ?? ''); setExpanded(false); setSearch(''); }} style={[formStyles.dropdownItem, a.id === selectedAssetId && { backgroundColor: colors.primary[50] }]}>
                                <View style={{ flex: 1 }}>
                                    <Text className={`font-inter text-sm ${a.id === selectedAssetId ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`} numberOfLines={1}>{a.name}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-400">{a.assetNumber}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

export function PMScheduleCreateScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const createMut = useCreatePMSchedule();

    const [assetId, setAssetId] = React.useState('');
    const [assetName, setAssetName] = React.useState('');
    const [name, setName] = React.useState('');
    const [strategyType, setStrategyType] = React.useState('');
    const [frequencyValue, setFrequencyValue] = React.useState('');
    const [frequencyUnit, setFrequencyUnit] = React.useState('DAYS');
    const [leadDays, setLeadDays] = React.useState('');
    const [graceDays, setGraceDays] = React.useState('');
    const [jobPlanId, setJobPlanId] = React.useState('');
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

    const { data: jobPlansRaw } = useJobPlans({ limit: 100 });
    const jobPlans: any[] = React.useMemo(() => {
        const raw = (jobPlansRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [jobPlansRaw]);

    const clearError = (field: string) => {
        if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!assetId) e.assetId = 'Asset is required';
        if (!name.trim()) e.name = 'Name is required';
        if (!strategyType) e.strategyType = 'Strategy type is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const data: Record<string, unknown> = { assetId, name: name.trim(), strategyType };
        if (frequencyValue.trim()) data.frequencyValue = Number(frequencyValue);
        if (frequencyUnit) data.frequencyUnit = frequencyUnit;
        if (leadDays.trim()) data.leadDays = Number(leadDays);
        if (graceDays.trim()) data.graceDays = Number(graceDays);
        if (jobPlanId) data.jobPlanId = jobPlanId;

        createMut.mutate(data, {
            onSuccess: () => { showSuccess('PM schedule created'); router.back(); },
            onError: () => showErrorMessage('Failed to create PM schedule'),
        });
    };

    const renderPickerField = (label: string, dropdownName: string, selectedValue: string, placeholder: string, options: { value: string; label: string }[], onSelect: (v: string) => void, required?: boolean, errorKey?: string) => {
        const isOpen = openDropdown === dropdownName;
        const selectedLabel = options.find((o) => o.value === selectedValue)?.label;
        return (
            <View style={formStyles.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label} {required ? <Text className="text-danger-500">*</Text> : null}</Text>
                <Pressable onPress={() => setOpenDropdown(isOpen ? null : dropdownName)} style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }, isOpen && { borderColor: colors.primary[400] }, errorKey && errors[errorKey] ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]}>
                    <Text className={`font-inter text-sm ${selectedValue ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{selectedLabel ?? placeholder}</Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                {errorKey && errors[errorKey] ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors[errorKey]}</Text> : null}
                {isOpen ? (
                    <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => (
                                <Pressable key={opt.value} onPress={() => { onSelect(opt.value); setOpenDropdown(null); if (errorKey) clearError(errorKey); }} style={[formStyles.dropdownItem, opt.value === selectedValue && { backgroundColor: colors.primary[50] }, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                                    <Text className={`flex-1 font-inter text-sm ${opt.value === selectedValue ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}
            </View>
        );
    };

    const jobPlanOptions = jobPlans.map((jp: any) => ({ value: jp.id, label: jp.name ?? jp.code ?? jp.id }));

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={headerStyles.backBtn} hitSlop={12}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="font-inter text-lg font-bold text-white">New PM Schedule</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                    <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Asset <Text className="text-danger-500">*</Text></Text>
                            <AssetSelector selectedAssetId={assetId} selectedAssetName={assetName} onSelect={(id, n) => { setAssetId(id); setAssetName(n); clearError('assetId'); }} isDark={isDark} />
                            {errors.assetId ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.assetId}</Text> : null}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Schedule Name <Text className="text-danger-500">*</Text></Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.name ? { borderColor: colors.danger[400] } : undefined]} placeholder="e.g. Monthly Oil Change" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); clearError('name'); }} />
                            {errors.name ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.name}</Text> : null}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        {renderPickerField('Strategy Type', 'strategyType', strategyType, 'Select strategy', STRATEGY_TYPES, setStrategyType, true, 'strategyType')}
                    </Animated.View>

                    {(strategyType === 'TIME_BASED' || strategyType === 'CALENDAR_BASED') ? (
                        <>
                            <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={[formStyles.field, { flex: 1 }]}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Frequency</Text>
                                        <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 30" placeholderTextColor={colors.neutral[400]} value={frequencyValue} onChangeText={setFrequencyValue} keyboardType="numeric" />
                                    </View>
                                    <View style={[formStyles.field, { flex: 1 }]}>
                                        {renderPickerField('Unit', 'frequencyUnit', frequencyUnit, 'Unit', FREQUENCY_UNITS, setFrequencyUnit)}
                                    </View>
                                </View>
                            </Animated.View>
                        </>
                    ) : null}

                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Lead Days</Text>
                                <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 7" placeholderTextColor={colors.neutral[400]} value={leadDays} onChangeText={setLeadDays} keyboardType="numeric" />
                            </View>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Grace Days</Text>
                                <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 3" placeholderTextColor={colors.neutral[400]} value={graceDays} onChangeText={setGraceDays} keyboardType="numeric" />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(300)}>
                        {renderPickerField('Job Plan', 'jobPlan', jobPlanId, 'Select job plan (optional)', jobPlanOptions, setJobPlanId)}
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(350)}>
                        <Pressable style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, createMut.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={createMut.isPending}>
                            {createMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Create PM Schedule</Text>}
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const mainStyles = StyleSheet.create({ container: { flex: 1 } });

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
    submitBtn: { backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, marginTop: 8 },
});
