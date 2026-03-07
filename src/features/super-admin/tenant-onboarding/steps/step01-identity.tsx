/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { ChipSelector, FormInput, RadioOption, SectionCard } from '../atoms';
import { BUSINESS_TYPES, COMPANY_STATUSES, INDUSTRIES } from '../constants';
import { S } from '../shared-styles';
import type { Step1Form } from '../types';

export function Step1Identity({
    form,
    setForm,
}: {
    form: Step1Form;
    setForm: (f: Partial<Step1Form>) => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Company Logo">
                <Pressable style={S.logoUpload}>
                    <View style={S.logoPlaceholder}>
                        <Svg width={28} height={28} viewBox="0 0 24 24">
                            <Path
                                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                                stroke={colors.primary[400]}
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                    <View style={S.logoUploadText}>
                        <Text className="font-inter text-sm font-semibold text-primary-600">
                            Upload Company Logo
                        </Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-400">
                            PNG, JPG or SVG · Max 2MB · 200×200px Recommended
                        </Text>
                    </View>
                </Pressable>
            </SectionCard>

            <SectionCard title="Core Identity">
                <FormInput
                    label="Display Name"
                    placeholder="e.g. Apex Manufacturing"
                    value={form.displayName}
                    onChangeText={(v) => setForm({ displayName: v })}
                    required
                />
                <FormInput
                    label="Legal / Registered Name"
                    placeholder="Full name as per incorporation documents"
                    value={form.legalName}
                    onChangeText={(v) => setForm({ legalName: v })}
                    required
                />
                <ChipSelector
                    label="Business Type"
                    options={BUSINESS_TYPES}
                    selected={form.businessType}
                    onSelect={(v) => setForm({ businessType: v })}
                    required
                />
                <ChipSelector
                    label="Nature of Industry"
                    options={INDUSTRIES}
                    selected={form.industry}
                    onSelect={(v) => setForm({ industry: v })}
                    required
                />
                <FormInput
                    label="Company Code"
                    placeholder="e.g. ABC-IN-001 (auto-generated)"
                    value={form.companyCode}
                    onChangeText={(v) => setForm({ companyCode: v })}
                    required
                    autoCapitalize="none"
                    hint="Auto-generated based on company name. Override if needed."
                />
                <FormInput
                    label="Short Name"
                    placeholder="Abbreviated name for headers"
                    value={form.shortName}
                    onChangeText={(v) => setForm({ shortName: v })}
                />
                <FormInput
                    label="Date of Incorporation"
                    placeholder="DD/MM/YYYY"
                    value={form.incorporationDate}
                    onChangeText={(v) => setForm({ incorporationDate: v })}
                    required
                />
                <FormInput
                    label="Number of Employees (approx.)"
                    placeholder="e.g. 250"
                    value={form.employees}
                    onChangeText={(v) => setForm({ employees: v })}
                    keyboardType="number-pad"
                    hint="Used for PF, ESI, PT compliance threshold checks."
                />
                <FormInput
                    label="CIN Number"
                    placeholder="U72900KA2019PTC312847"
                    value={form.cin}
                    onChangeText={(v) => setForm({ cin: v })}
                    autoCapitalize="none"
                />
                <FormInput
                    label="Official Website"
                    placeholder="https://company.com"
                    value={form.website}
                    onChangeText={(v) => setForm({ website: v })}
                    keyboardType="url"
                    autoCapitalize="none"
                />
                <FormInput
                    label="Corporate Email Domain"
                    placeholder="company.com"
                    value={form.emailDomain}
                    onChangeText={(v) => setForm({ emailDomain: v })}
                    required
                    keyboardType="email-address"
                    autoCapitalize="none"
                    hint="Used for auto-provisioning employee email IDs."
                />
            </SectionCard>

            <SectionCard title="Company Status">
                {COMPANY_STATUSES.map((s) => (
                    <RadioOption
                        key={s}
                        label={s}
                        selected={form.status === s}
                        onSelect={() => setForm({ status: s })}
                        badge={s === 'Draft' ? 'DEFAULT' : undefined}
                    />
                ))}
            </SectionCard>
        </Animated.View>
    );
}
