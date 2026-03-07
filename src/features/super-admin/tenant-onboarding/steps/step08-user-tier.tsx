/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormInput, SectionCard } from '../atoms';
import { MODULE_CATALOGUE, USER_TIERS, resolveModuleDependencies } from '../constants';
import { S } from '../shared-styles';
import type { Step7ModulesForm, Step8TierForm, UserTierKey } from '../types';

export function Step8UserTier({
    form,
    setForm,
    modules,
    errors,
}: {
    form: Step8TierForm;
    setForm: (f: Partial<Step8TierForm>) => void;
    modules: Step7ModulesForm;
    errors?: Record<string, string>;
}) {
    const currentTier = USER_TIERS.find((tier) => tier.key === form.userTier);

    const { resolved } = React.useMemo(
        () => resolveModuleDependencies(modules.selectedModuleIds),
        [modules.selectedModuleIds]
    );

    const moduleCost = React.useMemo(
        () =>
            resolved.reduce((sum, id) => {
                const mod = MODULE_CATALOGUE.find((item) => item.id === id);
                if (!mod) return sum;
                return sum + (modules.customModulePricing[id] ?? mod.price);
            }, 0),
        [resolved, modules.customModulePricing]
    );

    const customTierPrice = parseInt(form.customTierPrice || '0', 10) || 0;
    const tierBaseCost = form.userTier === 'custom'
        ? customTierPrice
        : (currentTier?.basePrice ?? 0);
    const totalMonthly = moduleCost + tierBaseCost;
    const totalAnnual = totalMonthly * 10;

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    User tier controls concurrent user capacity and base subscription pricing for
                    this tenant.
                </Text>
            </View>

            <SectionCard title="Select User Tier">
                {USER_TIERS.map((tier) => {
                    const selected = form.userTier === tier.key;
                    return (
                        <Pressable
                            key={tier.key}
                            onPress={() => setForm({ userTier: tier.key as UserTierKey })}
                            style={[
                                {
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 10,
                                    borderWidth: 1.5,
                                    borderColor: colors.neutral[200],
                                    backgroundColor: colors.white,
                                },
                                selected && {
                                    borderColor: colors.primary[500],
                                    backgroundColor: colors.primary[50],
                                },
                            ]}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">
                                            {tier.label}
                                        </Text>
                                        {tier.popular ? (
                                            <View
                                                style={{
                                                    borderRadius: 999,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    backgroundColor: colors.success[100],
                                                }}
                                            >
                                                <Text className="font-inter text-[10px] font-bold text-success-700">
                                                    Most Popular
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text className="mt-0.5 font-inter text-xs text-neutral-500">
                                        {tier.range} · {tier.description}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        S.radioCircle,
                                        selected && S.radioCircleActive,
                                    ]}
                                >
                                    {selected ? <View style={S.radioInner} /> : null}
                                </View>
                            </View>

                            {tier.key !== 'custom' ? (
                                <Text className="mt-2 font-inter text-xs font-semibold text-primary-700">
                                    ₹{tier.basePrice.toLocaleString('en-IN')}/month base + ₹{tier.perUserPrice}/user
                                </Text>
                            ) : (
                                <Text className="mt-2 font-inter text-xs font-semibold text-accent-700">
                                    Negotiated enterprise pricing
                                </Text>
                            )}
                        </Pressable>
                    );
                })}

                {form.userTier === 'custom' ? (
                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Custom User Limit"
                                placeholder="2500"
                                value={form.customUserLimit}
                                onChangeText={(v) => setForm({ customUserLimit: v })}
                                keyboardType="number-pad"
                                required
                                error={errors?.customUserLimit}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Custom Monthly Tier Price"
                                placeholder="60000"
                                value={form.customTierPrice}
                                onChangeText={(v) => setForm({ customTierPrice: v })}
                                keyboardType="number-pad"
                                required
                                error={errors?.customTierPrice}
                            />
                        </View>
                    </View>
                ) : null}
            </SectionCard>

            <SectionCard title="Billing Cycle">
                <View style={S.twoColumn}>
                    <Pressable
                        onPress={() => setForm({ billingCycle: 'monthly' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            form.billingCycle === 'monthly' && {
                                borderColor: colors.primary[500],
                                backgroundColor: colors.primary[50],
                            },
                        ]}
                    >
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            Monthly
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            Billed every month.
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setForm({ billingCycle: 'annual' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            form.billingCycle === 'annual' && {
                                borderColor: colors.success[500],
                                backgroundColor: colors.success[50],
                            },
                        ]}
                    >
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            Annual
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            Pay for 10 months, get 12 months.
                        </Text>
                    </Pressable>
                </View>
            </SectionCard>

            <SectionCard title="Trial Period">
                <FormInput
                    label="Trial Days"
                    placeholder="14"
                    value={form.trialDays}
                    onChangeText={(v) => setForm({ trialDays: v })}
                    keyboardType="number-pad"
                    hint="Set 0 to skip trial and start billing immediately"
                    error={errors?.trialDays}
                />
            </SectionCard>

            <SectionCard title="Pricing Summary">
                {resolved.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                        <Text className="mb-1 font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                            Modules
                        </Text>
                        {resolved.map((id) => {
                            const moduleItem = MODULE_CATALOGUE.find((item) => item.id === id);
                            if (!moduleItem) return null;
                            const price = modules.customModulePricing[id] ?? moduleItem.price;
                            return (
                                <View
                                    key={id}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginBottom: 4,
                                    }}
                                >
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {moduleItem.icon} {moduleItem.name}
                                    </Text>
                                    <Text className="font-inter text-xs font-semibold text-primary-800">
                                        ₹{price.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            );
                        })}
                        <View
                            style={{
                                marginTop: 6,
                                paddingTop: 6,
                                borderTopWidth: 1,
                                borderTopColor: colors.neutral[200],
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Text className="font-inter text-xs font-bold text-neutral-700">
                                Modules Subtotal
                            </Text>
                            <Text className="font-inter text-xs font-bold text-primary-800">
                                ₹{moduleCost.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View
                    style={{
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.primary[200],
                        backgroundColor: colors.primary[50],
                    }}
                >
                    <Text className="font-inter text-xs text-primary-700">
                        Tier Base: ₹{tierBaseCost.toLocaleString('en-IN')} / month
                    </Text>
                    <Text className="mt-1 font-inter text-sm font-bold text-primary-900">
                        Total {form.billingCycle === 'annual' ? 'Annual' : 'Monthly'}: ₹
                        {(form.billingCycle === 'annual' ? totalAnnual : totalMonthly).toLocaleString('en-IN')}
                        {form.billingCycle === 'annual' ? '/year' : '/month'}
                    </Text>
                </View>
            </SectionCard>
        </Animated.View>
    );
}
