import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useAssets } from '@/features/maintenance/api/use-maintenance-queries';
import { useLogBreakdown } from '@/features/maintenance/api/use-maintenance-mutations';
import { useIsDark } from '@/hooks/use-is-dark';
import { showSuccess, showError } from '@/components/ui/utils';

const PRIORITY_OPTIONS = [
    { value: 'EMERGENCY', label: 'Emergency', color: colors.danger[500] },
    { value: 'HIGH', label: 'High', color: colors.warning[500] },
    { value: 'MEDIUM', label: 'Medium', color: '#B45309' },
    { value: 'LOW', label: 'Low', color: colors.neutral[500] },
];

export function BreakdownLogScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [assetId, setAssetId] = React.useState('');
    const [assetName, setAssetName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [priority, setPriority] = React.useState('EMERGENCY');
    const [safetyRisk, setSafetyRisk] = React.useState(false);
    const [showAssetPicker, setShowAssetPicker] = React.useState(false);
    const [assetSearch, setAssetSearch] = React.useState('');

    const { data: assetsData } = useAssets({ search: assetSearch || undefined, limit: 20 });
    const assets: any[] = (assetsData as any)?.data ?? [];

    const logMutation = useLogBreakdown();

    const handleSubmit = async () => {
        if (!assetId || !description.trim()) return;
        try {
            const result = await logMutation.mutateAsync({ assetId, description, priority, safetyRisk });
            showSuccess('Breakdown Logged');
            const data = (result as any)?.data;
            const woId = data?.workOrderId ?? data?.id;
            if (woId) {
                router.replace({ pathname: '/maintenance/work-order-detail' as any, params: { id: woId } });
            } else {
                router.back();
            }
        } catch (err) {
            showError(err as any);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                    </Pressable>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white" style={{ marginTop: 8 }}>
                        Log Breakdown
                    </Text>
                    <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400" style={{ marginTop: 4 }}>
                        Quick-log an equipment breakdown
                    </Text>
                </Animated.View>

                {/* Warning banner */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : colors.danger[50] }]}>
                    <Text className="font-inter text-xs font-bold text-danger-700 dark:text-danger-400">
                        This will instantly create a breakdown WO and start tracking downtime.
                    </Text>
                </Animated.View>

                {/* Asset Picker */}
                <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
                    <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">Asset *</Text>
                    <Pressable
                        onPress={() => setShowAssetPicker(!showAssetPicker)}
                        style={[styles.input, { backgroundColor: isDark ? '#1A1730' : colors.neutral[50] }]}
                    >
                        <Text className="font-inter text-sm" style={{ color: assetName ? (isDark ? colors.white : colors.primary[950]) : colors.neutral[400] }}>
                            {assetName || 'Select an asset...'}
                        </Text>
                    </Pressable>
                    {showAssetPicker && (
                        <View style={[styles.dropdown, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <TextInput
                                value={assetSearch}
                                onChangeText={setAssetSearch}
                                placeholder="Search assets..."
                                placeholderTextColor={colors.neutral[400]}
                                style={[
                                    styles.dropdownSearchInput,
                                    {
                                        backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                                        color: isDark ? colors.white : colors.primary[950],
                                        marginBottom: 8,
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
                                        style={styles.dropdownItem}
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
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.section}>
                    <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">Description *</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What happened?"
                        placeholderTextColor={colors.neutral[400]}
                        multiline
                        numberOfLines={4}
                        style={[
                            styles.input,
                            {
                                backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                                height: 100,
                                textAlignVertical: 'top',
                                color: isDark ? colors.white : colors.primary[950],
                                borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
                            },
                        ]}
                    />
                </Animated.View>

                {/* Priority */}
                <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
                    <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">Priority</Text>
                    <View style={styles.priorityRow}>
                        {PRIORITY_OPTIONS.map((p) => (
                            <Pressable
                                key={p.value}
                                onPress={() => setPriority(p.value)}
                                style={[
                                    styles.priorityBtn,
                                    {
                                        backgroundColor: priority === p.value ? p.color + '15' : isDark ? '#1A1730' : colors.neutral[50],
                                        borderColor: priority === p.value ? p.color : isDark ? colors.neutral[800] : colors.neutral[200],
                                    },
                                ]}
                            >
                                <Text className="font-inter text-xs font-bold" style={{ color: priority === p.value ? p.color : colors.neutral[500] }}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Safety Risk */}
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={[styles.safetyRow, { backgroundColor: isDark ? 'rgba(217,119,6,0.1)' : '#FFF7ED' }]}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-warning-700 dark:text-warning-400">Safety Risk</Text>
                        <Text className="font-inter text-xs text-warning-600 dark:text-warning-500">Does this pose a safety hazard?</Text>
                    </View>
                    <Pressable
                        onPress={() => setSafetyRisk(!safetyRisk)}
                        style={[styles.toggle, { backgroundColor: safetyRisk ? colors.danger[500] : colors.neutral[300] }]}
                    >
                        <View style={[styles.toggleThumb, { transform: [{ translateX: safetyRisk ? 20 : 2 }] }]} />
                    </Pressable>
                </Animated.View>

                {/* Submit */}
                <Animated.View entering={FadeInUp.duration(400).delay(350)}>
                    <Pressable
                        onPress={handleSubmit}
                        disabled={!assetId || !description.trim() || logMutation.isPending}
                        style={[styles.submitBtn, { opacity: !assetId || !description.trim() || logMutation.isPending ? 0.5 : 1 }]}
                    >
                        <LinearGradient
                            colors={[colors.danger[600], colors.danger[700]]}
                            style={styles.submitGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text className="font-inter text-base font-bold text-white">
                                {logMutation.isPending ? 'Logging...' : 'Log Breakdown Now'}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtn: { paddingVertical: 8 },
    warningBanner: { padding: 16, borderRadius: 16, marginTop: 16 },
    section: { marginTop: 20, gap: 8 },
    input: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    dropdown: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        padding: 8,
        maxHeight: 220,
    },
    dropdownSearchInput: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 14,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    safetyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginTop: 20,
        gap: 12,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    submitBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
    submitGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 16,
    },
});
