/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateDisciplinaryAction,
    useUpdateDisciplinaryAction,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useDisciplinaryActions } from '@/features/company-admin/api/use-recruitment-queries';
import { useCanPerform } from '@/hooks/use-can-perform';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type ActionType = 'Verbal Warning' | 'Written Warning' | 'SCN' | 'PIP' | 'Suspension' | 'Termination';
type ActionStatus = 'Draft' | 'Issued' | 'Reply Received' | 'Under Review' | 'Closed' | 'PIP Active' | 'PIP Passed' | 'PIP Failed';

interface DisciplinaryItem {
    id: string;
    employeeId: string;
    employeeName: string;
    type: ActionType;
    charges: string;
    status: ActionStatus;
    replyDueDate: string;
    pipDuration: number;
    pipOutcome: string;
    issuedAt: string;
    closedAt: string;
}

// ============ CONSTANTS ============

const ACTION_TYPES: ActionType[] = ['Verbal Warning', 'Written Warning', 'SCN', 'PIP', 'Suspension', 'Termination'];

const TYPE_COLORS: Record<ActionType, { bg: string; text: string }> = {
    'Verbal Warning': { bg: colors.warning[50], text: colors.warning[700] },
    'Written Warning': { bg: '#FFF3E0', text: '#E65100' },
    SCN: { bg: colors.danger[50], text: colors.danger[700] },
    PIP: { bg: colors.primary[50], text: colors.primary[700] },
    Suspension: { bg: '#F3E5F5', text: '#7B1FA2' },
    Termination: { bg: colors.danger[100], text: colors.danger[900] },
};

const STATUS_COLORS: Record<ActionStatus, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Issued: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    'Reply Received': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    'Under Review': { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
    Closed: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    'PIP Active': { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    'PIP Passed': { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    'PIP Failed': { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

const STATUS_TRANSITIONS: Partial<Record<ActionStatus, { label: string; next: ActionStatus; color: string }[]>> = {
    Draft: [{ label: 'Issue', next: 'Issued', color: colors.info[600] }],
    Issued: [{ label: 'Reply Received', next: 'Reply Received', color: colors.warning[600] }],
    'Reply Received': [
        { label: 'Review', next: 'Under Review', color: colors.accent[600] },
        { label: 'Close', next: 'Closed', color: colors.neutral[600] },
    ],
    'Under Review': [{ label: 'Close', next: 'Closed', color: colors.neutral[600] }],
    'PIP Active': [
        { label: 'PIP Passed', next: 'PIP Passed', color: colors.success[600] },
        { label: 'PIP Failed', next: 'PIP Failed', color: colors.danger[600] },
    ],
};

// ============ SHARED ATOMS ============

function ActionStatusBadge({ status }: { status: ActionStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function ActionTypeBadge({ type }: { type: ActionType }) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS['Verbal Warning'];
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
        </View>
    );
}

function AvatarCircle({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatar}>
            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
                <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(8, 15, 40, 0.45)', paddingHorizontal: 20 }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={{ backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20, maxHeight: '70%' }}>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search employees..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" autoFocus />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {filteredOptions.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                    {opt.id === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[600] }} />}
                                </Pressable>
                            ))}
                            {filteredOptions.length === 0 && <Text className="py-6 text-center font-inter text-sm text-neutral-400">No employees found</Text>}
                        </ScrollView>
                        <Pressable onPress={() => setOpen(false)} style={{ marginTop: 16, height: 44, borderRadius: 12, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' }}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ FORM MODAL ============

function ActionFormModal({
    visible, onClose, onSave, employeeOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    employeeOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const [employeeId, setEmployeeId] = React.useState('');
    const [type, setType] = React.useState<ActionType>('Verbal Warning');
    const [charges, setCharges] = React.useState('');
    const [replyDueDate, setReplyDueDate] = React.useState('');
    const [pipDuration, setPipDuration] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeId(''); setType('Verbal Warning'); setCharges('');
            setReplyDueDate(''); setPipDuration('');
        }
    }, [visible]);

    const isValid = employeeId && charges.trim();
    const showReplyDue = type === 'SCN';
    const showPipDuration = type === 'PIP';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView
                style={{ flex: 1, justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-start', paddingTop: Platform.OS === 'ios' ? 0 : '10%', backgroundColor: 'rgba(8, 15, 40, 0.32)', paddingHorizontal: 20 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={styles.modalPopup}>
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">New Disciplinary Action</Text>
                    <KeyboardAwareScrollView
                        bottomOffset={20}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={{ flexGrow: 0, flexShrink: 1 }}
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <ChipSelector label="Type" options={[...ACTION_TYPES]} value={type} onSelect={v => setType(v as ActionType)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Charges <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start', paddingVertical: 10 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', width: '100%' }]} placeholder="Describe charges..." placeholderTextColor={colors.neutral[400]} value={charges} onChangeText={setCharges} multiline numberOfLines={4} />
                            </View>
                        </View>
                        {showReplyDue && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reply Due By</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={replyDueDate} onChangeText={setReplyDueDate} /></View>
                            </View>
                        )}
                        {showPipDuration && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">PIP Duration (days)</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 90" placeholderTextColor={colors.neutral[400]} value={pipDuration} onChangeText={setPipDuration} keyboardType="number-pad" /></View>
                            </View>
                        )}
                    </KeyboardAwareScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({
                            employeeId, employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '',
                            type, charges: charges.trim(), status: type === 'PIP' ? 'PIP Active' : 'Draft',
                            replyDueDate: showReplyDue ? replyDueDate.trim() : '',
                            pipDuration: showPipDuration ? (Number(pipDuration) || 0) : 0,
                        })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'Create Action'}</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============ ACTION CARD ============

