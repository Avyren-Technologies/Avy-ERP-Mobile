/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useIsDark } from '@/hooks/use-is-dark';
import { usePayrollAttendanceSummary } from '@/features/company-admin/api/use-payroll-run-queries';

// ── Types ──

interface StepProps {
    runId: string;
    runDetail: any;
    completedStep: number;
    onStepAction: () => void;
    anyMutating: boolean;
}

// ── Icons (inline SVG) ──

function CheckIcon() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function WarningIcon() {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </Svg>
    );
}

// ── Component ──

export function Step1AttendanceValidation({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const { data: summaryResp, isLoading } = usePayrollAttendanceSummary(runId);
    const summary = (summaryResp as any)?.data;

    if (isLoading) {
        return (
            <Animated.View entering={FadeInDown.duration(400)}>
                <View style={s.wizardCard}>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Lock Attendance</Text>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </Animated.View>
        );
    }

    // Use summary data if available, fallback to runDetail
    const headcount = summary?.headcount;
    const attendance = summary?.attendance;
    const alerts = summary?.alerts;

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Lock Attendance</Text>

                {/* Row 1: Headcount KPIs (2x2 grid) */}
                <View style={s.gridRow}>
                    {[
                        { label: 'Total Employees', value: headcount?.totalActive ?? runDetail?.employeeCount ?? 0, color: colors.primary[600] },
                        { label: 'With Salary', value: headcount?.withSalary ?? 0, color: colors.success[600] },
                        { label: 'Working Days', value: summary?.workingDays ?? 0, color: colors.info[600] },
                        { label: 'New Joiners', value: headcount?.newJoiners?.length ?? 0, color: colors.accent[600] },
                    ].map((item) => (
                        <View key={item.label} style={s.kpiCard}>
                            <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</Text>
                            <Text className="font-inter text-2xl font-extrabold text-primary-950 dark:text-white mt-1">
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Row 2: Attendance breakdown (per-employee averages) */}
                {attendance && (() => {
                    const totalActive = headcount?.totalActive ?? runDetail?.employeeCount ?? 1;
                    const present = attendance.present ?? 0;
                    const absent = attendance.absent ?? 0;
                    const lop = attendance.lop ?? 0;
                    const onLeave = attendance.onLeave ?? 0;
                    const late = attendance.late ?? 0;
                    return (
                    <View style={[s.gridRow, { marginTop: 10 }]}>
                        {[
                            { label: 'Present Days (Avg)', value: Math.round(present / totalActive), subtitle: `${present} total records`, color: colors.success[600] },
                            { label: 'Absent / LOP (Avg)', value: `${Math.round(absent / totalActive)} / ${Math.round(lop / totalActive)}`, subtitle: `${absent} absent, ${lop} LOP records`, color: colors.danger[600] },
                            { label: 'Leave Days (Avg)', value: Math.round(onLeave / totalActive), subtitle: `${onLeave} total records`, color: colors.warning[600] },
                            { label: 'Late Arrivals (Avg)', value: Math.round(late / totalActive), subtitle: `${late} total records`, color: colors.warning[500] },
                        ].map((item) => (
                            <View key={item.label} style={s.kpiCard}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</Text>
                                <Text className="font-inter text-2xl font-extrabold mt-1" style={{ color: item.color }}>
                                    {item.value}
                                </Text>
                                <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">{item.subtitle}</Text>
                            </View>
                        ))}
                    </View>
                    );
                })()}

                {/* Alert cards */}
                {(() => {
                    const alertItems = [
                        { key: 'employeesWithNoAttendance', label: 'Missing Attendance', count: attendance?.employeesWithNoAttendance },
                        { key: 'unapprovedLeaves', label: 'Unapproved Leaves', count: alerts?.unapprovedLeaves },
                        { key: 'unapprovedOvertime', label: 'Unapproved Overtime', count: alerts?.unapprovedOvertime },
                        { key: 'missingPunchOut', label: 'Missing Punch-Out', count: alerts?.missingPunchOut },
                    ].filter((a) => Number(a.count) > 0);
                    return alertItems.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Alerts</Text>
                        {alertItems.map((alert) => (
                                <View key={alert.key} style={s.alertCard}>
                                    <WarningIcon />
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <Text className="font-inter text-sm font-bold text-warning-700">{alert.label}</Text>
                                        <Text className="font-inter text-xs text-warning-600 mt-0.5">{alert.count} employee(s) affected</Text>
                                    </View>
                                </View>
                            ))}
                    </View>
                ) : null;
                })()}

                {/* Lock button */}
                {completedStep === 0 && (
                    <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.primaryBtn, anyMutating && { opacity: 0.5 }]}>
                        {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                            <Text className="font-inter text-sm font-bold text-white">Lock Attendance</Text>
                        )}
                    </Pressable>
                )}

                {/* Completed badge */}
                {completedStep > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <CheckIcon />
                        <Text className="font-inter text-sm font-bold text-success-600">Attendance locked</Text>
                    </View>
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
            padding: 14,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        alertCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.warning[50],
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.warning[200],
        },
        primaryBtn: {
            height: 48,
            borderRadius: 14,
            backgroundColor: colors.primary[600],
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
            shadowColor: colors.primary[500],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
        },
    });
