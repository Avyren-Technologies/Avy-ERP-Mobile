/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

// ── Types ──

interface StepProps {
    runId: string;
    runDetail: any;
    completedStep: number;
    onStepAction: () => void;
    anyMutating: boolean;
}

// ── Helpers ──

const fmt = (v: unknown) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

// ── Component ──

export function Step6Disbursement({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const router = useRouter();
    const dateFmt = useCompanyFormatter();
    const isDisbursed = completedStep > 5;

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Disburse & Generate Payslips</Text>

                {!isDisbursed ? (
                    <>
                        {/* Pre-disburse: confirmation with totals */}
                        <View style={s.confirmCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text className="font-inter text-sm font-bold text-success-700">Total Disbursement</Text>
                                <Text className="font-inter text-2xl font-extrabold text-success-700">{fmt(runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {[
                                    { label: 'Employees', value: String(runDetail?.employeeCount ?? 0) },
                                    { label: 'Gross Pay', value: fmt(runDetail?.totalGross ?? 0) },
                                    { label: 'Deductions', value: fmt(runDetail?.totalDeductions ?? 0) },
                                ].map((item) => (
                                    <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                                        <Text className="font-inter text-[10px] text-success-600 font-semibold uppercase tracking-wider">{item.label}</Text>
                                        <Text className="font-inter text-sm font-bold text-success-700">{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {completedStep === 5 && (
                            <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.disburseBtn, anyMutating && { opacity: 0.5 }]}>
                                {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                                    <Text className="font-inter text-sm font-bold text-white">Disburse & Generate Payslips</Text>
                                )}
                            </Pressable>
                        )}
                    </>
                ) : (
                    <>
                        {/* Post-disburse: success */}
                        <View style={s.successCard}>
                            <View style={s.successIcon}>
                                <Svg width={28} height={28} viewBox="0 0 24 24">
                                    <Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.success[600]} strokeWidth="2" fill="none" />
                                </Svg>
                            </View>
                            <Text className="font-inter text-base font-bold text-success-700">Payroll Disbursed Successfully</Text>
                            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">Payslips have been generated for all employees.</Text>
                        </View>

                        {/* Summary cards */}
                        <View style={s.gridRow}>
                            {[
                                { label: 'Employees Paid', value: String(runDetail?.employeeCount ?? 0) },
                                { label: 'Net Disbursed', value: fmt(runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0) },
                                { label: 'Disbursed On', value: runDetail?.disbursedAt ? dateFmt.date(runDetail.disbursedAt) : '-' },
                                { label: 'Status', value: 'Completed' },
                            ].map((item) => (
                                <View key={item.label} style={s.kpiCard}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</Text>
                                    <Text className="font-inter text-lg font-extrabold text-primary-950 dark:text-white mt-1">{item.value}</Text>
                                </View>
                            ))}
                        </View>

                        {/* View Payslips button */}
                        <Pressable onPress={() => router.push('/company/hr/payslips' as any)} style={s.outlineBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.primary[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-sm font-bold text-primary-600 ml-2">View Payslips</Text>
                        </Pressable>

                        {/* Completed badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-sm font-bold text-success-600">Payroll disbursed and payslips generated</Text>
                        </View>
                    </>
                )}
            </View>
        </Animated.View>
    );
}

// ── Styles ──

const createStyles = (isDark: boolean) =>
    StyleSheet.create({
        wizardCard: {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: colors.primary[900],
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
        },
        confirmCard: {
            backgroundColor: colors.success[50],
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.success[100],
        },
        successCard: {
            backgroundColor: colors.success[50],
            borderRadius: 14,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.success[100],
            marginBottom: 12,
        },
        successIcon: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.success[100],
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
        },
        gridRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        kpiCard: {
            flex: 1,
            minWidth: '45%' as any,
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
            alignItems: 'center',
        },
        disburseBtn: {
            height: 48,
            borderRadius: 14,
            backgroundColor: colors.success[600],
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
            shadowColor: colors.success[500],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
        },
        outlineBtn: {
            flexDirection: 'row',
            height: 44,
            borderRadius: 14,
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
            borderWidth: 1.5,
            borderColor: colors.primary[200],
        },
    });
