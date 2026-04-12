/* eslint-disable better-tailwindcss/no-unknown-classes */
// Step 07 — Configuration Strategy

import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { RadioOption, SectionCard, ToggleRow } from '../atoms';
import { S } from '../shared-styles';
import type { StrategyConfig } from '../types';

export function Step7Strategy({
    form,
    setForm,
    errors,
}: {
    form: StrategyConfig;
    setForm: (f: Partial<StrategyConfig>) => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            {/* Billing scope banner */}
            <View
                style={{
                    backgroundColor: colors.primary[50],
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: colors.primary[200],
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                }}
            >
                <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginTop: 2 }}>
                    <Path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                        fill={colors.primary[600]}
                    />
                </Svg>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-800">
                        Per-Location Billing
                    </Text>
                    <Text className="font-inter text-xs text-primary-700 leading-relaxed mt-0.5">
                        Module subscriptions and user tier pricing are applied per location. Each location
                        is billed independently — totals are aggregated.
                    </Text>
                </View>
            </View>

            <SectionCard
                title="Location Mode"
                subtitle="Does this company operate from a single or multiple sites?"
            >
                <ToggleRow
                    label="Multi-Location Mode"
                    subtitle="Enable if the company operates from multiple plants, branches, or office locations"
                    value={form.multiLocationMode}
                    onToggle={(v) => setForm({ multiLocationMode: v })}
                />

                {!form.multiLocationMode && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <View
                            style={{
                                backgroundColor: colors.neutral[50],
                                borderRadius: 12,
                                padding: 12,
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: colors.neutral[200],
                            }}
                        >
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Single-location mode: one HQ location will be created in the next step.
                                All operational configurations will apply to that location.
                            </Text>
                        </View>
                    </Animated.View>
                )}
            </SectionCard>

            {form.multiLocationMode && (
                <Animated.View entering={FadeIn.duration(200)}>
                    <SectionCard
                        title="Operational Configuration"
                        subtitle="How should shifts, number series, and IOT reasons be managed?"
                    >
                        <RadioOption
                            label="Common Configuration"
                            subtitle="All locations share the same shift schedules, No. Series, and IOT Reason lists. Easiest to manage."
                            selected={form.locationConfig === 'common'}
                            onSelect={() => setForm({ locationConfig: 'common' })}
                        />
                        <RadioOption
                            label="Per-Location Configuration"
                            subtitle="Each location has its own independent shift schedules, serial number tracking, and IOT configurations."
                            selected={form.locationConfig === 'per-location'}
                            onSelect={() => setForm({ locationConfig: 'per-location' })}
                        />

                        {/* Warning */}
                        <View
                            style={{
                                backgroundColor: colors.warning[50],
                                borderRadius: 12,
                                padding: 12,
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: colors.warning[200],
                            }}
                        >
                            <Text className="font-inter text-xs text-warning-700 leading-relaxed">
                                <Text className="font-inter font-bold text-warning-700">
                                    Downstream impact:{' '}
                                </Text>
                                This affects how Shifts, No. Series, and IOT steps are configured.
                                Changing after setup requires re-configuration.
                            </Text>
                        </View>
                    </SectionCard>
                </Animated.View>
            )}

            <SectionCard title="Billing Scope" subtitle="Commercial billing model">
                <View
                    style={{
                        backgroundColor: colors.success[50],
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.success[200],
                    }}
                >
                    <Text className="font-inter text-sm font-bold text-success-800">
                        Per-Location Billing Active
                    </Text>
                    <Text className="font-inter text-xs text-success-700 leading-relaxed mt-1">
                        Modules and user tier are subscribed per location. Billing totals are the sum of
                        all active location subscriptions. Annual billing applies a discount per location.
                    </Text>
                </View>
            </SectionCard>
        </Animated.View>
    );
}
