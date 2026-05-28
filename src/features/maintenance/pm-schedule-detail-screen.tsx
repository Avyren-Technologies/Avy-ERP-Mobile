/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    Modal as RNModal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { DatePickerField } from '@/components/ui/date-picker';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useGenerateWOFromPM, useReschedulePM, useSkipPM } from '@/features/maintenance/api/use-maintenance-mutations';
import { usePMSchedule } from '@/features/maintenance/api/use-maintenance-queries';
import { SectionCard } from '@/features/maintenance/components/section-card';
import {
    resolveMaintenanceAssetName,
    resolveMaintenanceAssetNumber,
} from '@/features/maintenance/maintenance-asset-display';
import {
    formatPMFrequencyDisplay,
    formatPMRescheduleReason,
    formatPMScheduleTypeLabel,
    formatPMStrategyLabel,
    getPMRescheduleNewDate,
    getPMRescheduleOldDate,
    getPMRescheduleTimestamp,
    type PMRescheduleHistoryEntry,
} from '@/features/maintenance/pm-schedule-form';
import { WOStatusBadge } from '@/features/maintenance/shared/wo-status-badge';
import { useCanPerform } from '@/hooks/use-can-perform';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={infoStyles.row}>
            <Text className="font-inter text-xs font-semibold text-neutral-500">{label}</Text>
            <Text className="font-inter text-sm text-primary-950 dark:text-white" numberOfLines={4}>
                {value}
            </Text>
        </View>
    );
}

function RescheduleSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { newDate: string; reasonNotes?: string }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [newDate, setNewDate] = React.useState('');
    const [reasonNotes, setReasonNotes] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setNewDate('');
            setReasonNotes('');
        }
    }, [visible]);

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Reschedule PM</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <DatePickerField label="New due date" value={newDate} onChange={setNewDate} />
                    <View style={[sheetStyles.field, { marginTop: 16 }]}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Notes (optional)</Text>
                        <TextInput
                            style={[
                                sheetStyles.input,
                                {
                                    height: 80,
                                    textAlignVertical: 'top',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    color: isDark ? colors.white : colors.primary[950],
                                },
                            ]}
                            placeholder="Reason for rescheduling..."
                            placeholderTextColor={colors.neutral[400]}
                            value={reasonNotes}
                            onChangeText={setReasonNotes}
                            multiline
                        />
                    </View>
                </ScrollView>
                <View
                    style={[
                        sheetStyles.submitContainer,
                        {
                            paddingBottom: insets.bottom + 16,
                            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                        },
                    ]}
                >
                    <Pressable
                        style={({ pressed }) => [
                            sheetStyles.submitBtn,
                            { backgroundColor: '#2563EB' },
                            pressed && { opacity: 0.85 },
                            (isSubmitting || !newDate.trim()) && { opacity: 0.5 },
                        ]}
                        onPress={() => onSubmit({ newDate: newDate.trim(), reasonNotes: reasonNotes.trim() || undefined })}
                        disabled={isSubmitting || !newDate.trim()}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-inter text-base font-bold text-white">Reschedule</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

function SkipSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) setReason('');
    }, [visible]);

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Skip PM Occurrence</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Reason <Text className="text-danger-500">*</Text>
                        </Text>
                        <TextInput
                            style={[
                                sheetStyles.input,
                                {
                                    height: 100,
                                    textAlignVertical: 'top',
                                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    color: isDark ? colors.white : colors.primary[950],
                                },
                            ]}
                            placeholder="Reason for skipping..."
                            placeholderTextColor={colors.neutral[400]}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                        />
                    </View>
                </ScrollView>
                <View
                    style={[
                        sheetStyles.submitContainer,
                        {
                            paddingBottom: insets.bottom + 16,
                            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                        },
                    ]}
                >
                    <Pressable
                        style={({ pressed }) => [
                            sheetStyles.submitBtn,
                            { backgroundColor: colors.warning[600] },
                            pressed && { opacity: 0.85 },
                            (isSubmitting || !reason.trim()) && { opacity: 0.5 },
                        ]}
                        onPress={() => onSubmit(reason.trim())}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-inter text-base font-bold text-white">Skip</Text>
                        )}
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
    const canManage = useCanPerform('maintenance.pm-schedule:update');

    const { data: response, isLoading, error, refetch, isFetching } = usePMSchedule(id ?? '');
    const pm: Record<string, unknown> | null = (response as { data?: Record<string, unknown> })?.data ?? null;

    useFocusEffect(
        React.useCallback(() => {
            if (id) refetch();
        }, [id, refetch]),
    );

    const [rescheduleVisible, setRescheduleVisible] = React.useState(false);
    const [skipVisible, setSkipVisible] = React.useState(false);

    const rescheduleMut = useReschedulePM();
    const skipMut = useSkipPM();
    const generateMut = useGenerateWOFromPM();

    const handleReschedule = (data: { newDate: string; reasonNotes?: string }) => {
        if (!id) return;
        rescheduleMut.mutate(
            {
                id,
                data: {
                    newDueDate: data.newDate,
                    reasonCode: 'OTHER',
                    reasonNotes: data.reasonNotes,
                },
            },
            {
                onSuccess: () => {
                    setRescheduleVisible(false);
                    showSuccess('PM rescheduled');
                    refetch();
                },
                onError: () => showErrorMessage('Failed to reschedule'),
            },
        );
    };

    const handleSkip = (reason: string) => {
        if (!id) return;
        skipMut.mutate(
            { id, data: { reason } },
            {
                onSuccess: () => {
                    setSkipVisible(false);
                    showSuccess('PM skipped');
                    refetch();
                },
                onError: () => showErrorMessage('Failed to skip'),
            },
        );
    };

    const handleGenerateWO = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Generate Work Order',
            message: 'Generate a work order from this PM schedule?',
            confirmText: 'Generate',
            variant: 'primary',
            onConfirm: () =>
                generateMut.mutate(id, {
                    onSuccess: () => {
                        showSuccess('Work order generated');
                        refetch();
                    },
                    onError: () => showErrorMessage('Failed to generate'),
                }),
        });
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

    if (error || !pm) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load"
                        message="Could not load PM schedule details."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    const name = String(pm.name ?? 'PM Schedule');
    const strategyType = pm.strategyType as string | undefined;
    const nextDueDate = pm.nextDueDate as string | undefined;
    const isOverdue = Boolean(pm.isOverdue || (nextDueDate && new Date(nextDueDate) < new Date()));
    const recentWOs = (pm.workOrders as Record<string, unknown>[]) ?? [];
    const rescheduleHistory = (pm.rescheduleHistory as PMRescheduleHistoryEntry[]) ?? [];

    let daysUntilDue: number | null = null;
    if (nextDueDate) {
        daysUntilDue = Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    const asset = pm.asset as { id?: string; name?: string; assetNumber?: string; code?: string } | undefined;
    const jobPlan = pm.jobPlan as { name?: string; description?: string } | undefined;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <HeaderBar onBack={() => router.back()} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            >
                {/* Title & badges */}
                <Animated.View entering={FadeInDown.duration(350)}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: isOverdue
                                        ? colors.danger[50]
                                        : pm.isActive !== false
                                          ? colors.success[50]
                                          : colors.neutral[100],
                                },
                            ]}
                        >
                            <Text
                                className={`font-inter text-[10px] font-bold ${
                                    isOverdue
                                        ? 'text-danger-700'
                                        : pm.isActive !== false
                                          ? 'text-success-700'
                                          : 'text-neutral-500'
                                }`}
                            >
                                {isOverdue ? 'Overdue' : pm.isActive !== false ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">
                                {formatPMStrategyLabel(strategyType)}
                            </Text>
                        </View>
                    </View>
                    <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">{name}</Text>
                </Animated.View>

                {/* Next due */}
                <Animated.View entering={FadeInUp.duration(350).delay(80)}>
                    <View
                        style={[
                            styles.dueCard,
                            {
                                backgroundColor: isOverdue
                                    ? isDark
                                        ? 'rgba(239,68,68,0.12)'
                                        : colors.danger[50]
                                    : isDark
                                      ? '#1A1730'
                                      : colors.white,
                                borderColor: isOverdue ? colors.danger[200] : isDark ? colors.primary[900] : colors.neutral[200],
                            },
                        ]}
                    >
                        <Text className="mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500">Next Due</Text>
                        <Text
                            className={`font-inter text-2xl font-bold ${isOverdue ? 'text-danger-700' : 'text-primary-950 dark:text-white'}`}
                        >
                            {nextDueDate ? fmt.date(nextDueDate) : 'Not scheduled'}
                        </Text>
                        {daysUntilDue !== null ? (
                            <Text
                                className={`mt-1 font-inter text-sm ${isOverdue ? 'text-danger-600' : 'text-neutral-500'}`}
                            >
                                {daysUntilDue <= 0
                                    ? `${Math.abs(daysUntilDue)} days overdue`
                                    : `${daysUntilDue} days from now`}
                            </Text>
                        ) : null}
                    </View>
                </Animated.View>

                {/* Actions — full-width, web-aligned colors */}
                <Animated.View entering={FadeInUp.duration(350).delay(120)}>
                    <View style={styles.actionsColumn}>
                        {canManage ? (
                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname: '/maintenance/pm-schedule-create' as never,
                                        params: { editId: id ?? '' },
                                    })
                                }
                                style={({ pressed }) => [
                                    styles.actionBtnFull,
                                    {
                                        backgroundColor: isDark ? colors.neutral[800] : colors.white,
                                        borderWidth: 1,
                                        borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
                                    },
                                    pressed && { opacity: 0.9 },
                                ]}
                            >
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Edit Schedule</Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            onPress={() => setRescheduleVisible(true)}
                            style={({ pressed }) => [styles.actionBtnFull, { backgroundColor: '#2563EB' }, pressed && { opacity: 0.9 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">Reschedule</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setSkipVisible(true)}
                            style={({ pressed }) => [
                                styles.actionBtnFull,
                                { backgroundColor: colors.warning[600] },
                                pressed && { opacity: 0.9 },
                            ]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">Skip</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleGenerateWO}
                            disabled={generateMut.isPending}
                            style={({ pressed }) => [
                                styles.actionBtnFull,
                                { backgroundColor: colors.success[600] },
                                pressed && { opacity: 0.9 },
                                generateMut.isPending && { opacity: 0.6 },
                            ]}
                        >
                            {generateMut.isPending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="font-inter text-sm font-bold text-white">Generate WO</Text>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Asset */}
                <Animated.View entering={FadeInUp.duration(350).delay(160)}>
                    <SectionCard title="Asset" isDark={isDark}>
                        {asset ? (
                            <>
                                <Pressable
                                    onPress={() =>
                                        asset.id
                                            ? router.push({
                                                  pathname: '/maintenance/asset-detail' as never,
                                                  params: { id: asset.id },
                                              })
                                            : undefined
                                    }
                                >
                                    <Text className="font-inter text-sm font-bold text-primary-600 dark:text-primary-400">
                                        {resolveMaintenanceAssetName(asset)}
                                    </Text>
                                </Pressable>
                                <InfoRow label="Asset Number" value={resolveMaintenanceAssetNumber(asset)} />
                            </>
                        ) : (
                            <Text className="font-inter text-sm text-neutral-400">No asset linked.</Text>
                        )}
                    </SectionCard>
                </Animated.View>

                {/* Schedule info */}
                <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                    <SectionCard title="Schedule Info" isDark={isDark}>
                        <InfoRow label="Strategy" value={formatPMStrategyLabel(strategyType)} />
                        {strategyType === 'AMC_MANAGED' ? (
                            <View style={infoStyles.row}>
                                <Text className="font-inter text-xs font-semibold text-neutral-500">Service Contract</Text>
                                {pm.contract ? (
                                    <Pressable
                                        onPress={() => {
                                            const contract = pm.contract as { id: string };
                                            router.push({
                                                pathname: '/maintenance/contract-detail' as any,
                                                params: { id: contract.id },
                                            });
                                        }}
                                    >
                                        <Text className="font-inter text-sm font-bold text-primary-600 dark:text-primary-400">
                                            {String((pm.contract as { name?: string }).name ?? '—')} { (pm.contract as { contractCode?: string }).contractCode ? `(${(pm.contract as { contractCode?: string }).contractCode})` : '' }
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <Text className="font-inter text-sm text-neutral-400">—</Text>
                                )}
                            </View>
                        ) : null}
                        {(pm.frequency || pm.meterInterval) ? (
                            <InfoRow label="Frequency" value={formatPMFrequencyDisplay(pm)} />
                        ) : null}
                        {pm.scheduleType ? (
                            <InfoRow label="Schedule Type" value={formatPMScheduleTypeLabel(pm.scheduleType as string)} />
                        ) : null}
                        <InfoRow label="Lead Days" value={pm.leadDays != null ? String(pm.leadDays) : '—'} />
                        <InfoRow
                            label="Grace Period"
                            value={pm.gracePeriodDays != null ? `${pm.gracePeriodDays} days` : '—'}
                        />
                        <InfoRow label="Auto-Assign" value={pm.autoAssignRule ? 'Yes' : 'No'} />
                        {pm.autoAssignTo ? <InfoRow label="Auto Technician" value={String(pm.autoAssignTo)} /> : null}
                    </SectionCard>
                </Animated.View>

                {/* Job plan */}
                {jobPlan?.name ? (
                    <Animated.View entering={FadeInUp.duration(350).delay(240)}>
                        <SectionCard title="Job Plan" isDark={isDark}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{jobPlan.name}</Text>
                            {jobPlan.description ? (
                                <Text className="mt-1 font-inter text-xs text-neutral-400">{jobPlan.description}</Text>
                            ) : null}
                        </SectionCard>
                    </Animated.View>
                ) : null}

                {/* Dates */}
                <Animated.View entering={FadeInUp.duration(350).delay(280)}>
                    <SectionCard title="Dates" isDark={isDark}>
                        <InfoRow
                            label="Last Completed"
                            value={pm.lastCompletedDate ? fmt.date(String(pm.lastCompletedDate)) : '—'}
                        />
                        <InfoRow label="Created" value={pm.createdAt ? fmt.dateTime(String(pm.createdAt)) : '—'} />
                        <InfoRow label="Updated" value={pm.updatedAt ? fmt.dateTime(String(pm.updatedAt)) : '—'} />
                    </SectionCard>
                </Animated.View>

                {/* Recent work orders */}
                <Animated.View entering={FadeInUp.duration(350).delay(320)}>
                    <SectionCard title="Recent Work Orders" isDark={isDark}>
                        {recentWOs.length === 0 ? (
                            <Text className="py-2 text-center font-inter text-sm text-neutral-400">
                                No work orders generated yet.
                            </Text>
                        ) : (
                            recentWOs.map((wo) => {
                                const woPriority = wo.priority ? String(wo.priority) : null;
                                return (
                                    <Pressable
                                        key={String(wo.id)}
                                        onPress={() =>
                                            router.push({
                                                pathname: '/maintenance/work-order-detail' as never,
                                                params: { id: String(wo.id) },
                                            })
                                        }
                                        style={[
                                            styles.woRow,
                                            {
                                                borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
                                                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                            },
                                        ]}
                                    >
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <View style={styles.woBadgeRow}>
                                                <View
                                                    style={[
                                                        styles.woNumberBadge,
                                                        { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                                    ]}
                                                >
                                                    <Text className="font-inter text-[10px] font-bold text-primary-700 dark:text-primary-300">
                                                        {String(wo.woNumber ?? '—')}
                                                    </Text>
                                                </View>
                                                <WOStatusBadge status={String(wo.status ?? 'DRAFT')} />
                                            </View>
                                            {woPriority ? (
                                                <Text className="font-inter text-[10px] text-neutral-400">
                                                    Priority: {woPriority}
                                                </Text>
                                            ) : null}
                                            {wo.plannedStart ? (
                                                <Text className="font-inter text-[10px] text-neutral-400">
                                                    Planned: {fmt.date(String(wo.plannedStart))}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                            <Text className="font-inter text-xs text-neutral-400">
                                                {wo.createdAt ? fmt.date(String(wo.createdAt)) : '—'}
                                            </Text>
                                            <Text className="font-inter text-[10px] font-semibold text-primary-600">View</Text>
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </SectionCard>
                </Animated.View>

                {/* Reschedule history */}
                {rescheduleHistory.length > 0 ? (
                    <Animated.View entering={FadeInUp.duration(350).delay(360)}>
                        <SectionCard title="Reschedule History" isDark={isDark}>
                            {rescheduleHistory.map((entry, idx) => {
                                const oldDate = getPMRescheduleOldDate(entry);
                                const newDate = getPMRescheduleNewDate(entry);
                                const reason = formatPMRescheduleReason(entry);
                                const when = getPMRescheduleTimestamp(entry);
                                return (
                                    <View key={idx} style={[styles.historyRow, idx > 0 && styles.historyRowBorder]}>
                                        <View style={styles.historyDot} />
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-medium text-primary-950 dark:text-white">
                                                {oldDate ? fmt.date(oldDate) : '—'} → {newDate ? fmt.date(newDate) : '—'}
                                            </Text>
                                            {reason ? (
                                                <Text className="mt-0.5 font-inter text-xs text-neutral-400">{reason}</Text>
                                            ) : null}
                                            {when ? (
                                                <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
                                                    {fmt.dateTime(when)}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </SectionCard>
                    </Animated.View>
                ) : null}
            </ScrollView>

            <RescheduleSheet
                visible={rescheduleVisible}
                onClose={() => setRescheduleVisible(false)}
                onSubmit={handleReschedule}
                isSubmitting={rescheduleMut.isPending}
            />
            <SkipSheet
                visible={skipVisible}
                onClose={() => setSkipVisible(false)}
                onSubmit={handleSkip}
                isSubmitting={skipMut.isPending}
            />
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
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
            <Text className="font-inter text-lg font-bold text-white">PM Schedule</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    dueCard: {
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        gap: 4,
    },
    actionsColumn: { marginTop: 16, gap: 10 },
    actionBtnFull: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    woRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        gap: 8,
    },
    woBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    woNumberBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    historyRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
    historyRowBorder: { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563EB',
        marginTop: 6,
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

const infoStyles = StyleSheet.create({ row: { gap: 4 } });

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    field: { marginBottom: 20 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    submitContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    submitBtn: {
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
