import type { Step2Form } from '../types';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormInput, FormSelect, SectionCard } from '../atoms';
import { INDIAN_STATES } from '../constants';
import { S } from '../shared-styles';

export function Step2Statutory({
    form,
    setForm,
    errors,
}: {
    form: Step2Form;
    setForm: (f: Partial<Step2Form>) => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.warningBanner}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                        stroke={colors.warning[700]}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
                <Text className="ml-2 flex-1 font-inter text-xs leading-4 text-warning-700">
                    Critical: These identifiers drive payroll, TDS, and statutory filings. Ensure 100% accuracy.
                </Text>
            </View>

            <SectionCard title="India Statutory Identifiers">
                <FormInput
                    label="PAN"
                    placeholder="AARCA5678F"
                    value={form.pan}
                    onChangeText={(v) => setForm({ pan: v.toUpperCase() })}
                    required
                    autoCapitalize="none"
                    hint="Required for TDS, Form 16, Form 24Q"
                    error={errors?.pan}
                />
                <FormInput
                    label="TAN"
                    placeholder="BLRA98765T"
                    value={form.tan}
                    onChangeText={(v) => setForm({ tan: v.toUpperCase() })}
                    required
                    autoCapitalize="none"
                    hint="Required for TDS deduction and quarterly returns"
                    error={errors?.tan}
                />
                <FormInput
                    label="GSTIN"
                    placeholder="29AARCA5678F1Z3"
                    value={form.gstin}
                    onChangeText={(v) => setForm({ gstin: v.toUpperCase() })}
                    autoCapitalize="none"
                    hint="Required if GST-registered. State code auto-prefixed."
                    error={errors?.gstin}
                />
                <FormInput
                    label="PF Registration No."
                    placeholder="KA/BLR/0112345/000/0001"
                    value={form.pfRegNo}
                    onChangeText={(v) => setForm({ pfRegNo: v })}
                    required
                    autoCapitalize="none"
                    hint="Required for PF deductions and ECR uploads"
                    error={errors?.pfRegNo}
                />
                <FormInput
                    label="ESI Employer Code"
                    placeholder="53-00-123456-000-0001"
                    value={form.esiCode}
                    onChangeText={(v) => setForm({ esiCode: v })}
                    autoCapitalize="none"
                    hint="Required if any employee earns ≤ ₹21,000/month gross"
                    error={errors?.esiCode}
                />
                <FormInput
                    label="PT Registration No."
                    placeholder="State-specific format"
                    value={form.ptReg}
                    onChangeText={(v) => setForm({ ptReg: v })}
                    autoCapitalize="none"
                    hint="Required in PT-applicable states (Karnataka, Maharashtra, etc.)"
                />
                <FormInput
                    label="LWFR Number"
                    placeholder="Labour Welfare Fund Registration"
                    value={form.lwfrNo}
                    onChangeText={(v) => setForm({ lwfrNo: v })}
                    autoCapitalize="none"
                />
                <FormSelect
                    label="ROC Filing State"
                    options={INDIAN_STATES}
                    selected={form.rocState}
                    onSelect={(v) => setForm({ rocState: v })}
                    required
                    error={errors?.rocState}
                    direction="up"
                />
            </SectionCard>
        </Animated.View>
    );
}
