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

import { EmployeePicker, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { workOrderDetailHelp } from '@/features/maintenance/help';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useAcknowledgeWorkOrder,
    useApproveWorkOrder,
    useAssignWorkOrder,
    useCancelWO,
    useCloseWorkOrder,
    useCompleteWorkOrder,
    useDeclineWorkOrder,
    useHoldWorkOrder,
    useReopenWorkOrder,
    useResumeWorkOrder,
    useStartWorkOrder,
} from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    computeLabourLineCost,
    computePartLineCost,
    resolveTechnicianName,
} from '@/features/maintenance/work-order-parts-labour';
import {
    formatWorkOrderDescriptionDisplay,
    getWorkOrderClosureHistory,
} from '@/features/maintenance/work-order-description';
import { formatMaintenanceWoType } from '@/features/maintenance/work-order-enums';
import { canAddWorkOrderEvidence, normalizeWorkOrderEvidence } from '@/features/maintenance/work-order-evidence';
import { WorkOrderEvidenceThumb } from '@/features/maintenance/work-order-evidence-thumb';
import { SectionCard } from '@/features/maintenance/components/section-card';
import {
    resolveMaintenanceAssetName,
    resolveMaintenanceAssetNumber,
} from '@/features/maintenance/maintenance-asset-display';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { WOStatusBadge } from '@/features/maintenance/shared/wo-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

const TERMINAL_STATUSES = ['CLOSED', 'CANCELLED', 'REJECTED'];

type TabKey = 'overview' | 'checklist' | 'parts' | 'labour' | 'cost' | 'evidence' | 'history';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'parts', label: 'Parts' },
    { key: 'labour', label: 'Labour' },
    { key: 'cost', label: 'Cost' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'history', label: 'History' },
];

