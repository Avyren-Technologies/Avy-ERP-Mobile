/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
    useCreateNotificationTemplate,
    useDeleteNotificationTemplate,
    useUpdateNotificationTemplate,
} from '@/features/company-admin/api/use-ess-mutations';
import { useNotificationTemplates } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface TemplateItem {
    id: string;
    name: string;
    channel: string;
    subject: string;
    body: string;
    active: boolean;
}

// ============ CONSTANTS ============

const CHANNELS = ['Email', 'SMS', 'Push', 'WhatsApp', 'In-App'];

const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
    Email: { bg: colors.info[50], text: colors.info[700] },
    SMS: { bg: colors.success[50], text: colors.success[700] },
    Push: { bg: colors.primary[50], text: colors.primary[700] },
    WhatsApp: { bg: '#ECFDF5', text: '#047857' },
    'In-App': { bg: colors.warning[50], text: colors.warning[700] },
};

const TOKEN_HINT = 'Tokens: {employee_name}, {leave_days}, {leave_type}, {start_date}, {end_date}, {approver_name}, {company_name}';

// ============ TEMPLATE FORM MODAL ============

function TemplateFormModal({
    visible, onClose, onSave, isSaving, editItem,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    editItem?: TemplateItem | null;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [channel, setChannel] = React.useState('Email');
    const [subject, setSubject] = React.useState('');
    const [body, setBody] = React.useState('');
    const [active, setActive] = React.useState(true);

    React.useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem.name); setChannel(editItem.channel);
                setSubject(editItem.subject); setBody(editItem.body); setActive(editItem.active);
            } else {
                setName(''); setChannel('Email'); setSubject(''); setBody(''); setActive(true);
            }
        }
    }, [visible, editItem]);

    const isValid = name.trim() && body.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">{editItem ? 'Edit Template' : 'New Template'}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Template Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Leave Approved" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        {/* Channel Selector */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Channel</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {CHANNELS.map(ch => {
                                    const sel = ch === channel;
                                    return (
                                        <Pressable key={ch} onPress={() => setChannel(ch)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{ch}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        {/* Subject (email only) */}
                        {channel === 'Email' && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Subject</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Email subject..." placeholderTextColor={colors.neutral[400]} value={subject} onChangeText={setSubject} /></View>
                            </View>
                        )}
                        {/* Body */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Body <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 120 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Notification body..." placeholderTextColor={colors.neutral[400]} value={body} onChangeText={setBody} multiline numberOfLines={5} />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">{TOKEN_HINT}</Text>
                        </View>
                        {/* Active */}
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" style={{ flex: 1 }}>Active</Text>
                            <Switch value={active} onValueChange={setActive} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={active ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={() => { if (isValid) onSave({ name: name.trim(), channel, subject, body: body.trim(), active }); }} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : editItem ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ TEMPLATE CARD ============

function TemplateCard({ item, index, onEdit, onDelete, onToggle }: { item: TemplateItem; index: number; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
    const cc = CHANNEL_COLORS[item.channel] ?? { bg: colors.neutral[100], text: colors.neutral[700] };
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.channelBadge, { backgroundColor: cc.bg }]}>
                            <Text style={{ color: cc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.channel}</Text>
                        </View>
                    </View>
                    <Switch value={item.active} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={item.active ? colors.primary[600] : colors.neutral[300]} />
                </View>
                {item.subject ? <Text className="mt-2 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>Subject: {item.subject}</Text> : null}
                <View style={styles.cardFooter}>
                    <Text className="font-inter text-[10px] text-neutral-400 flex-1" numberOfLines={1}>{item.body}</Text>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function NotificationTemplateScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useNotificationTemplates();
    const createMutation = useCreateNotificationTemplate();
    const updateMutation = useUpdateNotificationTemplate();
    const deleteMutation = useDeleteNotificationTemplate();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editItem, setEditItem] = React.useState<TemplateItem | null>(null);

    const templates: TemplateItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', channel: item.channel ?? 'Email',
            subject: item.subject ?? '', body: item.body ?? '', active: item.active ?? true,
        }));
    }, [response]);

    const handleCreate = () => { setEditItem(null); setFormVisible(true); };
    const handleEdit = (item: TemplateItem) => { setEditItem(item); setFormVisible(true); };

    const handleSave = (data: Record<string, unknown>) => {
        if (editItem) {
            updateMutation.mutate({ id: editItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleDelete = (item: TemplateItem) => {
        showConfirm({
            title: 'Delete Template', message: `Delete "${item.name}" template?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleToggle = (item: TemplateItem, active: boolean) => {
        updateMutation.mutate({ id: item.id, data: { active } });
    };

    const renderItem = ({ item, index }: { item: TemplateItem; index: number }) => (
        <TemplateCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onToggle={v => handleToggle(item, v)} />
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No templates" message="Create your first notification template." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Notification Templates" onMenuPress={toggle} />
            <FlashList
                data={templates}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleCreate} />
            <TemplateFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending || updateMutation.isPending} editItem={editItem} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    channelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
