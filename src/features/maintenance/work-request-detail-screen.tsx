/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
import { HelpDrawer } from '@/components/ui/help-drawer';
import { workRequestDetailHelp } from '@/features/maintenance/help';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useApproveWorkRequest,
    useCancelWorkRequest,
    useConvertWorkRequest,
    useRejectWorkRequest,
    useTriageWorkRequest,
} from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkRequest } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyUsers } from '@/features/company-admin/api/use-company-admin-queries';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ HELPERS ============

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    SUBMITTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    UNDER_REVIEW: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    CONVERTED: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[500], dot: colors.neutral[400] },
};

const TYPE_LABELS: Record<string, string> = {
    BREAKDOWN: 'Breakdown',
    PLANNED_SERVICE: 'Planned Service',
    INSPECTION: 'Inspection',
    REPLACEMENT: 'Replacement',
    SAFETY: 'Safety',
    CORRECTIVE: 'Corrective',
    OTHER: 'Other',
};

const PRIORITY_OPTIONS = ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'];

const TERMINAL_STATUSES = ['CONVERTED', 'REJECTED', 'CANCELLED'];

function getStatusColor(status: string) {
    return STATUS_COLOR[status] ?? { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
}

// ============ INFO ROW ============

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={infoStyles.row}>
            <Text className="font-inter text-xs font-semibold text-neutral-500">{label}</Text>
            <Text className="font-inter text-sm text-primary-950 dark:text-white" numberOfLines={3}>
                {value}
            </Text>
        </View>
    );
}

// ============ TRIAGE SHEET ============

function TriageSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { triageNotes?: string; assignedPriority: string }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [notes, setNotes] = React.useState('');
    const [priority, setPriority] = React.useState('MEDIUM');

    React.useEffect(() => {
        if (visible) {
            setNotes('');
            setPriority('MEDIUM');
        }
    }, [visible]);

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Triage Request</Text>
                    <View style={{ width: 52 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Assigned Priority <Text className="text-danger-500">*</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            {PRIORITY_OPTIONS.map((p) => (
                                <Pressable
                                    key={p}
                                    onPress={() => setPriority(p)}
                                    style={[
                                        sheetStyles.priorityChip,
                                        {
                                            backgroundColor: priority === p ? colors.primary[600] : (isDark ? '#1E1B4B' : colors.neutral[50]),
                                            borderColor: priority === p ? colors.primary[600] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                                        },
                                    ]}
                                >
                                    <Text className={`font-inter text-xs font-bold ${priority === p ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                        {p}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Triage Notes</Text>
                        <TextInput
                            style={[sheetStyles.input, { height: 100, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                            placeholder="Add notes..."
                            placeholderTextColor={colors.neutral[400]}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            maxLength={500}
                        />
                    </View>
                </ScrollView>

                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable
                        style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                        onPress={() => onSubmit({ assignedPriority: priority, triageNotes: notes.trim() || undefined })}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                            <Text className="font-inter text-base font-bold text-white">Submit Triage</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ============ REJECT SHEET ============

function RejectSheet({
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
    const [err, setErr] = React.useState('');

    React.useEffect(() => {
        if (visible) { setReason(''); setErr(''); }
    }, [visible]);

    const handleSubmit = () => {
        if (!reason.trim()) { setErr('Rejection reason is required'); return; }
        onSubmit(reason.trim());
    };

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Reject Request</Text>
                    <View style={{ width: 52 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Reason <Text className="text-danger-500">*</Text>
                        </Text>
                        <TextInput
                            style={[
                                sheetStyles.input,
                                { height: 120, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] },
                                err ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                            ]}
                            placeholder="Explain why this request is being rejected..."
                            placeholderTextColor={colors.neutral[400]}
                            value={reason}
                            onChangeText={(v) => { setReason(v); if (err) setErr(''); }}
                            multiline
                        />
                        {err ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{err}</Text> : null}
                    </View>
                </ScrollView>

                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable
                        style={({ pressed }) => [sheetStyles.submitBtn, { backgroundColor: colors.danger[600] }, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                            <Text className="font-inter text-base font-bold text-white">Reject</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ============ MAIN ============

export function WorkRequestDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const confirmModal = useConfirmModal();

    const { data: response, isLoading, error, refetch } = useWorkRequest(id ?? '');
    const wr: any = (response as any)?.data ?? null;

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const { data: usersData } = useCompanyUsers({ limit: 1000 });
    const usersList = usersData?.data ?? [];
    const userMap = new Map<string, string>(
        usersList.map((u: any) => [
            u.id,
            [u.firstName, u.lastName].filter(Boolean).join(" ") || u.fullName || u.email || u.id,
        ])
    );

    const triageMutation = useTriageWorkRequest();
    const approveMutation = useApproveWorkRequest();
    const rejectMutation = useRejectWorkRequest();
    const convertMutation = useConvertWorkRequest();
    const cancelMutation = useCancelWorkRequest();

    const [triageVisible, setTriageVisible] = React.useState(false);
    const [rejectVisible, setRejectVisible] = React.useState(false);

    const handleTriage = (data: { triageNotes?: string; assignedPriority: string }) => {
        if (!id) return;
        const payload = {
            triageNotes: data.triageNotes,
            assignedPriority: data.assignedPriority || wr.priority,
        };
        triageMutation.mutate({ id, data: payload }, {
            onSuccess: () => { setTriageVisible(false); showSuccess('Triaged successfully'); refetch(); },
            onError: () => showErrorMessage('Failed to triage'),
        });
    };

    const handleApprove = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Approve Request',
            message: 'Are you sure you want to approve this work request?',
            confirmText: 'Approve',
            variant: 'primary',
            onConfirm: () => {
                approveMutation.mutate(id, {
                    onSuccess: () => { showSuccess('Request approved'); refetch(); },
                    onError: () => showErrorMessage('Failed to approve'),
                });
            },
        });
    };

    const handleReject = (reason: string) => {
        if (!id) return;
        rejectMutation.mutate({ id, data: { rejectionReason: reason } }, {
            onSuccess: () => { setRejectVisible(false); showSuccess('Request rejected'); refetch(); },
            onError: () => showErrorMessage('Failed to reject'),
        });
    };

    const handleConvert = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Convert to Work Order',
            message: 'This will create a new Work Order from this request. Continue?',
            confirmText: 'Convert',
            variant: 'primary',
            onConfirm: () => {
                convertMutation.mutate(id, {
                    onSuccess: () => { showSuccess('Converted to Work Order'); refetch(); },
                    onError: () => showErrorMessage('Failed to convert'),
                });
            },
        });
    };

    const handleCancel = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Cancel Request',
            message: 'Are you sure you want to cancel this work request? This cannot be undone.',
            confirmText: 'Cancel Request',
            variant: 'danger',
            onConfirm: () => {
                cancelMutation.mutate(id, {
                    onSuccess: () => { showSuccess('Request cancelled'); refetch(); },
                    onError: () => showErrorMessage('Failed to cancel'),
                });
            },
        });
    };

    if (isLoading) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} rightSlot={<HelpDrawer help={workRequestDetailHelp} />} />
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (error || !wr) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} rightSlot={<HelpDrawer help={workRequestDetailHelp} />} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load"
                        message="Could not load work request details."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    const sc = getStatusColor(wr.status);
    const isTerminal = TERMINAL_STATUSES.includes(wr.status);
    const statusHistory: any[] = wr.statusHistory ?? [];

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <HeaderBar onBack={() => router.back()} rightSlot={<HelpDrawer help={workRequestDetailHelp} />} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Title area */}
                <Animated.View entering={FadeInDown.duration(350)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                            <Text className="font-inter text-xs font-bold text-info-700">{wr.requestNumber ?? 'WR-???'}</Text>
                        </View>
                        <View style={[cardStyles.statusBadge, { backgroundColor: sc.bg }]}>
                            <View style={[cardStyles.statusDot, { backgroundColor: sc.dot }]} />
                            <Text style={{ color: sc.text }} className="font-inter text-xs font-bold">{(wr.status ?? '').replace(/_/g, ' ')}</Text>
                        </View>
                        <PriorityBadge priority={wr.priority ?? 'MEDIUM'} />
                    </View>
                </Animated.View>

                {/* Safety risk banner */}
                {wr.safetyRisk ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                        <View style={mainStyles.safetyBanner}>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={colors.danger[700]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-xs font-bold text-danger-700">Safety Risk Identified</Text>
                        </View>
                    </Animated.View>
                ) : null}

                {/* Info card */}
                <Animated.View entering={FadeInUp.duration(350).delay(150)}>
                    <View style={[mainStyles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                        <InfoRow label="Asset" value={wr.asset?.name ?? '-'} />
                        <InfoRow label="Type" value={TYPE_LABELS[wr.requestType] ?? wr.requestType ?? '-'} />
                        <InfoRow label="Description" value={wr.description ?? '-'} />
                        {wr.locationDetail ? <InfoRow label="Location" value={wr.locationDetail} /> : null}
                        <InfoRow label="Requested By Date" value={wr.requestedByDate ? fmt.date(wr.requestedByDate) : '-'} />
                        <InfoRow label="Created" value={wr.createdAt ? fmt.dateTime(wr.createdAt) : '-'} />
                        <InfoRow label="Requested By" value={wr.requestedByName || userMap.get(wr.requestedById) || wr.requestedById || '-'} />
                        {wr.triageNotes ? <InfoRow label="Triage Notes" value={wr.triageNotes} /> : null}
                        {wr.rejectionReason ? <InfoRow label="Rejection Reason" value={wr.rejectionReason} /> : null}
                    </View>
                </Animated.View>

                {/* Action buttons */}
                {!isTerminal ? (
                    <Animated.View entering={FadeInUp.duration(350).delay(250)}>
                        <View style={mainStyles.actionsSection}>
                            {wr.status === 'SUBMITTED' ? (
                                <ActionButton label="Triage" color={colors.primary[600]} onPress={() => setTriageVisible(true)} />
                            ) : null}

                            {wr.status === 'UNDER_REVIEW' ? (
                                <View style={mainStyles.actionRow}>
                                    <ActionButton label="Approve" color={colors.success[600]} onPress={handleApprove} style={{ flex: 1 }} />
                                    <ActionButton label="Reject" color={colors.danger[600]} onPress={() => setRejectVisible(true)} style={{ flex: 1 }} />
                                </View>
                            ) : null}

                            {wr.status === 'APPROVED' ? (
                                <ActionButton label="Convert to WO" color={colors.accent[600]} onPress={handleConvert} />
                            ) : null}

                            <SecondaryButton label="Cancel" onPress={handleCancel} />
                        </View>
                    </Animated.View>
                ) : null}

                {/* Timeline */}
                <Animated.View entering={FadeInUp.duration(350).delay(350)}>
                    <Text className="mb-3 mt-6 font-inter text-sm font-bold text-primary-950 dark:text-white">Timeline</Text>
                    
                    <TimelineItem 
                        label="Created" 
                        date={wr.requestedAt} 
                        by={wr.requestedByName || userMap.get(wr.requestedById) || wr.requestedById} 
                        isLast={!wr.triagedAt && !wr.approvedAt && !wr.rejectionReason && !wr.workOrderId} 
                        fmt={fmt} 
                    />
                    
                    {wr.triagedAt ? (
                        <TimelineItem 
                            label="Triaged" 
                            date={wr.triagedAt} 
                            by={wr.triagedByName || userMap.get(wr.triagedById) || wr.triagedById} 
                            isLast={!wr.approvedAt && !wr.rejectionReason && !wr.workOrderId} 
                            fmt={fmt} 
                        />
                    ) : null}
                    
                    {wr.approvedAt ? (
                        <TimelineItem 
                            label="Approved" 
                            date={wr.approvedAt} 
                            by={wr.approvedByName || userMap.get(wr.approvedById) || userMap.get(wr.reviewedById) || wr.approvedById || wr.reviewedById} 
                            isLast={!wr.rejectionReason && !wr.workOrderId} 
                            fmt={fmt} 
                        />
                    ) : null}
                    
                    {wr.rejectionReason ? (
                        <TimelineItem 
                            label="Rejected" 
                            date={wr.updatedAt} 
                            notes={wr.rejectionReason}
                            isLast={!wr.workOrderId} 
                            fmt={fmt} 
                        />
                    ) : null}
                    
                    {wr.workOrderId ? (
                        <TimelineItem 
                            label="Converted to WO" 
                            date={wr.updatedAt} 
                            isLast={true} 
                            fmt={fmt} 
                        />
                    ) : null}
                </Animated.View>
            </ScrollView>

            <TriageSheet
                visible={triageVisible}
                onClose={() => setTriageVisible(false)}
                onSubmit={handleTriage}
                isSubmitting={triageMutation.isPending}
            />

            <RejectSheet
                visible={rejectVisible}
                onClose={() => setRejectVisible(false)}
                onSubmit={handleReject}
                isSubmitting={rejectMutation.isPending}
            />

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ SUB-COMPONENTS ============

function TimelineItem({
    label,
    date,
    by,
    notes,
    isLast,
    fmt,
}: {
    label: string;
    date: string;
    by?: string;
    notes?: string;
    isLast: boolean;
    fmt: any;
}) {
    return (
        <View style={mainStyles.timelineItem}>
            <View style={mainStyles.timelineLine}>
                <View style={[mainStyles.timelineDot, { backgroundColor: colors.primary[600] }]} />
                {!isLast ? <View style={mainStyles.timelineBar} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
                <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                    {label}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400">
                    {date ? fmt.dateTime(date) : '-'}
                    {by ? ` by ${by}` : ''}
                </Text>
                {notes ? (
                    <Text className="mt-1 font-inter text-xs text-neutral-500">{notes}</Text>
                ) : null}
            </View>
        </View>
    );
}

function HeaderBar({ onBack, rightSlot }: { onBack: () => void; rightSlot?: React.ReactNode }) {
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
                    <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            <Text className="font-inter text-lg font-bold text-white">Work Request</Text>
            {rightSlot ?? <View style={{ width: 44 }} />}
        </LinearGradient>
    );
}

function ActionButton({ 
    label, 
    color, 
    onPress, 
    style 
}: { 
    label: string; 
    color: string; 
    onPress: () => void; 
    style?: any 
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                mainStyles.actionBtn, 
                { backgroundColor: color }, 
                style,
                pressed && { opacity: 0.85 }
            ]}
        >
            <Text className="font-inter text-sm font-bold text-white">{label}</Text>
        </Pressable>
    );
}

function SecondaryButton({ 
    label, 
    onPress, 
    style 
}: { 
    label: string; 
    onPress: () => void; 
    style?: any 
}) {
    const isDark = useIsDark();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                mainStyles.actionBtn, 
                { 
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[300],
                }, 
                style,
                pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
            ]}
        >
            <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-300">{label}</Text>
        </Pressable>
    );
}

// ============ STYLES ============

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.danger[50],
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    infoCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        gap: 12,
        marginTop: 12,
    },
    actionsSection: {
        gap: 10,
        marginTop: 20,
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineLine: {
        alignItems: 'center',
        width: 20,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 2,
    },
    timelineBar: {
        width: 2,
        flex: 1,
        backgroundColor: colors.neutral[200],
        marginTop: 4,
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
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const cardStyles = StyleSheet.create({
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
});

const infoStyles = StyleSheet.create({
    row: { gap: 2 },
});

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
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    priorityChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    submitContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
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
