/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal as RNModal,
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
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useAddWOParts, useReturnWOPart } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import { computePartLineCost, validateAddPartForm } from '@/features/maintenance/work-order-parts-labour';
import { useIsDark } from '@/hooks/use-is-dark';

export function AddPartsScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();
    const { data: response, isLoading, error, refetch } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;
    const partsUsed: any[] = wo?.partsUsed ?? [];

    const addPartsMut = useAddWOParts();
    const returnPartMut = useReturnWOPart();

    const [partName, setPartName] = React.useState('');
    const [partNumber, setPartNumber] = React.useState('');
    const [quantity, setQuantity] = React.useState('');
    const [unitCost, setUnitCost] = React.useState('');
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [returnTarget, setReturnTarget] = React.useState<{ id: string; name: string; maxQty: number } | null>(null);
    const [returnQty, setReturnQty] = React.useState('1');
    const [returnCondition, setReturnCondition] = React.useState('');
    const [returnError, setReturnError] = React.useState('');

    const handleAdd = () => {
        const e = validateAddPartForm(partName, quantity);
        setErrors(e);
        if (Object.keys(e).length > 0 || !workOrderId) return;
        const data: Record<string, unknown> = {
            partName: partName.trim(),
            quantity: Number(quantity),
        };
        if (partNumber.trim()) data.partNumber = partNumber.trim();
        if (unitCost.trim() && !isNaN(Number(unitCost))) data.unitCost = Number(unitCost);

        addPartsMut.mutate({ id: workOrderId, data }, {
            onSuccess: () => {
                showSuccess('Part added');
                setPartName(''); setPartNumber(''); setQuantity(''); setUnitCost('');
                refetch();
            },
            onError: () => showErrorMessage('Failed to add part'),
        });
    };

    const handleReturn = (partId: string, name: string, maxQty: number) => {
        setReturnTarget({ id: partId, name, maxQty });
        setReturnQty(String(maxQty));
        setReturnCondition('');
        setReturnError('');
    };

    const confirmReturn = () => {
        if (!workOrderId || !returnTarget) return;
        const qty = Number(returnQty);
        if (!qty || qty <= 0 || qty > returnTarget.maxQty) {
            setReturnError(`Return quantity must be between 1 and ${returnTarget.maxQty}`);
            return;
        }
        returnPartMut.mutate(
            {
                id: workOrderId,
                partId: returnTarget.id,
                data: {
                    returnQty: qty,
                    returnCondition: returnCondition.trim() || undefined,
                },
            },
            {
                onSuccess: () => {
                    showSuccess('Part returned');
                    setReturnTarget(null);
                    refetch();
                },
                onError: () => showErrorMessage('Failed to return part'),
            },
        );
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
                    {/* Existing parts */}
                    {partsUsed.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(300)}>
                            <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">Parts Used ({partsUsed.length})</Text>
                            {partsUsed.map((p: any) => {
                                const lineTotal = computePartLineCost(p);
                                const isReturned = Boolean(p.isReturned);
                                return (
                                    <View key={p.id} style={[styles.partCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{p.partName ?? '-'}</Text>
                                            <Text className="font-inter text-[10px] text-neutral-400">
                                                {p.partNumber ? `${p.partNumber} · ` : ''}Qty: {p.quantity ?? 0}
                                                {lineTotal > 0 ? ` · Total: ${lineTotal.toFixed(2)}` : ''}
                                                {isReturned ? ' · Returned' : ''}
                                            </Text>
                                        </View>
                                        {!isReturned ? (
                                            <Pressable
                                                onPress={() => handleReturn(p.id, p.partName ?? 'Part', Number(p.quantity) || 1)}
                                                style={styles.returnBtn}
                                                hitSlop={8}
                                            >
                                                <Text className="font-inter text-[10px] font-bold text-danger-600">Return</Text>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </Animated.View>
                    ) : null}

                    {/* Add form */}
                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <Text className="mb-3 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">Add Part</Text>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Part Name <Text className="text-danger-500">*</Text></Text>
                            <TextInput
                                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.partName ? { borderColor: colors.danger[400] } : undefined]}
                                placeholder="Part name" placeholderTextColor={colors.neutral[400]} value={partName} onChangeText={(v) => { setPartName(v); if (errors.partName) setErrors((p) => { const n = { ...p }; delete n.partName; return n; }); }}
                            />
                            {errors.partName ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.partName}</Text> : null}
                        </View>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Part Number</Text>
                            <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Part number" placeholderTextColor={colors.neutral[400]} value={partNumber} onChangeText={setPartNumber} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Quantity <Text className="text-danger-500">*</Text></Text>
                                <TextInput
                                    style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, errors.quantity ? { borderColor: colors.danger[400] } : undefined]}
                                    placeholder="Qty" placeholderTextColor={colors.neutral[400]} value={quantity} onChangeText={(v) => { setQuantity(v); if (errors.quantity) setErrors((p) => { const n = { ...p }; delete n.quantity; return n; }); }}
                                    keyboardType="numeric"
                                />
                                {errors.quantity ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.quantity}</Text> : null}
                            </View>
                            <View style={[formStyles.field, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Unit Cost</Text>
                                <TextInput style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="0.00" placeholderTextColor={colors.neutral[400]} value={unitCost} onChangeText={setUnitCost} keyboardType="numeric" />
                            </View>
                        </View>
                        <Pressable style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, addPartsMut.isPending && { opacity: 0.6 }]} onPress={handleAdd} disabled={addPartsMut.isPending}>
                            {addPartsMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Add Part</Text>}
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
            <RNModal visible={!!returnTarget} animationType="slide" transparent onRequestClose={() => setReturnTarget(null)}>
                <View style={styles.returnOverlay}>
                    <View style={[styles.returnSheet, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-1">
                            Return Part
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500 mb-4">{returnTarget?.name}</Text>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Return Quantity *</Text>
                        <TextInput
                            style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: returnError ? colors.danger[400] : isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                            value={returnQty}
                            onChangeText={(v) => { setReturnQty(v); if (returnError) setReturnError(''); }}
                            keyboardType="numeric"
                            placeholder="Qty"
                            placeholderTextColor={colors.neutral[400]}
                        />
                        {returnError ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{returnError}</Text> : null}
                        <Text className="mb-1.5 mt-3 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Return Condition</Text>
                        <TextInput
                            style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                            value={returnCondition}
                            onChangeText={setReturnCondition}
                            placeholder="e.g. Good, Damaged"
                            placeholderTextColor={colors.neutral[400]}
                        />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable onPress={() => setReturnTarget(null)} style={[styles.returnAction, { backgroundColor: colors.neutral[100] }]}>
                                <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
                            </Pressable>
                            <Pressable onPress={confirmReturn} style={[styles.returnAction, { backgroundColor: colors.warning[600] }]}>
                                <Text className="font-inter text-sm font-bold text-white">Confirm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </RNModal>
        </View>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
            <Text className="font-inter text-lg font-bold text-white">Parts</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    partCard: { borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    returnBtn: { backgroundColor: colors.danger[50], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    returnOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    returnSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    returnAction: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
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
