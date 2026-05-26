/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Image,
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
import {
    canAddWorkOrderEvidence,
    createEvidenceItem,
    MAX_EVIDENCE_UPLOAD_BYTES,
    normalizeWorkOrderEvidence,
    prepareEvidenceImageForUpload,
    WORK_ORDER_EVIDENCE_CAMERA_OPTIONS,
    WORK_ORDER_EVIDENCE_LIBRARY_OPTIONS,
} from '@/features/maintenance/work-order-evidence';
import { WorkOrderEvidenceThumb } from '@/features/maintenance/work-order-evidence-thumb';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

export function CaptureEvidenceScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const scrollRef = React.useRef<ScrollView>(null);
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: response, isLoading } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;
    const evidence = normalizeWorkOrderEvidence(wo);
    const canUpload = wo?.status ? canAddWorkOrderEvidence(String(wo.status)) : false;

    const addMut = useAddWOEvidence();
    const { upload, isUploading } = useFileUpload({
        category: 'expense-receipt',
        entityId: workOrderId ?? 'draft',
        maxSize: MAX_EVIDENCE_UPLOAD_BYTES,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    });

    const [caption, setCaption] = React.useState('');
    const [previewAsset, setPreviewAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
    const [justUploaded, setJustUploaded] = React.useState(false);
    const [isPreparing, setIsPreparing] = React.useState(false);

    const pickAsset = (asset: ImagePicker.ImagePickerAsset) => {
        setPreviewAsset(asset);
        setJustUploaded(false);
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showErrorMessage('Camera permission is required');
            return;
        }
        const result = await ImagePicker.launchCameraAsync(WORK_ORDER_EVIDENCE_CAMERA_OPTIONS);
        if (!result.canceled && result.assets[0]) {
            pickAsset(result.assets[0]);
        }
    };

    const pickFromLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showErrorMessage('Photo library permission is required');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync(WORK_ORDER_EVIDENCE_LIBRARY_OPTIONS);
        if (!result.canceled && result.assets[0]) {
            pickAsset(result.assets[0]);
        }
    };

    const clearPreview = () => {
        setPreviewAsset(null);
        setCaption('');
    };

    const confirmUpload = async () => {
        if (!previewAsset) {
            showErrorMessage('No photo selected');
            return;
        }
        if (!workOrderId) {
            showErrorMessage('Work order not found');
            return;
        }
        if (!canUpload) {
            showErrorMessage('Cannot add evidence to a closed work order');
            return;
        }

        setIsPreparing(true);
        try {
            const prepared = await prepareEvidenceImageForUpload(previewAsset);
            setIsPreparing(false);
            const key = await upload(prepared);
            if (!key) return;

            const item = createEvidenceItem({
                url: key,
                description: caption.trim() || undefined,
                fileName: prepared.name,
                contentType: prepared.type,
            });

            await addMut.mutateAsync({ id: workOrderId, evidence: [item] });
            showSuccess('Evidence saved');
            clearPreview();
            setJustUploaded(true);
            requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Failed to upload evidence';
            showErrorMessage(message);
        } finally {
            setIsPreparing(false);
        }
    };

    const isBusy = addMut.isPending || isUploading || isPreparing;

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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={[
                        mainStyles.scrollContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                    alwaysBounceVertical
                >
                    {!canUpload ? (
                        <View style={[styles.notice, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100] }]}>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-300">
                                This work order is closed — you can view evidence but not add more.
                            </Text>
                        </View>
                    ) : null}

                    {previewAsset ? (
                        <Animated.View entering={FadeInUp.duration(280)}>
                            <View style={[styles.previewCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                <Text className="mb-2 font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    Review photo
                                </Text>
                                <Text className="mb-3 font-inter text-xs text-neutral-500">
                                    Check the image below, add a caption if needed, then upload or retake.
                                </Text>
                                <Image
                                    source={{ uri: previewAsset.uri }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                    accessibilityLabel="Photo preview"
                                />
                                <View style={formStyles.field}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Caption (optional)</Text>
                                    <TextInput
                                        style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                        placeholder="Describe the evidence..."
                                        placeholderTextColor={colors.neutral[400]}
                                        value={caption}
                                        onChangeText={setCaption}
                                        editable={!isBusy}
                                    />
                                </View>

                                <View style={actionStyles.row}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            actionStyles.secondaryBtn,
                                            { borderColor: isDark ? colors.neutral[600] : colors.neutral[200] },
                                            pressed && { opacity: 0.85 },
                                            isBusy && styles.disabledBtn,
                                        ]}
                                        onPress={clearPreview}
                                        disabled={isBusy}
                                    >
                                        <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">Retake</Text>
                                    </Pressable>
                                    <Pressable
                                        style={({ pressed }) => [
                                            actionStyles.primaryBtn,
                                            pressed && { opacity: 0.85 },
                                            isBusy && styles.disabledBtn,
                                        ]}
                                        onPress={confirmUpload}
                                        disabled={isBusy}
                                    >
                                        {isBusy ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <ActivityIndicator color="#fff" size="small" />
                                                <Text className="font-inter text-sm font-bold text-white">
                                                    {isPreparing ? 'Preparing…' : 'Uploading…'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text className="font-inter text-base font-bold text-white">Upload Evidence</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </Animated.View>
                    ) : null}

                    {canUpload && !previewAsset ? (
                        <Animated.View entering={FadeInUp.duration(300)}>
                            <View style={[styles.captureCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                <Text className="mb-1 font-inter text-sm font-bold text-primary-950 dark:text-white">Add evidence</Text>
                                <Text className="mb-4 font-inter text-xs text-neutral-500">
                                    Take a photo or choose from your gallery. You can review before uploading.
                                </Text>
                                <View style={styles.actionRow}>
                                    <Pressable
                                        style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }, isBusy && styles.disabledBtn]}
                                        onPress={pickFromCamera}
                                        disabled={isBusy}
                                    >
                                        <Text className="font-inter text-sm font-bold text-primary-700 dark:text-primary-200">Take Photo</Text>
                                    </Pressable>
                                    <Pressable
                                        style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }, isBusy && styles.disabledBtn]}
                                        onPress={pickFromLibrary}
                                        disabled={isBusy}
                                    >
                                        <Text className="font-inter text-sm font-bold text-primary-700 dark:text-primary-200">Choose Photo</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </Animated.View>
                    ) : null}

                    {justUploaded ? (
                        <View style={[styles.successBanner, { backgroundColor: isDark ? '#14532d' : colors.success[50], borderColor: isDark ? colors.success[800] : colors.success[200] }]}>
                            <Text className="font-inter text-xs font-semibold text-success-800 dark:text-success-200">
                                Photo uploaded. Scroll down to see it in the list, or tap Done when finished.
                            </Text>
                        </View>
                    ) : null}

                    {evidence.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(80)}>
                            <Text className="mb-3 mt-2 font-inter text-sm font-bold text-primary-950 dark:text-white">
                                Uploaded evidence ({evidence.length})
                            </Text>
                            {evidence.map((item) => (
                                <WorkOrderEvidenceThumb key={item.id} item={item} isDark={isDark} fmt={fmt} />
                            ))}
                        </Animated.View>
                    ) : !previewAsset ? (
                        <Text className="mt-6 text-center font-inter text-sm text-neutral-400">
                            No evidence uploaded yet.
                        </Text>
                    ) : null}

                    {!previewAsset ? (
                        <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                            <View style={actionStyles.row}>
                                <Pressable
                                    style={({ pressed }) => [
                                        actionStyles.secondaryBtn,
                                        { borderColor: isDark ? colors.neutral[600] : colors.neutral[200] },
                                        pressed && { opacity: 0.85 },
                                    ]}
                                    onPress={() => router.back()}
                                >
                                    <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [actionStyles.primaryBtn, pressed && { opacity: 0.85 }]}
                                    onPress={() => router.back()}
                                >
                                    <Text className="font-inter text-base font-bold text-white">Done</Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    ) : null}

                    <View style={{ height: 24 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            <Text className="font-inter text-lg font-bold text-white">Capture Evidence</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const mainStyles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    captureCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    previewCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
        gap: 4,
    },
    previewImage: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        marginBottom: 12,
    },
    actionRow: { flexDirection: 'row', gap: 10 },
    secondaryBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
    },
    disabledBtn: { opacity: 0.5 },
    notice: { borderRadius: 12, padding: 12, marginBottom: 16 },
    successBanner: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
});

const actionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    secondaryBtn: {
        minWidth: 100,
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
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

const formStyles = StyleSheet.create({
    field: { marginBottom: 0 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
});
