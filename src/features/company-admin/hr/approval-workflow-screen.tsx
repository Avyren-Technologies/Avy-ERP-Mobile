/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
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
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useApprovalWorkflows } from '@/features/company-admin/api/use-ess-queries';
import {
    useCreateApprovalWorkflow,
    useUpdateApprovalWorkflow,
    useDeleteApprovalWorkflow,
} from '@/features/company-admin/api/use-ess-mutations';

// ============ TYPES ============

interface WorkflowStep {
    order: number;
    approverRole: string;
    slaHours: string;
    autoEscalate: boolean;
    autoApprove: boolean;
    autoReject: boolean;
}

interface WorkflowItem {
    id: string;
    name: string;
    triggerEvent: string;
    steps: WorkflowStep[];
    active: boolean;
}

// ============ CONSTANTS ============

const TRIGGER_EVENTS = [
    'Leave Application', 'Attendance Regularization', 'Overtime Claim', 'Reimbursement',
    'Loan Application', 'Resignation', 'Payroll Approval', 'Salary Revision',
    'Asset Request', 'Training Request', 'Shift Change',
];

const APPROVER_ROLES = ['Manager', 'HR', 'Finance', 'Director', 'CEO'];

const TRIGGER_COLORS: Record<string, { bg: string; text: string }> = {
    'Leave Application': { bg: colors.info[50], text: colors.info[700] },
    'Attendance Regularization': { bg: colors.warning[50], text: colors.warning[700] },
    'Overtime Claim': { bg: colors.accent[50], text: colors.accent[700] },
    'Reimbursement': { bg: colors.success[50], text: colors.success[700] },
    'Loan Application': { bg: colors.primary[50], text: colors.primary[700] },
    'Resignation': { bg: colors.danger[50], text: colors.danger[700] },
    'Payroll Approval': { bg: colors.info[50], text: colors.info[700] },
    'Salary Revision': { bg: colors.warning[50], text: colors.warning[700] },
};

// ============ WORKFLOW FORM MODAL ============

