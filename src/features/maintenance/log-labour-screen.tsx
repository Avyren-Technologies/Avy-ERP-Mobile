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
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useLogWOLabour } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

export function LogLabourScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: response, isLoading, refetch } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;
    const labourLogs: any[] = wo?.labourLogs ?? [];

    const logMut = useLogWOLabour();

    const [startTime, setStartTime] = React.useState('');
    const [endTime, setEndTime] = React.useState('');
    const [hours, setHours] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [timerRunning, setTimerRunning] = React.useState(false);
    const [timerStart, setTimerStart] = React.useState<number | null>(null);
    const [elapsed, setElapsed] = React.useState(0);

    // Timer
    React.useEffect(() => {
        if (!timerRunning || !timerStart) return;
        const interval = setInterval(() => {
            setElapsed(Date.now() - timerStart);
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning, timerStart]);

    const formatElapsed = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        setTimerStart(Date.now());
        setTimerRunning(true);
        setElapsed(0);
    };

    const handleStopTimer = () => {
        setTimerRunning(false);
        const hrs = (elapsed / 3600000).toFixed(2);
        setHours(hrs);
    };

    const handleSubmit = () => {
        if (!workOrderId) return;
        const h = Number(hours);
        if (!h || h <= 0) {
            showErrorMessage('Please enter valid hours');
            return;
        }
        const data: Record<string, unknown> = { hours: h };
        if (startTime.trim()) data.startTime = startTime.trim();
        if (endTime.trim()) data.endTime = endTime.trim();
        if (notes.trim()) data.notes = notes.trim();

        logMut.mutate({ id: workOrderId, data }, {
            onSuccess: () => {
                showSuccess('Labour logged');
                setStartTime(''); setEndTime(''); setHours(''); setNotes('');
                setTimerStart(null); setElapsed(0);
                refetch();
            },
            onError: () => showErrorMessage('Failed to log labour'),
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <HeaderBar onBack={() => router.back()} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Timer */}
                    <Animated.View entering={FadeInUp.duration(300)}>
                        <View style={[styles.timerCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <Text className="font-inter text-3xl font-bold text-primary-950 dark:text-white" style={{ textAlign: 'center' }}>
                                {formatElapsed(elapsed)}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                {!timerRunning ? (
                                    <Pressable onPress={handleStartTimer} style={[styles.timerBtn, { backgroundColor: colors.success[500] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">Start Timer</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable onPress={handleStopTimer} style={[styles.timerBtn, { backgroundColor: colors.danger[500] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">Stop Timer</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </Animated.View>

                    {/* Manual entry */}
                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <Text className="mb-3 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">Manual Entry</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Start Time</Text>
                                <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="HH:mm" placeholderTextColor={colors.neutral[400]} value={startTime} onChangeText={setStartTime} />
                            </View>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">End Time</Text>
                                <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="HH:mm" placeholderTextColor={colors.neutral[400]} value={endTime} onChangeText={setEndTime} />
                            </View>
                        </View>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Hours <Text className="text-danger-500">*</Text></Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="e.g. 2.5" placeholderTextColor={colors.neutral[400]} value={hours} onChangeText={setHours} keyboardType="numeric" />
                        </View>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Notes</Text>
                            <TextInput style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Work description..." placeholderTextColor={colors.neutral[400]} value={notes} onChangeText={setNotes} multiline />
                        </View>
                        <Pressable style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, logMut.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={logMut.isPending}>
                            {logMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Log Labour</Text>}
                        </Pressable>
                    </Animated.View>

                    {/* Existing logs */}
                    {labourLogs.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                            <Text className="mb-3 mt-6 font-inter text-sm font-bold text-primary-950 dark:text-white">Previous Logs ({labourLogs.length})</Text>
                            {labourLogs.map((l: any, i: number) => (
                                <View key={i} style={[styles.logCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{l.technicianName ?? 'Technician'}</Text>
                                    <Text className="font-inter text-xs text-neutral-500">{Number(l.hours ?? 0).toFixed(1)} hrs{l.notes ? ` - ${l.notes}` : ''}</Text>
                                    {l.createdAt ? <Text className="font-inter text-[10px] text-neutral-400">{fmt.dateTime(l.createdAt)}</Text> : null}
                                </View>
                            ))}
                        </Animated.View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
            <Text className="font-inter text-lg font-bold text-white">Log Labour</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    timerCard: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    timerBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    logCard: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 4 },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
    field: { marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    submitBtn: { backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, marginTop: 8 },
});
