import type { Step4Form } from '../types';

import * as React from 'react';
import { Pressable, View } from 'react-native';

import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormSelect, RadioOption, SectionCard } from '../atoms';
import {
    CUTOFF_DAYS,
    DAYS_OF_WEEK,
    DISBURSEMENT_DAYS,
    FY_OPTIONS,
    MONTHS,
    PAYROLL_FREQ,
    TIMEZONES,
    WEEK_STARTS,
} from '../constants';
import { S } from '../shared-styles';

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
                <Text className="mb-4 font-inter text-sm text-neutral-600">
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
                <FormSelect
                    label="Frequency"
                    options={PAYROLL_FREQ}
                    selected={form.payrollFreq}
                    onSelect={(v) => setForm({ payrollFreq: v })}
                    hint="Monthly is standard for most Indian companies. Semi-Monthly = twice a month."
                    error={errors?.payrollFreq}
                    direction="up"
                />
                <FormSelect
                    label="Cut-off Day"
                    options={CUTOFF_DAYS}
                    selected={form.cutoffDay}
                    onSelect={(v) => setForm({ cutoffDay: v })}
                    hint="Day when attendance & leave data is frozen for payroll processing"
                    error={errors?.cutoffDay}
                    direction="up"
                />
                <FormSelect
                    label="Disbursement Day"
                    options={DISBURSEMENT_DAYS}
                    selected={form.disbursementDay}
                    onSelect={(v) => setForm({ disbursementDay: v })}
                    hint="Day salaries are transferred to employee accounts"
                    error={errors?.disbursementDay}
                    direction="up"
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
                <FormSelect
                    label="Timezone"
                    options={TIMEZONES}
                    selected={form.timezone}
                    onSelect={(v) => setForm({ timezone: v })}
                    required
                    error={errors?.timezone}
                    direction="up"
                />
            </SectionCard>

            {/* ---- Working Days ---- */}
            <SectionCard title="Working Days">
                <Text className="mb-3 font-inter text-xs text-neutral-500">
                    Toggle each day as working or weekly off
                </Text>
                {errors?.workingDays ? (
                    <Text className="mb-2 font-inter text-[10px] text-danger-600">
                        {errors.workingDays}
                    </Text>
                ) : null}
                {DAYS_OF_WEEK.map((day) => {
                    const isWorking = form.workingDays.includes(day);
                    return (
                        <Pressable
                            key={day}
                            onPress={() => toggleWorkingDay(day)}
                            style={S.dayToggleRow}
                        >
                            <Text
                                className={`font-inter text-sm font-semibold ${isWorking ? 'text-primary-700' : 'text-neutral-400'}`}
                            >
                                {day}
                            </Text>
                            <View
                                style={[
                                    S.dayBadge,
                                    { backgroundColor: isWorking ? colors.success[100] : colors.neutral[100] },
                                ]}
                            >
                                <Text
                                    className={`font-inter text-[10px] font-bold ${isWorking ? 'text-success-700' : 'text-neutral-400'}`}
                                >
                                    {isWorking ? 'Working' : 'Off'}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </SectionCard>
        </Animated.View>
    );
}
