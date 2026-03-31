/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useCreateShift,
    useUpdateShift,
    useDeleteShift,
    useCreateShiftBreak,
    useUpdateShiftBreak,
    useDeleteShiftBreak,
} from '@/features/company-admin/api/use-company-admin-mutations';
import type { CompanyShift, ShiftBreak, ShiftType, BreakType, CreateShiftPayload, CreateShiftBreakPayload } from '@/lib/api/company-admin';

import { ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';

// ============ CONSTANTS ============

const SHIFT_TYPE_OPTIONS = ['DAY', 'NIGHT', 'FLEXIBLE'];
const SHIFT_TYPE_LABELS: Record<string, string> = { DAY: 'Day', NIGHT: 'Night', FLEXIBLE: 'Flexible' };
const SHIFT_TYPE_COLORS: Record<string, string> = { DAY: colors.warning[500], NIGHT: colors.accent[500], FLEXIBLE: colors.primary[500] };

const BREAK_TYPE_OPTIONS = ['FIXED', 'FLEXIBLE'];
const BREAK_TYPE_LABELS: Record<string, string> = { FIXED: 'Fixed', FLEXIBLE: 'Flexible' };

// ============ TYPES ============

interface ShiftFormState {
    name: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    isCrossDay: boolean;
    noShuffle: boolean;
    autoClockOutMinutes: number | null;
    gracePeriodMinutes: number | null;
    earlyExitToleranceMinutes: number | null;
    halfDayThresholdHours: number | null;
    fullDayThresholdHours: number | null;
    maxLateCheckInMinutes: number | null;
    minWorkingHoursForOT: number | null;
    requireSelfie: boolean | null;
    requireGPS: boolean | null;
}

const EMPTY_SHIFT: ShiftFormState = {
    name: '', shiftType: 'DAY', startTime: '09:00', endTime: '17:00',
    isCrossDay: false, noShuffle: false, autoClockOutMinutes: null,
    gracePeriodMinutes: null, earlyExitToleranceMinutes: null,
    halfDayThresholdHours: null, fullDayThresholdHours: null,
    maxLateCheckInMinutes: null, minWorkingHoursForOT: null,
    requireSelfie: null, requireGPS: null,
};

interface BreakFormState {
    name: string;
    type: BreakType;
    startTime: string;
    duration: number;
    isPaid: boolean;
}

const EMPTY_BREAK: BreakFormState = { name: '', type: 'FIXED', startTime: '', duration: 30, isPaid: false };

// ============ REUSABLE ============

function FormField({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad' }) {
    return (
        <View style={s.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={s.inputWrap}>
                <TextInput style={s.textInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.neutral[400]} keyboardType={keyboardType ?? 'default'} />
            </View>
        </View>
    );
}

function NullableNumberRow({ label, value, onChange, suffix, tooltip }: { label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; tooltip?: string }) {
    const isNull = value === null;
    return (
        <View style={s.overrideRow}>
            <Pressable onPress={() => onChange(isNull ? 0 : null)} style={s.overrideCheck}>
                <View style={[s.checkBox, !isNull && s.checkBoxActive]}>
                    {!isNull && <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text className="ml-2 font-inter text-xs text-neutral-600">{label}</Text>
                    {tooltip && <InfoTooltip content={tooltip} />}
                </View>
            </Pressable>
            {!isNull ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={s.smallInputWrap}>
                        <TextInput style={s.smallInput} value={String(value)} onChangeText={(v) => onChange(Number(v) || 0)} keyboardType="decimal-pad" />
                    </View>
                    {suffix && <Text className="ml-1 font-inter text-[10px] text-neutral-400">{suffix}</Text>}
                </View>
            ) : (
                <Text className="font-inter text-[10px] font-medium text-primary-500">Use Default</Text>
            )}
        </View>
    );
}

function NullableBoolRow({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
    const isNull = value === null;
    return (
        <View style={s.overrideRow}>
            <Pressable onPress={() => onChange(isNull ? false : null)} style={s.overrideCheck}>
                <View style={[s.checkBox, !isNull && s.checkBoxActive]}>
                    {!isNull && <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                </View>
                <Text className="ml-2 font-inter text-xs text-neutral-600">{label}</Text>
            </Pressable>
            {!isNull ? (
                <Switch value={value ?? false} onValueChange={(v) => onChange(v)} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
            ) : (
                <Text className="font-inter text-[10px] font-medium text-primary-500">Use Default</Text>
            )}
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function ShiftManagementScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const { data, isLoading, isError, refetch } = useCompanyShifts();
    const createMutation = useCreateShift();
    const updateMutation = useUpdateShift();
    const deleteMutation = useDeleteShift();
    const createBreakMutation = useCreateShiftBreak();
    const updateBreakMutation = useUpdateShiftBreak();
    const deleteBreakMutation = useDeleteShiftBreak();

    const [search, setSearch] = React.useState('');
    const [modalOpen, setModalOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [form, setForm] = React.useState<ShiftFormState>({ ...EMPTY_SHIFT });

    // Break management
    const [breakModalOpen, setBreakModalOpen] = React.useState(false);
    const [editingBreakId, setEditingBreakId] = React.useState<string | null>(null);
    const [breakForm, setBreakForm] = React.useState<BreakFormState>({ ...EMPTY_BREAK });
    const [currentBreaks, setCurrentBreaks] = React.useState<ShiftBreak[]>([]);

    const shifts: CompanyShift[] = (data as any)?.data ?? [];
    const filtered = shifts.filter((s) => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY_SHIFT });
        setCurrentBreaks([]);
        setModalOpen(true);
    };

    const openEdit = (shift: CompanyShift) => {
        setEditingId(shift.id);
        setForm({
            name: shift.name ?? '', shiftType: shift.shiftType ?? 'DAY',
            startTime: shift.startTime ?? '09:00', endTime: shift.endTime ?? '17:00',
            isCrossDay: shift.isCrossDay ?? false, noShuffle: shift.noShuffle ?? false,
            autoClockOutMinutes: shift.autoClockOutMinutes ?? null,
            gracePeriodMinutes: shift.gracePeriodMinutes ?? null,
            earlyExitToleranceMinutes: shift.earlyExitToleranceMinutes ?? null,
            halfDayThresholdHours: shift.halfDayThresholdHours ?? null,
            fullDayThresholdHours: shift.fullDayThresholdHours ?? null,
            maxLateCheckInMinutes: shift.maxLateCheckInMinutes ?? null,
            minWorkingHoursForOT: shift.minWorkingHoursForOT ?? null,
            requireSelfie: shift.requireSelfie ?? null,
            requireGPS: shift.requireGPS ?? null,
        });
        setCurrentBreaks(shift.breaks ?? []);
        setModalOpen(true);
    };

    const handleSave = async () => {
        const payload: CreateShiftPayload = { ...form };
        try {
            if (editingId) {
                await updateMutation.mutateAsync({ id: editingId, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            setModalOpen(false);
        } catch { /* showError handles */ }
    };

    const handleDelete = (shift: CompanyShift) => {
        confirmModal.show({
            title: 'Delete Shift',
            message: `Are you sure you want to delete "${shift.name}"?`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(shift.id);
                } catch { /* showError handles */ }
            },
        });
    };

    // Break handlers
    const openCreateBreak = () => {
        setEditingBreakId(null);
        setBreakForm({ ...EMPTY_BREAK });
        setBreakModalOpen(true);
    };

    const openEditBreak = (brk: ShiftBreak) => {
        setEditingBreakId(brk.id);
        setBreakForm({ name: brk.name, type: brk.type, startTime: brk.startTime ?? '', duration: brk.duration, isPaid: brk.isPaid });
        setBreakModalOpen(true);
    };

    const handleSaveBreak = async () => {
        if (!editingId) return;
        const payload: CreateShiftBreakPayload = {
            name: breakForm.name, type: breakForm.type,
            startTime: breakForm.type === 'FIXED' && breakForm.startTime ? breakForm.startTime : null,
            duration: breakForm.duration, isPaid: breakForm.isPaid,
        };
        try {
            if (editingBreakId) {
                await updateBreakMutation.mutateAsync({ shiftId: editingId, breakId: editingBreakId, data: payload });
            } else {
                await createBreakMutation.mutateAsync({ shiftId: editingId, data: payload });
            }
            setBreakModalOpen(false);
        } catch { /* showError handles */ }
    };

    const handleDeleteBreak = (brk: ShiftBreak) => {
        if (!editingId) return;
        confirmModal.show({
            title: 'Delete Break',
            message: `Remove "${brk.name}"?`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await deleteBreakMutation.mutateAsync({ shiftId: editingId, breakId: brk.id });
                    setCurrentBreaks((prev) => prev.filter((b) => b.id !== brk.id));
                } catch { /* showError handles */ }
            },
        });
    };

    const saving = createMutation.isPending || updateMutation.isPending;
    const breakSaving = createBreakMutation.isPending || updateBreakMutation.isPending;

    // ── Shift Card ──
    const renderShiftCard = ({ item }: { item: CompanyShift }) => (
        <Animated.View entering={FadeIn.duration(300)} style={s.shiftCard}>
            <View style={s.shiftCardHeader}>
                <View style={[s.shiftTypeBadge, { backgroundColor: SHIFT_TYPE_COLORS[item.shiftType] + '20' }]}>
                    <Text className="font-inter text-[10px] font-bold" style={{ color: SHIFT_TYPE_COLORS[item.shiftType] }}>
                        {SHIFT_TYPE_LABELS[item.shiftType] ?? item.shiftType}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => openEdit(item)} style={s.iconBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item)} style={s.iconBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={colors.danger[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </View>
            <Text className="font-inter text-base font-bold text-primary-950">{item.name}</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{item.startTime} - {item.endTime}{item.isCrossDay ? ' (Cross-day)' : ''}</Text>
            {(item.breaks?.length ?? 0) > 0 && (
                <Text className="mt-1 font-inter text-xs text-neutral-400">{item.breaks?.length} break(s)</Text>
            )}
        </Animated.View>
    );

    return (
        <View style={s.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader title="Shifts" onMenuPress={toggle} />

            {/* Search */}
            <View style={s.searchWrap}>
                <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginRight: 8 }}><Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>
                <TextInput style={s.searchInput} placeholder="Search shifts..." placeholderTextColor={colors.neutral[400]} value={search} onChangeText={setSearch} />
            </View>

            {isLoading ? (
                <View style={{ paddingHorizontal: 24, paddingTop: 12 }}><SkeletonCard /><SkeletonCard /></View>
            ) : isError ? (
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load shifts" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            ) : filtered.length === 0 ? (
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="list" title="No shifts found" message="Add your first shift to get started." /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderShiftCard}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: insets.bottom + 80 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <FAB onPress={openCreate} />

            {/* ── Shift Create/Edit Modal ── */}
            <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
                <View style={[s.modalContainer, { paddingTop: insets.top + 12 }]}>
                    <View style={s.modalHeader}>
                        <Pressable onPress={() => setModalOpen(false)}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950">{editingId ? 'Edit Shift' : 'New Shift'}</Text>
                        <Pressable onPress={handleSave} disabled={saving || !form.name}>
                            {saving ? <ActivityIndicator size="small" color={colors.primary[600]} /> : <Text className="font-inter text-sm font-bold text-primary-600">Save</Text>}
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {/* Basic Info */}
                        <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Basic Info</Text>
                        <FormField label="Shift Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="e.g. Morning Shift" />
                        <ChipSelector label="Shift Type" options={SHIFT_TYPE_OPTIONS.map((o) => SHIFT_TYPE_LABELS[o])} selected={SHIFT_TYPE_LABELS[form.shiftType]} onSelect={(v) => { const key = Object.entries(SHIFT_TYPE_LABELS).find(([, l]) => l === v)?.[0] ?? 'DAY'; setForm((p) => ({ ...p, shiftType: key as ShiftType })); }} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}><FormField label="Start Time" value={form.startTime} onChange={(v) => setForm((p) => ({ ...p, startTime: v }))} placeholder="HH:MM" /></View>
                            <View style={{ flex: 1 }}><FormField label="End Time" value={form.endTime} onChange={(v) => setForm((p) => ({ ...p, endTime: v }))} placeholder="HH:MM" /></View>
                        </View>

                        {/* Toggles */}
                        <View style={s.toggleRowModal}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <Text className="font-inter text-sm text-primary-950">Cross-Day Shift</Text>
                                <InfoTooltip content="Enable for night shifts that span midnight (e.g., 22:00 to 06:00). Attendance date will be the shift start date." />
                            </View>
                            <Switch value={form.isCrossDay} onValueChange={(v) => setForm((p) => ({ ...p, isCrossDay: v }))} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={form.isCrossDay ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        <View style={s.toggleRowModal}>
                            <Text className="flex-1 font-inter text-sm text-primary-950">No Shuffle</Text>
                            <Switch value={form.noShuffle} onValueChange={(v) => setForm((p) => ({ ...p, noShuffle: v }))} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={form.noShuffle ? colors.primary[600] : colors.neutral[300]} />
                        </View>

                        {/* Policy Overrides */}
                        <Text className="mt-6 mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Policy Overrides</Text>
                        <Text className="mb-3 font-inter text-xs text-neutral-500 leading-relaxed">Leave fields empty to inherit from company-wide Attendance Rules. Set a value to override for this specific shift.</Text>
                        <NullableNumberRow label="Grace Period" value={form.gracePeriodMinutes} onChange={(v) => setForm((p) => ({ ...p, gracePeriodMinutes: v }))} suffix="min" />
                        <NullableNumberRow label="Early Exit Tolerance" value={form.earlyExitToleranceMinutes} onChange={(v) => setForm((p) => ({ ...p, earlyExitToleranceMinutes: v }))} suffix="min" />
                        <NullableNumberRow label="Half Day Threshold" value={form.halfDayThresholdHours} onChange={(v) => setForm((p) => ({ ...p, halfDayThresholdHours: v }))} suffix="hrs" />
                        <NullableNumberRow label="Full Day Threshold" value={form.fullDayThresholdHours} onChange={(v) => setForm((p) => ({ ...p, fullDayThresholdHours: v }))} suffix="hrs" />
                        <NullableNumberRow label="Max Late Check-In" value={form.maxLateCheckInMinutes} onChange={(v) => setForm((p) => ({ ...p, maxLateCheckInMinutes: v }))} suffix="min" />
                        <NullableNumberRow label="Min Hours for OT" value={form.minWorkingHoursForOT} onChange={(v) => setForm((p) => ({ ...p, minWorkingHoursForOT: v }))} suffix="hrs" tooltip="Minimum hours an employee must work in this shift before overtime starts accumulating." />
                        <NullableNumberRow label="Auto Clock-Out" value={form.autoClockOutMinutes} onChange={(v) => setForm((p) => ({ ...p, autoClockOutMinutes: v }))} suffix="min" tooltip="Automatically clock out employees this many minutes after shift end if they haven't punched out." />
                        <NullableBoolRow label="Require Selfie" value={form.requireSelfie} onChange={(v) => setForm((p) => ({ ...p, requireSelfie: v }))} />
                        <NullableBoolRow label="Require GPS" value={form.requireGPS} onChange={(v) => setForm((p) => ({ ...p, requireGPS: v }))} />

                        {/* Breaks (only when editing) */}
                        {editingId && (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Breaks</Text>
                                    <Pressable onPress={openCreateBreak} style={s.addBreakBtn}><Text className="font-inter text-xs font-bold text-primary-600">+ Add Break</Text></Pressable>
                                </View>
                                {currentBreaks.length === 0 ? (
                                    <Text className="py-3 font-inter text-xs text-neutral-400">No breaks configured</Text>
                                ) : currentBreaks.map((brk) => (
                                    <View key={brk.id} style={s.breakRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950">{brk.name}</Text>
                                            <Text className="font-inter text-xs text-neutral-500">{brk.type} / {brk.duration}min / {brk.isPaid ? 'Paid' : 'Unpaid'}</Text>
                                        </View>
                                        <Pressable onPress={() => openEditBreak(brk)} style={{ marginRight: 10 }}>
                                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                        </Pressable>
                                        <Pressable onPress={() => handleDeleteBreak(brk)}>
                                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={colors.danger[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                        </Pressable>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Break Create/Edit Modal ── */}
            <Modal visible={breakModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBreakModalOpen(false)}>
                <View style={[s.modalContainer, { paddingTop: insets.top + 12 }]}>
                    <View style={s.modalHeader}>
                        <Pressable onPress={() => setBreakModalOpen(false)}><Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text></Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950">{editingBreakId ? 'Edit Break' : 'New Break'}</Text>
                        <Pressable onPress={handleSaveBreak} disabled={breakSaving || !breakForm.name}>
                            {breakSaving ? <ActivityIndicator size="small" color={colors.primary[600]} /> : <Text className="font-inter text-sm font-bold text-primary-600">Save</Text>}
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
                        <FormField label="Break Name" value={breakForm.name} onChange={(v) => setBreakForm((p) => ({ ...p, name: v }))} placeholder="e.g. Lunch Break" />
                        <ChipSelector label="Break Type" options={BREAK_TYPE_OPTIONS.map((o) => BREAK_TYPE_LABELS[o])} selected={BREAK_TYPE_LABELS[breakForm.type]} onSelect={(v) => { const key = Object.entries(BREAK_TYPE_LABELS).find(([, l]) => l === v)?.[0] ?? 'FIXED'; setBreakForm((p) => ({ ...p, type: key as BreakType })); }} />
                        {breakForm.type === 'FIXED' && (
                            <FormField label="Start Time" value={breakForm.startTime} onChange={(v) => setBreakForm((p) => ({ ...p, startTime: v }))} placeholder="HH:MM" />
                        )}
                        <FormField label="Duration (minutes)" value={String(breakForm.duration)} onChange={(v) => setBreakForm((p) => ({ ...p, duration: Number(v) || 0 }))} keyboardType="number-pad" />
                        <View style={s.toggleRowModal}>
                            <Text className="flex-1 font-inter text-sm text-primary-950">Paid Break</Text>
                            <Switch value={breakForm.isPaid} onValueChange={(v) => setBreakForm((p) => ({ ...p, isPaid: v }))} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={breakForm.isPaid ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 8, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    shiftCard: {
        backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    shiftCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    shiftTypeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.neutral[50], justifyContent: 'center', alignItems: 'center' },
    modalContainer: { flex: 1, backgroundColor: colors.white },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    fieldWrap: { marginBottom: 12 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRowModal: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    overrideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[50] },
    overrideCheck: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
    checkBoxActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    smallInputWrap: { backgroundColor: colors.neutral[50], borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 8, height: 32, minWidth: 52, justifyContent: 'center' },
    smallInput: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950], textAlign: 'right' },
    addBreakBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary[50] },
    breakRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
});
