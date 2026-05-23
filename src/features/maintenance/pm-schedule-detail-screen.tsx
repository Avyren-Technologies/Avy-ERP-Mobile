/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    Modal as RNModal,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useGenerateWOFromPM, useReschedulePM, useSkipPM } from '@/features/maintenance/api/use-maintenance-mutations';
import { usePMSchedule } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

const STRATEGY_LABELS: Record<string, string> = {
    TIME_BASED: 'Time Based',
    METER_BASED: 'Meter Based',
    CONDITION_BASED: 'Condition Based',
    CALENDAR_BASED: 'Calendar Based',
    EVENT_BASED: 'Event Based',
};

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={infoStyles.row}>
            <Text className="font-inter text-xs font-semibold text-neutral-500">{label}</Text>
            <Text className="font-inter text-sm text-primary-950 dark:text-white" numberOfLines={3}>{value}</Text>
        </View>
    );
}

function RescheduleSheet({ visible, onClose, onSubmit, isSubmitting }: {
    visible: boolean; onClose: () => void; onSubmit: (data: { newDate: string; reason?: string }) => void; isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [newDate, setNewDate] = React.useState('');
    const [reason, setReason] = React.useState('');
    React.useEffect(() => { if (visible) { setNewDate(''); setReason(''); } }, [visible]);

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Reschedule PM</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">New Date <Text className="text-danger-500">*</Text></Text>
                        <TextInput style={[sheetStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="yyyy-mm-dd" placeholderTextColor={colors.neutral[400]} value={newDate} onChangeText={setNewDate} />
                    </View>
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason</Text>
                        <TextInput style={[sheetStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]} placeholder="Reason for rescheduling..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline />
                    </View>
                </ScrollView>
                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, (isSubmitting || !newDate.trim()) && { opacity: 0.5 }]} onPress={() => onSubmit({ newDate: newDate.trim(), reason: reason.trim() || undefined })} disabled={isSubmitting || !newDate.trim()}>
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Reschedule</Text>}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

export function PMScheduleDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const confirmModal = useConfirmModal();

    const { data: response, isLoading, error, refetch } = usePMSchedule(id ?? '');
    const pm: any = (response as any)?.data ?? null;

    const [rescheduleVisible, setRescheduleVisible] = React.useState(false);

    const rescheduleMut = useReschedulePM();
    const skipMut = useSkipPM();
    const generateMut = useGenerateWOFromPM();

    const handleReschedule = (data: { newDate: string; reason?: string }) => {
        if (!id) return;
        rescheduleMut.mutate({ id, data }, {
            onSuccess: () => { setRescheduleVisible(false); showSuccess('PM rescheduled'); refetch(); },
            onError: () => showErrorMessage('Failed to reschedule'),
        });
    };

    const handleSkip = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Skip PM',
            message: 'Are you sure you want to skip this PM occurrence?',
            confirmText: 'Skip',
            variant: 'danger',
            onConfirm: () => skipMut.mutate({ id, data: { reason: 'Skipped from mobile' } }, {
                onSuccess: () => { showSuccess('PM skipped'); refetch(); },
                onError: () => showErrorMessage('Failed to skip'),
            }),
        });
    };

    const handleGenerateWO = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Generate Work Order',
            message: 'Generate a work order from this PM schedule?',
            confirmText: 'Generate',
            variant: 'primary',
            onConfirm: () => generateMut.mutate(id, {
                onSuccess: () => { showSuccess('Work order generated'); refetch(); },
                onError: () => showErrorMessage('Failed to generate'),
            }),
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

    if (error || !pm) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState icon="error" title="Failed to load" message="Could not load PM schedule details." action={{ label: 'Retry', onPress: () => refetch() }} />
                </View>
            </View>
        );
    }

    const isOverdue = pm.isOverdue || (pm.nextDueDate && new Date(pm.nextDueDate) < new Date());
    const recentWOs: any[] = pm.workOrders ?? [];

    // Days until due
    let daysUntilDue = '-';
    if (pm.nextDueDate) {
        const diff = Math.ceil((new Date(pm.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysUntilDue = diff <= 0 ? `${Math.abs(diff)} days overdue` : `${diff} days`;
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <HeaderBar onBack={() => router.back()} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Animated.View entering={FadeInDown.duration(350)}>
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{pm.name ?? 'PM Schedule'}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <View style={[styles.badge, { backgroundColor: pm.isActive !== false ? colors.success[50] : colors.neutral[100] }]}>
                            <Text className={`font-inter text-[10px] font-bold ${pm.isActive !== false ? 'text-success-700' : 'text-neutral-500'}`}>
                                {pm.isActive !== false ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">
                                {STRATEGY_LABELS[pm.strategyType] ?? pm.strategyType}
                            </Text>
                        </View>
                        {isOverdue ? (
                            <View style={[styles.badge, { backgroundColor: colors.danger[50] }]}>
                                <Text className="font-inter text-[10px] font-bold text-danger-700">Overdue</Text>
                            </View>
                        ) : null}
                    </View>
                </Animated.View>

                {/* Due countdown */}
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    <View style={[styles.dueCard, { backgroundColor: isOverdue ? colors.danger[50] : colors.success[50], borderColor: isOverdue ? colors.danger[200] : colors.success[200] }]}>
                        <Text className={`font-inter text-2xl font-bold ${isOverdue ? 'text-danger-700' : 'text-success-700'}`}>{daysUntilDue}</Text>
                        <Text className={`font-inter text-xs ${isOverdue ? 'text-danger-600' : 'text-success-600'}`}>
                            {pm.nextDueDate ? `Next due: ${fmt.date(pm.nextDueDate)}` : 'No scheduled date'}
                        </Text>
                    </View>
                </Animated.View>

                {/* Info */}
                <Animated.View entering={FadeInUp.duration(350).delay(150)}>
                    <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                        <InfoRow label="Asset" value={pm.asset?.name ?? '-'} />
                        <InfoRow label="Strategy" value={STRATEGY_LABELS[pm.strategyType] ?? pm.strategyType ?? '-'} />
                        {pm.frequencyValue ? <InfoRow label="Frequency" value={`Every ${pm.frequencyValue} ${pm.frequencyUnit ?? ''}`} /> : null}
                        {pm.leadDays != null ? <InfoRow label="Lead Days" value={`${pm.leadDays}`} /> : null}
                        {pm.graceDays != null ? <InfoRow label="Grace Days" value={`${pm.graceDays}`} /> : null}
                        {pm.jobPlan ? <InfoRow label="Job Plan" value={pm.jobPlan.name ?? '-'} /> : null}
                        <InfoRow label="Created" value={pm.createdAt ? fmt.dateTime(pm.createdAt) : '-'} />
                    </View>
                </Animated.View>

                {/* Actions */}
                <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                    <View style={styles.actionsSection}>
                        <Pressable onPress={() => setRescheduleVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.primary[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Reschedule</Text>
                        </Pressable>
                        <Pressable onPress={handleSkip} style={[styles.actionBtn, { backgroundColor: colors.warning[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Skip</Text>
                        </Pressable>
                        <Pressable onPress={handleGenerateWO} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Generate WO</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Recent WOs */}
                {recentWOs.length > 0 ? (
                    <Animated.View entering={FadeInUp.duration(350).delay(300)}>
                        <Text className="mb-3 mt-6 font-inter text-sm font-bold text-primary-950 dark:text-white">Recent Work Orders</Text>
                        {recentWOs.map((wo: any, i: number) => (
                            <Pressable key={i} onPress={() => router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: wo.id } })} style={[styles.woCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{wo.woNumber ?? '-'}</Text>
                                <Text className="font-inter text-[10px] text-neutral-400">{(wo.status ?? '').replace(/_/g, ' ')} | {wo.createdAt ? fmt.date(wo.createdAt) : '-'}</Text>
                            </Pressable>
                        ))}
                    </Animated.View>
                ) : null}
            </ScrollView>

            <RescheduleSheet visible={rescheduleVisible} onClose={() => setRescheduleVisible(false)} onSubmit={handleReschedule} isSubmitting={rescheduleMut.isPending} />
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
            <Text className="font-inter text-lg font-bold text-white">PM Schedule</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    dueCard: { borderRadius: 16, padding: 20, marginTop: 16, alignItems: 'center', borderWidth: 1, gap: 4 },
    infoCard: { borderRadius: 20, padding: 16, borderWidth: 1, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, gap: 12, marginTop: 16 },
    actionsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
    actionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 90 },
    woCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, gap: 4 },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const infoStyles = StyleSheet.create({ row: { gap: 2 } });

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    field: { marginBottom: 20 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    submitContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    submitBtn: { backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
