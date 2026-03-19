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

import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useCreateShift,
    useDeleteShift,
    useUpdateShift,
} from '@/features/company-admin/api/use-company-admin-mutations';

// ============ CONSTANTS ============

const DOWNTIME_TYPES = [
    'Scheduled Maintenance', 'Lunch Break', 'Changeover', 'Training',
    'Cleaning', 'Tea Break', 'Other',
];

// ============ TYPES ============

interface DowntimeSlot {
    id: string;
    type: string;
    duration: string;
}

interface ShiftItem {
    id: string;
    name: string;
    fromTime: string;
    toTime: string;
    noShuffle: boolean;
    downtimeSlots: DowntimeSlot[];
}

// ============ TIME PICKER ============

function TimePicker({
    label,
    value,
    onChange,
    error,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [selectedHour, setSelectedHour] = React.useState(() => {
        if (!value) return 0;
        const [h] = value.split(':').map(Number);
        return isNaN(h) ? 0 : h;
    });
    const [selectedMinute, setSelectedMinute] = React.useState(() => {
        if (!value) return 0;
        const parts = value.split(':');
        const m = Number(parts[1]);
        return isNaN(m) ? 0 : m;
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const formatTime = (h: number, m: number) =>
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const handleConfirm = () => {
        onChange(formatTime(selectedHour, selectedMinute));
        setOpen(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label}
            </Text>
            <Pressable
                onPress={() => setOpen(true)}
                style={[
                    styles.timePickerBtn,
                    error ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                ]}
            >
                <Text className={`font-inter text-sm font-semibold ${value ? 'text-primary-950' : 'text-neutral-400'}`}>
                    {value || 'Select'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2" stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {error && <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text>}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
                        <Text className="font-inter text-base font-bold text-primary-950 mb-4">{label}</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-neutral-500 mb-2 text-center">Hour</Text>
                                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                                    {hours.map(h => (
                                        <Pressable
                                            key={h}
                                            onPress={() => setSelectedHour(h)}
                                            style={{ padding: 10, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: selectedHour === h ? colors.primary[600] : colors.neutral[50] }}
                                        >
                                            <Text className={`font-inter text-sm font-semibold ${selectedHour === h ? 'text-white' : 'text-primary-900'}`}>
                                                {String(h).padStart(2, '0')}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                            <View style={{ justifyContent: 'center', paddingBottom: 20 }}>
                                <Text className="font-inter text-xl font-bold text-primary-600">:</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-neutral-500 mb-2 text-center">Minute</Text>
                                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                                    {minutes.map(m => (
                                        <Pressable
                                            key={m}
                                            onPress={() => setSelectedMinute(m)}
                                            style={{ padding: 10, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: selectedMinute === m ? colors.primary[600] : colors.neutral[50] }}
                                        >
                                            <Text className={`font-inter text-sm font-semibold ${selectedMinute === m ? 'text-white' : 'text-primary-900'}`}>
                                                {String(m).padStart(2, '0')}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable onPress={() => setOpen(false)} style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}>
                                <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleConfirm} style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.primary[600], alignItems: 'center' }}>
                                <Text className="font-inter text-sm font-bold text-white">
                                    Confirm {formatTime(selectedHour, selectedMinute)}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ DOWNTIME TYPE DROPDOWN ============

function DowntimeTypeDropdown({
    value,
    onSelect,
}: {
    value: string;
    onSelect: (v: string) => void;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <View style={{ flex: 2, position: 'relative', zIndex: open ? 100 : 1 }}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Type</Text>
            <Pressable
                onPress={() => setOpen(v => !v)}
                style={[styles.timePickerBtn, open ? { borderColor: colors.primary[400] } : undefined]}
            >
                <Text className={`font-inter text-xs font-semibold ${value ? 'text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {value || 'Select...'}
                </Text>
                <Svg width={12} height={12} viewBox="0 0 24 24">
                    <Path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {open && (
                <>
                    <Pressable onPress={() => setOpen(false)} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.dropdownList}>
                        <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                            {DOWNTIME_TYPES.map((item, idx) => (
                                <Pressable
                                    key={item}
                                    onPress={() => { onSelect(item); setOpen(false); }}
                                    style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: item === value ? colors.primary[50] : '#fff', borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.neutral[100] }}
                                >
                                    <Text className={`font-inter text-xs ${item === value ? 'font-semibold text-primary-700' : 'text-primary-950'}`}>
                                        {item}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
}

// ============ SHIFT FORM (BOTTOM SHEET MODAL) ============

function ShiftFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<ShiftItem, 'id'>) => void;
    initialData?: ShiftItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [fromTime, setFromTime] = React.useState('');
    const [toTime, setToTime] = React.useState('');
    const [noShuffle, setNoShuffle] = React.useState(false);
    const [downtimeSlots, setDowntimeSlots] = React.useState<DowntimeSlot[]>([]);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setFromTime(initialData.fromTime);
                setToTime(initialData.toTime);
                setNoShuffle(initialData.noShuffle);
                setDowntimeSlots(initialData.downtimeSlots ?? []);
            } else {
                setName('');
                setFromTime('');
                setToTime('');
                setNoShuffle(false);
                setDowntimeSlots([]);
            }
        }
    }, [visible, initialData]);

    const addSlot = () => {
        setDowntimeSlots(prev => [...prev, { id: Date.now().toString(), type: '', duration: '' }]);
    };

    const updateSlot = (slotId: string, updates: Partial<DowntimeSlot>) => {
        setDowntimeSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
    };

    const removeSlot = (slotId: string) => {
        setDowntimeSlots(prev => prev.filter(s => s.id !== slotId));
    };

    const handleSave = () => {
        if (!name.trim() || !fromTime || !toTime) return;
        onSave({ name: name.trim(), fromTime, toTime, noShuffle, downtimeSlots });
    };

    const isValid = name.trim() && fromTime && toTime;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />

                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Shift' : 'Add Shift'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Shift Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Shift Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder='e.g. "Morning Shift"'
                                    placeholderTextColor={colors.neutral[400]}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* From / To Time */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TimePicker label="From Time *" value={fromTime} onChange={setFromTime} />
                            <TimePicker label="To Time *" value={toTime} onChange={setToTime} />
                        </View>

                        {/* No Shuffle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950">No Shuffle</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>
                                    Exclude from shift rotation
                                </Text>
                            </View>
                            <Switch
                                value={noShuffle}
                                onValueChange={setNoShuffle}
                                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                thumbColor={noShuffle ? colors.primary[600] : colors.neutral[300]}
                            />
                        </View>

                        {/* Downtime Slots */}
                        <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500">
                            Planned Downtime Slots
                        </Text>
                        {downtimeSlots.map(slot => (
                            <View key={slot.id} style={styles.slotRow}>
                                <DowntimeTypeDropdown
                                    value={slot.type}
                                    onSelect={v => updateSlot(slot.id, { type: v })}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Duration (min)</Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="30"
                                            placeholderTextColor={colors.neutral[400]}
                                            value={slot.duration}
                                            onChangeText={v => updateSlot(slot.id, { duration: v })}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>
                                <Pressable onPress={() => removeSlot(slot.id)} style={styles.deleteSlotBtn}>
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={addSlot} style={styles.addSlotBtn}>
                            <Text className="font-inter text-xs font-semibold text-primary-500">
                                + Add Downtime Slot
                            </Text>
                        </Pressable>
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
                                {isSaving ? 'Saving...' : initialData ? 'Update Shift' : 'Add Shift'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SHIFT CARD ============

function ShiftCard({
    shift,
    index,
    onEdit,
    onDelete,
}: {
    shift: ShiftItem;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>
                            {shift.name}
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            {shift.fromTime} → {shift.toTime}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {shift.noShuffle && (
                            <View style={styles.noShuffleBadge}>
                                <Text className="font-inter text-[9px] font-bold text-warning-700">NO SHUFFLE</Text>
                            </View>
                        )}
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                </View>

                {shift.downtimeSlots.length > 0 && (
                    <View style={styles.downtimeChips}>
                        {shift.downtimeSlots.map(slot => (
                            <View key={slot.id} style={styles.downtimeChip}>
                                <Text className="font-inter text-[9px] font-semibold text-neutral-600">
                                    {slot.type} ({slot.duration}m)
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ShiftManagementScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useCompanyShifts();
    const createMutation = useCreateShift();
    const updateMutation = useUpdateShift();
    const deleteMutation = useDeleteShift();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingShift, setEditingShift] = React.useState<ShiftItem | null>(null);

    const shifts: ShiftItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            fromTime: item.fromTime ?? '',
            toTime: item.toTime ?? '',
            noShuffle: item.noShuffle ?? false,
            downtimeSlots: (item.downtimeSlots ?? []).map((s: any) => ({
                id: s.id ?? Date.now().toString(),
                type: s.type ?? '',
                duration: String(s.duration ?? ''),
            })),
        }));
    }, [response]);

    const handleAdd = () => {
        setEditingShift(null);
        setFormVisible(true);
    };

    const handleEdit = (shift: ShiftItem) => {
        setEditingShift(shift);
        setFormVisible(true);
    };

    const handleDelete = (shift: ShiftItem) => {
        showConfirm({
            title: 'Delete Shift',
            message: `Are you sure you want to delete "${shift.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(shift.id);
            },
        });
    };

    const handleSave = (data: Omit<ShiftItem, 'id'>) => {
        if (editingShift) {
            updateMutation.mutate(
                { id: editingShift.id, data: data as unknown as Record<string, unknown> },
                { onSuccess: () => setFormVisible(false) },
            );
        } else {
            createMutation.mutate(
                data as unknown as Record<string, unknown>,
                { onSuccess: () => setFormVisible(false) },
            );
        }
    };

    const renderShift = ({ item, index }: { item: ShiftItem; index: number }) => (
        <ShiftCard
            shift={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">
                Shifts & Time
            </Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">
                {shifts.length} shift{shifts.length !== 1 ? 's' : ''} configured
            </Text>
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
                        title="Failed to load shifts"
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
                    title="No shifts configured"
                    message="Add your first shift to get started with scheduling."
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
                    Shift Management
                </Text>
                <View style={{ width: 36 }} />
            </View>

            <FlatList
                data={shifts}
                renderItem={renderShift}
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

            <ShiftFormModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleSave}
                initialData={editingShift}
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
        paddingBottom: 16,
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
    noShuffleBadge: {
        backgroundColor: colors.warning[50],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    downtimeChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    downtimeChip: {
        backgroundColor: colors.neutral[100],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
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
    timePickerBtn: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        marginBottom: 4,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    deleteSlotBtn: {
        width: 36,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSlotBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary[200],
        borderStyle: 'dashed',
        borderRadius: 12,
        marginBottom: 8,
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
        maxHeight: 180,
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
