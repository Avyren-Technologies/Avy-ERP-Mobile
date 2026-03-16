/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { AddButton, DeleteButton, FormInput, FormSelect } from '../atoms';
import { IOT_REASON_TYPES } from '../constants';
import type { IOTReason } from '../types';
import { S } from '../shared-styles';

export function Step10IOTReasons({
    reasons,
    setReasons,
    errors,
}: {
    reasons: IOTReason[];
    setReasons: (r: IOTReason[]) => void;
    errors?: Record<string, string>;
}) {
    const addReason = () => {
        setReasons([
            ...reasons,
            {
                id: Date.now().toString(),
                reasonType: 'Machine Idle',
                reason: '',
                description: '',
                department: '',
                planned: false,
                duration: '',
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
                        onSelect={(v) => update(item.id, { reasonType: v, planned: false })}
                        required
                        error={errors?.[`reasonType_${idx}`]}
                    />
                    <FormInput
                        label="Reason"
                        placeholder='e.g. "PREVENTIVE MAINTENANCE"'
                        value={item.reason}
                        onChangeText={(v) => update(item.id, { reason: v.toUpperCase() })}
                        required
                        autoCapitalize="characters"
                        error={errors?.[`reason_${idx}`]}
                    />
                    <FormInput
                        label="Description"
                        placeholder="Detailed explanation"
                        value={item.description}
                        onChangeText={(v) => update(item.id, { description: v })}
                        multiline
                    />
                    <FormInput
                        label="Department"
                        placeholder="e.g. Maintenance, Production"
                        value={item.department}
                        onChangeText={(v) => update(item.id, { department: v })}
                        autoCapitalize="words"
                    />

                    {item.reasonType === 'Machine Idle' && (
                        <Animated.View entering={FadeIn.duration(200)}>
                            <Pressable
                                onPress={() => update(item.id, { planned: !item.planned })}
                                style={S.checkboxRow}
                            >
                                <View style={[S.checkbox, item.planned && S.checkboxActive]}>
                                    {item.planned && (
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
                                    Planned Downtime
                                </Text>
                            </Pressable>

                            {item.planned && (
                                <FormInput
                                    label="Max Planned Duration (minutes)"
                                    placeholder="60"
                                    value={item.duration}
                                    onChangeText={(v) => update(item.id, { duration: v })}
                                    keyboardType="number-pad"
                                    hint="Excess beyond this is treated as unplanned downtime"
                                />
                            )}
                        </Animated.View>
                    )}
                </Animated.View>
            ))}

            <AddButton onPress={addReason} label="Add IOT Reason" />
        </Animated.View>
    );
}
