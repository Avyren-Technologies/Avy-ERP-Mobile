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
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import {
    useCreateOnboardingTemplate,
    useDeleteOnboardingTemplate,
    useUpdateOnboardingTask,
    useUpdateOnboardingTemplate,
} from '@/features/company-admin/api/use-onboarding-mutations';
import {
    useOnboardingTasks,
    useOnboardingTemplates,
} from '@/features/company-admin/api/use-onboarding-queries';

// ============ TYPES ============

interface TemplateItem {
    id: string;
    name: string;
    description: string;
    items: any[];
    isDefault: boolean;
}

interface TaskItem {
    id: string;
    title: string;
    employeeName: string;
    employeeId: string;
    department: string;
    status: string;
    dueDate: string;
}

type Tab = 'templates' | 'tasks';

const TASK_STATUSES = ['PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE'];

// ============ STATUS BADGE ============

function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase();
    const bg = s === 'completed' ? colors.success[50] : s === 'skipped' ? colors.neutral[100] : s === 'overdue' ? colors.danger[50] : colors.warning[50];
    const textCls = s === 'completed' ? 'text-success-700' : s === 'skipped' ? 'text-neutral-500' : s === 'overdue' ? 'text-danger-700' : 'text-warning-700';
    return (
        <View style={[styles.typeBadge, { backgroundColor: bg }]}>
            <Text className={`font-inter text-[10px] font-bold uppercase ${textCls}`}>{status}</Text>
        </View>
    );
}

// ============ DEFAULT BADGE ============

