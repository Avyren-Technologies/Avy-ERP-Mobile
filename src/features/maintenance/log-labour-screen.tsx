/* eslint-disable better-tailwindcss/no-unknown-classes */
import { DateTime } from 'luxon';
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
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { EmployeePickerField } from '@/features/maintenance/components/employee-picker-field';
import { useLogWOLabour } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import {
    buildLogLabourPayload,
    computeLabourLineCost,
    nowInCompanyParts,
    resolveTechnicianName,
    validateLogLabourForm,
    type EmployeeOption,
} from '@/features/maintenance/work-order-parts-labour';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { DEFAULT_FORMAT_SETTINGS } from '@/lib/format/company-formatter';

export function LogLabourScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: settingsData } = useCompanySettings();
    const timezone =
        (settingsData as { data?: { timezone?: string } } | undefined)?.data?.timezone ??
        DEFAULT_FORMAT_SETTINGS.timezone;

    const { data: response, isLoading, refetch } = useWorkOrder(workOrderId ?? '');
    const wo: { leadTechnicianId?: string; labourLogs?: unknown[] } | null =
        (response as { data?: typeof wo } | undefined)?.data ?? null;
    const labourLogs: Record<string, unknown>[] = (wo?.labourLogs as Record<string, unknown>[]) ?? [];

    const { data: empData, isLoading: empLoading } = useEmployees({ limit: 500 });
    const employeeOptions = React.useMemo<EmployeeOption[]>(() => {
        const raw: Record<string, unknown>[] = (empData as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
        return raw.map((e) => ({
            id: String(e.id ?? ''),
            name: `${String(e.firstName ?? '')} ${String(e.lastName ?? '')}`.trim() || String(e.name ?? e.employeeId ?? ''),
            code: String(e.employeeId ?? ''),
            sublabel: [e.employeeId, (e.department as { name?: string } | undefined)?.name, (e.designation as { name?: string } | undefined)?.name]
                .filter(Boolean)
                .join(' · '),
        }));
    }, [empData]);

    const logMut = useLogWOLabour();

    const [technicianId, setTechnicianId] = React.useState('');
    const [technicianName, setTechnicianName] = React.useState('');
    const [startDate, setStartDate] = React.useState('');
    const [startTime, setStartTime] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [endTime, setEndTime] = React.useState('');
    const [hours, setHours] = React.useState('');
    const [hourlyRate, setHourlyRate] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const [timerRunning, setTimerRunning] = React.useState(false);
    const [timerStartMs, setTimerStartMs] = React.useState<number | null>(null);
    const [elapsed, setElapsed] = React.useState(0);

    const scrollBottomPadding = insets.bottom + 120;

    React.useEffect(() => {
        const { date, time } = nowInCompanyParts(timezone);
        setStartDate(date);
        setStartTime(time);
    }, [timezone]);

    React.useEffect(() => {
        if (!wo?.leadTechnicianId || technicianId) return;
        const emp = employeeOptions.find((e) => e.id === wo.leadTechnicianId);
        if (emp) {
            setTechnicianId(emp.id);
            setTechnicianName(emp.name);
        }
    }, [wo?.leadTechnicianId, employeeOptions, technicianId]);

    React.useEffect(() => {
        if (!timerRunning || !timerStartMs) return;
        const interval = setInterval(() => setElapsed(Date.now() - timerStartMs), 1000);
        return () => clearInterval(interval);
    }, [timerRunning, timerStartMs]);

    const formatElapsed = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        const now = DateTime.now().setZone(timezone);
        setTimerStartMs(Date.now());
        setTimerRunning(true);
        setElapsed(0);
        setStartDate(now.toFormat('yyyy-MM-dd'));
        setStartTime(now.toFormat('HH:mm'));
        setEndDate('');
        setEndTime('');
    };

    const handleStopTimer = () => {
        if (!timerStartMs) return;
        const now = DateTime.now().setZone(timezone);
        const start = DateTime.fromMillis(timerStartMs).setZone(timezone);
        setTimerRunning(false);
        setEndDate(now.toFormat('yyyy-MM-dd'));
        setEndTime(now.toFormat('HH:mm'));
        setStartDate(start.toFormat('yyyy-MM-dd'));
        setStartTime(start.toFormat('HH:mm'));
        setHours(((Date.now() - timerStartMs) / 3600000).toFixed(2));
    };

    const handleSubmit = () => {
        if (!workOrderId) return;

        const validationErrors = validateLogLabourForm({
            technicianId,
            startDate,
            startTime,
            hours,
            timezone,
            hourlyRate,
        });
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const payload = buildLogLabourPayload({
            technicianId,
            startDate,
            startTime,
            endDate,
            endTime,
            hours,
            hourlyRate,
            notes,
            timezone,
        });
        if (!payload) {
            showErrorMessage('Invalid labour entry');
            return;
        }

        logMut.mutate(
            { id: workOrderId, data: payload },
            {
                onSuccess: () => {
                    showSuccess('Labour logged');
                    const { date, time } = nowInCompanyParts(timezone);
                    setStartDate(date);
                    setStartTime(time);
                    setEndDate('');
                    setEndTime('');
                    setHours('');
                    setHourlyRate('');
                    setNotes('');
                    setErrors({});
                    setTimerStartMs(null);
                    setElapsed(0);
                    refetch();
                },
                onError: () => showErrorMessage('Failed to log labour'),
            },
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    const cardBg = isDark ? '#1A1730' : colors.white;
    const cardBorder = isDark ? colors.primary[900] : colors.primary[50];
    const inputBg = isDark ? '#1E1B4B' : colors.neutral[50];
    const inputBorder = isDark ? colors.neutral[700] : colors.neutral[200];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <HeaderBar onBack={() => router.back()} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                    alwaysBounceVertical
                >
                    {/* Timer */}
                    <Animated.View entering={FadeInUp.duration(300)}>
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                                Quick timer
                            </Text>
                            <Text className="font-inter text-3xl font-bold text-primary-950 dark:text-white text-center">
                                {formatElapsed(elapsed)}
                            </Text>
                            <View style={styles.timerRow}>
                                {!timerRunning ? (
                                    <Pressable onPress={handleStartTimer} style={[styles.timerBtn, { backgroundColor: colors.success[500] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">Start</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable onPress={handleStopTimer} style={[styles.timerBtn, { backgroundColor: colors.danger[500] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">Stop & fill</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </Animated.View>

                    {/* Form */}
                    <Animated.View entering={FadeInUp.duration(300).delay(80)}>
                        <View style={[styles.card, styles.formCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Log Labour</Text>
                            <Text className="font-inter text-xs text-neutral-500 mt-1 mb-4">
                                Record technician time and optional cost
                            </Text>

                            <EmployeePickerField
                                label="Technician"
                                required
                                value={technicianId}
                                displayName={technicianName}
                                onChange={(id, name) => {
                                    setTechnicianId(id);
                                    setTechnicianName(name);
                                    if (errors.technicianId) setErrors((p) => ({ ...p, technicianId: '' }));
                                }}
                                employees={employeeOptions}
                                loading={empLoading}
                                error={errors.technicianId}
                            />

                            <SectionLabel text="Time & duration" />
                            <FieldLabel label="Start" required />
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: errors.startTime ? colors.danger[400] : inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                    placeholder="yyyy-mm-dd"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={startDate}
                                    onChangeText={(v) => {
                                        setStartDate(v);
                                        if (errors.startTime) setErrors((p) => ({ ...p, startTime: '' }));
                                    }}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: errors.startTime ? colors.danger[400] : inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                    placeholder="HH:mm"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={startTime}
                                    onChangeText={(v) => {
                                        setStartTime(v);
                                        if (errors.startTime) setErrors((p) => ({ ...p, startTime: '' }));
                                    }}
                                />
                            </View>
                            {errors.startTime ? <Text className="font-inter text-[10px] text-danger-600 mb-3">{errors.startTime}</Text> : null}

                            <FieldLabel label="End" />
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                    placeholder="yyyy-mm-dd"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={endDate}
                                    onChangeText={setEndDate}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                    placeholder="HH:mm"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={endTime}
                                    onChangeText={setEndTime}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <FieldLabel label="Hours" required />
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: errors.hours ? colors.danger[400] : inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                        placeholder="2.5"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={hours}
                                        onChangeText={(v) => {
                                            setHours(v);
                                            if (errors.hours) setErrors((p) => ({ ...p, hours: '' }));
                                        }}
                                        keyboardType="decimal-pad"
                                    />
                                    {errors.hours ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.hours}</Text> : null}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FieldLabel label="Hourly rate" />
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                        placeholder="0.00"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={hourlyRate}
                                        onChangeText={setHourlyRate}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <SectionLabel text="Notes" />
                            <TextInput
                                style={[styles.input, styles.notesInput, { backgroundColor: inputBg, borderColor: inputBorder, color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Describe work performed..."
                                placeholderTextColor={colors.neutral[400]}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </Animated.View>

                    {/* Previous logs — nested scroll so main form stays scrollable */}
                    {labourLogs.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(160)} style={styles.historyBlock}>
                            <Text className="mb-2 font-inter text-sm font-bold text-primary-950 dark:text-white">
                                Previous logs ({labourLogs.length})
                            </Text>
                            <View style={[styles.historyScrollWrap, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <ScrollView
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                    contentContainerStyle={styles.historyScrollContent}
                                >
                                    {labourLogs.map((l) => (
                                        <View key={String(l.id)} style={[styles.logCard, { borderColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                                {resolveTechnicianName(String(l.technicianId ?? ''), employeeOptions)}
                                            </Text>
                                            <Text className="font-inter text-xs text-neutral-500">
                                                {Number(l.hours ?? 0).toFixed(1)} hrs
                                                {l.hourlyRate != null ? ` · ${Number(l.hourlyRate).toFixed(2)}/hr` : ''}
                                                {computeLabourLineCost(l) > 0 ? ` · ${computeLabourLineCost(l).toFixed(2)} total` : ''}
                                            </Text>
                                            {l.startTime ? (
                                                <Text className="font-inter text-[10px] text-neutral-400">
                                                    {fmt.dateTime(String(l.startTime))}
                                                    {l.endTime ? ` – ${fmt.dateTime(String(l.endTime))}` : ''}
                                                </Text>
                                            ) : null}
                                            {l.notes ? (
                                                <Text className="font-inter text-xs text-neutral-500 mt-1">{String(l.notes)}</Text>
                                            ) : null}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </Animated.View>
                    ) : null}

                    <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                        <View style={styles.actionsRow}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.cancelBtn,
                                    {
                                        backgroundColor: isDark ? colors.neutral[800] : colors.white,
                                        borderColor: isDark ? colors.neutral[700] : colors.neutral[300],
                                    },
                                    pressed && { opacity: 0.85 },
                                ]}
                                onPress={() => router.back()}
                                disabled={logMut.isPending}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.submitBtn,
                                    { flex: 1 },
                                    pressed && { opacity: 0.9 },
                                    logMut.isPending && { opacity: 0.6 },
                                ]}
                                onPress={handleSubmit}
                                disabled={logMut.isPending}
                            >
                                {logMut.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Log Labour</Text>
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

function SectionLabel({ text }: { text: string }) {
    return (
        <Text className="mb-2 mt-1 font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            {text}
        </Text>
    );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
    return (
        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
            {label}
            {required ? <Text className="text-danger-500"> *</Text> : null}
        </Text>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient
            colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}
        >
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
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
            <Text className="font-inter text-lg font-bold text-white">Log Labour</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 16,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    formCard: {
        gap: 0,
    },
    timerRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 14,
    },
    timerBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter',
    },
    notesInput: {
        minHeight: 88,
        marginBottom: 4,
    },
    historyBlock: {
        marginTop: 4,
    },
    historyScrollWrap: {
        borderRadius: 16,
        borderWidth: 1,
        maxHeight: 240,
        overflow: 'hidden',
    },
    historyScrollContent: {
        padding: 12,
        gap: 8,
    },
    logCard: {
        borderBottomWidth: 1,
        paddingBottom: 10,
        marginBottom: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
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
