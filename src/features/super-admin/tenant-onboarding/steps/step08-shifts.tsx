/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { AddButton, ChipSelector, DeleteButton, FormInput, SectionCard } from '../atoms';
import { DAYS_OF_WEEK, DOWNTIME_TYPES } from '../constants';
import { S } from '../shared-styles';
import type { DowntimeSlot, Shift, Step8Form } from '../types';

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
    const toggleWeeklyOff = (day: string) => {
        const updated = form.weeklyOffs.includes(day)
            ? form.weeklyOffs.filter((d) => d !== day)
            : [...form.weeklyOffs, day];
        setForm({ weeklyOffs: updated });
    };

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
                        <FormInput
                            label="Day Start Time"
                            placeholder="06:00 AM"
                            value={form.dayStartTime}
                            onChangeText={(v) => setForm({ dayStartTime: v })}
                            required
                            error={errors?.dayStartTime}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormInput
                            label="Day End Time"
                            placeholder="10:00 PM"
                            value={form.dayEndTime}
                            onChangeText={(v) => setForm({ dayEndTime: v })}
                            required
                            error={errors?.dayEndTime}
                        />
                    </View>
                </View>
            </SectionCard>

            <SectionCard title="Weekly Off Days">
                <View style={S.chipGrid}>
                    {DAYS_OF_WEEK.map((day) => {
                        const isOff = form.weeklyOffs.includes(day);
                        return (
                            <Pressable
                                key={day}
                                onPress={() => toggleWeeklyOff(day)}
                                style={[S.chip, isOff && S.chipActive]}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${isOff ? 'text-white' : 'text-neutral-600'}`}
                                >
                                    {day.substring(0, 3)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
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
                                <ChipSelector
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
