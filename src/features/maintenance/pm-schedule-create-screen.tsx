/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { DatePickerField } from '@/components/ui/date-picker';
import colors from '@/components/ui/colors';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { SkeletonCard } from '@/components/ui/skeleton';
import { pmScheduleCreateHelp } from '@/features/maintenance/help';
import { useCreatePMSchedule, useUpdatePMSchedule } from '@/features/maintenance/api/use-maintenance-mutations';
import { useAssets, useJobPlans, usePMSchedule, useContracts } from '@/features/maintenance/api/use-maintenance-queries';
import {
    PM_STRATEGY_OPTIONS,
    PM_FREQUENCY_OPTIONS,
    PM_SCHEDULE_TYPE_OPTIONS,
    PM_METER_TYPE_OPTIONS,
    PM_AUTO_ASSIGN_RULE_OPTIONS,
    PM_MONTH_OPTIONS,
    defaultPMScheduleFormState,
    buildCreatePMSchedulePayload,
    buildUpdatePMSchedulePayload,
    pmScheduleToFormState,
    validatePMScheduleForm,
    type PMScheduleFormState,
    type PMFormStrategyKey,
} from '@/features/maintenance/pm-schedule-form';
import { resolveMaintenanceAssetName, resolveMaintenanceAssetNumber } from '@/features/maintenance/maintenance-asset-display';
import { useIsDark } from '@/hooks/use-is-dark';

type PickerOption = { value: string; label: string };

