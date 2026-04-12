/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeIn,
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
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateIOTReason,
    useDeleteIOTReason,
    useUpdateIOTReason,
} from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyIOTReasons } from '@/features/company-admin/api/use-company-admin-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const REASON_TYPES = ['Machine Idle', 'Machine Alarm'];

const DEPARTMENTS = [
    'Production', 'Maintenance', 'Quality', 'Stores', 'Admin',
    'HR', 'Finance', 'IT', 'Engineering', 'All',
];

// ============ TYPES ============

interface IOTReasonItem {
    id: string;
    reasonType: string;
    reason: string;
    description: string;
    department: string;
    planned: boolean;
    duration: string;
}

// ============ IOT REASON FORM MODAL ============

function IOTReasonFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<IOTReasonItem, 'id'>) => void;
    initialData?: IOTReasonItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [reasonType, setReasonType] = React.useState('Machine Idle');
    const [reason, setReason] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [department, setDepartment] = React.useState('Production');
    const [planned, setPlanned] = React.useState(false);
    const [duration, setDuration] = React.useState('');

    const [deptDropOpen, setDeptDropOpen] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setReasonType(initialData.reasonType);
                setReason(initialData.reason);
                setDescription(initialData.description);
                setDepartment(initialData.department);
                setPlanned(initialData.planned);
                setDuration(String(initialData.duration ?? ''));
            } else {
                setReasonType('Machine Idle');
                setReason('');
                setDescription('');
                setDepartment('Production');
                setPlanned(false);
                setDuration('');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!reason.trim()) return;
        onSave({ reasonType, reason: reason.trim(), description, department, planned, duration });
    };

    const isValid = reason.trim();

    return (
        <Modal 
            visible={visible} 
            transparent={false}
            animationType="slide" 
            presentationStyle="fullScreen" 
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: colors.white }}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white]}
                    style={StyleSheet.absoluteFill}
                />
                
                {/* Fixed Full-Screen Header */}
                <View style={[styles.headerBar, { paddingTop: insets.top + 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                            {initialData ? 'Edit IOT Reason' : 'Add IOT Reason'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            Create or update your machine downtime categories
                        </Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        style={{ flex: 1 }}
                        contentContainerStyle={{ 
                            paddingHorizontal: 24, 
                            paddingTop: 24, 
                            paddingBottom: insets.bottom + 120 // Extra room for keyboard
                        }}
                    >
                        {/* Reason Type Selection */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Reason Type</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {REASON_TYPES.map(t => (
                                    <Pressable
                                        key={t}
                                        onPress={() => setReasonType(t)}
                                        style={[styles.chip, { flex: 1 }, reasonType === t && (t === 'Machine Idle' ? styles.chipWarning : styles.chipDanger)]}
                                    >
                                        <Text className={`font-inter text-center text-xs font-semibold ${reasonType === t ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                            {t}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Reason Input */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Reason Label <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. MAINTENANCE"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={reason}
                                    onChangeText={v => setReason(v.toUpperCase())}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        {/* Description Input */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Description</Text>
                            <View style={[styles.inputWrap, styles.multilineWrap, { height: 100 }]}>
                                <TextInput
                                    style={[styles.textInput, styles.multilineInput]}
                                    placeholder="Enter additional details..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Department Picker */}
                        <View style={[styles.fieldWrap, { zIndex: deptDropOpen ? 1200 : 1, position: 'relative' }]}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Department</Text>
                            <Pressable
                                onPress={() => setDeptDropOpen(v => !v)}
                                style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                            >
                                <Text className={`flex-1 font-inter text-sm ${department ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                                    {department || 'Select Department'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d={deptDropOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                            {deptDropOpen && (
                                <View style={[styles.dropdownList, { position: 'absolute', top: 70, left: 0, right: 0, zIndex: 1210 }]}>
                                    <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 200 }}>
                                        {DEPARTMENTS.map((item, idx) => (
                                            <Pressable
                                                key={item}
                                                onPress={() => { setDepartment(item); setDeptDropOpen(false); }}
                                                style={{ padding: 15, backgroundColor: item === department ? colors.primary[50] : '#fff', borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.neutral[50] }}
                                            >
                                                <Text className={`font-inter text-sm ${item === department ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                                    {item}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Optional Planned Toggle */}
                        {reasonType === 'Machine Idle' && (
                            <View style={[styles.toggleRow, { marginTop: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.neutral[50] }]}>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Planned Event</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Scheduled downtime activities</Text>
                                </View>
                                <Switch
                                    value={planned}
                                    onValueChange={setPlanned}
                                    trackColor={{ false: colors.neutral[100], true: colors.primary[600] }}
                                />
                            </View>
                        )}

                        {/* Duration Setting */}
                        <View style={[styles.fieldWrap, { marginTop: 10 }]}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">
                                {planned ? 'Default Time (min)' : 'Threshold Time (min)'}
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="5"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={duration}
                                    onChangeText={setDuration}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={{ height: 30 }} />

                        {/* Form Buttons */}
                        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                            <Pressable onPress={onClose} style={[styles.cancelBtn, { height: 56 }]}>
                                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSave}
                                disabled={!isValid || isSaving}
                                style={[styles.saveBtn, { height: 56 }, (!isValid || isSaving) && { opacity: 0.5 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">
                                    {isSaving ? 'Saving...' : initialData ? 'SAVE CHANGES' : 'CREATE REASON'}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// ============ IOT REASON CARD ============

function IOTReasonCard({
    item,
    index,
    onEdit,
    onDelete,
}: {
    item: IOTReasonItem;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isIdle = item.reasonType === 'Machine Idle';
    const typeBg = isIdle ? colors.warning[50] : colors.danger[50];
    const typeColor = isIdle ? 'text-warning-700' : 'text-danger-700';

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.reasonTypeBadge, { backgroundColor: typeBg }]}>
                                <Text className={`font-inter text-[9px] font-bold ${typeColor}`}>
                                    {item.reasonType.toUpperCase()}
                                </Text>
                            </View>
                            {item.planned && (
                                <View style={styles.plannedBadge}>
                                    <Text className="font-inter text-[9px] font-bold text-success-700">PLANNED</Text>
                                </View>
                            )}
                        </View>
                        <Text className="mt-1.5 font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.reason}
                        </Text>
                        {item.department ? (
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                {item.department}
                            </Text>
                        ) : null}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                </View>

                {item.description ? (
                    <Text className="mt-2 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function IOTReasonManagementScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useCompanyIOTReasons();
    const createMutation = useCreateIOTReason();
    const updateMutation = useUpdateIOTReason();
    const deleteMutation = useDeleteIOTReason();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<IOTReasonItem | null>(null);

    const reasons: IOTReasonItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            reasonType: item.reasonType ?? 'Machine Idle',
            reason: item.reason ?? '',
            description: item.description ?? '',
            department: item.department ?? '',
            planned: item.planned ?? false,
            duration: String(item.duration ?? '0'),
        }));
    }, [response]);

    const idleCount = reasons.filter(r => r.reasonType === 'Machine Idle').length;
    const alarmCount = reasons.filter(r => r.reasonType === 'Machine Alarm').length;

    const handleAdd = () => {
        setEditingItem(null);
        setFormVisible(true);
    };

    const handleEdit = (item: IOTReasonItem) => {
        setEditingItem(item);
        setFormVisible(true);
    };

    const handleDelete = (item: IOTReasonItem) => {
        showConfirm({
            title: 'Delete IOT Reason',
            message: `Are you sure you want to delete "${item.reason}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(item.id);
            },
        });
    };

    const handleSave = (data: Omit<IOTReasonItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate(
                { id: editingItem.id, data: data as unknown as Record<string, unknown> },
                { onSuccess: () => setFormVisible(false) },
            );
        } else {
            createMutation.mutate(
                data as unknown as Record<string, unknown>,
                { onSuccess: () => setFormVisible(false) },
            );
        }
    };

    const renderItem = ({ item, index }: { item: IOTReasonItem; index: number }) => (
        <IOTReasonCard
            item={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.headerContent}>
                <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                    IOT Reasons
                </Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                    {reasons.length} reason{reasons.length !== 1 ? 's' : ''} configured
                </Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: colors.warning[50], borderColor: colors.warning[200] }]}>
                    <Text className="font-inter text-2xl font-bold text-warning-700">{idleCount}</Text>
                    <Text className="font-inter text-xs font-semibold text-warning-800 mt-0.5">Idle Reasons</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}>
                    <Text className="font-inter text-2xl font-bold text-danger-700">{alarmCount}</Text>
                    <Text className="font-inter text-xs font-semibold text-danger-800 mt-0.5">Alarm Reasons</Text>
                </View>
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 40, alignItems: 'center' }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load IOT reasons"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <EmptyState
                    icon="inbox"
                    title="No IOT reasons defined"
                    message="Add reasons for machine idle time and alarms. Operators select these during downtime logging."
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <AppTopHeader title="IOT Reason Management" onMenuPress={toggle} />

            <FlashList
                data={reasons}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
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
            />

            <FAB onPress={handleAdd} />

            <IOTReasonFormModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleSave}
                initialData={editingItem}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reasonTypeBadge: {
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    plannedBadge: {
        backgroundColor: colors.success[50],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    // Form sheet
    formSheet: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginBottom: 16,
    },
    fieldWrap: {
        marginBottom: 14,
    },
    inputWrap: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: colors.primary[950],
    },
    multilineWrap: {
        height: undefined,
        minHeight: 86,
        alignItems: 'flex-start',
        paddingTop: 12,
        paddingBottom: 12,
        justifyContent: 'flex-start',
    },
    multilineInput: {
        height: undefined,
        minHeight: 62,
        width: '100%',
        lineHeight: 20,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    chipWarning: {
        backgroundColor: colors.warning[500],
        borderColor: colors.warning[500],
    },
    chipDanger: {
        backgroundColor: colors.danger[500],
        borderColor: colors.danger[500],
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        marginBottom: 14,
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 1200,
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    saveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});
const styles = createStyles(false);