function ActionCard({ item, index, onTransition, showAdminActions }: {
    item: DisciplinaryItem; index: number;
    onTransition: (next: ActionStatus) => void;
    showAdminActions: boolean;
}) {
    const transitions = showAdminActions ? (STATUS_TRANSITIONS[item.status] ?? []) : [];

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.issuedAt || 'Not issued yet'}</Text>
                        </View>
                    </View>
                    <ActionStatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <ActionTypeBadge type={item.type} />
                    {item.replyDueDate && item.type === 'SCN' && (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Reply by: {item.replyDueDate}</Text>
                    )}
                    {item.type === 'PIP' && item.pipDuration > 0 && (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.pipDuration} days PIP</Text>
                    )}
                </View>
                <Text className="mt-2 font-inter text-xs text-neutral-600 dark:text-neutral-400" numberOfLines={2}>{item.charges}</Text>
                {item.pipOutcome ? (
                    <View style={{ marginTop: 4, backgroundColor: item.pipOutcome === 'Passed' ? colors.success[50] : colors.danger[50], borderRadius: 8, padding: 6 }}>
                        <Text className={`font-inter text-[10px] font-bold ${item.pipOutcome === 'Passed' ? 'text-success-700' : 'text-danger-700'}`}>
                            PIP Outcome: {item.pipOutcome}
                        </Text>
                    </View>
                ) : null}
                {transitions.length > 0 && (
                    <View style={styles.actionRow}>
                        {transitions.map(t => (
                            <Pressable key={t.next} onPress={() => onTransition(t.next)} style={[styles.transitionBtn, { backgroundColor: t.color }]}>
                                <Text className="font-inter text-[10px] font-bold text-white">{t.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function DisciplinaryScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const isHrAdmin = useCanPerform('hr:read');

    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useDisciplinaryActions();
    const createMutation = useCreateDisciplinaryAction();
    const updateMutation = useUpdateDisciplinaryAction();
    const { data: empResponse } = useEmployees();

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const actions: DisciplinaryItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            type: item.type ?? 'Verbal Warning', charges: item.charges ?? '', status: item.status ?? 'Draft',
            replyDueDate: item.replyDueDate ?? '', pipDuration: item.pipDuration ?? 0,
            pipOutcome: item.pipOutcome ?? '', issuedAt: item.issuedAt ?? '', closedAt: item.closedAt ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return actions;
        const q = search.toLowerCase();
        return actions.filter(a => a.employeeName.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.charges.toLowerCase().includes(q));
    }, [actions, search]);

    const handleTransition = (item: DisciplinaryItem, next: ActionStatus) => {
        showConfirm({
            title: `${next}`,
            message: `Change ${item.employeeName}'s action to "${next}"?`,
            confirmText: next,
            variant: next === 'PIP Failed' || next === 'Closed' ? 'danger' : 'primary',
            onConfirm: () => updateMutation.mutate({ id: item.id, data: {
                status: next,
                ...(next === 'Issued' ? { issuedAt: new Date().toISOString().split('T')[0] } : {}),
                ...(next === 'Closed' ? { closedAt: new Date().toISOString().split('T')[0] } : {}),
                ...(next === 'PIP Passed' ? { pipOutcome: 'Passed' } : {}),
                ...(next === 'PIP Failed' ? { pipOutcome: 'Failed' } : {}),
            }}),
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">{isHrAdmin ? 'Disciplinary Actions' : 'My Disciplinary Actions'}</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{isHrAdmin ? `${actions.length} action${actions.length !== 1 ? 's' : ''}` : 'View disciplinary actions related to you'}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee or type..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No actions" message="No disciplinary actions recorded." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title={isHrAdmin ? 'Disciplinary' : 'My Disciplinary'} onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={({ item, index }) => <ActionCard item={item} index={index} onTransition={next => handleTransition(item, next)} showAdminActions={isHrAdmin} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            {isHrAdmin && <FAB onPress={() => setFormVisible(true)} />}
            <ActionFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} employeeOptions={employeeOptions} isSaving={createMutation.isPending} />
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    transitionBtn: { flex: 1, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    modalPopup: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 24, maxHeight: '88%' },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
