/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useIsDark } from '@/hooks/use-is-dark';
import { useStatutorySummary } from '@/features/company-admin/api/use-payroll-run-queries';

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

export function Step4StatutoryCompliance({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const isComputed = completedStep >= 4;
    const { data: summaryResp, isLoading } = useStatutorySummary(runId);
    const summary = (summaryResp as any)?.data;
    const [empSearch, setEmpSearch] = React.useState('');

    const empContrib = summary?.employeeContributions;
    const empTotal = empContrib
        ? Number(empContrib.pfEmployee ?? 0) + Number(empContrib.esiEmployee ?? 0) + Number(empContrib.ptTotal ?? 0) + Number(empContrib.tdsTotal ?? 0) + Number(empContrib.lwfEmployee ?? 0) + Number(empContrib.vpfTotal ?? 0)
        : 0;

    const erContrib = summary?.employerContributions;
    const erTotal = erContrib
        ? Number(erContrib.pfEmployer ?? 0) + Number(erContrib.esiEmployer ?? 0) + Number(erContrib.lwfEmployer ?? 0) + Number(erContrib.gratuityProvision ?? 0) + Number(erContrib.bonusProvision ?? 0)
        : 0;

    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const employees: any[] = summary?.employeeStatutory ?? [];
    const filtered = employees.filter((e: any) => {
        if (!empSearch) return true;
        const q = empSearch.toLowerCase();
        return (e.name ?? '').toLowerCase().includes(q) || (e.department ?? '').toLowerCase().includes(q);
    });

    // Reset page when search changes
    React.useEffect(() => setPage(1), [empSearch]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginatedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Statutory Deductions</Text>

                {!isComputed ? (
                    /* Pre-compute */
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <Svg width={40} height={40} viewBox="0 0 24 24">
                            <Path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </Svg>
                        <Text className="mt-2 font-inter text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            Click below to compute statutory deductions for all employees.
                        </Text>
                        <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.primaryBtn, { alignSelf: 'stretch', marginTop: 16 }, anyMutating && { opacity: 0.5 }]}>
                            {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                                <Text className="font-inter text-sm font-bold text-white">Compute Statutory</Text>
                            )}
                        </Pressable>
                    </View>
                ) : isLoading ? (
                    <View><SkeletonCard /><SkeletonCard /></View>
                ) : (
                    <>
                        {/* Employee Deductions card (amber themed) */}
                        {empContrib && (
                            <View style={[s.contribCard, { borderColor: colors.warning[200] }]}>
                                <View style={[s.contribHeader, { backgroundColor: colors.warning[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Employee Deductions</Text>
                                </View>
                                {[
                                    { label: 'PF (Employee)', value: empContrib.pfEmployee },
                                    { label: 'ESI (Employee)', value: empContrib.esiEmployee },
                                    { label: 'Professional Tax', value: empContrib.ptTotal },
                                    { label: 'TDS', value: empContrib.tdsTotal },
                                    { label: 'LWF (Employee)', value: empContrib.lwfEmployee },
                                    { label: 'VPF', value: empContrib.vpfTotal },
                                ].map((item) => (
                                    <View key={item.label} style={s.contribRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400 flex-1">{item.label}</Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(item.value)}</Text>
                                    </View>
                                ))}
                                <View style={[s.contribRow, { backgroundColor: colors.warning[100] }]}>
                                    <Text className="font-inter text-sm font-bold" style={{ color: colors.warning[800], flex: 1 }}>Total</Text>
                                    <Text className="font-inter text-sm font-extrabold" style={{ color: colors.warning[800] }}>{fmt(empTotal)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Employer Contributions card (blue themed) */}
                        {erContrib && (
                            <View style={[s.contribCard, { borderColor: colors.info[200], marginTop: 12 }]}>
                                <View style={[s.contribHeader, { backgroundColor: colors.info[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Employer Contributions</Text>
                                </View>
                                {[
                                    { label: 'PF (Employer)', value: erContrib.pfEmployer },
                                    { label: 'ESI (Employer)', value: erContrib.esiEmployer },
                                    { label: 'LWF (Employer)', value: erContrib.lwfEmployer },
                                    { label: 'Gratuity Provision', value: erContrib.gratuityProvision },
                                    { label: 'Bonus Provision', value: erContrib.bonusProvision },
                                ].map((item) => (
                                    <View key={item.label} style={s.contribRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400 flex-1">{item.label}</Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(item.value)}</Text>
                                    </View>
                                ))}
                                <View style={[s.contribRow, { backgroundColor: colors.info[100] }]}>
                                    <Text className="font-inter text-sm font-bold" style={{ color: colors.info[800], flex: 1 }}>Total</Text>
                                    <Text className="font-inter text-sm font-extrabold" style={{ color: colors.info[800] }}>{fmt(erTotal)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Eligibility badges */}
                        {summary?.eligibility && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                {[
                                    { label: 'PF Eligible', value: summary.eligibility.pfEligible },
                                    { label: 'ESI Eligible', value: summary.eligibility.esiEligible },
                                    { label: 'PT Applicable', value: summary.eligibility.ptApplicable },
                                    { label: 'TDS Applicable', value: summary.eligibility.tdsApplicable },
                                ].map((item) => (
                                    <View key={item.label} style={s.eligibilityBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                                            {item.label}: {item.value ?? 0}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Per-employee statutory list */}
                        {employees.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Per-Employee Statutory</Text>
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
                                {paginatedFiltered.map((emp: any) => (
                                    <View key={emp.employeeId} style={s.empCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{emp.name}</Text>
                                            <Text className="font-inter text-[10px] text-neutral-500">{emp.department ?? '-'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {[
                                                { label: 'PF', value: fmt(emp.pfEmployee) },
                                                { label: 'ESI', value: fmt(emp.esiEmployee) },
                                                { label: 'PT', value: fmt(emp.pt) },
                                                { label: 'TDS', value: fmt(emp.tds) },
                                            ].map((item) => (
                                                <View key={item.label} style={{ flex: 1, minWidth: '20%' as any }}>
                                                    <Text className="font-inter text-[9px] text-neutral-400">{item.label}</Text>
                                                    <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{item.value}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], paddingTop: 4 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text className="font-inter text-[10px] font-bold text-neutral-500">Total</Text>
                                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt(emp.total)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                                {totalPages > 1 && (
                                    <View style={s.paginationRow}>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            Page {page} of {totalPages} ({filtered.length} employees)
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

                        {completedStep > 3 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text className="font-inter text-sm font-bold text-success-600">Statutory deductions computed</Text>
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
        contribCard: {
            borderRadius: 14,
            borderWidth: 1,
            overflow: 'hidden',
        },
        contribHeader: {
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        contribRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
        eligibilityBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100],
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
        empCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderRadius: 14,
            padding: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
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