function WorkflowFormModal({
    visible, onClose, onSave, isSaving, editItem,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    editItem?: WorkflowItem | null;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [triggerEvent, setTriggerEvent] = React.useState('');
    const [triggerOpen, setTriggerOpen] = React.useState(false);
    const [steps, setSteps] = React.useState<WorkflowStep[]>([{ order: 1, approverRole: 'Manager', slaHours: '24', autoEscalate: false, autoApprove: false, autoReject: false }]);
    const [active, setActive] = React.useState(true);

    React.useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem.name);
                setTriggerEvent(editItem.triggerEvent);
                setSteps(editItem.steps.length > 0 ? editItem.steps : [{ order: 1, approverRole: 'Manager', slaHours: '24', autoEscalate: false, autoApprove: false, autoReject: false }]);
                setActive(editItem.active);
            } else {
                setName(''); setTriggerEvent('');
                setSteps([{ order: 1, approverRole: 'Manager', slaHours: '24', autoEscalate: false, autoApprove: false, autoReject: false }]);
                setActive(true);
            }
        }
    }, [visible, editItem]);

    const addStep = () => setSteps(prev => [...prev, { order: prev.length + 1, approverRole: 'HR', slaHours: '24', autoEscalate: false, autoApprove: false, autoReject: false }]);
    const removeStep = (idx: number) => setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
    const updateStep = (idx: number, patch: Partial<WorkflowStep>) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

    const isValid = name.trim() && triggerEvent;

    const handleSave = () => {
        if (!isValid) return;
        onSave({ name: name.trim(), triggerEvent, steps, active });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 40 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">{editItem ? 'Edit Workflow' : 'New Workflow'}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Workflow Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Leave Approval" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>

                        {/* Trigger Event */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Trigger Event <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setTriggerOpen(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${triggerEvent ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>{triggerEvent || 'Select event...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={triggerOpen} transparent animationType="slide" onRequestClose={() => setTriggerOpen(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTriggerOpen(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Trigger Event</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {TRIGGER_EVENTS.map(ev => (
                                                <Pressable key={ev} onPress={() => { setTriggerEvent(ev); setTriggerOpen(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: ev === triggerEvent ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${ev === triggerEvent ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{ev}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Active Toggle */}
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950" style={{ flex: 1 }}>Active</Text>
                            <Switch value={active} onValueChange={setActive} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={active ? colors.primary[600] : colors.neutral[300]} />
                        </View>

                        {/* Steps */}
                        <Text className="mt-4 mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Approval Steps</Text>
                        {steps.map((step, idx) => (
                            <View key={idx} style={styles.stepCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={styles.stepBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">Step {step.order}</Text></View>
                                    {steps.length > 1 && (
                                        <Pressable onPress={() => removeStep(idx)} hitSlop={8}>
                                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                        </Pressable>
                                    )}
                                </View>
                                {/* Approver Role */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                    {APPROVER_ROLES.map(role => {
                                        const sel = role === step.approverRole;
                                        return (
                                            <Pressable key={role} onPress={() => updateStep(idx, { approverRole: role })} style={[styles.chip, sel && styles.chipActive]}>
                                                <Text className={`font-inter text-[10px] font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{role}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                                {/* SLA Hours */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <Text className="font-inter text-xs text-neutral-500">SLA Hours:</Text>
                                    <View style={[styles.inputWrapSmall, { width: 60 }]}>
                                        <TextInput style={styles.textInputSmall} value={step.slaHours} onChangeText={v => updateStep(idx, { slaHours: v })} keyboardType="number-pad" placeholder="24" placeholderTextColor={colors.neutral[400]} />
                                    </View>
                                </View>
                                {/* Toggles row */}
                                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                    <Pressable onPress={() => updateStep(idx, { autoEscalate: !step.autoEscalate })} style={[styles.miniToggle, step.autoEscalate && styles.miniToggleActive]}>
                                        <Text className={`font-inter text-[10px] font-semibold ${step.autoEscalate ? 'text-white' : 'text-neutral-500'}`}>Auto-Escalate</Text>
                                    </Pressable>
                                    <Pressable onPress={() => updateStep(idx, { autoApprove: !step.autoApprove })} style={[styles.miniToggle, step.autoApprove && styles.miniToggleActive]}>
                                        <Text className={`font-inter text-[10px] font-semibold ${step.autoApprove ? 'text-white' : 'text-neutral-500'}`}>Auto-Approve</Text>
                                    </Pressable>
                                    <Pressable onPress={() => updateStep(idx, { autoReject: !step.autoReject })} style={[styles.miniToggle, step.autoReject && { backgroundColor: colors.danger[500] }]}>
                                        <Text className={`font-inter text-[10px] font-semibold ${step.autoReject ? 'text-white' : 'text-neutral-500'}`}>Auto-Reject</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        <Pressable onPress={addStep} style={styles.addBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add Step</Text>
                        </Pressable>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : editItem ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ WORKFLOW CARD ============

function WorkflowCard({ item, index, onEdit, onDelete, onToggle }: { item: WorkflowItem; index: number; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
    const tc = TRIGGER_COLORS[item.triggerEvent] ?? { bg: colors.neutral[100], text: colors.neutral[700] };
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.triggerBadge, { backgroundColor: tc.bg }]}>
                            <Text style={{ color: tc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.triggerEvent}</Text>
                        </View>
                    </View>
                    <Switch value={item.active} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={item.active ? colors.primary[600] : colors.neutral[300]} />
                </View>
                <View style={styles.cardFooter}>
                    <Text className="font-inter text-xs text-neutral-500">{item.steps.length} step{item.steps.length !== 1 ? 's' : ''}</Text>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ApprovalWorkflowScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useApprovalWorkflows();
    const createMutation = useCreateApprovalWorkflow();
    const updateMutation = useUpdateApprovalWorkflow();
    const deleteMutation = useDeleteApprovalWorkflow();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editItem, setEditItem] = React.useState<WorkflowItem | null>(null);

    const workflows: WorkflowItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            triggerEvent: item.triggerEvent ?? '',
            steps: (item.steps ?? []).map((s: any, i: number) => ({
                order: s.order ?? i + 1,
                approverRole: s.approverRole ?? 'Manager',
                slaHours: String(s.slaHours ?? 24),
                autoEscalate: s.autoEscalate ?? false,
                autoApprove: s.autoApprove ?? false,
                autoReject: s.autoReject ?? false,
            })),
            active: item.active ?? true,
        }));
    }, [response]);

    const handleCreate = () => { setEditItem(null); setFormVisible(true); };
    const handleEdit = (item: WorkflowItem) => { setEditItem(item); setFormVisible(true); };

    const handleSave = (data: Record<string, unknown>) => {
        if (editItem) {
            updateMutation.mutate({ id: editItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleDelete = (item: WorkflowItem) => {
        showConfirm({
            title: 'Delete Workflow', message: `Delete "${item.name}" workflow?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleToggle = (item: WorkflowItem, active: boolean) => {
        updateMutation.mutate({ id: item.id, data: { active } });
    };

    const renderItem = ({ item, index }: { item: WorkflowItem; index: number }) => (
        <WorkflowCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onToggle={v => handleToggle(item, v)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Approval Workflows</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</Text>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No workflows" message="Create your first approval workflow." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Approval Workflows</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={workflows}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleCreate} />
            <WorkflowFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending || updateMutation.isPending} editItem={editItem} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    triggerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
    formSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    inputWrapSmall: { backgroundColor: colors.neutral[50], borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 10, height: 36, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    textInputSmall: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    stepCard: {
        backgroundColor: colors.neutral[50], borderRadius: 14, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: colors.neutral[200],
    },
    stepBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
    miniToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
    miniToggleActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', marginTop: 4, marginBottom: 12,
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
