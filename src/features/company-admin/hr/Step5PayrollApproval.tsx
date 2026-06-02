/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useIsDark } from '@/hooks/use-is-dark';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useApprovalSummary } from '@/features/company-admin/api/use-payroll-run-queries';

// ── Types ──

interface StepProps {
    runId: string;
    runDetail: any;
    completedStep: number;
    onStepAction: () => void;
    anyMutating: boolean;
}

// ── Helpers ──

const fmtCurrency = (v: unknown) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

/** Compact format for summary cards — uses L/Cr for large values */
const formatCompact = (v: unknown) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
};

/** Format a comparison row value — currency or plain number */
const formatComparisonValue = (v: number, key: string) => {
    const numKeys = ['employees'];
    if (numKeys.includes(key)) return v.toLocaleString('en-IN');
    return fmtCurrency(v);
};

/** Format audit user — resolve CUIDs to fallback label */
const formatAuditUser = (id: string | null) => {
    if (!id) return null;
    if (id.length > 20 && /^c[a-z0-9]+$/.test(id)) return 'Admin';
    return id;
};

// ── Component ──

export function Step5PayrollApproval({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const dateFmt = useCompanyFormatter();
    const { data: summaryResp, isLoading } = useApprovalSummary(runId);
    const summary = (summaryResp as any)?.data;

    const exec = summary?.summary;
    const comparison = summary?.comparison;
    const departments: any[] = summary?.departmentBreakdown ?? [];
    const highVariance: any[] = summary?.highVarianceEmployees ?? [];
    const audit = summary?.audit;

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Approve Payroll</Text>

                {isLoading ? (
                    <View><SkeletonCard /><SkeletonCard /></View>
                ) : (
                    <>
                        {/* Executive summary cards (2x3 grid) */}
                        {exec && (
                            <View style={s.gridRow}>
                                {[
                                    { label: 'Employees', value: String(exec.employees ?? runDetail?.employeeCount ?? 0) },
                                    { label: 'Gross Pay', value: formatCompact(exec.grossPay ?? runDetail?.totalGross ?? 0) },
                                    { label: 'Deductions', value: formatCompact(exec.totalDeductions ?? runDetail?.totalDeductions ?? 0) },
                                    { label: 'Statutory', value: formatCompact(exec.totalStatutory ?? 0) },
                                    { label: 'Net Pay', value: formatCompact(exec.netPay ?? runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0) },
                                    { label: 'Employer Cost', value: formatCompact(exec.employerCost ?? exec.totalCostToCompany ?? 0) },
                                ].map((item) => (
                                    <View key={item.label} style={s.kpiCard}>
                                        <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</Text>
                                        <Text className="font-inter text-lg font-extrabold text-primary-950 dark:text-white mt-1">{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Fallback summary */}
                        {!exec && (
                            <View style={s.fallbackCard}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Final Summary</Text>
                                {[
                                    { label: 'Employees', value: String(runDetail?.employeeCount ?? 0) },
                                    { label: 'Total Gross Pay', value: fmtCurrency(runDetail?.totalGross ?? 0) },
                                    { label: 'Total Deductions', value: fmtCurrency(runDetail?.totalDeductions ?? 0) },
                                    { label: 'Total Net Pay', value: fmtCurrency(runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0) },
                                ].map((item) => (
                                    <View key={item.label} style={s.summaryRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">{item.label}</Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Month-on-Month Comparison */}
                        {comparison && (
                            <View style={[s.sectionCard, { marginTop: 12 }]}>
                                <View style={s.sectionHeader}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Month-on-Month Comparison</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View>
                                        {/* Header row */}
                                        <View style={[s.compRow, { backgroundColor: isDark ? colors.neutral[900] : colors.neutral[50] }]}>
                                            <Text style={[s.compCell, s.compCellFirst]} className="font-inter text-[10px] font-bold text-neutral-500 uppercase">Metric</Text>
                                            <Text style={s.compCell} className="font-inter text-[10px] font-bold text-neutral-500 uppercase text-right">Previous</Text>
                                            <Text style={s.compCell} className="font-inter text-[10px] font-bold text-neutral-500 uppercase text-right">Current</Text>
                                            <Text style={s.compCell} className="font-inter text-[10px] font-bold text-neutral-500 uppercase text-right">Variance</Text>
                                            <Text style={[s.compCell, { width: 60 }]} className="font-inter text-[10px] font-bold text-neutral-500 uppercase text-right">%</Text>
                                        </View>
                                        {Object.keys(comparison.current ?? {}).map((key) => {
                                            const prev = Number(comparison.previous?.[key] ?? 0);
                                            const curr = Number(comparison.current?.[key] ?? 0);
                                            const variance = Number(comparison.variance?.[key] ?? (curr - prev));
                                            const pct = Number(comparison.variancePercent?.[key] ?? (prev ? ((variance / prev) * 100) : 0));
                                            const isUp = variance > 0;
                                            return (
                                                <View key={key} style={s.compRow}>
                                                    <Text style={[s.compCell, s.compCellFirst]} className="font-inter text-xs font-bold text-primary-950 dark:text-white capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </Text>
                                                    <Text style={s.compCell} className="font-inter text-xs text-neutral-600 dark:text-neutral-400 text-right">{formatComparisonValue(prev, key)}</Text>
                                                    <Text style={s.compCell} className="font-inter text-xs font-bold text-primary-950 dark:text-white text-right">{formatComparisonValue(curr, key)}</Text>
                                                    <Text style={[s.compCell, { color: isUp ? colors.danger[600] : colors.success[600] }]} className="font-inter text-xs font-bold text-right">
                                                        {isUp ? '+' : ''}{key === 'employees' ? Math.abs(variance).toLocaleString('en-IN') : fmtCurrency(Math.abs(variance))}
                                                    </Text>
                                                    <Text
                                                        style={[s.compCell, { width: 60, color: Math.abs(pct) > 10 ? colors.danger[600] : colors.neutral[600] }]}
                                                        className="font-inter text-xs font-bold text-right"
                                                    >
                                                        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Department Breakdown */}
                        {departments.length > 0 && (
                            <View style={{ marginTop: 12, gap: 8 }}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Department Breakdown</Text>
                                {departments.map((dept: any) => (
                                    <View key={dept.department} style={s.deptCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{dept.department}</Text>
                                            <Text className="font-inter text-[10px] text-neutral-500">{dept.employees} emp</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[9px] text-neutral-400">Gross</Text>
                                                <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{fmtCurrency(dept.grossPay)}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[9px] text-neutral-400">Net</Text>
                                                <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{fmtCurrency(dept.netPay)}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[9px] text-neutral-400">Cost</Text>
                                                <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{fmtCurrency(dept.employerCost)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* High Variance Employees */}
                        {highVariance.length > 0 && (
                            <View style={s.warningBanner}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </Svg>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text className="font-inter text-sm font-bold text-warning-700">High Variance Employees ({highVariance.length})</Text>
                                    <Text className="font-inter text-[10px] text-warning-600 mt-1 mb-2">Employees whose net pay changed by more than 10% compared to the previous month.</Text>
                                    {highVariance.map((emp: any, i: number) => {
                                        const v = Number(emp.variance ?? 0);
                                        return (
                                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                            <Text className="font-inter text-xs text-warning-700 font-bold">
                                                {emp.name} <Text className="font-inter text-warning-500 font-inter">{emp.employeeCode}</Text>
                                            </Text>
                                            <Text className="font-inter text-xs font-bold" style={{ color: v > 0 ? colors.danger[600] : colors.success[600] }}>
                                                {v > 0 ? '+' : ''}{v.toFixed(2)}%
                                            </Text>
                                        </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Audit Trail */}
                        {audit && (
                            <View style={[s.auditCard, { marginTop: 12 }]}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Audit Trail</Text>
                                {audit.createdAt && (
                                    <View style={s.auditRow}>
                                        <Text className="font-inter text-xs text-neutral-500">Created</Text>
                                        <Text className="font-inter text-xs font-semibold text-neutral-700 dark:text-neutral-300">{dateFmt.dateTime(audit.createdAt)}</Text>
                                    </View>
                                )}
                                {audit.lockedBy && (
                                    <View style={s.auditRow}>
                                        <Text className="font-inter text-xs text-neutral-500">Attendance Locked</Text>
                                        <Text className="font-inter text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                            {formatAuditUser(audit.lockedBy)}{audit.lockedAt ? ` \u00B7 ${dateFmt.dateTime(audit.lockedAt)}` : ''}
                                        </Text>
                                    </View>
                                )}
                                {audit.computedBy && (
                                    <View style={s.auditRow}>
                                        <Text className="font-inter text-xs text-neutral-500">Computed</Text>
                                        <Text className="font-inter text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                            {formatAuditUser(audit.computedBy)}{audit.computedAt ? ` \u00B7 ${dateFmt.dateTime(audit.computedAt)}` : ''}
                                        </Text>
                                    </View>
                                )}
                                {audit.approvedBy && (
                                    <View style={s.auditRow}>
                                        <Text className="font-inter text-xs text-neutral-500">Approved</Text>
                                        <Text className="font-inter text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                            {formatAuditUser(audit.approvedBy)}{audit.approvedAt ? ` \u00B7 ${dateFmt.dateTime(audit.approvedAt)}` : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Exception count note */}
                        {summary?.exceptionCount > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </Svg>
                                <Text className="font-inter text-xs text-warning-600 font-semibold">
                                    {summary.exceptionCount} exception(s) were reviewed and accepted during this run
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Approve button */}
                {completedStep === 4 && (
                    <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.approveBtn, anyMutating && { opacity: 0.5 }]}>
                        {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                            <Text className="font-inter text-sm font-bold text-white">Approve Payroll Run</Text>
                        )}
                    </Pressable>
                )}

                {completedStep > 4 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text className="font-inter text-sm font-bold text-success-600">Payroll approved</Text>
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
            minWidth: '30%' as any,
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        fallbackCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        summaryRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 6,
        },
        sectionCard: {
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
            overflow: 'hidden',
        },
        sectionHeader: {
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: isDark ? colors.neutral[900] : colors.neutral[50],
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        compRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
        compCell: {
            width: 90,
            paddingHorizontal: 10,
            paddingVertical: 8,
        },
        compCellFirst: {
            width: 110,
        },
        deptCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        warningBanner: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.warning[50],
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
            borderWidth: 1,
            borderColor: colors.warning[200],
        },
        auditCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        auditRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 4,
        },
        approveBtn: {
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
    });
