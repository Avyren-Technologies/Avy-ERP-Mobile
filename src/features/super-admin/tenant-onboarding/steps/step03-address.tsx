/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { ChipSelector, FormInput, SectionCard } from '../atoms';
import { INDIAN_STATES } from '../constants';
import { S } from '../shared-styles';
import type { Step3Form } from '../types';

export function Step3Address({
    form,
    setForm,
    errors,
}: {
    form: Step3Form;
    setForm: (f: Partial<Step3Form>) => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Registered Address">
                <FormInput
                    label="Address Line 1"
                    placeholder="Street, building, floor"
                    value={form.regLine1}
                    onChangeText={(v) => setForm({ regLine1: v })}
                    required
                    error={errors?.regLine1}
                />
                <FormInput
                    label="Address Line 2"
                    placeholder="Area, landmark, locality"
                    value={form.regLine2}
                    onChangeText={(v) => setForm({ regLine2: v })}
                />
                <FormInput
                    label="City"
                    placeholder="e.g. Bengaluru"
                    value={form.regCity}
                    onChangeText={(v) => setForm({ regCity: v })}
                    required
                    autoCapitalize="words"
                    error={errors?.regCity}
                />
                <FormInput
                    label="District"
                    placeholder="e.g. Bengaluru Urban"
                    value={form.regDistrict}
                    onChangeText={(v) => setForm({ regDistrict: v })}
                    autoCapitalize="words"
                />
                <ChipSelector
                    label="State"
                    options={INDIAN_STATES}
                    selected={form.regState}
                    onSelect={(v) => setForm({ regState: v })}
                    required
                    error={errors?.regState}
                />
                <FormInput
                    label="PIN Code"
                    placeholder="560001"
                    value={form.regPin}
                    onChangeText={(v) => setForm({ regPin: v })}
                    required
                    keyboardType="number-pad"
                    error={errors?.regPin}
                />
                <FormInput
                    label="STD Code"
                    placeholder="080"
                    value={form.regStdCode}
                    onChangeText={(v) => setForm({ regStdCode: v })}
                    keyboardType="phone-pad"
                />
            </SectionCard>

            <SectionCard title="Corporate / HQ Address">
                <Pressable
                    onPress={() =>
                        setForm({
                            sameAsRegistered: !form.sameAsRegistered,
                            ...(form.sameAsRegistered
                                ? {}
                                : {
                                      corpLine1: form.regLine1,
                                      corpCity: form.regCity,
                                      corpState: form.regState,
                                      corpPin: form.regPin,
                                  }),
                        })
                    }
                    style={S.checkboxRow}
                >
                    <View style={[S.checkbox, form.sameAsRegistered && S.checkboxActive]}>
                        {form.sameAsRegistered && (
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
                    <Text className="font-inter text-sm font-medium text-neutral-600">
                        Same as Registered Address
                    </Text>
                </Pressable>

                {!form.sameAsRegistered && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <FormInput
                            label="Address Line 1"
                            placeholder="Corporate office address"
                            value={form.corpLine1}
                            onChangeText={(v) => setForm({ corpLine1: v })}
                            error={errors?.corpLine1}
                        />
                        <FormInput
                            label="City"
                            placeholder="City"
                            value={form.corpCity}
                            onChangeText={(v) => setForm({ corpCity: v })}
                            autoCapitalize="words"
                            error={errors?.corpCity}
                        />
                        <ChipSelector
                            label="State"
                            options={INDIAN_STATES}
                            selected={form.corpState}
                            onSelect={(v) => setForm({ corpState: v })}
                            error={errors?.corpState}
                        />
                        <FormInput
                            label="PIN Code"
                            placeholder="560001"
                            value={form.corpPin}
                            onChangeText={(v) => setForm({ corpPin: v })}
                            keyboardType="number-pad"
                            error={errors?.corpPin}
                        />
                    </Animated.View>
                )}
            </SectionCard>
        </Animated.View>
    );
}
