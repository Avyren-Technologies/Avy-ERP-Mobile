/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { Step4Form } from '../types';

import * as React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormSelect, RadioOption, SectionCard } from '../atoms';
import {
    DAYS_OF_WEEK,
    FY_OPTIONS,
    MONTHS,
    WEEK_STARTS,
} from '../constants';
import { S } from '../shared-styles';

const IST_TIMEZONE = 'IST UTC+5:30';

// ============ DAY OF MONTH PICKER ============

function DayOfMonthPicker({
    label,
    value,
    onSelect,
    hint,
}: {
    label: string;
    value: string;
    onSelect: (v: string) => void;
    hint?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const days = Array.from({ length: 28 }, (_, i) => String(i + 1));

    return (
        <View style={S.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label}
            </Text>
            <Pressable
                onPress={() => setOpen(true)}
                style={[
                    S.fieldInput,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                ]}
            >
                <Text className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                    {value ? `Day ${value} of month` : 'Select day'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                        d="M8 2v3M16 2v3M3 10h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                        stroke={colors.neutral[400]}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>
            {hint && (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            )}

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8, 15, 40, 0.28)', paddingHorizontal: 28 }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={{ width: '100%', maxWidth: 300, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 15 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">Select Day of Month</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {days.map((d) => (
                                <Pressable
                                    key={d}
                                    onPress={() => { onSelect(d); setOpen(false); }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: value === d ? colors.primary[600] : colors.neutral[50],
                                        borderWidth: 1,
                                        borderColor: value === d ? colors.primary[600] : colors.neutral[200],
                                    }}
                                >
                                    <Text className={`font-inter text-xs font-semibold ${value === d ? 'text-white' : 'text-primary-900 dark:text-primary-100'}`}>
                                        {d}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Pressable onPress={() => setOpen(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ MAIN STEP ============

export function Step4Fiscal({
    form,
    setForm,
    errors,
}: {
    form: Step4Form;
    setForm: (f: Partial<Step4Form>) => void;
    errors?: Record<string, string>;
}) {
    const [customFY, setCustomFY] = React.useState(form.fyType === 'custom');

    React.useEffect(() => {
        if (form.timezone !== IST_TIMEZONE) {
            setForm({ timezone: IST_TIMEZONE });
        }
    }, [form.timezone, setForm]);

    const toggleCustom = (isCustom: boolean) => {
        setCustomFY(isCustom);
        setForm({ fyType: isCustom ? 'custom' : 'apr-mar' });
    };

    const toggleWorkingDay = (day: string) => {
        const updated = form.workingDays.includes(day)
            ? form.workingDays.filter((d) => d !== day)
            : [...form.workingDays, day];
        setForm({ workingDays: updated });
    };

    const filteredFY = FY_OPTIONS.filter((opt) => opt.key === 'apr-mar' || opt.key === 'custom');

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Financial Year Setup">
                <Text className="mb-4 font-inter text-sm text-neutral-600 dark:text-neutral-400">
                    Define the accounting period for the company.
                </Text>

                {filteredFY.map((opt) => (
                    <RadioOption
                        key={opt.key}
                        label={opt.label}
                        selected={form.fyType === opt.key}
                        onSelect={() => toggleCustom(opt.key === 'custom')}
                        subtitle={opt.subtitle}
                    />
                ))}

                {customFY && (
                    <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <FormSelect
                                    label="Start Month"
                                    options={MONTHS.map((m) => m.label)}
                                    selected={form.fyCustomStartMonth}
                                    onSelect={(v) => setForm({ fyCustomStartMonth: v })}
                                    required
                                    direction="up"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <FormSelect
                                    label="End Month"
                                    options={MONTHS.map((m) => m.label)}
                                    selected={form.fyCustomEndMonth}
                                    onSelect={(v) => setForm({ fyCustomEndMonth: v })}
                                    required
                                    direction="up"
                                />
                            </View>
                        </View>
                        <View style={S.infoCard}>
                            <Text className="font-inter text-xs text-primary-600">
                                Common cycles: Jan–Dec, July–June, Oct–Sept.
                            </Text>
                        </View>
                    </Animated.View>
                )}
            </SectionCard>

            {/* ---- Payroll Cycle ---- */}
            <SectionCard title="Payroll Cycle">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.success[50], borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.success[200] }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path
                            d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            stroke={colors.success[600]}
                            strokeWidth="1.8"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    <Text className="font-inter text-xs font-semibold text-success-700">
                        Payroll Frequency: Monthly (Standard)
                    </Text>
                </View>
                <DayOfMonthPicker
                    label="Salary Cut-off Day"
                    value={form.cutoffDay}
                    onSelect={(v) => setForm({ cutoffDay: v })}
                    hint="Attendance data is frozen after this day for payroll"
                />
                <DayOfMonthPicker
                    label="Disbursement Day"
                    value={form.disbursementDay}
                    onSelect={(v) => setForm({ disbursementDay: v })}
                    hint="Day when salaries are transferred to employee accounts"
                />
            </SectionCard>

            {/* ---- Week & Timezone ---- */}
            <SectionCard title="Week & Timezone">
                <FormSelect
                    label="Week Start Day"
                    options={WEEK_STARTS}
                    selected={form.weekStart}
                    onSelect={(v) => setForm({ weekStart: v })}
                    hint="Affects shift rotation, attendance calendar, and OT calculations"
                    error={errors?.weekStart}
                    direction="up"
                />
                <View style={S.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Timezone <Text className="text-danger-500">*</Text>
                    </Text>
                    <View style={[S.fieldInput, { justifyContent: 'center' }]}>
                        <Text className="font-inter text-sm text-primary-950 dark:text-white">
                            {IST_TIMEZONE}
                        </Text>
                    </View>
                    <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                        Locked to IST (UTC+5:30) for now
                    </Text>
                </View>
            </SectionCard>

            {/* ---- Non-Working Days ---- */}
            <SectionCard title="Non-Working Days">
                <Text className="mb-3 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                    Select your company's weekly off days. Highlighted days are non-working.
                </Text>
                {errors?.workingDays ? (
                    <Text className="mb-2 font-inter text-[10px] text-danger-600">
                        {errors.workingDays}
                    </Text>
                ) : null}
                {DAYS_OF_WEEK.map((day) => {
                    const isWorking = form.workingDays.includes(day);
                    const isOff = !isWorking;
                    return (
                        <Pressable
                            key={day}
                            onPress={() => toggleWorkingDay(day)}
                            style={S.dayToggleRow}
                        >
                            <Text
                                className={`font-inter text-sm font-semibold ${isOff ? 'text-danger-700' : 'text-neutral-400'}`}
                            >
                                {day}
                            </Text>
                            <View
                                style={[
                                    S.dayBadge,
                                    { backgroundColor: isOff ? colors.danger[100] : colors.neutral[100] },
                                ]}
                            >
                                <Text
                                    className={`font-inter text-[10px] font-bold ${isOff ? 'text-danger-700' : 'text-neutral-400'}`}
                                >
                                    {isOff ? 'Off' : 'Working'}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </SectionCard>
        </Animated.View>
    );
}
