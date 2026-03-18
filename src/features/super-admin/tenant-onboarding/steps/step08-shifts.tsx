/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { AddButton, DeleteButton, FormInput, FormSelect, SectionCard } from '../atoms';
import { DOWNTIME_TYPES } from '../constants';
import type { DowntimeSlot, Shift, Step8Form } from '../types';
import { S } from '../shared-styles';

function TimePicker({
    label,
    value,
    onChange,
    required,
    error,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    error?: string;
}) {
    const [open, setOpen] = React.useState(false);

    // Parse current value
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
    const minutes = [0, 15, 30, 45];

    const formatTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const handleConfirm = () => {
        onChange(formatTime(selectedHour, selectedMinute));
        setOpen(false);
    };

    return (
        <View style={S.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label}{required && <Text className="text-danger-500"> *</Text>}
            </Text>
            <Pressable
                onPress={() => setOpen(true)}
                style={[
                    S.fieldInput,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                    error ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                ]}
            >
                <Text className={`font-inter text-sm font-semibold ${value ? 'text-primary-950' : 'text-neutral-400'}`}>
                    {value || 'Select time'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2" stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
            </Pressable>
            {error && <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text>}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
                        <Text className="font-inter text-base font-bold text-primary-950 mb-4">{label}</Text>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {/* Hours */}
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-neutral-500 mb-2 text-center">Hour</Text>
                                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                                    {hours.map(h => (
                                        <Pressable
                                            key={h}
                                            onPress={() => setSelectedHour(h)}
                                            style={{
                                                padding: 10,
                                                borderRadius: 10,
                                                marginBottom: 4,
                                                alignItems: 'center',
                                                backgroundColor: selectedHour === h ? colors.primary[600] : colors.neutral[50],
                                            }}
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

                            {/* Minutes */}
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-neutral-500 mb-2 text-center">Minute</Text>
                                {minutes.map(m => (
                                    <Pressable
                                        key={m}
                                        onPress={() => setSelectedMinute(m)}
                                        style={{
                                            padding: 10,
                                            borderRadius: 10,
                                            marginBottom: 4,
                                            alignItems: 'center',
                                            backgroundColor: selectedMinute === m ? colors.primary[600] : colors.neutral[50],
                                        }}
                                    >
                                        <Text className={`font-inter text-sm font-semibold ${selectedMinute === m ? 'text-white' : 'text-primary-900'}`}>
                                            {String(m).padStart(2, '0')}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable
                                onPress={() => setOpen(false)}
                                style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleConfirm}
                                style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.primary[600], alignItems: 'center' }}
                            >
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

export function Step8Shifts({
    form,
    setForm,
    shifts,
    setShifts,
    errors,
}: {
    form: Step8Form;
    setForm: (f: Partial<Step8Form>) => void;
    shifts: Shift[];
    setShifts: (s: Shift[]) => void;
    errors?: Record<string, string>;
}) {
    const [totalShiftsPerDay, setTotalShiftsPerDay] = React.useState('');

    const addShift = () => {
        setShifts([
            ...shifts,
            {
                id: Date.now().toString(),
                name: '',
                fromTime: '',
                toTime: '',
                noShuffle: false,
                downtimeSlots: [],
            },
        ]);
    };

    const updateShift = (id: string, updates: Partial<Shift>) => {
        setShifts(shifts.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const removeShift = (id: string) => {
        setShifts(shifts.filter((s) => s.id !== id));
    };

    const addDowntimeSlot = (shiftId: string) => {
        const slot: DowntimeSlot = { id: Date.now().toString(), type: '', duration: '' };
        setShifts(
            shifts.map((s) =>
                s.id === shiftId ? { ...s, downtimeSlots: [...s.downtimeSlots, slot] } : s
            )
        );
    };

    const updateSlot = (shiftId: string, slotId: string, updates: Partial<DowntimeSlot>) => {
        setShifts(
            shifts.map((s) =>
                s.id === shiftId
                    ? {
                          ...s,
                          downtimeSlots: s.downtimeSlots.map((d) =>
                              d.id === slotId ? { ...d, ...updates } : d
                          ),
                      }
                    : s
            )
        );
    };

    const removeSlot = (shiftId: string, slotId: string) => {
        setShifts(
            shifts.map((s) =>
                s.id === shiftId
                    ? { ...s, downtimeSlots: s.downtimeSlots.filter((d) => d.id !== slotId) }
                    : s
            )
        );
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Production Day Boundary">
                <View style={S.twoColumn}>
                    <View style={{ flex: 1 }}>
                        <TimePicker label="Day Start Time" value={form.dayStartTime} onChange={(v) => setForm({ dayStartTime: v })} required error={errors?.dayStartTime} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <TimePicker label="Day End Time" value={form.dayEndTime} onChange={(v) => setForm({ dayEndTime: v })} required error={errors?.dayEndTime} />
                    </View>
                </View>
                <FormSelect
                    label="Total Shifts Per Day"
                    options={['1 Shift', '2 Shifts', '3 Shifts', '4 Shifts', '5 Shifts']}
                    selected={totalShiftsPerDay}
                    onSelect={(v) => {
                        setTotalShiftsPerDay(v);
                        const count = parseInt(v);
                        const startTime = form.dayStartTime;
                        const endTime = form.dayEndTime;
                        if (!startTime || !endTime || !count || count < 1) return;

                        const parseTime = (t: string) => {
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + (m || 0);
                        };
                        const formatTime = (minutes: number) => {
                            const norm = ((minutes % 1440) + 1440) % 1440;
                            return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(norm % 60).padStart(2, '0')}`;
                        };

                        const startMin = parseTime(startTime);
                        let endMin = parseTime(endTime);
                        if (endMin <= startMin) endMin += 1440;
                        const shiftDuration = Math.floor((endMin - startMin) / count);

                        const shiftNames = ['Morning Shift', 'Afternoon Shift', 'Night Shift', 'Shift 4', 'Shift 5'];
                        const autoShifts: Shift[] = Array.from({ length: count }, (_, i) => ({
                            id: `${Date.now()}_${i}`,
                            name: shiftNames[i] || `Shift ${i + 1}`,
                            fromTime: formatTime(startMin + i * shiftDuration),
                            toTime: formatTime(startMin + (i + 1) * shiftDuration),
                            noShuffle: false,
                            downtimeSlots: [],
                        }));

                        if (shifts.length === 0 || shifts.every(s => !s.name)) {
                            setShifts(autoShifts);
                        }
                    }}
                    hint="Auto-configures shift timings. You can modify after generation."
                    direction="up"
                />
            </SectionCard>

            <Text className="mb-3 font-inter text-sm font-bold text-primary-900">
                Shift Master
            </Text>

            {shifts.map((shift, idx) => (
                <Animated.View
                    key={shift.id}
                    entering={FadeIn.duration(250)}
                    style={S.itemCard}
                >
                    <View style={S.itemCardHeader}>
                        <View style={S.itemCardBadge}>
                            <Text className="font-inter text-xs font-bold text-primary-700">
                                Shift {idx + 1}
                            </Text>
                        </View>
                        <DeleteButton onPress={() => removeShift(shift.id)} />
                    </View>

                    <FormInput
                        label="Shift Name"
                        placeholder='e.g. "Morning Shift", "General Shift"'
                        value={shift.name}
                        onChangeText={(v) => updateShift(shift.id, { name: v })}
                        required
                        autoCapitalize="words"
                        error={errors?.[`name_${idx}`]}
                    />
                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="From Time"
                                placeholder="07:00 AM"
                                value={shift.fromTime}
                                onChangeText={(v) => updateShift(shift.id, { fromTime: v })}
                                required
                                error={errors?.[`fromTime_${idx}`]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="To Time"
                                placeholder="03:00 PM"
                                value={shift.toTime}
                                onChangeText={(v) => updateShift(shift.id, { toTime: v })}
                                required
                                error={errors?.[`toTime_${idx}`]}
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={() => updateShift(shift.id, { noShuffle: !shift.noShuffle })}
                        style={S.checkboxRow}
                    >
                        <View style={[S.checkbox, shift.noShuffle && S.checkboxActive]}>
                            {shift.noShuffle && (
                                <Svg width={12} height={12} viewBox="0 0 24 24">
                                    <Path
                                        d="M5 12l5 5L20 7"
                                        stroke="#fff"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            )}
                        </View>
                        <Text className="font-inter text-sm text-neutral-600">
                            No Shuffle (exclude from shift rotation)
                        </Text>
                    </Pressable>

                    {/* Downtime Slots */}
                    <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500">
                        Planned Downtime Slots
                    </Text>
                    {shift.downtimeSlots.map((slot) => (
                        <View key={slot.id} style={S.slotRow}>
                            <View style={{ flex: 2 }}>
                                <FormSelect
                                    label="Type"
                                    options={DOWNTIME_TYPES}
                                    selected={slot.type}
                                    onSelect={(v) => updateSlot(shift.id, slot.id, { type: v })}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <FormInput
                                    label="Duration (min)"
                                    placeholder="30"
                                    value={slot.duration}
                                    onChangeText={(v) =>
                                        updateSlot(shift.id, slot.id, { duration: v })
                                    }
                                    keyboardType="number-pad"
                                />
                            </View>
                            <DeleteButton onPress={() => removeSlot(shift.id, slot.id)} />
                        </View>
                    ))}
                    <Pressable
                        onPress={() => addDowntimeSlot(shift.id)}
                        style={S.smallAddButton}
                    >
                        <Text className="font-inter text-xs font-semibold text-primary-500">
                            + Add Downtime Slot
                        </Text>
                    </Pressable>
                </Animated.View>
            ))}

            <AddButton onPress={addShift} label="Add Shift" />
        </Animated.View>
    );
}