function DefaultBadge() {
    return (
        <View style={[styles.typeBadge, { backgroundColor: colors.primary[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-primary-700">Default</Text>
        </View>
    );
}

// ============ PROGRESS BAR ============

function ProgressBar({ percentage }: { percentage: number }) {
    const color = percentage >= 100 ? colors.success[500] : percentage >= 50 ? colors.primary[500] : colors.warning[500];
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` as any, backgroundColor: color }]} />
            </View>
            <Text className="font-inter text-xs font-bold text-neutral-600" style={{ minWidth: 36, textAlign: 'right' }}>{Math.round(percentage)}%</Text>
        </View>
    );
}

// ============ TAB SELECTOR ============

function TabSelector({ activeTab, onSelect }: { activeTab: Tab; onSelect: (t: Tab) => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['templates', 'tasks'] as Tab[]).map(tab => {
                const active = tab === activeTab;
                return (
                    <Pressable key={tab} onPress={() => onSelect(tab)} style={[styles.chip, active && styles.chipActive]}>
                        <Text className={`font-inter text-xs font-semibold capitalize ${active ? 'text-white' : 'text-neutral-600'}`}>{tab}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ============ TEMPLATE FORM MODAL ============

function TemplateFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: { name: string; description: string; items: string[]; isDefault: boolean }) => void;
    initialData?: TemplateItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [items, setItems] = React.useState('');
    const [isDefault, setIsDefault] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description ?? '');
                setItems(Array.isArray(initialData.items) ? initialData.items.map((i: any) => typeof i === 'string' ? i : i.title ?? i.name).join('\n') : '');
                setIsDefault(initialData.isDefault ?? false);
            } else {
                setName(''); setDescription(''); setItems(''); setIsDefault(false);
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            description: description.trim(),
            items: items.split('\n').map(s => s.trim()).filter(Boolean),
            isDefault,
        });
    };

    const isValid = name.trim().length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Template' : 'Add Template'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Standard Onboarding" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Optional description" placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Checklist Items (one per line)</Text>
                            <View style={[styles.inputWrap, { height: 120 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder={'Issue laptop\nCreate email account\nAssign mentor'} placeholderTextColor={colors.neutral[400]} value={items} onChangeText={setItems} multiline />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">{items.split('\n').filter(Boolean).length} items</Text>
                        </View>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">Set as Default</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500">Auto-applied to new employees</Text>
                            </View>
                            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isDefault ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ TEMPLATE CARD ============

function TemplateCard({ item, index, onEdit, onDelete }: { item: TemplateItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            {item.isDefault && <DefaultBadge />}
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{Array.isArray(item.items) ? item.items.length : 0} items</Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {item.description ? (
                    <View style={styles.cardMeta}>
                        <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={2}>{item.description}</Text>
                    </View>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ============ TASK CARD ============

function TaskCard({ item, index, onComplete, onSkip }: { item: TaskItem; index: number; onComplete: () => void; onSkip: () => void }) {
    const fmt = useCompanyFormatter();
    const isPending = item.status?.toLowerCase() === 'pending';
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                    </View>
                    <StatusBadge status={item.status ?? 'PENDING'} />
                </View>
                <View style={styles.cardMeta}>
                    {item.department ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">{item.department}</Text>
                        </View>
                    ) : null}
                    {item.dueDate ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">Due: {fmt.date(item.dueDate)}</Text>
                        </View>
                    ) : null}
                </View>
                {isPending && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <Pressable onPress={onComplete} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="ml-1 font-inter text-xs font-bold text-success-700">Complete</Text>
                        </Pressable>
                        <Pressable onPress={onSkip} style={[styles.actionBtn, { backgroundColor: colors.neutral[100] }]}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 4l10 8-10 8V4zM19 5v14" stroke={colors.neutral[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="ml-1 font-inter text-xs font-semibold text-neutral-500">Skip</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<Tab>('templates');
    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<TemplateItem | null>(null);

    const { data: templatesRes, isLoading: templatesLoading, error: templatesError, refetch: refetchTemplates, isFetching: templatesFetching } = useOnboardingTemplates();
    const { data: tasksRes, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks, isFetching: tasksFetching } = useOnboardingTasks();
    const createMutation = useCreateOnboardingTemplate();
    const updateMutation = useUpdateOnboardingTemplate();
    const deleteMutation = useDeleteOnboardingTemplate();
    const updateTaskMutation = useUpdateOnboardingTask();

    const templates: TemplateItem[] = React.useMemo(() => {
        const raw = (templatesRes as any)?.data ?? templatesRes ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [templatesRes]);

    const tasks: TaskItem[] = React.useMemo(() => {
        const raw = (tasksRes as any)?.data ?? tasksRes ?? [];
        return Array.isArray(raw) ? raw.map((t: any) => ({
            id: t.id, title: t.title ?? t.name ?? '', employeeName: t.employeeName ?? t.employee?.name ?? '',
            employeeId: t.employeeId ?? '', department: t.department ?? '', status: t.status ?? 'PENDING', dueDate: t.dueDate ?? '',
        })) : [];
    }, [tasksRes]);

    // Group tasks by employee for progress
    const employeeProgress = React.useMemo(() => {
        const map = new Map<string, { name: string; total: number; completed: number }>();
        tasks.forEach(t => {
            const key = t.employeeId || 'unknown';
            if (!map.has(key)) map.set(key, { name: t.employeeName, total: 0, completed: 0 });
            const entry = map.get(key)!;
            entry.total++;
            if (t.status?.toLowerCase() === 'completed') entry.completed++;
        });
        return Array.from(map.entries());
    }, [tasks]);

    const filtered = React.useMemo(() => {
        const list = activeTab === 'templates' ? templates : tasks;
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((item: any) =>
            item.name?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q) ||
            item.employeeName?.toLowerCase().includes(q) || item.department?.toLowerCase().includes(q)
        );
    }, [activeTab, templates, tasks, search]);

    const isLoading = activeTab === 'templates' ? templatesLoading : tasksLoading;
    const error = activeTab === 'templates' ? templatesError : tasksError;
    const isFetching = activeTab === 'templates' ? templatesFetching : tasksFetching;
    const refetch = activeTab === 'templates' ? refetchTemplates : refetchTasks;

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: TemplateItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: TemplateItem) => {
        showConfirm({
            title: 'Delete Template',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: { name: string; description: string; items: string[]; isDefault: boolean }) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleTaskAction = (taskId: string, status: string) => {
        updateTaskMutation.mutate({ id: taskId, data: { status } as unknown as Record<string, unknown> });
    };

    const renderTemplateItem = ({ item, index }: { item: any; index: number }) => (
        <TemplateCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderTaskItem = ({ item, index }: { item: any; index: number }) => (
        <TaskCard item={item} index={index} onComplete={() => handleTaskAction(item.id, 'COMPLETED')} onSkip={() => handleTaskAction(item.id, 'SKIPPED')} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Onboarding</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {activeTab === 'templates' ? `${templates.length} template${templates.length !== 1 ? 's' : ''}` : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
                    </Text>
                </View>
            </View>
            <View style={{ marginTop: 16 }}>
                <TabSelector activeTab={activeTab} onSelect={t => { setActiveTab(t); setSearch(''); }} />
                <SearchBar value={search} onChangeText={setSearch} placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search tasks...'} />
            </View>
            {/* Employee Progress (Tasks tab) */}
            {activeTab === 'tasks' && employeeProgress.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <Text className="mb-2 font-inter text-xs font-bold text-primary-900">Employee Progress</Text>
                    {employeeProgress.map(([id, info]) => (
                        <View key={id} style={{ marginBottom: 10, backgroundColor: colors.neutral[50], borderRadius: 12, padding: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text className="font-inter text-xs font-bold text-primary-950">{info.name}</Text>
                                <Text className="font-inter text-[10px] text-neutral-500">{info.completed}/{info.total}</Text>
                            </View>
                            <ProgressBar percentage={info.total > 0 ? (info.completed / info.total) * 100 : 0} />
                        </View>
                    ))}
                </View>
            )}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title={`Failed to load ${activeTab}`} message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No ${activeTab} match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title={`No ${activeTab} yet`} message={activeTab === 'templates' ? 'Create your first onboarding template.' : 'Generate onboarding tasks for employees.'} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Onboarding" onMenuPress={toggle} />
            <FlatList
                data={filtered as any[]}
                renderItem={activeTab === 'templates' ? renderTemplateItem : renderTaskItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            {activeTab === 'templates' && <FAB onPress={handleAdd} />}
            <TemplateFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    progressTrack: { flex: 1, height: 6, backgroundColor: colors.neutral[100], borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
