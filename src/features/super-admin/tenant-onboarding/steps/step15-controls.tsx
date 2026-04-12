/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';

import { SectionCard, ToggleRow } from '../atoms';
import { S } from '../shared-styles';
import type { Step11Form } from '../types';

export function Step15Controls({
    form,
    setForm,
}: {
    form: Step11Form;
    setForm: (f: Partial<Step11Form>) => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">
                    System controls are always company-level — they apply to all plants and locations
                    regardless of multi-location configuration.
                </Text>
            </View>

            <SectionCard title="NC Reason Assignment">
                <ToggleRow
                    label="Enable Edit Mode"
                    subtitle="Allows operators to edit or delete existing Non-Conformance (NC) entries in the NC Reason Assignment screen"
                    value={form.ncEditMode}
                    onToggle={(v) => setForm({ ncEditMode: v })}
                />
            </SectionCard>

            <SectionCard title="Load & Unload Assignment">
                <ToggleRow
                    label="Load / Unload Tracking"
                    subtitle="When enabled, Load & Unload time is tracked and assigned to a category"
                    value={form.loadUnload}
                    onToggle={(v) => setForm({ loadUnload: v })}
                />
                <ToggleRow
                    label="Cycle Time Capture"
                    subtitle="When enabled, cycle time data is captured and included in production analytics"
                    value={form.cycleTime}
                    onToggle={(v) => setForm({ cycleTime: v })}
                />
            </SectionCard>

            <SectionCard title="Payroll & Attendance">
                <ToggleRow
                    label="Payroll Lock Control"
                    subtitle="Prevent payroll modifications after lock date"
                    value={form.payrollLock}
                    onToggle={(v) => setForm({ payrollLock: v })}
                />
                <ToggleRow
                    label="Leave Carry Forward"
                    subtitle="Enable automatic carry forward at year end"
                    value={form.leaveCarryForward}
                    onToggle={(v) => setForm({ leaveCarryForward: v })}
                />
                <ToggleRow
                    label="Overtime Approval"
                    subtitle="Require manager approval before overtime is paid"
                    value={form.overtimeApproval}
                    onToggle={(v) => setForm({ overtimeApproval: v })}
                />
            </SectionCard>

            <SectionCard title="Security">
                <ToggleRow
                    label="Multi-Factor Authentication (MFA)"
                    subtitle="Require OTP / Authenticator app for login"
                    value={form.mfa}
                    onToggle={(v) => setForm({ mfa: v })}
                />
            </SectionCard>
        </Animated.View>
    );
}
