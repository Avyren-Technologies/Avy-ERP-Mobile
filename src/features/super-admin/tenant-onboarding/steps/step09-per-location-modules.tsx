/* eslint-disable better-tailwindcss/no-unknown-classes */
// Step 09 — Per-Location Module Selection

import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { SectionCard } from '../atoms';
import { MODULE_CATALOGUE, resolveModuleDependencies } from '../constants';
import { S } from '../shared-styles';
import type { LocationCommercialEntry, PlantBranch, StrategyConfig } from '../types';

export function Step9PerLocationModules({
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
                    billingType: 'monthly',
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
        billingType: 'monthly',
        trialDays: '14',
    };

    const toggleModule = (moduleId: string) => {
        const current = activeEntry.moduleIds;
        const isSelected = current.includes(moduleId);
        let next: string[];
        if (isSelected) {
            next = current.filter((id) => id !== moduleId);
        } else {
            next = [...current, moduleId];
        }
        const { resolved } = resolveModuleDependencies(next);
        onUpdateLocationCommercial(activeLocationId, { moduleIds: resolved });
    };

    const setCustomPrice = (moduleId: string, value: string) => {
        const digitsOnly = value.replace(/[^0-9]/g, '');
        const next = { ...activeEntry.customModulePricing };
        if (digitsOnly === '') {
            delete next[moduleId];
        } else {
            next[moduleId] = parseInt(digitsOnly, 10);
        }
        onUpdateLocationCommercial(activeLocationId, { customModulePricing: next });
    };

    const copyToAll = () => {
        for (const loc of locations) {
            if (loc.id !== activeLocationId) {
                onUpdateLocationCommercial(loc.id, {
                    moduleIds: [...activeEntry.moduleIds],
                    customModulePricing: { ...activeEntry.customModulePricing },
                });
            }
        }
    };

    const activeLoc = locations.find((l) => l.id === activeLocationId);
    const activeModuleIds = activeEntry.moduleIds;

    const { resolved: resolvedModuleIds, auto: autoIds } = React.useMemo(
        () => resolveModuleDependencies(activeModuleIds),
        [activeModuleIds]
    );

    const monthlyTotal = React.useMemo(
        () =>
            resolvedModuleIds.reduce((sum, id) => {
                const mod = MODULE_CATALOGUE.find((m) => m.id === id);
                if (!mod) return sum;
                return sum + (activeEntry.customModulePricing[id] ?? mod.price);
            }, 0),
        [resolvedModuleIds, activeEntry.customModulePricing]
    );

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            {/* Info banner */}
            <View style={[S.infoCard, { marginBottom: 8 }]}>
                <Text className="font-inter text-xs text-primary-700 leading-relaxed">
                    <Text className="font-inter font-bold text-primary-700">
                        Per-location billing:{' '}
                    </Text>
                    Each active location needs at least one module. Subscriptions are independent per
                    location.
                </Text>
            </View>

            {/* Location Tabs */}
            {strategyConfig.multiLocationMode && locations.length > 1 && (
                <View style={{ marginBottom: 8 }}>
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
                                const hasModules = entry && entry.moduleIds.length > 0;
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
                                        {hasModules && (
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

                    {/* Copy to all button */}
                    {activeLoc && (
                        <Pressable
                            onPress={copyToAll}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.neutral[200],
                                alignSelf: 'flex-start',
                                marginTop: 2,
                            }}
                        >
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path
                                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                                    fill={colors.neutral[500]}
                                />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                Copy to all locations
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* Summary bar */}
            <View
                style={{
                    backgroundColor: colors.primary[900],
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                }}
            >
                <Text className="font-inter text-sm font-bold text-white">
                    {resolvedModuleIds.length} module{resolvedModuleIds.length !== 1 ? 's' : ''} selected
                    {autoIds.length > 0 ? ` (incl. ${autoIds.length} auto-dependency)` : ''}
                </Text>
                <Text className="mt-0.5 font-inter text-xs text-primary-200">
                    {activeLoc?.name || 'Location'} — module subscription subtotal
                </Text>
                {/* Pricing hidden — uncomment when pricing is finalized
                <Text className="mt-2 font-inter text-xl font-bold text-white">
                    ₹{monthlyTotal.toLocaleString('en-IN')}/month
                </Text>
                */}
            </View>

            {/* Module Cards */}
            <SectionCard
                title={`${activeLoc?.name || 'Modules'} — Module Catalogue`}
                subtitle="Dependencies are auto-resolved when you select a module"
            >
                {MODULE_CATALOGUE.map((moduleItem) => {
                    const selected = resolvedModuleIds.includes(moduleItem.id);
                    const isAuto =
                        autoIds.includes(moduleItem.id) &&
                        !activeModuleIds.includes(moduleItem.id);
                    const customPrice = activeEntry.customModulePricing[moduleItem.id];

                    return (
                        <View
                            key={moduleItem.id}
                            style={[
                                S.itemCard,
                                {
                                    marginBottom: 10,
                                    borderColor: selected
                                        ? isAuto
                                            ? colors.accent[300]
                                            : colors.primary[400]
                                        : colors.neutral[200],
                                    backgroundColor: selected
                                        ? isAuto
                                            ? colors.accent[50]
                                            : colors.primary[50]
                                        : colors.white,
                                },
                            ]}
                        >
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                <Text className="text-xl">{moduleItem.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                        {moduleItem.name}
                                    </Text>
                                    <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                        {moduleItem.description}
                                    </Text>
                                </View>
                                {isAuto ? (
                                    <View
                                        style={{
                                            borderRadius: 8,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            backgroundColor: colors.accent[100],
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                                            Auto
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {moduleItem.dependencies.length > 0 ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 6,
                                        marginBottom: 10,
                                    }}
                                >
                                    {moduleItem.dependencies.map((depId) => {
                                        const dep = MODULE_CATALOGUE.find((m) => m.id === depId);
                                        if (!dep) return null;
                                        return (
                                            <View
                                                key={depId}
                                                style={{
                                                    borderRadius: 999,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    backgroundColor: colors.neutral[100],
                                                }}
                                            >
                                                <Text className="font-inter text-[10px] text-neutral-600 dark:text-neutral-400">
                                                    {dep.icon} {dep.name}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : null}

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                {/* Pricing hidden — uncomment when pricing is finalized
                                <Text className="font-inter text-sm font-bold text-primary-700">
                                    ₹{(customPrice ?? moduleItem.price).toLocaleString('en-IN')}/mo
                                </Text>
                                */}
                                {isAuto ? (
                                    <View
                                        style={{
                                            borderRadius: 10,
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            backgroundColor: colors.accent[100],
                                        }}
                                    >
                                        <Text className="font-inter text-xs font-bold text-accent-700">
                                            Included
                                        </Text>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={() => toggleModule(moduleItem.id)}
                                        style={{
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 7,
                                            backgroundColor: activeModuleIds.includes(moduleItem.id)
                                                ? colors.danger[50]
                                                : colors.primary[600],
                                        }}
                                    >
                                        <Text
                                            className={`font-inter text-xs font-bold ${activeModuleIds.includes(moduleItem.id) ? 'text-danger-600' : 'text-white'}`}
                                        >
                                            {activeModuleIds.includes(moduleItem.id)
                                                ? 'Remove'
                                                : 'Add'}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>

                            {selected ? (
                                <View
                                    style={{
                                        marginTop: 10,
                                        paddingTop: 10,
                                        borderTopWidth: 1,
                                        borderTopColor: colors.neutral[200],
                                    }}
                                >
                                    <Text className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                        Custom Price Override
                                    </Text>
                                    <View
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    >
                                        <View
                                            style={[
                                                S.fieldInput,
                                                { flex: 1, marginBottom: 0, height: 40, paddingHorizontal: 10 },
                                            ]}
                                        >
                                            <TextInput
                                                placeholder={String(moduleItem.price)}
                                                placeholderTextColor={colors.neutral[400]}
                                                keyboardType="number-pad"
                                                value={
                                                    customPrice === undefined
                                                        ? ''
                                                        : String(customPrice)
                                                }
                                                onChangeText={(v) => setCustomPrice(moduleItem.id, v)}
                                                style={[S.textInput, { fontSize: 13 }]}
                                            />
                                        </View>
                                        {customPrice !== undefined ? (
                                            <Pressable
                                                onPress={() => setCustomPrice(moduleItem.id, '')}
                                            >
                                                <Text className="font-inter text-xs font-bold text-danger-500">
                                                    Reset
                                                </Text>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    );
                })}
            </SectionCard>

            {/* Auto-included dependencies */}
            {autoIds.length > 0 ? (
                <SectionCard title="Auto-Included Dependencies">
                    {autoIds.map((id) => {
                        const dependency = MODULE_CATALOGUE.find((m) => m.id === id);
                        if (!dependency) return null;
                        const requiredBy = MODULE_CATALOGUE.filter(
                            (m) =>
                                activeModuleIds.includes(m.id) && m.dependencies.includes(id)
                        )
                            .map((m) => m.name)
                            .join(', ');
                        return (
                            <View
                                key={id}
                                style={{
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: colors.accent[200],
                                    backgroundColor: colors.accent[50],
                                }}
                            >
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {dependency.icon} {dependency.name}
                                </Text>
                                <Text className="mt-1 font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                    Required by: {requiredBy}
                                </Text>
                            </View>
                        );
                    })}
                </SectionCard>
            ) : null}

            {/* Location subtotal footer */}
            {resolvedModuleIds.length > 0 && (
                <Animated.View entering={FadeIn.duration(200)}>
                    <View
                        style={{
                            backgroundColor: colors.neutral[50],
                            borderRadius: 12,
                            padding: 14,
                            marginTop: 4,
                            borderWidth: 1,
                            borderColor: colors.neutral[100],
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                            {activeLoc?.name || 'Location'} —{' '}
                            {resolvedModuleIds.length} module
                            {resolvedModuleIds.length > 1 ? 's' : ''}
                        </Text>
                        {/* Pricing hidden — uncomment when pricing is finalized
                        <Text className="font-inter text-sm font-bold text-primary-700">
                            ₹{monthlyTotal.toLocaleString('en-IN')}/mo
                        </Text>
                        */}
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}
