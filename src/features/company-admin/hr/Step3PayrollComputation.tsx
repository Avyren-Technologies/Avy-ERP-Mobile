/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useIsDark } from '@/hooks/use-is-dark';
import { useComputeSummary, usePayrollEntries } from '@/features/company-admin/api/use-payroll-run-queries';
import { useResetToCompute } from '@/features/company-admin/api/use-payroll-run-mutations';

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

export function Step3PayrollComputation({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const isComputed = completedStep >= 3;

    const { data: summaryResp, isLoading: summaryLoading } = useComputeSummary(runId);
    const { data: entriesResp, isLoading: entriesLoading } = usePayrollEntries(runId);
    const resetMutation = useResetToCompute();

    const summary = (summaryResp as any)?.data;
    const entries: any[] = (entriesResp as any)?.data ?? [];

    const [empSearch, setEmpSearch] = React.useState('');
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filteredEntries = entries.filter((e: any) => {
        if (!empSearch) return true;
        const q = empSearch.toLowerCase();
        const fullName = [e.employee?.firstName, e.employee?.lastName].filter(Boolean).join(' ');
        return (
            fullName.toLowerCase().includes(q) ||
            (e.employee?.employeeId ?? '').toLowerCase().includes(q)
        );
    });

    // Reset page when search changes
    React.useEffect(() => setPage(1), [empSearch]);

    const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
    const paginatedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Compute Salaries</Text>

                {!isComputed ? (
                    /* Pre-compute */
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <Svg width={40} height={40} viewBox="0 0 24 24">
                            <Path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </Svg>
                        <Text className="mt-2 font-inter text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            Click below to compute salaries for all employees.
                        </Text>
                        <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.primaryBtn, { alignSelf: 'stretch', marginTop: 16 }, anyMutating && { opacity: 0.5 }]}>
                            {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                                <Text className="font-inter text-sm font-bold text-white">Compute Salaries</Text>
                            )}
                        </Pressable>
                    </View>
                ) : summaryLoading ? (
                    <View><SkeletonCard /><SkeletonCard /></View>
                ) : (
                    <>
                        {/* Summary cards (horizontal scroll) */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {[
                                    { label: 'Employees', value: String(summary?.employeesProcessed ?? runDetail?.employeeCount ?? 0) },
                                    { label: 'Gross', value: fmt(summary?.totalGrossEarnings ?? runDetail?.totalGross ?? 0) },
                                    { label: 'Deductions', value: fmt(summary?.totalDeductions ?? runDetail?.totalDeductions ?? 0) },
                                    { label: 'Net Pay', value: fmt(summary?.totalNetPay ?? runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0) },
                                    { label: 'Employer Cost', value: fmt(summary?.totalEmployerCost ?? 0) },
                                ].map((item) => (
                                    <View key={item.label} style={s.summaryChip}>
                                        <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</Text>
                                        <Text className="font-inter text-lg font-extrabold text-primary-950 dark:text-white mt-1">{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Payroll inputs section */}
                        {summary?.inputs && (
                            <View style={s.sectionCard}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Payroll Inputs</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                    {[
                                        { label: 'Claims', value: summary.inputs.expenseClaims ?? 0 },
                                        { label: 'Arrears', value: summary.inputs.arrearEntries ?? 0 },
                                        { label: 'OT', value: summary.inputs.overtimeRequests ?? 0 },
                                        { label: 'Holds', value: summary.inputs.salaryHolds ?? 0 },
                                        { label: 'Loans', value: summary.inputs.loanDeductions ?? 0 },
                                    ].map((item) => (
                                        <View key={item.label} style={{ alignItems: 'center', minWidth: 50, flex: 1 }}>
                                            <Text className="font-inter text-[10px] text-neutral-400 font-semibold">{item.label}</Text>
                                            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{item.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Earnings breakdown */}
                        {summary?.earningsBreakdown && Object.keys(summary.earningsBreakdown).length > 0 && (
                            <View style={[s.sectionCard, { marginTop: 10, borderColor: colors.success[200] }]}>
                                <View style={[s.sectionHeader, { backgroundColor: colors.success[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Earnings Breakdown</Text>
                                </View>
                                {Object.entries(summary.earningsBreakdown).map(([component, amount]) => (
                                    <View key={component} style={s.breakdownRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400 flex-1">{component.replace(/_/g, ' ')}</Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Deductions breakdown */}
                        {summary?.deductionsBreakdown && Object.keys(summary.deductionsBreakdown).length > 0 && (
                            <View style={[s.sectionCard, { marginTop: 10, borderColor: colors.warning[200] }]}>
                                <View style={[s.sectionHeader, { backgroundColor: colors.warning[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Deductions Breakdown</Text>
                                </View>
                                {Object.entries(summary.deductionsBreakdown).map(([component, amount]) => (
                                    <View key={component} style={s.breakdownRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400 flex-1">{component.replace(/_/g, ' ')}</Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Compute exceptions */}
                        {summary?.computeExceptions?.length > 0 && (
                            <View style={s.warningBanner}>
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </Svg>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text className="font-inter text-sm font-bold text-warning-700">Computation Exceptions ({summary.computeExceptions.length})</Text>
                                    {summary.computeExceptions.map((exc: any, i: number) => (
                                        <View key={i} style={{ marginTop: 4 }}>
                                            <Text className="font-inter text-xs text-warning-600">
                                                <Text className="font-bold">{exc.employeeName ?? exc.name ?? exc.employeeId}</Text>
                                                {(exc.department || exc.designation) ? (
                                                    <Text className="font-inter text-warning-500"> ({[exc.department, exc.designation].filter(Boolean).join(' - ')})</Text>
                                                ) : null}
                                                {(exc.exceptionNote ?? exc.note) ? `: ${exc.exceptionNote ?? exc.note}` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Employee salary list */}
                        {!entriesLoading && entries.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Employee Salaries</Text>
                                </View>
                                <View style={s.searchBox}>
                                    <Svg width={14} height={14} viewBox="0 0 24 24">
                                        <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                                    </Svg>
                                    <TextInput
                                        placeholder="Search employees..."
                                        value={empSearch}
                                        onChangeText={setEmpSearch}
                                        style={s.searchInput}
                                        placeholderTextColor={colors.neutral[400]}
                                    />
                                </View>
                                {paginatedEntries.map((entry: any) => (
                                    <Pressable key={entry.id} onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                                        <View style={s.employeeCard}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{[entry.employee?.firstName, entry.employee?.lastName].filter(Boolean).join(' ') || 'Employee'}</Text>
                                                    {entry.employee?.employeeId && <Text className="font-inter text-[10px] text-neutral-400">{entry.employee.employeeId}</Text>}
                                                    {entry.employee?.department?.name && (
                                                        <Text className="font-inter text-[10px] text-neutral-400">{entry.employee.department.name}{entry.employee?.designation?.name ? ` - ${entry.employee.designation.name}` : ''}</Text>
                                                    )}
                                                </View>
                                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                                    <Path d={expandedId === entry.id ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </View>
                                            <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text className="font-inter text-[10px] text-neutral-500">Gross</Text>
                                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(entry.grossEarnings ?? entry.gross ?? 0)}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text className="font-inter text-[10px] text-neutral-500">Deductions</Text>
                                                    <Text className="font-inter text-sm font-bold text-danger-600">{fmt(entry.totalDeductions ?? entry.deductions ?? 0)}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text className="font-inter text-[10px] text-neutral-500">Net</Text>
                                                    <Text className="font-inter text-sm font-bold text-success-700">{fmt(entry.netPay ?? entry.net ?? 0)}</Text>
                                                </View>
                                            </View>

                                            {/* Expandable detail */}
                                            {expandedId === entry.id && (
                                                <View style={s.expandedDetail}>
                                                    {entry.components?.earnings && Object.keys(entry.components.earnings).length > 0 && (
                                                        <View style={{ marginBottom: 8 }}>
                                                            <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Earnings</Text>
                                                            {Object.entries(entry.components.earnings).map(([k, v]) => (
                                                                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                                                                    <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{k.replace(/_/g, ' ')}</Text>
                                                                    <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{fmt(v)}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                    {entry.components?.deductions && Object.keys(entry.components.deductions).length > 0 && (
                                                        <View>
                                                            <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Deductions</Text>
                                                            {Object.entries(entry.components.deductions).map(([k, v]) => (
                                                                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                                                                    <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{k.replace(/_/g, ' ')}</Text>
                                                                    <Text className="font-inter text-xs font-bold text-danger-600">{fmt(v)}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>
                                ))}
                                {totalPages > 1 && (
                                    <View style={s.paginationRow}>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            Page {page} of {totalPages} ({filteredEntries.length} employees)
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <Pressable
                                                onPress={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page <= 1}
                                                style={[s.pageBtn, page <= 1 && { opacity: 0.3 }]}
                                            >
                                                <Text className="font-inter text-xs font-bold text-neutral-600 dark:text-neutral-400">Previous</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page >= totalPages}
                                                style={[s.pageBtn, page >= totalPages && { opacity: 0.3 }]}
                                            >
                                                <Text className="font-inter text-xs font-bold text-neutral-600 dark:text-neutral-400">Next</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Re-compute button (danger style) */}
                        {completedStep >= 3 && completedStep < 5 && (
                            <Pressable
                                onPress={() => resetMutation.mutate(runId)}
                                disabled={resetMutation.isPending || anyMutating}
                                style={[s.dangerBtn, (resetMutation.isPending || anyMutating) && { opacity: 0.5 }]}
                            >
                                {resetMutation.isPending ? <ActivityIndicator size="small" color={colors.danger[600]} /> : (
                                    <Text className="font-inter text-xs font-bold text-danger-700">Re-compute Salaries</Text>
                                )}
                            </Pressable>
                        )}

                        {completedStep > 2 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text className="font-inter text-sm font-bold text-success-600">Salaries computed</Text>
                            </View>
                        )}
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
        summaryChip: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 14,
            minWidth: 130,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
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
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        breakdownRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
        warningBanner: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.warning[50],
            borderRadius: 12,
            padding: 12,
            marginTop: 10,
            borderWidth: 1,
            borderColor: colors.warning[200],
        },
        searchBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
            gap: 8,
        },
        searchInput: {
            flex: 1,
            fontSize: 13,
            fontFamily: 'Inter',
            color: isDark ? colors.white : colors.primary[950],
        },
        employeeCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        expandedDetail: {
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200],
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
        dangerBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.danger[50],
            borderWidth: 1,
            borderColor: colors.danger[200],
            marginTop: 12,
        },
        paginationRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.neutral[800] : colors.neutral[200],
            marginTop: 4,
        },
        pageBtn: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            backgroundColor: isDark ? colors.neutral[800] : colors.neutral[50],
        },
    });
