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
import { useCompleteWorkOrder, useCloseWorkOrder } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder, useActionCodes } from '@/features/maintenance/api/use-maintenance-queries';
import {
    buildObservationsForComplete,
    getWorkOrderExecutionObservations,
} from '@/features/maintenance/work-order-description';
import { useIsDark } from '@/hooks/use-is-dark';

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={summaryStyles.row}>
            <Text className="font-inter text-xs text-neutral-500">{label}</Text>
            <Text className={`font-inter text-sm font-bold ${highlight ? 'text-primary-700' : 'text-primary-950 dark:text-white'}`}>{value}</Text>
        </View>
    );
}

export function CloseJobScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: response, isLoading } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;

    const { data: actionCodesRaw } = useActionCodes();
    const actionCodes: any[] = React.useMemo(() => {
        const raw = (actionCodesRaw as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [actionCodesRaw]);

    const completeMut = useCompleteWorkOrder();
    const closeMut = useCloseWorkOrder();

    const [rootCauseCode, setRootCauseCode] = React.useState('');
    const [actionTaken, setActionTaken] = React.useState('');
    const [actionDescription, setActionDescription] = React.useState('');
    const [closureReason, setClosureReason] = React.useState('');
    const [jobObservations, setJobObservations] = React.useState('');
    const [recommendations, setRecommendations] = React.useState('');
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!wo) return;
        setRootCauseCode(wo.rootCauseCode ?? '');
        setActionTaken(wo.actionTakenCode ?? '');
        setActionDescription(wo.actionDescription ?? '');
        setJobObservations(getWorkOrderExecutionObservations(wo));
        setRecommendations(wo.recommendations ?? '');
        setClosureReason('');
    }, [wo?.id]);

    // Compute summary
    const partsUsed: any[] = wo?.partsUsed ?? [];
    const labourLogs: any[] = wo?.labourLogs ?? [];
    const evidence: any[] = wo?.evidence ?? [];
    const checklistSnapshot: any[] = wo?.checklistSnapshot ?? [];

    const totalLabourHrs = labourLogs.reduce((sum: number, l: any) => sum + Number(l.hours ?? 0), 0);
    const partsCost = partsUsed.reduce((sum: number, p: any) => sum + Number(p.totalCost ?? (Number(p.quantity ?? 0) * Number(p.unitCost ?? 0))), 0);
    const labourCost = labourLogs.reduce((sum: number, l: any) => sum + Number(l.totalCost ?? (Number(l.hours ?? 0) * Number(l.hourlyRate ?? 0))), 0);
    const totalCost = partsCost + labourCost;
    const totalChecklistFields = checklistSnapshot.reduce((sum: number, s: any) => sum + (s.fields?.length ?? 0), 0);

    const handleSubmit = async () => {
        if (!workOrderId) return;
        const reason = closureReason.trim();
        if (!reason) {
            showErrorMessage('Closure reason is required');
            return;
        }
        try {
            const completePayload = {
                observations: buildObservationsForComplete(wo, {
                    executionObservations: jobObservations,
                }),
                rootCauseCode: rootCauseCode || undefined,
                actionTakenCode: actionTaken || undefined,
                actionDescription: actionDescription.trim() || undefined,
                recommendations: recommendations.trim() || undefined,
            };
            if (wo?.status === 'IN_PROGRESS' || wo?.status === 'ACKNOWLEDGED' || wo?.status === 'ON_HOLD') {
                await completeMut.mutateAsync({ id: workOrderId, data: completePayload });
            }
            await closeMut.mutateAsync({
                id: workOrderId,
                data: { reason },
            });
            showSuccess('Work order closed');
            router.back();
        } catch {
            showErrorMessage('Failed to close work order');
        }
    };

    const isSubmitting = completeMut.isPending || closeMut.isPending;

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

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[mainStyles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                    alwaysBounceVertical
                >
                    {/* Summary card */}
                    <Animated.View entering={FadeInUp.duration(300)}>
                        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">Closure Summary</Text>
                            <SummaryRow label="Total Labour Time" value={`${totalLabourHrs.toFixed(1)} hrs`} />
                            <SummaryRow label="Labour Cost" value={`${labourCost.toFixed(2)}`} />
                            <SummaryRow label="Parts Used" value={`${partsUsed.length}`} />
                            {partsUsed.length > 0 ? (
                                <View style={{ marginVertical: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 10, gap: 6 }}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Parts Details</Text>
                                    {partsUsed.map((p: any, idx: number) => (
                                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text className="font-inter text-xs text-primary-900 dark:text-neutral-300" numberOfLines={1} style={{ flex: 1 }}>
                                                {p.partName ?? p.partNumber ?? `Part #${idx + 1}`}
                                            </Text>
                                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white ml-2">
                                                {p.quantity} x {Number(p.unitCost ?? 0).toFixed(2)} = {Number(p.totalCost ?? (Number(p.quantity ?? 0) * Number(p.unitCost ?? 0))).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                            <SummaryRow label="Parts Cost" value={`${partsCost.toFixed(2)}`} />
                            <SummaryRow label="Total Cost" value={`${totalCost.toFixed(2)}`} highlight />
                            <SummaryRow label="Checklist Fields" value={`${totalChecklistFields}`} />
                            <SummaryRow label="Evidence Items" value={`${evidence.length}`} />
                            <SummaryRow label="Actual End Time" value={new Date().toLocaleString()} />
                        </View>
                    </Animated.View>

                    {/* Root Cause Code */}
                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Root Cause Code</Text>
                            <Pressable
                                onPress={() => setOpenDropdown(openDropdown === 'rootCause' ? null : 'rootCause')}
                                style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                            >
                                <Text className={`font-inter text-sm ${rootCauseCode ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{rootCauseCode || 'Select root cause...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={openDropdown === 'rootCause' ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            {openDropdown === 'rootCause' ? (
                                <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {actionCodes.map((ac: any) => (
                                            <Pressable key={ac.id} onPress={() => { setRootCauseCode(ac.code ?? ac.name); setOpenDropdown(null); }} style={[formStyles.dropdownItem, rootCauseCode === (ac.code ?? ac.name) && { backgroundColor: colors.primary[50] }]}>
                                                <Text className="font-inter text-sm text-primary-950 dark:text-white">{ac.code ?? ac.name} - {ac.name ?? ''}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}
                        </View>
                    </Animated.View>

                    {/* Action Taken */}
                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Action Taken</Text>
                            <Pressable
                                onPress={() => setOpenDropdown(openDropdown === 'action' ? null : 'action')}
                                style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                            >
                                <Text className={`font-inter text-sm ${actionTaken ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{actionTaken || 'Select action...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={openDropdown === 'action' ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            {openDropdown === 'action' ? (
                                <View style={[formStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {actionCodes.map((ac: any) => (
                                            <Pressable key={ac.id} onPress={() => { setActionTaken(ac.code ?? ac.name); setOpenDropdown(null); }} style={[formStyles.dropdownItem, actionTaken === (ac.code ?? ac.name) && { backgroundColor: colors.primary[50] }]}>
                                                <Text className="font-inter text-sm text-primary-950 dark:text-white">{ac.code ?? ac.name} - {ac.name ?? ''}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}
                        </View>
                    </Animated.View>

                    {/* Closure reason */}
                    <Animated.View entering={FadeInUp.duration(300).delay(200)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Closure Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            <Text className="mb-2 font-inter text-[10px] text-neutral-500">Required to complete and close this work order</Text>
                            <TextInput
                                style={[formStyles.input, { height: 88, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Why is this job complete and ready to close?"
                                placeholderTextColor={colors.neutral[400]}
                                value={closureReason}
                                onChangeText={setClosureReason}
                                multiline
                            />
                        </View>
                    </Animated.View>

                    {/* Action description */}
                    <Animated.View entering={FadeInUp.duration(300).delay(215)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Action Description</Text>
                            <TextInput
                                style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Describe the action taken to resolve the issue..."
                                placeholderTextColor={colors.neutral[400]}
                                value={actionDescription}
                                onChangeText={setActionDescription}
                                multiline
                            />
                        </View>
                    </Animated.View>

                    {/* Job observations */}
                    <Animated.View entering={FadeInUp.duration(300).delay(225)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Observations</Text>
                            <Text className="mb-2 font-inter text-[10px] text-neutral-500">Findings during the job (kept separate from closure reason)</Text>
                            <TextInput
                                style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Detailed observations about the failure/job..."
                                placeholderTextColor={colors.neutral[400]}
                                value={jobObservations}
                                onChangeText={setJobObservations}
                                multiline
                            />
                        </View>
                    </Animated.View>

                    {/* Recommendations */}
                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <View style={formStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Recommendations</Text>
                            <TextInput
                                style={[formStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Recommendations..." placeholderTextColor={colors.neutral[400]}
                                value={recommendations} onChangeText={setRecommendations} multiline
                            />
                        </View>
                    </Animated.View>

                    {/* Actions */}
                    <Animated.View entering={FadeInUp.duration(300).delay(300)}>
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
                                disabled={isSubmitting}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    formStyles.submitBtn,
                                    { flex: 1 },
                                    pressed && { opacity: 0.85 },
                                    isSubmitting && { opacity: 0.6 },
                                ]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Complete &amp; Close</Text>
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

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
            <Text className="font-inter text-lg font-bold text-white">Close Job</Text>
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
    summaryCard: { borderRadius: 20, padding: 16, borderWidth: 1, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 20 },
});

const summaryStyles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[50] },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
    field: { marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    dropdown: { borderRadius: 10, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 11 },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
        backgroundColor: colors.success[600],
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.success[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});
