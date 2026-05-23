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
import { useAddWOEvidence } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

export function CaptureEvidenceScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: response, isLoading, refetch } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;
    const evidence: any[] = wo?.evidence ?? [];

    const addMut = useAddWOEvidence();
    const [caption, setCaption] = React.useState('');

    const handleCapture = () => {
        if (!workOrderId) return;
        const data: Record<string, unknown> = {
            fileType: 'image',
            caption: caption.trim() || 'Photo evidence',
            capturedAt: new Date().toISOString(),
        };

        addMut.mutate({ id: workOrderId, data }, {
            onSuccess: () => {
                showSuccess('Evidence captured');
                setCaption('');
                refetch();
            },
            onError: () => showErrorMessage('Failed to add evidence'),
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ padding: 24 }}><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <HeaderBar onBack={() => router.back()} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Capture button */}
                    <Animated.View entering={FadeInUp.duration(300)}>
                        <View style={[styles.captureCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <Pressable style={styles.cameraBtn} onPress={handleCapture}>
                                <Svg width={40} height={40} viewBox="0 0 24 24">
                                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" />
                                    <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" />
                                </Svg>
                                <Text className="font-inter text-sm font-bold text-primary-600">Capture Photo</Text>
                            </Pressable>

                            <View style={formStyles.field}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Caption</Text>
                                <TextInput
                                    style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                    placeholder="Describe the evidence..." placeholderTextColor={colors.neutral[400]}
                                    value={caption} onChangeText={setCaption}
                                />
                            </View>

                            <Pressable style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, addMut.isPending && { opacity: 0.6 }]} onPress={handleCapture} disabled={addMut.isPending}>
                                {addMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Upload Evidence</Text>}
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* Existing evidence */}
                    {evidence.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                            <Text className="mb-3 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">Evidence ({evidence.length})</Text>
                            {evidence.map((e: any, i: number) => (
                                <View key={i} style={[styles.evidenceCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                    <View style={styles.evidenceIcon}>
                                        <Svg width={20} height={20} viewBox="0 0 24 24">
                                            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                                        </Svg>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{e.caption ?? 'Photo'}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">
                                            {e.fileType ?? 'image'} | {e.createdAt ? fmt.dateTime(e.createdAt) : '-'}
                                        </Text>
                                    </View>
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
            <Text className="font-inter text-lg font-bold text-white">Capture Evidence</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    captureCard: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 16, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    cameraBtn: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary[200] },
    evidenceCard: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    evidenceIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
    field: { marginBottom: 0 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    submitBtn: { backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
