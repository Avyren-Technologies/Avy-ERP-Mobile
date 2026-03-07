/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { SectionCard } from '../atoms';
import { MODULE_CATALOGUE, resolveModuleDependencies } from '../constants';
import { S } from '../shared-styles';
import type { Step7ModulesForm } from '../types';

export function Step7Modules({
    form,
    setForm,
}: {
    form: Step7ModulesForm;
    setForm: (f: Partial<Step7ModulesForm>) => void;
}) {
    const { resolved, auto } = React.useMemo(
        () => resolveModuleDependencies(form.selectedModuleIds),
        [form.selectedModuleIds]
    );

    const totalMonthly = React.useMemo(
        () =>
            resolved.reduce((sum, id) => {
                const mod = MODULE_CATALOGUE.find((item) => item.id === id);
                if (!mod) return sum;
                return sum + (form.customModulePricing[id] ?? mod.price);
            }, 0),
        [resolved, form.customModulePricing]
    );

    const toggleModule = (id: string) => {
        if (auto.includes(id) && !form.selectedModuleIds.includes(id)) return;
        const next = form.selectedModuleIds.includes(id)
            ? form.selectedModuleIds.filter((item) => item !== id)
            : [...form.selectedModuleIds, id];
        setForm({ selectedModuleIds: next });
    };

    const setCustomPrice = (id: string, value: string) => {
        const digitsOnly = value.replace(/[^0-9]/g, '');
        const next = { ...form.customModulePricing };

        if (digitsOnly === '') {
            delete next[id];
            setForm({ customModulePricing: next });
            return;
        }

        next[id] = parseInt(digitsOnly, 10);
        setForm({ customModulePricing: next });
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    Select tenant modules. Required dependency modules are auto-included based on
                    your selection.
                </Text>
            </View>

            <View
                style={{
                    backgroundColor: colors.primary[900],
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                }}
            >
                <Text className="font-inter text-sm font-bold text-white">
                    {resolved.length} modules selected
                    {auto.length > 0 ? ` (incl. ${auto.length} auto-dependency)` : ''}
                </Text>
                <Text className="mt-0.5 font-inter text-xs text-primary-200">
                    Module subscription subtotal
                </Text>
                <Text className="mt-2 font-inter text-xl font-bold text-white">
                    ₹{totalMonthly.toLocaleString('en-IN')}/month
                </Text>
            </View>

            <SectionCard title="Module Catalogue">
                {MODULE_CATALOGUE.map((moduleItem) => {
                    const selected = resolved.includes(moduleItem.id);
                    const isAuto = auto.includes(moduleItem.id)
                        && !form.selectedModuleIds.includes(moduleItem.id);
                    const customPrice = form.customModulePricing[moduleItem.id];

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
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {moduleItem.name}
                                    </Text>
                                    <Text className="mt-0.5 font-inter text-xs text-neutral-500">
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
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {moduleItem.dependencies.map((depId) => {
                                        const dep = MODULE_CATALOGUE.find((item) => item.id === depId);
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
                                                <Text className="font-inter text-[10px] text-neutral-600">
                                                    {dep.icon} {dep.name}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : null}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text className="font-inter text-sm font-bold text-primary-700">
                                    ₹{(customPrice ?? moduleItem.price).toLocaleString('en-IN')}/mo
                                </Text>
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
                                            backgroundColor: form.selectedModuleIds.includes(moduleItem.id)
                                                ? colors.danger[50]
                                                : colors.primary[600],
                                        }}
                                    >
                                        <Text
                                            className={`font-inter text-xs font-bold ${form.selectedModuleIds.includes(moduleItem.id) ? 'text-danger-600' : 'text-white'}`}
                                        >
                                            {form.selectedModuleIds.includes(moduleItem.id) ? 'Remove' : 'Add'}
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
                                    <Text className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                                        Custom Price Override
                                    </Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <View
                                            style={[
                                                S.fieldInput,
                                                {
                                                    flex: 1,
                                                    marginBottom: 0,
                                                    height: 40,
                                                    paddingHorizontal: 10,
                                                },
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
                                                onChangeText={(value) => setCustomPrice(moduleItem.id, value)}
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

            {auto.length > 0 ? (
                <SectionCard title="Auto-Included Dependencies">
                    {auto.map((id) => {
                        const dependency = MODULE_CATALOGUE.find((item) => item.id === id);
                        if (!dependency) return null;
                        const requiredBy = MODULE_CATALOGUE
                            .filter((item) => form.selectedModuleIds.includes(item.id)
                                && item.dependencies.includes(id))
                            .map((item) => item.name)
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
                                <Text className="font-inter text-sm font-bold text-primary-950">
                                    {dependency.icon} {dependency.name}
                                </Text>
                                <Text className="mt-1 font-inter text-xs text-neutral-600">
                                    Required by: {requiredBy}
                                </Text>
                            </View>
                        );
                    })}
                </SectionCard>
            ) : null}
        </Animated.View>
    );
}
