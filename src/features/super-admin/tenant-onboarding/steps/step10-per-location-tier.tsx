/* eslint-disable better-tailwindcss/no-unknown-classes */
// Step 10 — Per-Location User Tier & Pricing

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormInput, SectionCard } from '../atoms';
import { MODULE_CATALOGUE, USER_TIERS, resolveModuleDependencies } from '../constants';
import { S } from '../shared-styles';
import type { LocationCommercialEntry, PlantBranch, StrategyConfig, UserTierKey } from '../types';

export function Step10PerLocationTier({
    strategyConfig,
    locations,
    locationCommercial,
    onUpdateLocationCommercial,
    errors,
}: {
    strategyConfig: StrategyConfig;
    locations: PlantBranch[];
    locationCommercial: Record<string, LocationCommercialEntry>;
    onUpdateLocationCommercial: (locationId: string, u: Partial<LocationCommercialEntry>) => void;
    errors?: Record<string, string>;
}) {
    const [activeLocationId, setActiveLocationId] = React.useState<string>(
        locations[0]?.id ?? ''
    );

    // Initialize entries for locations that don't have one yet
    React.useEffect(() => {
        for (const loc of locations) {
            if (!locationCommercial[loc.id]) {
                onUpdateLocationCommercial(loc.id, {
                    moduleIds: [],
                    customModulePricing: {},
                    userTier: 'starter',
                    customUserLimit: '',
                    customTierPrice: '',
                    billingCycle: 'monthly',
                    trialDays: '14',
                });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations]);

    const activeEntry: LocationCommercialEntry = locationCommercial[activeLocationId] ?? {
        moduleIds: [],
        customModulePricing: {},
        userTier: 'starter',
        customUserLimit: '',
        customTierPrice: '',
        billingCycle: 'monthly',
        trialDays: '14',
    };

    const activeLoc = locations.find((l) => l.id === activeLocationId);
    const currentTier = USER_TIERS.find((t) => t.key === activeEntry.userTier);

    // Per-active-location costs
    const { resolved: resolvedModuleIds } = React.useMemo(
        () => resolveModuleDependencies(activeEntry.moduleIds),
        [activeEntry.moduleIds]
    );

    const moduleCost = React.useMemo(
        () =>
            resolvedModuleIds.reduce((sum, id) => {
                const mod = MODULE_CATALOGUE.find((m) => m.id === id);
                if (!mod) return sum;
                return sum + (activeEntry.customModulePricing[id] ?? mod.price);
            }, 0),
        [resolvedModuleIds, activeEntry.customModulePricing]
    );

    const customTierPrice = parseInt(activeEntry.customTierPrice || '0', 10) || 0;
    const tierBaseCost =
        activeEntry.userTier === 'custom'
            ? customTierPrice
            : (currentTier?.basePrice ?? 0);
    const locationMonthly = moduleCost + tierBaseCost;
    const locationAnnual = locationMonthly * 10;

    // Grand totals across all locations
    const grandTotals = React.useMemo(() => {
        let totalMonthly = 0;
        let totalAnnual = 0;
        for (const loc of locations) {
            const entry = locationCommercial[loc.id];
            if (!entry) continue;
            const { resolved } = resolveModuleDependencies(entry.moduleIds);
            const mCost = resolved.reduce((sum, id) => {
                const mod = MODULE_CATALOGUE.find((m) => m.id === id);
                if (!mod) return sum;
                return sum + (entry.customModulePricing[id] ?? mod.price);
            }, 0);
            const tier = USER_TIERS.find((t) => t.key === entry.userTier);
            const tPrice =
                entry.userTier === 'custom'
                    ? parseInt(entry.customTierPrice || '0', 10) || 0
                    : (tier?.basePrice ?? 0);
            const locMonthly = mCost + tPrice;
            if (entry.billingCycle === 'annual') {
                totalAnnual += locMonthly * 10;
            } else {
                totalMonthly += locMonthly;
            }
        }
        return { totalMonthly, totalAnnual };
    }, [locations, locationCommercial]);

    const update = (u: Partial<LocationCommercialEntry>) =>
        onUpdateLocationCommercial(activeLocationId, u);

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            {/* Info banner */}
            <View style={[S.infoCard, { marginBottom: 8 }]}>
                <Text className="font-inter text-sm text-neutral-600">
                    User tier controls concurrent user capacity and base subscription pricing for each
                    location independently.
                </Text>
            </View>

            {/* Location Tabs */}
            {strategyConfig.multiLocationMode && locations.length > 1 && (
                <View style={{ marginBottom: 12 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 4 }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                paddingHorizontal: 2,
                                paddingVertical: 4,
                            }}
                        >
                            {locations.map((loc) => {
                                const entry = locationCommercial[loc.id];
                                const hasTier = entry && entry.userTier;
                                const isActive = loc.id === activeLocationId;
                                return (
                                    <Pressable
                                        key={loc.id}
                                        onPress={() => setActiveLocationId(loc.id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: isActive
                                                ? colors.primary[600]
                                                : colors.neutral[100],
                                        }}
                                    >
                                        {hasTier && (
                                            <Svg width={10} height={10} viewBox="0 0 24 24">
                                                <Path
                                                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                                    fill={isActive ? 'white' : colors.success[500]}
                                                />
                                            </Svg>
                                        )}
                                        <Text
                                            className={`font-inter text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-700'}`}
                                        >
                                            {loc.name || `Location ${locations.indexOf(loc) + 1}`}
                                            {loc.isHQ ? ' ★' : ''}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Tier Selection */}
            <SectionCard
                title={`${activeLoc?.name || 'Location'} — Select User Tier`}
            >
                {USER_TIERS.map((tier) => {
                    const selected = activeEntry.userTier === tier.key;
                    return (
                        <Pressable
                            key={tier.key}
                            onPress={() => update({ userTier: tier.key as UserTierKey })}
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
                                    <View
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    >
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
                                    ₹{tier.basePrice.toLocaleString('en-IN')}/month base + ₹
                                    {tier.perUserPrice}/user
                                </Text>
                            ) : (
                                <Text className="mt-2 font-inter text-xs font-semibold text-accent-700">
                                    Negotiated enterprise pricing
                                </Text>
                            )}
                        </Pressable>
                    );
                })}

                {activeEntry.userTier === 'custom' ? (
                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Custom User Limit"
                                placeholder="2500"
                                value={activeEntry.customUserLimit}
                                onChangeText={(v) => update({ customUserLimit: v })}
                                keyboardType="number-pad"
                                required
                                error={errors?.[`customUserLimit_${activeLocationId}`]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Custom Monthly Tier Price"
                                placeholder="60000"
                                value={activeEntry.customTierPrice}
                                onChangeText={(v) => update({ customTierPrice: v })}
                                keyboardType="number-pad"
                                required
                                error={errors?.[`customTierPrice_${activeLocationId}`]}
                            />
                        </View>
                    </View>
                ) : null}
            </SectionCard>

            {/* Billing Cycle */}
            <SectionCard title="Billing Cycle">
                <View style={S.twoColumn}>
                    <Pressable
                        onPress={() => update({ billingCycle: 'monthly' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            activeEntry.billingCycle === 'monthly' && {
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
                        onPress={() => update({ billingCycle: 'annual' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            activeEntry.billingCycle === 'annual' && {
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

            {/* Trial Period */}
            <SectionCard title="Trial Period">
                <FormInput
                    label="Trial Days"
                    placeholder="14"
                    value={activeEntry.trialDays}
                    onChangeText={(v) => update({ trialDays: v })}
                    keyboardType="number-pad"
                    hint="Set 0 to skip trial and start billing immediately"
                    error={errors?.trialDays}
                />
                <View
                    style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                    }}
                >
                    <Text className="font-inter text-xs font-semibold text-info-800">
                        📅 Billing Date
                    </Text>
                    <Text className="mt-1 font-inter text-xs leading-4 text-info-700">
                        Billing will commence from the date of successful tenant registration and first
                        payment confirmation. The trial period begins immediately upon activation.
                    </Text>
                </View>
            </SectionCard>

            {/* Location Pricing Summary */}
            <SectionCard
                title={`${activeLoc?.name || 'Location'} — Pricing Summary`}
            >
                {resolvedModuleIds.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                        <Text className="mb-1 font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                            Modules
                        </Text>
                        {resolvedModuleIds.map((id) => {
                            const moduleItem = MODULE_CATALOGUE.find((m) => m.id === id);
                            if (!moduleItem) return null;
                            const price =
                                activeEntry.customModulePricing[id] ?? moduleItem.price;
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
                        Location{' '}
                        {activeEntry.billingCycle === 'annual' ? 'Annual' : 'Monthly'}: ₹
                        {(activeEntry.billingCycle === 'annual'
                            ? locationAnnual
                            : locationMonthly
                        ).toLocaleString('en-IN')}
                        {activeEntry.billingCycle === 'annual' ? '/year' : '/month'}
                    </Text>
                </View>
            </SectionCard>

            {/* Grand Totals Panel */}
            {locations.length > 1 && (
                <Animated.View entering={FadeIn.duration(250)}>
                    <View
                        style={{
                            backgroundColor: colors.primary[900],
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 4,
                        }}
                    >
                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-primary-200">
                            Grand Total — All {locations.length} Locations
                        </Text>

                        {grandTotals.totalMonthly > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 10,
                                }}
                            >
                                <Text className="font-inter text-xs text-primary-300">
                                    Monthly subscriptions
                                </Text>
                                <Text className="font-inter text-base font-bold text-white">
                                    ₹{grandTotals.totalMonthly.toLocaleString('en-IN')}/mo
                                </Text>
                            </View>
                        )}

                        {grandTotals.totalAnnual > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: grandTotals.totalMonthly > 0 ? 6 : 10,
                                }}
                            >
                                <Text className="font-inter text-xs text-primary-300">
                                    Annual subscriptions
                                </Text>
                                <Text className="font-inter text-base font-bold text-white">
                                    ₹{grandTotals.totalAnnual.toLocaleString('en-IN')}/yr
                                </Text>
                            </View>
                        )}

                        {grandTotals.totalMonthly === 0 && grandTotals.totalAnnual === 0 && (
                            <Text className="mt-3 font-inter text-sm text-primary-300">
                                Configure tiers for each location to see totals.
                            </Text>
                        )}

                        <View
                            style={{
                                marginTop: 12,
                                paddingTop: 10,
                                borderTopWidth: 1,
                                borderTopColor: colors.primary[700],
                            }}
                        >
                            <Text className="font-inter text-[10px] text-primary-400 leading-relaxed">
                                Annual billing = 10 months charged, 12 months access. Totals exclude
                                per-user charges which vary monthly.
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}
