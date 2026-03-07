/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { SectionCard } from '../atoms';
import { S } from '../shared-styles';

const CHECKLIST_PHASES = [
    {
        phase: 'Company Identity',
        items: ['Display name & legal name', 'Business type & industry', 'Company code & CIN', 'Corporate email domain'],
    },
    {
        phase: 'Compliance & Statutory',
        items: ['PAN & TAN entered', 'GSTIN configured', 'PF & ESI details', 'ROC filing state'],
    },
    {
        phase: 'Address',
        items: ['Registered address complete', 'Corporate/HQ address confirmed'],
    },
    {
        phase: 'Fiscal & Calendar',
        items: ['FY period selected', 'Payroll cycle configured', 'Timezone & working days set'],
    },
    {
        phase: 'Preferences',
        items: ['Currency & language set', 'Compliance toggles reviewed', 'Integrations configured'],
    },
    {
        phase: 'Locations',
        items: ['Locations/Plants added', 'Key contacts added', 'Geo-fencing configured (if applicable)'],
    },
    {
        phase: 'Time & Config',
        items: ['Shifts created', 'No Series defined', 'IOT Reasons populated', 'Controls reviewed'],
    },
    {
        phase: 'User Access',
        items: ['Company Admin created', 'Role assignments confirmed'],
    },
];

export function Step13Activation({
    companyName,
    currentStatus,
    onStatusChange,
}: {
    companyName: string;
    currentStatus: string;
    onStatusChange: (s: string) => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <LinearGradient
                colors={[colors.primary[600], colors.accent[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.activationHero}
            >
                <View style={S.activationCircle1} />
                <View style={S.activationCircle2} />
                <Svg width={48} height={48} viewBox="0 0 24 24">
                    <Path
                        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
                <Text className="mt-4 text-center font-inter text-xl font-bold text-white">
                    Ready to Activate
                </Text>
                <Text className="mt-1 text-center font-inter text-sm text-primary-200">
                    {companyName || 'New Company'}
                </Text>
            </LinearGradient>

            <SectionCard title="Set Company Status">
                <Text className="mb-3 font-inter text-xs text-neutral-500">
                    Select the activation status for this tenant:
                </Text>
                {[
                    {
                        status: 'Draft',
                        subtitle: 'Setup is still in progress — not yet live',
                        color: colors.warning[500],
                    },
                    {
                        status: 'Pilot',
                        subtitle: 'Company is in trial/UAT phase with limited users',
                        color: colors.info[500],
                    },
                    {
                        status: 'Active',
                        subtitle: 'Company is live — full production use',
                        color: colors.success[500],
                    },
                ].map((opt) => (
                    <Pressable
                        key={opt.status}
                        onPress={() => onStatusChange(opt.status)}
                        style={[
                            S.statusOption,
                            currentStatus === opt.status && S.statusOptionActive,
                        ]}
                    >
                        <View style={[S.statusDot, { backgroundColor: opt.color }]} />
                        <View style={{ flex: 1 }}>
                            <Text
                                className={`font-inter text-sm font-bold ${currentStatus === opt.status ? 'text-primary-700' : 'text-primary-950'}`}
                            >
                                {opt.status}
                            </Text>
                            <Text className="font-inter text-xs text-neutral-500">
                                {opt.subtitle}
                            </Text>
                        </View>
                        <View
                            style={[
                                S.radioCircle,
                                currentStatus === opt.status && S.radioCircleActive,
                            ]}
                        >
                            {currentStatus === opt.status && <View style={S.radioInner} />}
                        </View>
                    </Pressable>
                ))}
            </SectionCard>

            <SectionCard title="Provisioning Checklist">
                <Text className="mb-3 font-inter text-xs text-neutral-500">
                    Verify all phases are complete before going live:
                </Text>
                {CHECKLIST_PHASES.map((phase) => (
                    <View key={phase.phase} style={S.checklistPhase}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                            {phase.phase}
                        </Text>
                        {phase.items.map((item) => (
                            <View key={item} style={S.checklistItem}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path
                                        d="M9 11l3 3L22 4"
                                        stroke={colors.success[500]}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="ml-2 font-inter text-xs text-neutral-600">
                                    {item}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </SectionCard>
        </Animated.View>
    );
}
