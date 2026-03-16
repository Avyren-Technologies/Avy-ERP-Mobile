/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { AddButton, DeleteButton, FormInput, FormSelect } from '../atoms';
import { NO_SERIES_SCREENS } from '../constants';
import { S } from '../shared-styles';
import type { NoSeriesItem } from '../types';

function getPreview(item: NoSeriesItem): string {
    const count = parseInt(item.numberCount || '5', 10);
    const start = parseInt(item.startNumber || '1', 10);
    const num = String(start).padStart(count, '0');
    return `${item.prefix}${num}${item.suffix}`;
}

export function Step9NoSeries({
    noSeries,
    setNoSeries,
    errors,
}: {
    noSeries: NoSeriesItem[];
    setNoSeries: (ns: NoSeriesItem[]) => void;
    errors?: Record<string, string>;
}) {
    const addSeries = () => {
        setNoSeries([
            ...noSeries,
            {
                id: Date.now().toString(),
                code: '',
                description: '',
                linkedScreen: '',
                prefix: '',
                suffix: '',
                numberCount: '5',
                startNumber: '1',
            },
        ]);
    };

    const update = (id: string, updates: Partial<NoSeriesItem>) => {
        setNoSeries(noSeries.map((ns) => (ns.id === id ? { ...ns, ...updates } : ns)));
    };

    const remove = (id: string) => {
        setNoSeries(noSeries.filter((ns) => ns.id !== id));
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    Number Series defines auto-numbering formats for all transactional documents.
                    Each series generates unique, traceable document numbers across the system.
                </Text>
            </View>

            {noSeries.map((item, idx) => (
                <Animated.View key={item.id} entering={FadeIn.duration(250)} style={S.itemCard}>
                    <View style={S.itemCardHeader}>
                        <View style={S.itemCardBadge}>
                            <Text className="font-inter text-xs font-bold text-primary-700">
                                Series {idx + 1}
                            </Text>
                        </View>
                        <DeleteButton onPress={() => remove(item.id)} />
                    </View>

                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Code"
                                placeholder="EMP"
                                value={item.code}
                                onChangeText={(v) => update(item.id, { code: v.toUpperCase() })}
                                required
                                autoCapitalize="none"
                                error={errors?.[`code_${idx}`]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Starting Number"
                                placeholder="1"
                                value={item.startNumber}
                                onChangeText={(v) => update(item.id, { startNumber: v })}
                                keyboardType="number-pad"
                                error={errors?.[`startNumber_${idx}`]}
                            />
                        </View>
                    </View>

                    <FormInput
                        label="Description"
                        placeholder="Employee ID"
                        value={item.description}
                        onChangeText={(v) => update(item.id, { description: v })}
                    />

                    <FormSelect
                        label="Linked Screen"
                        options={NO_SERIES_SCREENS}
                        selected={item.linkedScreen}
                        onSelect={(v) => update(item.id, { linkedScreen: v })}
                        required
                        error={errors?.[`linkedScreen_${idx}`]}
                    />

                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Prefix"
                                placeholder="EMP-"
                                value={item.prefix}
                                onChangeText={(v) => update(item.id, { prefix: v })}
                                autoCapitalize="none"
                                error={errors?.[`prefix_${idx}`]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Suffix"
                                placeholder="-2026"
                                value={item.suffix}
                                onChangeText={(v) => update(item.id, { suffix: v })}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <FormInput
                        label="Number of Digits"
                        placeholder="5"
                        value={item.numberCount}
                        onChangeText={(v) => update(item.id, { numberCount: v })}
                        keyboardType="number-pad"
                        hint="The number will be zero-padded to this length"
                        error={errors?.[`numberCount_${idx}`]}
                    />

                    {/* Live Preview */}
                    <View style={S.previewBox}>
                        <Text className="font-inter text-[10px] font-bold text-neutral-400">
                            DOCUMENT NUMBER PREVIEW
                        </Text>
                        <Text className="mt-1 font-inter text-lg font-bold text-primary-600">
                            {getPreview(item)}
                        </Text>
                        <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
                            Next: {item.prefix}{String(parseInt(item.startNumber || '1') + 1).padStart(parseInt(item.numberCount || '5'), '0')}{item.suffix}
                        </Text>
                    </View>
                </Animated.View>
            ))}

            <AddButton onPress={addSeries} label="Add No. Series" />
        </Animated.View>
    );
}
