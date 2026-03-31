/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateNotificationRule,
    useDeleteNotificationRule,
    useUpdateNotificationRule,
} from '@/features/company-admin/api/use-ess-mutations';
import { useNotificationRules, useNotificationTemplates } from '@/features/company-admin/api/use-ess-queries';

// ============ TYPES ============

interface RuleItem {
    id: string;
    triggerEvent: string;
    templateId: string;
    templateName: string;
    recipientRole: string;
    channel: string;
    active: boolean;
}

// ============ CONSTANTS ============

const TRIGGER_EVENTS = [
    'Leave Application', 'Leave Approved', 'Leave Rejected', 'Attendance Regularization',
    'Overtime Claim', 'Reimbursement', 'Loan Application', 'Resignation',
    'Payroll Processed', 'Salary Revision', 'Birthday', 'Work Anniversary',
];

const RECIPIENT_ROLES = ['Employee', 'Manager', 'HR', 'Finance', 'IT', 'Admin', 'All'];
const CHANNELS = ['Email', 'SMS', 'Push', 'WhatsApp', 'In-App'];

const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
    Email: { bg: colors.info[50], text: colors.info[700] },
    SMS: { bg: colors.success[50], text: colors.success[700] },
    Push: { bg: colors.primary[50], text: colors.primary[700] },
    WhatsApp: { bg: '#ECFDF5', text: '#047857' },
    'In-App': { bg: colors.warning[50], text: colors.warning[700] },
};

const TRIGGER_COLORS: Record<string, { bg: string; text: string }> = {
    'Leave Application': { bg: colors.info[50], text: colors.info[700] },
    'Leave Approved': { bg: colors.success[50], text: colors.success[700] },
    'Leave Rejected': { bg: colors.danger[50], text: colors.danger[700] },
    'Attendance Regularization': { bg: colors.warning[50], text: colors.warning[700] },
    'Payroll Processed': { bg: colors.primary[50], text: colors.primary[700] },
};

// ============ RULE FORM MODAL ============

function RuleFormModal({
    visible, onClose, onSave, isSaving, editItem, templateOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    editItem?: RuleItem | null;
    templateOptions: { id: string; name: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [triggerEvent, setTriggerEvent] = React.useState('');
    const [templateId, setTemplateId] = React.useState('');
    const [recipientRole, setRecipientRole] = React.useState('Employee');
    const [channel, setChannel] = React.useState('Email');
    const [active, setActive] = React.useState(true);
    const [triggerOpen, setTriggerOpen] = React.useState(false);
    const [templateOpen, setTemplateOpen] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (editItem) {
                setTriggerEvent(editItem.triggerEvent); setTemplateId(editItem.templateId);
                setRecipientRole(editItem.recipientRole); setChannel(editItem.channel); setActive(editItem.active);
            } else {
                setTriggerEvent(''); setTemplateId(''); setRecipientRole('Employee'); setChannel('Email'); setActive(true);
            }
        }
    }, [visible, editItem]);

    const isValid = triggerEvent && templateId;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">{editItem ? 'Edit Rule' : 'New Rule'}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Trigger Event Dropdown */}
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

                        {/* Template Dropdown */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Template <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setTemplateOpen(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${templateId ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {templateOptions.find(t => t.id === templateId)?.name || 'Select template...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={templateOpen} transparent animationType="slide" onRequestClose={() => setTemplateOpen(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTemplateOpen(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Template</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {templateOptions.map(t => (
                                                <Pressable key={t.id} onPress={() => { setTemplateId(t.id); setTemplateOpen(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: t.id === templateId ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${t.id === templateId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{t.name}</Text>
                                                </Pressable>
                                            ))}
                                            {templateOptions.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No templates available</Text>}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Recipient Role */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Recipient Role</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {RECIPIENT_ROLES.map(r => {
                                    const sel = r === recipientRole;
                                    return (
                                        <Pressable key={r} onPress={() => setRecipientRole(r)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{r}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Channel */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Channel</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {CHANNELS.map(ch => {
                                    const sel = ch === channel;
                                    return (
                                        <Pressable key={ch} onPress={() => setChannel(ch)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{ch}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Active */}
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950" style={{ flex: 1 }}>Active</Text>
                            <Switch value={active} onValueChange={setActive} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={active ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => { if (isValid) onSave({ triggerEvent, templateId, recipientRole, channel, active }); }} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : editItem ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ RULE CARD ============

function RuleCard({ item, index, onEdit, onDelete, onToggle }: { item: RuleItem; index: number; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
    const tc = TRIGGER_COLORS[item.triggerEvent] ?? { bg: colors.neutral[100], text: colors.neutral[700] };
    const cc = CHANNEL_COLORS[item.channel] ?? { bg: colors.neutral[100], text: colors.neutral[700] };
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.triggerBadge, { backgroundColor: tc.bg }]}>
                            <Text style={{ color: tc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.triggerEvent}</Text>
                        </View>
                        <Text className="mt-1 font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>{item.templateName}</Text>
                    </View>
                    <Switch value={item.active} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={item.active ? colors.primary[600] : colors.neutral[300]} />
                </View>
                <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                        <View style={[styles.metaChip, { backgroundColor: colors.neutral[100] }]}>
                            <Text className="font-inter text-[10px] font-semibold text-neutral-600">{item.recipientRole}</Text>
                        </View>
                        <View style={[styles.metaChip, { backgroundColor: cc.bg }]}>
                            <Text style={{ color: cc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '600' }}>{item.channel}</Text>
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function NotificationRuleScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useNotificationRules();
    const { data: templatesResponse } = useNotificationTemplates();
    const createMutation = useCreateNotificationRule();
    const updateMutation = useUpdateNotificationRule();
    const deleteMutation = useDeleteNotificationRule();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editItem, setEditItem] = React.useState<RuleItem | null>(null);

    const templateOptions = React.useMemo(() => {
        const raw = (templatesResponse as any)?.data ?? templatesResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
    }, [templatesResponse]);

    const rules: RuleItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', triggerEvent: item.triggerEvent ?? '',
            templateId: item.templateId ?? '', templateName: item.templateName ?? templateOptions.find((t: any) => t.id === item.templateId)?.name ?? '',
            recipientRole: item.recipientRole ?? 'Employee', channel: item.channel ?? 'Email', active: item.active ?? true,
        }));
    }, [response, templateOptions]);

    const handleCreate = () => { setEditItem(null); setFormVisible(true); };
    const handleEdit = (item: RuleItem) => { setEditItem(item); setFormVisible(true); };

    const handleSave = (data: Record<string, unknown>) => {
        if (editItem) {
            updateMutation.mutate({ id: editItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleDelete = (item: RuleItem) => {
        showConfirm({
            title: 'Delete Rule', message: `Delete notification rule for "${item.triggerEvent}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleToggle = (item: RuleItem, active: boolean) => {
        updateMutation.mutate({ id: item.id, data: { active } });
    };

    const renderItem = ({ item, index }: { item: RuleItem; index: number }) => (
        <RuleCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onToggle={v => handleToggle(item, v)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Notification Rules</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{rules.length} rule{rules.length !== 1 ? 's' : ''}</Text>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No rules" message="Create your first notification rule." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Notification Rules" onMenuPress={toggle} />
            <FlatList
                data={rules}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleCreate} />
            <RuleFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending || updateMutation.isPending} editItem={editItem} templateOptions={templateOptions} />
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
    cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    triggerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    metaChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
