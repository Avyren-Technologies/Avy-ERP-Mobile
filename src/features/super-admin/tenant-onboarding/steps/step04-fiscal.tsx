/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { ChipSelector, RadioOption, SectionCard } from '../atoms';
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
import type { Step4Form } from '../types';

// ============ MONTH GRID PICKER ============

function MonthGridPicker({
    label,
    selectedMonth,
    onSelect,
    highlightColor,
}: {
    label: string;
    selectedMonth: string;
    onSelect: (key: string) => void;
    highlightColor: string;
}) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text className="mb-2 font-inter text-xs font-bold text-neutral-500">{label}</Text>
            <View style={S.monthGrid}>
                {MONTHS.map((m) => {
                    const isSelected = m.key === selectedMonth;
                    return (
                        <Pressable
                            key={m.key}
                            style={[
                                S.monthCell,
                                isSelected && {
                                    backgroundColor: highlightColor,
                                    borderColor: highlightColor,
                                },
                            ]}
                            onPress={() => onSelect(m.key)}
                        >
                            <Text
                                className={`font-inter text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {m.short}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ CUSTOM FY RANGE PICKER ============

function CustomFYPicker({
    startMonth,
    endMonth,
    onStartChange,
    onEndChange,
}: {
    startMonth: string;
    endMonth: string;
    onStartChange: (m: string) => void;
    onEndChange: (m: string) => void;
}) {
    const startLabel = MONTHS.find((m) => m.key === startMonth)?.label ?? 'Select';
    const endLabel = MONTHS.find((m) => m.key === endMonth)?.label ?? 'Select';

    return (
        <Animated.View entering={FadeIn.duration(200)}>
            <View
                style={{
                    backgroundColor: colors.primary[50],
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: colors.primary[200],
                }}
            >
                {/* Summary row */}
                {startMonth && endMonth && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 14,
                            gap: 8,
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: colors.primary[600],
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                            }}
                        >
                            <Text className="font-inter text-xs font-bold text-white">
                                {startLabel}
                            </Text>
                        </View>
                        <Text className="font-inter text-xs text-neutral-400">to</Text>
                        <View
                            style={{
                                backgroundColor: colors.accent[600],
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                            }}
                        >
                            <Text className="font-inter text-xs font-bold text-white">
                                {endLabel}
                            </Text>
                        </View>
                    </View>
                )}

                <MonthGridPicker
                    label="FY Start Month"
                    selectedMonth={startMonth}
                    onSelect={onStartChange}
                    highlightColor={colors.primary[600]}
                />
                <MonthGridPicker
                    label="FY End Month"
                    selectedMonth={endMonth}
                    onSelect={onEndChange}
                    highlightColor={colors.accent[600]}
                />
                <Text className="mt-2 font-inter text-[10px] text-neutral-400">
                    Select the month your financial year starts and ends. These months define payroll cycles, compliance deadlines, and audit periods.
                </Text>
            </View>
        </Animated.View>
    );
}

// ============ MAIN STEP ============

export function Step4Fiscal({
    form,
    setForm,
}: {
    form: Step4Form;
    setForm: (f: Partial<Step4Form>) => void;
}) {
    const toggleWorkingDay = (day: string) => {
        const updated = form.workingDays.includes(day)
            ? form.workingDays.filter((d) => d !== day)
            : [...form.workingDays, day];
        setForm({ workingDays: updated });
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            {/* ---- Financial Year ---- */}
            <SectionCard title="Financial Year">
                {FY_OPTIONS.map((opt) => (
                    <RadioOption
                        key={opt.key}
                        label={opt.label}
                        subtitle={opt.subtitle}
                        selected={form.fyType === opt.key}
                        onSelect={() => setForm({ fyType: opt.key })}
                        badge={opt.key === 'apr-mar' ? 'INDIA DEFAULT' : undefined}
                    />
                ))}

                {form.fyType === 'custom' && (
                    <CustomFYPicker
                        startMonth={form.fyCustomStartMonth}
                        endMonth={form.fyCustomEndMonth}
                        onStartChange={(m) => setForm({ fyCustomStartMonth: m })}
                        onEndChange={(m) => setForm({ fyCustomEndMonth: m })}
                    />
                )}
            </SectionCard>

            {/* ---- Payroll Cycle ---- */}
            <SectionCard title="Payroll Cycle">
                <ChipSelector
                    label="Frequency"
                    options={PAYROLL_FREQ}
                    selected={form.payrollFreq}
                    onSelect={(v) => setForm({ payrollFreq: v })}
                    hint="Monthly is standard for most Indian companies. Semi-Monthly = twice a month."
                />
                <ChipSelector
                    label="Cut-off Day"
                    options={CUTOFF_DAYS}
                    selected={form.cutoffDay}
                    onSelect={(v) => setForm({ cutoffDay: v })}
                    hint="Day when attendance & leave data is frozen for payroll processing"
                />
                <ChipSelector
                    label="Disbursement Day"
                    options={DISBURSEMENT_DAYS}
                    selected={form.disbursementDay}
                    onSelect={(v) => setForm({ disbursementDay: v })}
                    hint="Day salaries are transferred to employee accounts"
                />
            </SectionCard>

            {/* ---- Week & Timezone ---- */}
            <SectionCard title="Week & Timezone">
                <ChipSelector
                    label="Week Start Day"
                    options={WEEK_STARTS}
                    selected={form.weekStart}
                    onSelect={(v) => setForm({ weekStart: v })}
                    hint="Affects shift rotation, attendance calendar, and OT calculations"
                />
                <ChipSelector
                    label="Timezone"
                    options={TIMEZONES}
                    selected={form.timezone}
                    onSelect={(v) => setForm({ timezone: v })}
                    required
                />
            </SectionCard>

            {/* ---- Working Days ---- */}
            <SectionCard title="Working Days">
                <Text className="mb-3 font-inter text-xs text-neutral-500">
                    Toggle each day as working or weekly off
                </Text>
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