function CostRow({ label, value, bold, isDark }: { label: string; value: number; bold?: boolean; isDark: boolean }) {
    return (
        <View style={[costStyles.row, bold && costStyles.rowTotal, bold && { borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
            <Text className={`font-inter text-sm ${bold ? 'font-bold text-primary-950 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                {label}
            </Text>
            <Text className={`font-inter text-sm ${bold ? 'font-bold text-primary-700 dark:text-primary-300' : 'font-semibold text-primary-950 dark:text-white'}`}>
                {value.toFixed(2)}
            </Text>
        </View>
    );
}

function CostTab({
    labourCost,
    partsCost,
    vendorCost,
    totalCost,
    isDark,
}: {
    labourCost: number;
    partsCost: number;
    vendorCost: number;
    totalCost: number;
    isDark: boolean;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350)}>
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500">Cost Summary</Text>
            <View style={[mainStyles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <CostRow label="Labour Cost" value={labourCost} isDark={isDark} />
                <CostRow label="Parts Cost" value={partsCost} isDark={isDark} />
                <CostRow label="Vendor Cost" value={vendorCost} isDark={isDark} />
                <CostRow label="Total Cost" value={totalCost} bold isDark={isDark} />
            </View>
        </Animated.View>
    );
}

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

function StatBox({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
    return (
        <View
            style={[
                overviewStyles.statBox,
                {
                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                    borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
                },
            ]}
        >
            <Text className="font-inter text-[10px] font-semibold text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-xs font-bold text-primary-950 dark:text-white" numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

function HeaderBar({ onBack, title, rightSlot }: { onBack: () => void; title: string; rightSlot?: React.ReactNode }) {
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
            <Text className="font-inter text-lg font-bold text-white">{title}</Text>
            {rightSlot ?? <View style={{ width: 44 }} />}
        </LinearGradient>
    );
}

function ActionButton({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [actionStyles.btn, { backgroundColor: color }, pressed && { opacity: 0.85 }, disabled && { opacity: 0.5 }]}
        >
            <Text className="font-inter text-sm font-bold text-white">{label}</Text>
        </Pressable>
    );
}

const HOLD_REASON_OPTIONS = [
    { value: 'WAITING_PARTS', label: 'Waiting for Parts' },
    { value: 'WAITING_VENDOR', label: 'Waiting for Vendor' },
    { value: 'WAITING_SHUTDOWN', label: 'Waiting for Shutdown' },
    { value: 'WAITING_PTW', label: 'Waiting for PTW' },
    { value: 'WAITING_QA', label: 'Waiting for QA' },
    { value: 'WAITING_APPROVAL', label: 'Waiting for Approval' },
    { value: 'OTHER', label: 'Other' },
];

// ── Hold Sheet ──
function HoldSheet({ visible, onClose, onSubmit, isSubmitting }: {
    visible: boolean; onClose: () => void; onSubmit: (holdReason: string, holdNotes?: string) => void; isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [selectedReason, setSelectedReason] = React.useState('');
    const [holdNotes, setHoldNotes] = React.useState('');
    React.useEffect(() => { if (visible) { setSelectedReason(''); setHoldNotes(''); } }, [visible]);
    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Hold Work Order</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                    <View style={sheetStyles.field}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Hold Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            {workOrderDetailHelp.fields?.holdReason ? <InfoTooltip content={workOrderDetailHelp.fields.holdReason} /> : null}
                        </View>
                        <View style={{ gap: 6 }}>
                            {HOLD_REASON_OPTIONS.map((opt) => (
                                <Pressable
                                    key={opt.value}
                                    onPress={() => setSelectedReason(opt.value)}
                                    style={[
                                        sheetStyles.input,
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            backgroundColor: selectedReason === opt.value
                                                ? (isDark ? colors.primary[900] : colors.primary[50])
                                                : (isDark ? '#1E1B4B' : colors.neutral[50]),
                                            borderColor: selectedReason === opt.value
                                                ? colors.primary[500]
                                                : (isDark ? colors.neutral[700] : colors.neutral[200]),
                                        },
                                    ]}
                                >
                                    <View style={{
                                        width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                                        borderColor: selectedReason === opt.value ? colors.primary[500] : colors.neutral[300],
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {selectedReason === opt.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500] }} /> : null}
                                    </View>
                                    <Text className={`font-inter text-sm ${selectedReason === opt.value ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-primary-950 dark:text-white'}`}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Notes
                        </Text>
                        <TextInput
                            style={[sheetStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                            placeholder="Additional notes (optional)..."
                            placeholderTextColor={colors.neutral[400]}
                            value={holdNotes}
                            onChangeText={setHoldNotes}
                            multiline
                        />
                    </View>
                </ScrollView>
                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable
                        style={({ pressed }) => [sheetStyles.submitBtn, { backgroundColor: '#F97316' }, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                        onPress={() => { if (selectedReason) onSubmit(selectedReason, holdNotes.trim() || undefined); }}
                        disabled={isSubmitting || !selectedReason}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Put On Hold</Text>}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ── Assign Sheet — uses shared <EmployeePicker> (server search + pagination) ──
function AssignSheet({ visible, onClose, onSubmit, isSubmitting }: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { leadTechnicianId: string }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (visible) { setSelectedId(null); }
    }, [visible]);

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Assign Technician</Text>
                    <View style={{ width: 52 }} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <EmployeePicker
                        label="Lead Technician"
                        required
                        value={selectedId}
                        onChange={(id) => setSelectedId(id)}
                        placeholder="Tap to search & select a technician..."
                    />
                    {selectedId ? (
                        <Text className="mt-1 font-inter text-xs font-semibold text-success-600 dark:text-success-400">
                            ✓ Technician selected
                        </Text>
                    ) : null}
                </ScrollView>

                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable
                        style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, (isSubmitting || !selectedId) && { opacity: 0.6 }]}
                        onPress={() => { if (selectedId) onSubmit({ leadTechnicianId: selectedId }); }}
                        disabled={isSubmitting || !selectedId}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Assign</Text>}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ── Reason Sheet (close / reopen) ──
function ReasonSheet({
    visible,
    title,
    placeholder,
    submitLabel,
    submitColor,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    title: string;
    placeholder: string;
    submitLabel: string;
    submitColor: string;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [reason, setReason] = React.useState('');
    React.useEffect(() => { if (visible) setReason(''); }, [visible]);
    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{title}</Text>
                    <View style={{ width: 52 }} />
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Reason <Text className="text-danger-500">*</Text>
                        </Text>
                        <TextInput
                            style={[sheetStyles.input, { height: 120, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                            placeholder={placeholder}
                            placeholderTextColor={colors.neutral[400]}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                        />
                    </View>
                </ScrollView>
                <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Pressable
                        style={({ pressed }) => [sheetStyles.submitBtn, { backgroundColor: submitColor }, pressed && { opacity: 0.85 }, (isSubmitting || !reason.trim()) && { opacity: 0.6 }]}
                        onPress={() => { if (reason.trim()) onSubmit(reason.trim()); }}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">{submitLabel}</Text>}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ── Main ──
export function WorkOrderDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const confirmModal = useConfirmModal();

    const { data: response, isLoading, error, refetch } = useWorkOrder(id ?? '');
    const wo: any = (response as any)?.data ?? null;

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const [activeTab, setActiveTab] = React.useState<TabKey>('overview');
    const [holdVisible, setHoldVisible] = React.useState(false);
    const [assignVisible, setAssignVisible] = React.useState(false);
    const [closeVisible, setCloseVisible] = React.useState(false);
    const [reopenVisible, setReopenVisible] = React.useState(false);

    // Employee list — retained ONLY for fallback name resolution on the
    // Lead Technician / labour log rows where the response doesn't include
    // a nested technician object. The Assign sheet's picker now uses
    // <EmployeePicker> with proper server-side search + pagination.
    const { data: empData } = useEmployees({ limit: 500 });
    const employeeOptions = React.useMemo(() => {
        const raw: any[] = (empData as any)?.data ?? [];
        return raw.map((e: any) => ({
            id: e.id ?? '',
            name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.name || e.employeeId,
            code: e.employeeId ?? '',
            sublabel: [e.employeeId, e.department?.name, e.designation?.name].filter(Boolean).join(' · '),
        }));
    }, [empData]);

    const approveMut = useApproveWorkOrder();
    const assignMut = useAssignWorkOrder();
    const ackMut = useAcknowledgeWorkOrder();
    const declineMut = useDeclineWorkOrder();
    const startMut = useStartWorkOrder();
    const holdMut = useHoldWorkOrder();
    const resumeMut = useResumeWorkOrder();
    const completeMut = useCompleteWorkOrder();
    const closeMut = useCloseWorkOrder();
    const cancelMut = useCancelWO();
    const reopenMut = useReopenWorkOrder();

    const status = wo?.status ?? 'DRAFT';

    const resolvedTechName = React.useMemo(() => {
        if (wo?.leadTechnician) {
            const t = wo.leadTechnician;
            const full = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
            if (full || t.name) return full || t.name;
        }
        if (wo?.leadTechnicianName) return wo.leadTechnicianName;
        if (wo?.leadTechnicianId) {
            const emp = employeeOptions.find(e => e.id === wo.leadTechnicianId);
            if (emp) return emp.name;
            return wo.leadTechnicianId;
        }
        return '-';
    }, [wo, employeeOptions]);

    const handleAction = (action: string) => {
        if (!id) return;
        switch (action) {
            case 'approve':
                confirmModal.show({
                    title: 'Approve Work Order',
                    message: 'Approve this work order?',
                    confirmText: 'Approve',
                    variant: 'primary',
                    onConfirm: () => {
                        approveMut.mutate({ id }, {
                            onSuccess: () => { showSuccess('Work order approved'); refetch(); },
                            onError: () => showErrorMessage('Failed to approve'),
                        });
                    },
                });
                break;
            case 'acknowledge':
                confirmModal.show({
                    title: 'Acknowledge Work Order',
                    message: 'Acknowledge this work order assignment?',
                    confirmText: 'Acknowledge',
                    variant: 'primary',
                    onConfirm: () => {
                        ackMut.mutate(id, {
                            onSuccess: () => { showSuccess('Work order acknowledged'); refetch(); },
                            onError: () => showErrorMessage('Failed to acknowledge'),
                        });
                    },
                });
                break;
            case 'start':
                confirmModal.show({
                    title: 'Start Work Order',
                    message: 'Start working on this work order?',
                    confirmText: 'Start',
                    variant: 'primary',
                    onConfirm: () => {
                        startMut.mutate(id, {
                            onSuccess: () => { showSuccess('Work order started'); refetch(); },
                            onError: () => showErrorMessage('Failed to start'),
                        });
                    },
                });
                break;
            case 'resume':
                confirmModal.show({
                    title: 'Resume Work Order',
                    message: 'Resume this work order?',
                    confirmText: 'Resume',
                    variant: 'primary',
                    onConfirm: () => {
                        resumeMut.mutate(id, {
                            onSuccess: () => { showSuccess('Work order resumed'); refetch(); },
                            onError: () => showErrorMessage('Failed to resume'),
                        });
                    },
                });
                break;
            case 'complete':
                router.push({ pathname: '/maintenance/close-job' as any, params: { workOrderId: id } });
                break;
            case 'close':
                setCloseVisible(true);
                break;
            case 'cancel':
                confirmModal.show({
                    title: 'Cancel Work Order',
                    message: 'Are you sure you want to cancel this work order? This cannot be undone.',
                    confirmText: 'Cancel WO',
                    variant: 'danger',
                    onConfirm: () => {
                        cancelMut.mutate({ id, data: { reason: 'Cancelled from mobile' } }, {
                            onSuccess: () => { showSuccess('Work order cancelled'); refetch(); },
                            onError: () => showErrorMessage('Failed to cancel'),
                        });
                    },
                });
                break;
            case 'reopen':
                setReopenVisible(true);
                break;
            default:
                break;
        }
    };

    const handleHold = (holdReason: string, holdNotes?: string) => {
        if (!id) return;
        const data: any = { holdReason };
        if (holdNotes) data.holdNotes = holdNotes;
        holdMut.mutate({ id, data }, {
            onSuccess: () => { setHoldVisible(false); showSuccess('Work order on hold'); refetch(); },
            onError: () => showErrorMessage('Failed to hold'),
        });
    };

    const handleAssign = (data: { leadTechnicianId: string }) => {
        if (!id) return;
        assignMut.mutate({ id, data }, {
            onSuccess: () => { setAssignVisible(false); showSuccess('Technician assigned'); refetch(); },
            onError: () => showErrorMessage('Failed to assign'),
        });
    };

    const handleClose = (reason: string) => {
        if (!id) return;
        closeMut.mutate({ id, data: { reason } }, {
            onSuccess: () => { setCloseVisible(false); showSuccess('Work order closed'); refetch(); },
            onError: () => showErrorMessage('Failed to close work order'),
        });
    };

    const handleReopen = (reason: string) => {
        if (!id) return;
        reopenMut.mutate({ id, data: { reason } }, {
            onSuccess: () => { setReopenVisible(false); showSuccess('Work order reopened'); refetch(); },
            onError: () => showErrorMessage('Failed to reopen'),
        });
    };

    const handleDecline = () => {
        if (!id) return;
        confirmModal.show({
            title: 'Decline Work Order',
            message: 'Are you sure you want to decline this assignment?',
            confirmText: 'Decline',
            variant: 'danger',
            onConfirm: () => {
                declineMut.mutate({ id, data: { reason: 'Declined from mobile' } }, {
                    onSuccess: () => { showSuccess('Work order declined'); refetch(); },
                    onError: () => showErrorMessage('Failed to decline'),
                });
            },
        });
    };

    if (isLoading) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} title="Work Order" rightSlot={<HelpDrawer help={workOrderDetailHelp} />} />
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error || !wo) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} title="Work Order" rightSlot={<HelpDrawer help={workOrderDetailHelp} />} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState icon="error" title="Failed to load" message="Could not load work order details." action={{ label: 'Retry', onPress: () => refetch() }} />
                </View>
            </View>
        );
    }

    const isTerminal = TERMINAL_STATUSES.includes(status);
    const statusHistory: any[] = wo.statusHistory ?? [];
    const rawSnapshot = (() => {
        const snapshotSource = wo?.checklistSnapshot;
        if (typeof snapshotSource === 'string') {
            try {
                return JSON.parse(snapshotSource);
            } catch {
                return null;
            }
        }
        return snapshotSource ?? null;
    })();
    const checklistSnapshot: any[] = Array.isArray(rawSnapshot) ? rawSnapshot : (rawSnapshot?.sections ?? []);
    const checklistName = rawSnapshot?.name || (wo.checklistTemplateId ? 'Checklist Linked' : '-');
    const partsUsed: any[] = wo.partsUsed ?? [];
    const labourLogs: any[] = wo.labourLogs ?? [];
    const evidence = normalizeWorkOrderEvidence(wo);
    const closureHistory = getWorkOrderClosureHistory(wo);

    const labourCost = labourLogs.reduce((sum: number, l: any) => sum + computeLabourLineCost(l), 0);
    const partsCost = partsUsed.reduce((sum: number, p: any) => sum + computePartLineCost(p), 0);
    const vendorCost = Number(wo.vendorCost ?? 0);
    const totalCost = Number(wo.totalCost ?? 0) > 0 ? Number(wo.totalCost) : labourCost + partsCost + vendorCost;

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <HeaderBar onBack={() => router.back()} title="Work Order" rightSlot={<HelpDrawer help={workOrderDetailHelp} />} />

            {/* Tabs */}
            <View style={tabStyles.container}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tabStyles.scroll}>
                    {TABS.map((tab) => (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={[tabStyles.tab, activeTab === tab.key && tabStyles.tabActive]}
                        >
                            <Text className={`font-inter text-xs font-bold ${activeTab === tab.key ? 'text-primary-700' : 'text-neutral-500'}`}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Overview Tab */}
                {activeTab === 'overview' ? (
                    <>
                        <Animated.View entering={FadeInDown.duration(350)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <View style={[badgeStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                                    <Text className="font-inter text-xs font-bold text-info-700">{wo.woNumber ?? 'WO-???'}</Text>
                                </View>
                                <WOStatusBadge status={status ?? 'DRAFT'} />
                                <PriorityBadge priority={wo.priority ?? 'MEDIUM'} />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                            <SectionCard title="Description" isDark={isDark}>
                                <Text className="font-inter text-sm leading-5 text-primary-950 dark:text-white">
                                    {formatWorkOrderDescriptionDisplay(wo)}
                                </Text>
                            </SectionCard>

                            {closureHistory.length > 0 ? (
                                <SectionCard title="Closure History" isDark={isDark}>
                                    {closureHistory.map((note, idx) => (
                                        <Text
                                            key={`${idx}-${note.slice(0, 16)}`}
                                            className="font-inter text-sm leading-5 text-neutral-700 dark:text-neutral-300"
                                        >
                                            {note}
                                        </Text>
                                    ))}
                                </SectionCard>
                            ) : null}

                            <SectionCard title="Scheduling" isDark={isDark}>
                                <View style={overviewStyles.statGrid}>
                                    <StatBox
                                        label="Planned Start"
                                        value={wo.plannedStart ? fmt.dateTime(wo.plannedStart) : '—'}
                                        isDark={isDark}
                                    />
                                    <StatBox
                                        label="Planned End"
                                        value={wo.plannedEnd ? fmt.dateTime(wo.plannedEnd) : '—'}
                                        isDark={isDark}
                                    />
                                    <StatBox
                                        label="Actual Start"
                                        value={wo.actualStart ? fmt.dateTime(wo.actualStart) : '—'}
                                        isDark={isDark}
                                    />
                                    <StatBox
                                        label="Actual End"
                                        value={wo.actualEnd ? fmt.dateTime(wo.actualEnd) : '—'}
                                        isDark={isDark}
                                    />
                                </View>
                            </SectionCard>

                            {wo.findings ? (
                                <SectionCard title="Findings" isDark={isDark}>
                                    <Text className="font-inter text-sm leading-5 text-primary-950 dark:text-white">{wo.findings}</Text>
                                </SectionCard>
                            ) : null}

                            {wo.completionNotes ? (
                                <SectionCard title="Completion Notes" isDark={isDark}>
                                    <Text className="font-inter text-sm leading-5 text-primary-950 dark:text-white">
                                        {wo.completionNotes}
                                    </Text>
                                </SectionCard>
                            ) : null}

                            <SectionCard title="Asset" isDark={isDark}>
                                {wo.asset ? (
                                    <>
                                        <Pressable
                                            onPress={() =>
                                                wo.asset?.id
                                                    ? router.push({
                                                          pathname: '/maintenance/asset-detail' as never,
                                                          params: { id: wo.asset.id },
                                                      })
                                                    : undefined
                                            }
                                        >
                                            <Text className="font-inter text-sm font-bold text-primary-600 dark:text-primary-400">
                                                {resolveMaintenanceAssetName(wo.asset)}
                                            </Text>
                                        </Pressable>
                                        <InfoRow label="Asset Number" value={resolveMaintenanceAssetNumber(wo.asset)} />
                                        {wo.asset.location?.name ? (
                                            <InfoRow label="Location" value={wo.asset.location.name} />
                                        ) : null}
                                    </>
                                ) : (
                                    <Text className="font-inter text-sm text-neutral-400">No asset linked.</Text>
                                )}
                            </SectionCard>

                            <SectionCard title="Details" isDark={isDark}>
                                <InfoRow label="WO Type" value={formatMaintenanceWoType(wo.woType)} />
                                <InfoRow label="Priority" value={wo.priority ?? '—'} />
                                <InfoRow
                                    label="Estimated Hours"
                                    value={wo.estimatedHours ? `${Number(wo.estimatedHours)} hrs` : '—'}
                                />
                                <InfoRow label="Lead Technician" value={resolvedTechName} />
                                {wo.jobPlan?.name ? <InfoRow label="Job Plan" value={wo.jobPlan.name} /> : null}
                                {checklistSnapshot.length > 0 ? (
                                    <InfoRow label="Checklist" value={`${checklistName} (${checklistSnapshot.length} sections)`} />
                                ) : wo.checklistTemplateId ? (
                                    <InfoRow label="Checklist" value={checklistName} />
                                ) : null}
                                {wo.pmSchedule?.name ? <InfoRow label="PM Schedule" value={wo.pmSchedule.name} /> : null}
                                {wo.holdReason ? <InfoRow label="Hold Reason" value={String(wo.holdReason)} /> : null}
                                <InfoRow label="Created" value={wo.createdAt ? fmt.dateTime(wo.createdAt) : '—'} />
                                <InfoRow label="Updated" value={wo.updatedAt ? fmt.dateTime(wo.updatedAt) : '—'} />
                            </SectionCard>

                            {wo.workRequestId ? (
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname: '/maintenance/work-request-detail' as never,
                                            params: { id: wo.workRequestId },
                                        })
                                    }
                                    style={[mainStyles.actionLinkBtn, { backgroundColor: colors.accent[600], marginTop: 0 }]}
                                >
                                    <Text className="font-inter text-sm font-bold text-white">View Work Request</Text>
                                </Pressable>
                            ) : null}
                        </Animated.View>
                    </>
                ) : null}

                {/* Checklist Tab */}
                {activeTab === 'checklist' ? (
                    <Animated.View entering={FadeInUp.duration(350)}>
                        {checklistSnapshot.length === 0 ? (
                            <EmptyState icon="search" title="No checklist" message="This work order has no checklist assigned." />
                        ) : (
                            <View style={{ gap: 12 }}>
                                <Pressable
                                    onPress={() => router.push({ pathname: '/maintenance/execute-checklist' as any, params: { workOrderId: id } })}
                                    style={[mainStyles.actionLinkBtn, { backgroundColor: status === 'IN_PROGRESS' ? colors.primary[600] : colors.neutral[500] }]}
                                >
                                    <Text className="font-inter text-sm font-bold text-white">
                                        {status === 'IN_PROGRESS' ? 'Execute Checklist' : 'View Checklist'}
                                    </Text>
                                </Pressable>
                                <Text className="font-inter text-xs text-neutral-500">{checklistSnapshot.length} section(s) in checklist</Text>
                                {status !== 'IN_PROGRESS' ? (
                                    <Text className="font-inter text-xs text-neutral-400">
                                        Checklist is view-only until work order is started.
                                    </Text>
                                ) : null}
                            </View>
                        )}
                    </Animated.View>
                ) : null}

                {/* Parts Tab */}
                {activeTab === 'parts' ? (
                    <Animated.View entering={FadeInUp.duration(350)}>
                        {(status === 'IN_PROGRESS' || status === 'ON_HOLD') ? (
                            <Pressable
                                onPress={() => router.push({ pathname: '/maintenance/add-parts' as any, params: { workOrderId: id } })}
                                style={[mainStyles.actionLinkBtn, { backgroundColor: colors.primary[600], marginBottom: 16 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">Manage Parts</Text>
                            </Pressable>
                        ) : null}
                        {partsUsed.length === 0 ? (
                            <EmptyState icon="search" title="No parts" message="No parts have been logged for this work order." />
                        ) : (
                            <View style={{ gap: 8 }}>
                                {partsUsed.map((p: any) => {
                                    const lineTotal = computePartLineCost(p);
                                    return (
                                        <View key={p.id} style={[mainStyles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                            <InfoRow label="Part" value={p.partName ?? '-'} />
                                            {p.partNumber ? <InfoRow label="Part No." value={p.partNumber} /> : null}
                                            <InfoRow label="Qty" value={`${p.quantity ?? 0}`} />
                                            {p.unitCost != null ? <InfoRow label="Unit Cost" value={`${Number(p.unitCost).toFixed(2)}`} /> : null}
                                            {lineTotal > 0 ? <InfoRow label="Total" value={`${lineTotal.toFixed(2)}`} /> : null}
                                            <InfoRow label="Status" value={p.isReturned ? 'Returned' : 'Used'} />
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </Animated.View>
                ) : null}

                {/* Labour Tab */}
                {activeTab === 'labour' ? (
                    <Animated.View entering={FadeInUp.duration(350)}>
                        {(status === 'IN_PROGRESS' || status === 'ON_HOLD') ? (
                            <Pressable
                                onPress={() => router.push({ pathname: '/maintenance/log-labour' as any, params: { workOrderId: id } })}
                                style={[mainStyles.actionLinkBtn, { backgroundColor: colors.primary[600], marginBottom: 16 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">Log Labour</Text>
                            </Pressable>
                        ) : null}
                        {labourLogs.length === 0 ? (
                            <EmptyState icon="search" title="No labour logs" message="No labour has been logged for this work order." />
                        ) : (
                            <View style={{ gap: 8 }}>
                                {labourLogs.map((l: any) => {
                                    const lineTotal = computeLabourLineCost(l);
                                    return (
                                        <View key={l.id} style={[mainStyles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                            <InfoRow label="Technician" value={resolveTechnicianName(l.technicianId, employeeOptions)} />
                                            {l.startTime ? <InfoRow label="Start" value={fmt.dateTime(l.startTime)} /> : null}
                                            {l.endTime ? <InfoRow label="End" value={fmt.dateTime(l.endTime)} /> : null}
                                            <InfoRow label="Hours" value={`${Number(l.hours ?? 0).toFixed(1)} hrs`} />
                                            {l.hourlyRate != null ? <InfoRow label="Rate/Hr" value={`${Number(l.hourlyRate).toFixed(2)}`} /> : null}
                                            {lineTotal > 0 ? <InfoRow label="Total" value={`${lineTotal.toFixed(2)}`} /> : null}
                                            {l.notes ? <InfoRow label="Notes" value={l.notes} /> : null}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </Animated.View>
                ) : null}

                {/* Cost Tab */}
                {activeTab === 'cost' ? (
                    <CostTab
                        labourCost={labourCost}
                        partsCost={partsCost}
                        vendorCost={vendorCost}
                        totalCost={totalCost}
                        isDark={isDark}
                    />
                ) : null}

                {/* Evidence Tab */}
                {activeTab === 'evidence' ? (
                    <Animated.View entering={FadeInUp.duration(350)}>
                        {canAddWorkOrderEvidence(status) ? (
                            <Pressable
                                onPress={() => router.push({ pathname: '/maintenance/capture-evidence' as any, params: { workOrderId: id } })}
                                style={[mainStyles.actionLinkBtn, { backgroundColor: colors.primary[600], marginBottom: 16 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">Add Evidence</Text>
                            </Pressable>
                        ) : null}
                        {evidence.length === 0 ? (
                            <EmptyState icon="search" title="No evidence" message="Upload photos or documents to document work performed." />
                        ) : (
                            <View>
                                {evidence.map((item) => (
                                    <WorkOrderEvidenceThumb key={item.id} item={item} isDark={isDark} fmt={fmt} />
                                ))}
                            </View>
                        )}
                    </Animated.View>
                ) : null}

                {/* History Tab */}
                {activeTab === 'history' ? (
                    <Animated.View entering={FadeInUp.duration(350)}>
                        {statusHistory.length === 0 ? (
                            <EmptyState icon="search" title="No history" message="No status changes recorded." />
                        ) : (
                            statusHistory.map((entry: any, idx: number) => (
                                <View key={idx} style={mainStyles.timelineItem}>
                                    <View style={mainStyles.timelineLine}>
                                        <View style={[mainStyles.timelineDot, { backgroundColor: colors.primary[500] }]} />
                                        {idx < statusHistory.length - 1 ? <View style={mainStyles.timelineBar} /> : null}
                                    </View>
                                    <View style={{ flex: 1, paddingBottom: 16 }}>
                                        <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                                            {(entry.status ?? '').replace(/_/g, ' ')}
                                        </Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">
                                            {(entry.changedAt ?? entry.createdAt) ? fmt.dateTime(entry.changedAt ?? entry.createdAt) : '-'}
                                        </Text>
                                        {entry.notes ? <Text className="mt-1 font-inter text-xs text-neutral-500">{entry.notes}</Text> : null}
                                    </View>
                                </View>
                            ))
                        )}
                    </Animated.View>
                ) : null}

                {/* Action buttons */}
                {(!isTerminal || status === 'CLOSED') && activeTab === 'overview' ? (
                    <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                        <View style={actionStyles.section}>
                            {(status === 'DRAFT' || status === 'PLANNED') ? (
                                <ActionButton label="Approve" color={colors.success[600]} onPress={() => handleAction('approve')} disabled={approveMut.isPending} />
                            ) : null}
                            {status === 'APPROVED' ? (
                                <ActionButton label="Assign" color={colors.primary[600]} onPress={() => setAssignVisible(true)} />
                            ) : null}
                            {status === 'ASSIGNED' ? (
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                    <ActionButton label="Acknowledge" color={colors.success[600]} onPress={() => handleAction('acknowledge')} />
                                    <ActionButton label="Decline" color={colors.danger[600]} onPress={handleDecline} />
                                </View>
                            ) : null}
                            {status === 'ACKNOWLEDGED' ? (
                                <ActionButton label="Start" color={colors.primary[600]} onPress={() => handleAction('start')} />
                            ) : null}
                            {status === 'IN_PROGRESS' ? (
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                    <ActionButton label="Hold" color="#F97316" onPress={() => setHoldVisible(true)} />
                                    <ActionButton label="Complete" color={colors.success[600]} onPress={() => handleAction('complete')} />
                                </View>
                            ) : null}
                            {status === 'ON_HOLD' ? (
                                <ActionButton label="Resume" color={colors.primary[600]} onPress={() => handleAction('resume')} />
                            ) : null}
                            {status === 'COMPLETED' ? (
                                <ActionButton label="Close" color={colors.success[600]} onPress={() => handleAction('close')} />
                            ) : null}
                            {status === 'CLOSED' ? (
                                <ActionButton label="Reopen" color={colors.primary[600]} onPress={() => handleAction('reopen')} />
                            ) : null}
                            {!['CLOSED', 'CANCELLED', 'REJECTED'].includes(status) ? (
                                <ActionButton label="Cancel" color={colors.neutral[500]} onPress={() => handleAction('cancel')} />
                            ) : null}
                        </View>
                    </Animated.View>
                ) : null}
            </ScrollView>

            <HoldSheet visible={holdVisible} onClose={() => setHoldVisible(false)} onSubmit={handleHold} isSubmitting={holdMut.isPending} />
            <AssignSheet
                visible={assignVisible}
                onClose={() => setAssignVisible(false)}
                onSubmit={handleAssign}
                isSubmitting={assignMut.isPending}
            />
            <ReasonSheet
                visible={closeVisible}
                title="Close Work Order"
                placeholder="Why is this work order being closed?"
                submitLabel="Close Work Order"
                submitColor={colors.success[600]}
                onClose={() => setCloseVisible(false)}
                onSubmit={handleClose}
                isSubmitting={closeMut.isPending}
            />
            <ReasonSheet
                visible={reopenVisible}
                title="Reopen Work Order"
                placeholder="Why are you reopening this work order?"
                submitLabel="Reopen Work Order"
                submitColor={colors.primary[600]}
                onClose={() => setReopenVisible(false)}
                onSubmit={handleReopen}
                isSubmitting={reopenMut.isPending}
            />
            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    infoCard: {
        borderRadius: 20, padding: 16, borderWidth: 1,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        gap: 12,
    },
    actionLinkBtn: {
        paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    },
    timelineItem: { flexDirection: 'row', gap: 12 },
    timelineLine: { alignItems: 'center', width: 20 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
    timelineBar: { width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: 4 },
});

const headerStyles = StyleSheet.create({
    gradient: {
        paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const tabStyles = StyleSheet.create({
    container: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    scroll: { paddingHorizontal: 20, gap: 4 },
    tab: { paddingHorizontal: 14, paddingVertical: 10 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[600] },
});

const badgeStyles = StyleSheet.create({
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});

const infoStyles = StyleSheet.create({
    row: { gap: 2 },
});

const overviewStyles = StyleSheet.create({
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statBox: {
        width: '47%',
        flexGrow: 1,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        minHeight: 64,
    },
});

const costStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rowTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
    },
});

const actionStyles = StyleSheet.create({
    section: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
    btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 100 },
});

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    field: { marginBottom: 20 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    submitContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    submitBtn: {
        backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    // ── Employee picker styles (inline within AssignSheet) ──
    pickerTrigger: {
        borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    inlineSearch: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5,
        paddingHorizontal: 14, height: 50, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    },
    pickerItem: {
        paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[100],
    },
});
