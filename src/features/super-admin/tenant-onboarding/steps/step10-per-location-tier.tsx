/* eslint-disable better-tailwindcss/no-unknown-classes */
// Step 10 — Per-Location User Tier & Pricing

import * as React from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormInput, SectionCard, ToggleRow } from '../atoms';
import { BILLING_TYPES, MODULE_CATALOGUE, USER_TIERS, resolveModuleDependencies } from '../constants';
import { S } from '../shared-styles';
import type { LocationCommercialEntry, PlantBranch, StrategyConfig, UserTierKey } from '../types';

export function Step10PerLocationTier({
    strategyConfig,
    locations,
    locationCommercial,
    onUpdateLocationCommercial,
    endpointType,
    errors,
}: {
    strategyConfig: StrategyConfig;
    locations: PlantBranch[];
    locationCommercial: Record<string, LocationCommercialEntry>;
    onUpdateLocationCommercial: (locationId: string, u: Partial<LocationCommercialEntry>) => void;
    endpointType: 'default' | 'custom';
    errors?: Record<string, string>;
}) {
    const [activeLocationId, setActiveLocationId] = React.useState<string>(
        locations[0]?.id ?? ''
    );

    // Override toggles for one-time + AMC
    const [overrideOneTime, setOverrideOneTime] = React.useState(false);
    const [overrideAmc, setOverrideAmc] = React.useState(false);

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
                    billingType: 'monthly',
                    trialDays: '14',
                });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations]);

    // Reset override toggles when switching locations
    React.useEffect(() => {
        setOverrideOneTime(false);
        setOverrideAmc(false);
    }, [activeLocationId]);

    const activeEntry: LocationCommercialEntry = locationCommercial[activeLocationId] ?? {
        moduleIds: [],
        customModulePricing: {},
        userTier: 'starter',
        customUserLimit: '',
        customTierPrice: '',
        billingType: 'monthly',
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

    // One-time + AMC calculations
    const calculatedOneTimeFee = locationMonthly * 24;
    const effectiveOneTimeFee = overrideOneTime && activeEntry.oneTimeLicenseFee
        ? (parseInt(activeEntry.oneTimeLicenseFee, 10) || 0)
        : calculatedOneTimeFee;
    const calculatedAmc = Math.round(effectiveOneTimeFee * 0.18);
    const effectiveAmc = overrideAmc && activeEntry.amcAmount
        ? (parseInt(activeEntry.amcAmount, 10) || 0)
        : calculatedAmc;

    // Grand totals across all locations
    const grandTotals = React.useMemo(() => {
        let totalMonthly = 0;
        let totalAnnual = 0;
        let totalOneTime = 0;
        let totalAmc = 0;
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
            if (entry.billingType === 'annual') {
                totalAnnual += locMonthly * 10;
            } else if (entry.billingType === 'one_time_amc') {
                const otFee = entry.oneTimeLicenseFee
                    ? (parseInt(entry.oneTimeLicenseFee, 10) || 0)
                    : locMonthly * 24;
                totalOneTime += otFee;
                if (endpointType === 'default') {
                    const amcFee = entry.amcAmount
                        ? (parseInt(entry.amcAmount, 10) || 0)
                        : Math.round(otFee * 0.18);
                    totalAmc += amcFee;
                }
            } else {
                totalMonthly += locMonthly;
            }
        }
        return { totalMonthly, totalAnnual, totalOneTime, totalAmc };
    }, [locations, locationCommercial, endpointType]);

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

            {/* Billing Type */}
            <SectionCard title="Billing Type">
                {BILLING_TYPES.map((bt) => {
                    const selected = activeEntry.billingType === bt.key;
                    return (
                        <Pressable
                            key={bt.key}
                            onPress={() => update({ billingType: bt.key })}
                            style={[
                                {
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 10,
                                    borderWidth: 1.5,
                                    borderColor: colors.neutral[200],
                                    backgroundColor: colors.white,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                },
                                selected && {
                                    borderColor: bt.key === 'annual' ? colors.success[500] : colors.primary[500],
                                    backgroundColor: bt.key === 'annual' ? colors.success[50] : colors.primary[50],
                                },
                            ]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-sm font-bold text-primary-950">
                                    {bt.label}
                                </Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500">
                                    {bt.description}
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
                        </Pressable>
                    );
                })}
            </SectionCard>

            {/* One-Time + AMC Section */}
            {activeEntry.billingType === 'one_time_amc' && (
                <Animated.View entering={FadeIn.duration(250)}>
                    <SectionCard title="One-Time License + AMC">
                        {/* One-Time Fee */}
                        <View style={{ marginBottom: 14 }}>
                            <Text className="mb-1 font-inter text-xs font-bold text-neutral-700">
                                One-Time License Fee
                            </Text>
                            <View
                                style={{
                                    backgroundColor: colors.primary[50],
                                    borderRadius: 12,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: colors.primary[200],
                                    marginBottom: 8,
                                }}
                            >
                                <Text className="font-inter text-xs text-primary-600">
                                    Calculated: Monthly Total x 24
                                </Text>
                                <Text className="mt-1 font-inter text-lg font-bold text-primary-900">
                                    ₹{calculatedOneTimeFee.toLocaleString('en-IN')}
                                </Text>
                            </View>

                            <ToggleRow
                                label="Override one-time fee"
                                value={overrideOneTime}
                                onToggle={(v) => {
                                    setOverrideOneTime(v);
                                    if (!v) update({ oneTimeLicenseFee: undefined });
                                }}
                            />

                            {overrideOneTime && (
                                <View style={{ marginTop: 8 }}>
                                    <FormInput
                                        label="Custom One-Time Fee (₹)"
                                        placeholder={calculatedOneTimeFee.toString()}
                                        value={activeEntry.oneTimeLicenseFee ?? ''}
                                        onChangeText={(v) => update({ oneTimeLicenseFee: v })}
                                        keyboardType="number-pad"
                                        error={errors?.[`oneTimeLicenseFee_${activeLocationId}`]}
                                    />
                                </View>
                            )}
                        </View>

                        {/* AMC Section */}
                        {endpointType === 'default' ? (
                            <View>
                                <Text className="mb-1 font-inter text-xs font-bold text-neutral-700">
                                    Annual Maintenance Contract (AMC)
                                </Text>
                                <View
                                    style={{
                                        backgroundColor: colors.accent[50],
                                        borderRadius: 12,
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: colors.accent[200],
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text className="font-inter text-xs text-accent-600">
                                        AMC: 18% of one-time fee per year
                                    </Text>
                                    <Text className="mt-1 font-inter text-lg font-bold text-accent-900">
                                        ₹{calculatedAmc.toLocaleString('en-IN')}/year
                                    </Text>
                                </View>

                                <ToggleRow
                                    label="Override AMC amount"
                                    value={overrideAmc}
                                    onToggle={(v) => {
                                        setOverrideAmc(v);
                                        if (!v) update({ amcAmount: undefined });
                                    }}
                                />

                                {overrideAmc && (
                                    <View style={{ marginTop: 8 }}>
                                        <FormInput
                                            label="Custom AMC Amount (₹/year)"
                                            placeholder={calculatedAmc.toString()}
                                            value={activeEntry.amcAmount ?? ''}
                                            onChangeText={(v) => update({ amcAmount: v })}
                                            keyboardType="number-pad"
                                            error={errors?.[`amcAmount_${activeLocationId}`]}
                                        />
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View
                                style={{
                                    backgroundColor: '#EFF6FF',
                                    borderRadius: 12,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                }}
                            >
                                <Text className="font-inter text-xs font-semibold text-info-800">
                                    Self-Hosted Infrastructure
                                </Text>
                                <Text className="mt-1 font-inter text-xs leading-4 text-info-700">
                                    AMC not required — self-hosted infrastructure. The client manages
                                    their own server and maintenance.
                                </Text>
                            </View>
                        )}
                    </SectionCard>
                </Animated.View>
            )}

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
                        Billing Date
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
                    {activeEntry.billingType === 'monthly' && (
                        <Text className="mt-1 font-inter text-sm font-bold text-primary-900">
                            ₹{locationMonthly.toLocaleString('en-IN')}/month
                        </Text>
                    )}
                    {activeEntry.billingType === 'annual' && (
                        <Text className="mt-1 font-inter text-sm font-bold text-primary-900">
                            ₹{locationAnnual.toLocaleString('en-IN')}/year (₹{locationMonthly.toLocaleString('en-IN')}/month x 10 months — save 16.67%)
                        </Text>
                    )}
                    {activeEntry.billingType === 'one_time_amc' && (
                        <View>
                            <Text className="mt-1 font-inter text-sm font-bold text-primary-900">
                                ₹{effectiveOneTimeFee.toLocaleString('en-IN')} one-time
                                {endpointType === 'default'
                                    ? ` + ₹${effectiveAmc.toLocaleString('en-IN')} AMC/year`
                                    : ' (no AMC)'}
                            </Text>
                        </View>
                    )}
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

                        {grandTotals.totalOneTime > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 6,
                                }}
                            >
                                <Text className="font-inter text-xs text-primary-300">
                                    One-time licenses
                                </Text>
                                <Text className="font-inter text-base font-bold text-white">
                                    ₹{grandTotals.totalOneTime.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        )}

                        {grandTotals.totalAmc > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 6,
                                }}
                            >
                                <Text className="font-inter text-xs text-primary-300">
                                    AMC (annual)
                                </Text>
                                <Text className="font-inter text-base font-bold text-white">
                                    ₹{grandTotals.totalAmc.toLocaleString('en-IN')}/yr
                                </Text>
                            </View>
                        )}

                        {grandTotals.totalMonthly === 0 && grandTotals.totalAnnual === 0 && grandTotals.totalOneTime === 0 && (
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
                                Annual billing = 10 months charged, 12 months access. One-time = perpetual license. AMC = 18% of license fee/year. Totals exclude per-user charges which vary monthly.
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}
