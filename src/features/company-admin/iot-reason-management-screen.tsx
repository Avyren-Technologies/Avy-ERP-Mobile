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
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCompanyIOTReasons } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useCreateIOTReason,
    useDeleteIOTReason,
    useUpdateIOTReason,
} from '@/features/company-admin/api/use-company-admin-mutations';

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
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />

                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit IOT Reason' : 'Add IOT Reason'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Reason Type Chips */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Reason Type <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {REASON_TYPES.map(t => (
                                    <Pressable
                                        key={t}
                                        onPress={() => setReasonType(t)}
                                        style={[styles.chip, reasonType === t && (t === 'Machine Idle' ? styles.chipWarning : styles.chipDanger)]}
                                    >
                                        <Text className={`font-inter text-xs font-semibold ${reasonType === t ? 'text-white' : 'text-neutral-600'}`}>
                                            {t}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Tool Breakage, Power Failure"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={reason}
                                    onChangeText={v => setReason(v.toUpperCase())}
                                    autoCapitalize="characters"
                                />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                This label appears in Andon board, reports, and OEE Dashboard
                            </Text>
                        </View>

                        {/* Description */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start' }]}>
                                <TextInput
                                    style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                                    placeholder="Optional detailed description..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                />
                            </View>
                        </View>

                        {/* Department Dropdown */}
                        <View style={[styles.fieldWrap, { zIndex: deptDropOpen ? 1200 : 1, position: 'relative' }]}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department</Text>
                            <Pressable
                                onPress={() => setDeptDropOpen(v => !v)}
                                style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, deptDropOpen && { borderColor: colors.primary[400] }]}
                            >
                                <Text className={`flex-1 font-inter text-sm ${department ? 'text-primary-950' : 'text-neutral-400'}`}>
                                    {department || 'Select...'}
                                </Text>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d={deptDropOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                            {deptDropOpen && (
                                <>
                                    <Pressable onPress={() => setDeptDropOpen(false)} style={{ position: 'absolute', top: -3000, left: -3000, right: -3000, bottom: -3000, zIndex: 1199 }} />
                                    <View style={styles.dropdownList}>
                                        <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                                            {DEPARTMENTS.map((item, idx) => (
                                                <Pressable
                                                    key={item}
                                                    onPress={() => { setDepartment(item); setDeptDropOpen(false); }}
                                                    style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: item === department ? colors.primary[50] : '#fff', borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.neutral[100] }}
                                                >
                                                    <Text className={`font-inter text-sm ${item === department ? 'font-semibold text-primary-700' : 'text-primary-950'}`}>
                                                        {item}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Planned (only for Machine Idle) */}
                        {reasonType === 'Machine Idle' && (
                            <>
                                <View style={styles.toggleRow}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">Planned Downtime</Text>
                                        <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>
                                            Planned losses don't count against OEE Availability
                                        </Text>
                                    </View>
                                    <Switch
                                        value={planned}
                                        onValueChange={setPlanned}
                                        trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                        thumbColor={planned ? colors.primary[600] : colors.neutral[300]}
                                    />
                                </View>

                                {planned && (
                                    <Animated.View entering={FadeIn.duration(200)} style={styles.fieldWrap}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Duration (minutes)</Text>
                                        <View style={styles.inputWrap}>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. 30"
                                                placeholderTextColor={colors.neutral[400]}
                                                value={duration}
                                                onChangeText={setDuration}
                                                keyboardType="number-pad"
                                            />
                                        </View>
                                    </Animated.View>
                                )}
                            </>
                        )}

                        {/* Duration threshold (always) */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Threshold Duration (min)</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="15"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={duration}
                                    onChangeText={setDuration}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                Minimum downtime duration before this reason must be logged
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {isSaving ? 'Saving...' : initialData ? 'Update Reason' : 'Add Reason'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
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
                        <Text className="mt-1.5 font-inter text-sm font-bold text-primary-950" numberOfLines={1}>
                            {item.reason}
                        </Text>
                        {item.department ? (
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">
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
                    <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function IOTReasonManagementScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
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
                <Text className="font-inter text-2xl font-bold text-primary-950">
                    IOT Reasons
                </Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                    IOT Reason Management
                </Text>
                <View style={{ width: 36 }} />
            </View>

            <FlatList
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
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
        backgroundColor: colors.primary[50],
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
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardPressed: {
        backgroundColor: colors.primary[50],
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
        backgroundColor: colors.white,
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
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: colors.primary[950],
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
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
        backgroundColor: '#fff',
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
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
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