function AssetSelector({
    selectedAssetId,
    selectedAssetName,
    onSelect,
    isDark,
    disabled = false,
}: {
    selectedAssetId: string;
    selectedAssetName: string;
    onSelect: (id: string, name: string) => void;
    isDark: boolean;
    disabled?: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const { data } = useAssets({ search: search.trim() || undefined, limit: 20 });
    const assets: { id: string; name?: string; assetNumber?: string }[] = (data as { data?: typeof assets })?.data ?? [];

    return (
        <View>
            <Pressable
                onPress={() => !disabled && setExpanded(!expanded)}
                disabled={disabled}
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
                    <Path
                        d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                        stroke={colors.neutral[400]}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>
            {expanded ? (
                <View
                    style={[
                        formStyles.dropdown,
                        {
                            backgroundColor: isDark ? '#1A1730' : '#fff',
                            borderColor: isDark ? colors.primary[800] : colors.primary[200],
                        },
                    ]}
                >
                    <TextInput
                        style={[
                            formStyles.dropdownSearch,
                            {
                                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                color: isDark ? colors.white : colors.primary[950],
                            },
                        ]}
                        placeholder="Search assets..."
                        placeholderTextColor={colors.neutral[400]}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                    />
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {assets.map((a) => (
                            <Pressable
                                key={a.id}
                                onPress={() => {
                                    onSelect(a.id, a.name ?? a.assetNumber ?? '');
                                    setExpanded(false);
                                    setSearch('');
                                }}
                                style={[formStyles.dropdownItem, a.id === selectedAssetId && { backgroundColor: colors.primary[50] }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text
                                        className={`font-inter text-sm ${a.id === selectedAssetId ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}
                                        numberOfLines={1}
                                    >
                                        {a.name}
                                    </Text>
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

function SectionTitle({ children }: { children: string }) {
    return (
        <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {children}
        </Text>
    );
}

export function PMScheduleCreateScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { editId } = useLocalSearchParams<{ editId?: string }>();
    const scheduleId = typeof editId === 'string' ? editId : Array.isArray(editId) ? editId[0] : '';
    const isEdit = Boolean(scheduleId);

    const createMut = useCreatePMSchedule();
    const updateMut = useUpdatePMSchedule();
    const { data: pmResponse, isLoading: pmLoading, isError: pmError } = usePMSchedule(scheduleId ?? '');

    const [form, setForm] = React.useState<PMScheduleFormState>(defaultPMScheduleFormState);
    const [assetName, setAssetName] = React.useState('');
    const [formError, setFormError] = React.useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
    const [formHydrated, setFormHydrated] = React.useState(!isEdit);

    const { data: jobPlansRaw } = useJobPlans({ limit: 100 });
    const jobPlans: { id: string; name?: string; code?: string }[] = React.useMemo(() => {
        const raw = (jobPlansRaw as { data?: typeof jobPlans })?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [jobPlansRaw]);

    const { data: contractsRaw } = useContracts({ limit: 200 });
    const contracts: { id: string; name?: string; contractCode?: string }[] = React.useMemo(() => {
        const raw = (contractsRaw as { data?: typeof contracts })?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [contractsRaw]);

    const setField = <K extends keyof PMScheduleFormState>(key: K, value: PMScheduleFormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setFormError(null);
    };

    React.useEffect(() => {
        if (!isEdit) return;
        const pm = (pmResponse as { data?: Record<string, unknown> })?.data;
        if (!pm) return;
        setForm(pmScheduleToFormState(pm));
        const asset = pm.asset as { name?: string; assetNumber?: string; code?: string } | undefined;
        const label = asset
            ? `${resolveMaintenanceAssetName(asset)} (${resolveMaintenanceAssetNumber(asset)})`
            : '';
        setAssetName(label);
        setFormHydrated(true);
    }, [isEdit, pmResponse]);

    const strategy = form.strategyKey;

    const renderPickerField = (
        label: string,
        dropdownName: string,
        selectedValue: string,
        placeholder: string,
        options: PickerOption[],
        onSelect: (v: string) => void,
        required?: boolean,
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
                    ]}
                >
                    <Text className={`font-inter text-sm ${selectedValue ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path
                            d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                            stroke={colors.neutral[400]}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                {isOpen ? (
                    <View
                        style={[
                            formStyles.dropdown,
                            {
                                backgroundColor: isDark ? '#1A1730' : '#fff',
                                borderColor: isDark ? colors.primary[800] : colors.primary[200],
                            },
                        ]}
                    >
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => (
                                <Pressable
                                    key={opt.value}
                                    onPress={() => {
                                        onSelect(opt.value);
                                        setOpenDropdown(null);
                                    }}
                                    style={[
                                        formStyles.dropdownItem,
                                        opt.value === selectedValue && { backgroundColor: colors.primary[50] },
                                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
                                    ]}
                                >
                                    <Text
                                        className={`flex-1 font-inter text-sm ${opt.value === selectedValue ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}
            </View>
        );
    };

    const monthOptions: PickerOption[] = PM_MONTH_OPTIONS.map((m) => ({
        value: String(m.value),
        label: m.label,
    }));

    const jobPlanOptions: PickerOption[] = [
        { value: '', label: 'No job plan' },
        ...jobPlans.map((jp) => ({ value: jp.id, label: jp.name ?? jp.code ?? jp.id })),
    ];

    const contractOptions: PickerOption[] = [
        { value: '', label: 'Select Service Contract' },
        ...contracts.map((c) => ({ value: c.id, label: c.name ? `${c.name} (${c.contractCode ?? 'CTR'})` : c.contractCode ?? c.id })),
    ];

    const handleSubmit = () => {
        const validationError = validatePMScheduleForm(form);
        if (validationError) {
            setFormError(validationError);
            return;
        }
        if (isEdit && scheduleId) {
            updateMut.mutate(
                { id: scheduleId, data: buildUpdatePMSchedulePayload(form) },
                {
                    onSuccess: () => {
                        showSuccess('PM schedule updated');
                        router.replace({
                            pathname: '/maintenance/pm-schedule-detail' as never,
                            params: { id: scheduleId },
                        });
                    },
                    onError: () => showErrorMessage('Failed to update PM schedule'),
                },
            );
            return;
        }
        createMut.mutate(buildCreatePMSchedulePayload(form), {
            onSuccess: () => {
                showSuccess('PM schedule created');
                router.back();
            },
            onError: () => showErrorMessage('Failed to create PM schedule'),
        });
    };

    const isSaving = createMut.isPending || updateMut.isPending;

    const handleCancel = () => {
        if (isEdit && scheduleId) {
            router.replace({
                pathname: '/maintenance/pm-schedule-detail' as never,
                params: { id: scheduleId },
            });
            return;
        }
        router.back();
    };

    if (isEdit && (pmLoading || !formHydrated)) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
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
                    <Text className="font-inter text-lg font-bold text-white">Edit PM Schedule</Text>
                    <HelpDrawer help={pmScheduleCreateHelp} />
                </LinearGradient>
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (isEdit && pmError) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface, padding: 24 }]}>
                <Text className="font-inter text-sm text-danger-600">Could not load PM schedule.</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text className="font-inter text-sm font-bold text-primary-600">Go back</Text>
                </Pressable>
            </View>
        );
    }

    const inputStyle = [
        formStyles.input,
        {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            color: isDark ? colors.white : colors.primary[950],
        },
    ];

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}
            >
                <Pressable onPress={() => router.back()} style={headerStyles.backBtn} hitSlop={12}>
                    <Svg width={22} height={22} viewBox="0 0 24 24">
                        <Path
                            d="M19 12H5M12 19l-7-7 7-7"
                            stroke="#fff"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-white">{isEdit ? 'Edit PM Schedule' : 'New PM Schedule'}</Text>
                <HelpDrawer help={pmScheduleCreateHelp} />
            </LinearGradient>

            <KeyboardAvoidingView style={mainStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={mainStyles.flex}
                    contentContainerStyle={mainStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    nestedScrollEnabled
                >
                    <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Asset <Text className="text-danger-500">*</Text>
                            </Text>
                            <AssetSelector
                                selectedAssetId={form.assetId}
                                selectedAssetName={assetName}
                                onSelect={(id, n) => {
                                    setField('assetId', id);
                                    setAssetName(n);
                                }}
                                isDark={isDark}
                                disabled={isEdit}
                            />
                            {isEdit ? (
                                <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                    Asset cannot be changed after creation.
                                </Text>
                            ) : null}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Schedule Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="e.g. Monthly Lubrication Check"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.name}
                                onChangeText={(v) => setField('name', v)}
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        {renderPickerField(
                            'Strategy Type',
                            'strategyKey',
                            form.strategyKey,
                            'Select strategy',
                            PM_STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                            (v) => setField('strategyKey', v as PMFormStrategyKey),
                            true,
                        )}
                        {pmScheduleCreateHelp.fields?.strategyType ? <InfoTooltip content={pmScheduleCreateHelp.fields.strategyType} /> : null}
                    </Animated.View>

                    {strategy === 'PREVENTIVE_CALENDAR' ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <SectionTitle>Calendar settings</SectionTitle>
                            {renderPickerField(
                                'Frequency',
                                'frequency',
                                form.frequency,
                                'Select frequency',
                                PM_FREQUENCY_OPTIONS,
                                (v) => setField('frequency', v),
                                true,
                            )}
                            {pmScheduleCreateHelp.fields?.frequencyValue ? <InfoTooltip content={pmScheduleCreateHelp.fields.frequencyValue} /> : null}
                            {form.frequency === 'CUSTOM_DAYS' ? (
                                <View style={formStyles.field}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        Custom interval (days) <Text className="text-danger-500">*</Text>
                                    </Text>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder="e.g. 30"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={form.customIntervalDays}
                                        onChangeText={(v) => setField('customIntervalDays', v)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            ) : null}
                            {renderPickerField(
                                'Schedule type',
                                'scheduleType',
                                form.scheduleType,
                                'Select schedule type',
                                PM_SCHEDULE_TYPE_OPTIONS,
                                (v) => setField('scheduleType', v),
                            )}
                            {pmScheduleCreateHelp.fields?.scheduleType ? <InfoTooltip content={pmScheduleCreateHelp.fields.scheduleType} /> : null}
                        </Animated.View>
                    ) : null}

                    {strategy === 'PREVENTIVE_METER' ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <SectionTitle>Meter settings</SectionTitle>
                            {renderPickerField(
                                'Meter type',
                                'meterType',
                                form.meterType,
                                'Select meter type',
                                PM_METER_TYPE_OPTIONS,
                                (v) => setField('meterType', v),
                                true,
                            )}
                            {pmScheduleCreateHelp.fields?.meterType ? <InfoTooltip content={pmScheduleCreateHelp.fields.meterType} /> : null}
                            <View style={formStyles.field}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        Meter interval <Text className="text-danger-500">*</Text>
                                    </Text>
                                    {pmScheduleCreateHelp.fields?.meterInterval ? <InfoTooltip content={pmScheduleCreateHelp.fields.meterInterval} /> : null}
                                </View>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="e.g. 500"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.meterInterval}
                                    onChangeText={(v) => setField('meterInterval', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </Animated.View>
                    ) : null}

                    {strategy === 'SEASONAL' ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <SectionTitle>Seasonal settings</SectionTitle>
                            {renderPickerField(
                                'Season start month',
                                'seasonStartMonth',
                                String(form.seasonStartMonth),
                                'Start month',
                                monthOptions,
                                (v) => setField('seasonStartMonth', Number(v)),
                            )}
                            {renderPickerField(
                                'Season end month',
                                'seasonEndMonth',
                                String(form.seasonEndMonth),
                                'End month',
                                monthOptions,
                                (v) => setField('seasonEndMonth', Number(v)),
                            )}
                        </Animated.View>
                    ) : null}

                    {strategy === 'STATUTORY' ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <SectionTitle>Statutory settings</SectionTitle>
                            <DatePickerField
                                label="Statutory due date"
                                value={form.statutoryDueDate}
                                onChange={(v) => setField('statutoryDueDate', v)}
                            />
                        </Animated.View>
                    ) : null}

                    {strategy === 'AMC_MANAGED' ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <SectionTitle>Service Contract settings</SectionTitle>
                            {renderPickerField(
                                'Service Contract',
                                'contractId',
                                form.contractId,
                                'Select Service Contract',
                                contractOptions,
                                (v) => setField('contractId', v),
                                true,
                            )}
                        </Animated.View>
                    ) : null}

                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <SectionTitle>Common settings</SectionTitle>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Lead days</Text>
                                    {pmScheduleCreateHelp.fields?.leadDays ? <InfoTooltip content={pmScheduleCreateHelp.fields.leadDays} /> : null}
                                </View>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="7"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.leadDays}
                                    onChangeText={(v) => setField('leadDays', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Grace period (days)</Text>
                                    {pmScheduleCreateHelp.fields?.gracePeriodDays ? <InfoTooltip content={pmScheduleCreateHelp.fields.gracePeriodDays} /> : null}
                                </View>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="0"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.gracePeriodDays}
                                    onChangeText={(v) => setField('gracePeriodDays', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <DatePickerField
                            label="Next due date"
                            value={form.nextDueDate}
                            onChange={(v) => setField('nextDueDate', v)}
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(300)}>
                        {renderPickerField(
                            'Job plan',
                            'jobPlan',
                            form.jobPlanId,
                            'No job plan',
                            jobPlanOptions,
                            (v) => setField('jobPlanId', v),
                        )}
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(300).delay(350)}>
                        {renderPickerField(
                            'Auto-assign rule',
                            'autoAssignRule',
                            form.autoAssignRule,
                            'None',
                            PM_AUTO_ASSIGN_RULE_OPTIONS,
                            (v) => setField('autoAssignRule', v),
                        )}
                        {pmScheduleCreateHelp.fields?.autoAssign ? <InfoTooltip content={pmScheduleCreateHelp.fields.autoAssign} /> : null}
                        {form.autoAssignRule ? (
                            <View style={formStyles.field}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Assign to (user ID)</Text>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="Technician user ID"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.autoAssignTo}
                                    onChangeText={(v) => setField('autoAssignTo', v)}
                                    autoCapitalize="none"
                                />
                            </View>
                        ) : null}
                    </Animated.View>

                </ScrollView>

                <View
                    style={[
                        footerStyles.bar,
                        {
                            paddingBottom: insets.bottom + 12,
                            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200],
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                        },
                    ]}
                >
                    {formError ? (
                        <Text className="mb-3 font-inter text-sm text-danger-600 dark:text-danger-400">{formError}</Text>
                    ) : null}

                    {isEdit ? (
                        <View style={footerStyles.stack}>
                            <Pressable
                                style={({ pressed }) => [
                                    footerStyles.primaryBtn,
                                    pressed && { opacity: 0.9 },
                                    (isSaving || !form.assetId || !form.name.trim()) && { opacity: 0.55 },
                                ]}
                                onPress={handleSubmit}
                                disabled={isSaving || !form.assetId || !form.name.trim()}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Update PM Schedule</Text>
                                )}
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    footerStyles.secondaryBtn,
                                    {
                                        borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
                                        backgroundColor: isDark ? colors.neutral[800] : colors.white,
                                    },
                                    pressed && { opacity: 0.9 },
                                ]}
                                onPress={handleCancel}
                                disabled={isSaving}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={footerStyles.row}>
                            <Pressable
                                style={({ pressed }) => [
                                    footerStyles.secondaryBtn,
                                    footerStyles.cancelInRow,
                                    {
                                        borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
                                        backgroundColor: isDark ? colors.neutral[800] : colors.white,
                                    },
                                    pressed && { opacity: 0.9 },
                                ]}
                                onPress={handleCancel}
                                disabled={isSaving}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    footerStyles.primaryBtn,
                                    footerStyles.submitInRow,
                                    pressed && { opacity: 0.9 },
                                    (isSaving || !form.assetId || !form.name.trim()) && { opacity: 0.55 },
                                ]}
                                onPress={handleSubmit}
                                disabled={isSaving || !form.assetId || !form.name.trim()}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Create PM Schedule</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
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
        paddingBottom: 16,
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
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
    field: { marginBottom: 20 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
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
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
});

const footerStyles = StyleSheet.create({
    bar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    stack: { gap: 10 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    primaryBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryBtn: {
        borderRadius: 14,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    cancelInRow: { minWidth: 110 },
    submitInRow: { flex: 1 },
});
