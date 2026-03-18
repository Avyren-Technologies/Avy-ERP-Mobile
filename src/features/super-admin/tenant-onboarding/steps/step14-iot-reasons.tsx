/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { AddButton, DeleteButton, FormInput, FormSelect, ToggleRow } from '../atoms';
import { IOT_REASON_TYPES } from '../constants';
import type { IOTReason } from '../types';
import { S } from '../shared-styles';

const DEPARTMENTS = [
    'Production',
    'Maintenance',
    'Quality',
    'Stores',
    'Admin',
    'HR',
    'Finance',
    'IT',
    'Engineering',
    'All',
];

export function Step14IOTReasons({
    reasons,
    setReasons,
    errors,
}: {
    reasons: IOTReason[];
    setReasons: (r: IOTReason[]) => void;
    errors?: Record<string, string>;
}) {
    const idle = reasons.filter((r) => r.reasonType === 'Machine Idle');
    const alarm = reasons.filter((r) => r.reasonType === 'Machine Alarm');

    const addReason = () => {
        setReasons([
            ...reasons,
            {
                id: Date.now().toString(),
                reasonType: 'Machine Idle',
                reason: '',
                description: '',
                department: 'Production',
                planned: false,
                duration: '0',
            },
        ]);
    };

    const update = (id: string, updates: Partial<IOTReason>) => {
        setReasons(reasons.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    };

    const remove = (id: string) => {
        setReasons(reasons.filter((r) => r.id !== id));
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    IOT Reason Master classifies machine downtime events for OEE monitoring. These
                    reasons are logged when machines go idle or raise alarms on the shop floor.
                </Text>
            </View>

            {/* Summary Cards */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.warning[50],
                        borderColor: colors.warning[200],
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: 'center',
                    }}
                >
                    <Text className="font-inter text-2xl font-bold text-warning-700">
                        {idle.length}
                    </Text>
                    <Text className="font-inter text-xs font-semibold text-warning-800 mt-0.5">
                        Idle Reasons
                    </Text>
                </View>

                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.danger[50],
                        borderColor: colors.danger[200],
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: 'center',
                    }}
                >
                    <Text className="font-inter text-2xl font-bold text-danger-700">
                        {alarm.length}
                    </Text>
                    <Text className="font-inter text-xs font-semibold text-danger-800 mt-0.5">
                        Alarm Reasons
                    </Text>
                </View>
            </View>

            {/* IOT Reason List */}
            <View style={S.sectionCard}>
                <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    IOT Reason List
                </Text>
                <Text className="mb-4 font-inter text-xs text-neutral-500">
                    Add all reasons that operators will use to classify machine downtime on the shop floor
                </Text>

                {reasons.length === 0 ? (
                    <View
                        style={{
                            backgroundColor: colors.neutral[50],
                            borderWidth: 1,
                            borderColor: colors.neutral[200],
                            borderStyle: 'dashed',
                            borderRadius: 16,
                            paddingVertical: 28,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <Text className="font-inter text-2xl mb-3">📡</Text>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">
                            No IOT reasons defined
                        </Text>
                        <Text className="font-inter text-xs text-neutral-400 mt-1">
                            Add reasons for machine idle time and alarms. Operators select these during downtime logging.
                        </Text>
                    </View>
                ) : null}

                {reasons.map((item, idx) => (
                    <Animated.View key={item.id} entering={FadeIn.duration(250)} style={S.itemCard}>
                        <View style={S.itemCardHeader}>
                            <View style={S.itemCardBadge}>
                                <Text className="font-inter text-xs font-bold text-primary-700">
                                    Reason {idx + 1}
                                </Text>
                            </View>
                            <DeleteButton onPress={() => remove(item.id)} />
                        </View>

                        <FormSelect
                            label="Reason Type"
                            options={IOT_REASON_TYPES}
                            selected={item.reasonType}
                            onSelect={(v) => update(item.id, { reasonType: v })}
                            required
                            error={errors?.[`reasonType_${idx}`]}
                        />

                        <FormInput
                            label="Reason (Short Label)"
                            placeholder="e.g. Tool Breakage, Power Failure, Raw Material Shortage"
                            value={item.reason}
                            onChangeText={(v) => update(item.id, { reason: v.toUpperCase() })}
                            required
                            autoCapitalize="characters"
                            hint="This label appears in the Andon board, reports, and OEE Dashboard"
                            error={errors?.[`reason_${idx}`]}
                        />

                        <FormInput
                            label="Description"
                            placeholder="Optional detailed description of when this reason applies..."
                            value={item.description}
                            onChangeText={(v) => update(item.id, { description: v })}
                            multiline
                            error={errors?.[`description_${idx}`]}
                        />

                        <FormSelect
                            label="Department"
                            options={DEPARTMENTS}
                            selected={item.department}
                            onSelect={(v) => update(item.id, { department: v })}
                            placeholder="Select department"
                            error={errors?.[`department_${idx}`]}
                        />

                        <FormInput
                            label="Threshold Duration (min)"
                            placeholder="15"
                            value={item.duration}
                            onChangeText={(v) => update(item.id, { duration: v })}
                            keyboardType="number-pad"
                            hint="Minimum downtime duration before this reason must be logged"
                            error={errors?.[`duration_${idx}`]}
                        />

                        <ToggleRow
                            label="Planned Downtime"
                            subtitle="Planned losses don't count against OEE Availability"
                            value={!!item.planned}
                            onToggle={(v) => update(item.id, { planned: v })}
                        />
                    </Animated.View>
                ))}

                <AddButton onPress={addReason} label="Add IOT Reason" />
            </View>

            {/* Common Reasons Reference */}
            <View style={[S.sectionCard, { marginTop: 6 }]}>
                <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Common Reasons Reference
                </Text>
                <Text className="mb-4 font-inter text-xs text-neutral-500">
                    Typical IOT reasons for manufacturing companies — add as needed
                </Text>

                <View style={{ marginBottom: 12 }}>
                    <Text className="font-inter text-xs font-bold text-warning-600 mb-2">
                        ⚡ Common Idle Reasons
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                            'Material Shortage',
                            'Changeover',
                            'Operator Absence',
                            'Quality Hold',
                            'Tool Change',
                            'Scheduled Break',
                            'Power Fluctuation',
                            'No Job Order',
                        ].map((s) => (
                            <Text
                                key={s}
                                className="font-inter text-xs text-neutral-600 bg-warning-50 rounded-full px-3 py-1.5 border border-warning-100 dark:text-neutral-300 dark:bg-warning-900/20 dark:border-warning-800/50"
                            >
                                {s}
                            </Text>
                        ))}
                    </View>
                </View>

                <View>
                    <Text className="font-inter text-xs font-bold text-danger-600 mb-2">
                        🚨 Common Alarm Reasons
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                            'Machine Breakdown',
                            'Hydraulic Failure',
                            'Spindle Error',
                            'Coolant System Fault',
                            'Electrical Fault',
                            'Servo Alarm',
                            'Chuck Pressure Low',
                            'Emergency Stop Triggered',
                        ].map((s) => (
                            <Text
                                key={s}
                                className="font-inter text-xs text-neutral-600 bg-danger-50 rounded-full px-3 py-1.5 border border-danger-100 dark:text-neutral-300 dark:bg-danger-900/20 dark:border-danger-800/50"
                            >
                                {s}
                            </Text>
                        ))}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}
