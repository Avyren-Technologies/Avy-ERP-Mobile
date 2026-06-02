/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useIsDark } from '@/hooks/use-is-dark';
import { usePayrollEntries } from '@/features/company-admin/api/use-payroll-run-queries';

// ── Types ──

interface StepProps {
    runId: string;
    runDetail: any;
    completedStep: number;
    onStepAction: () => void;
    anyMutating: boolean;
}

// ── Helpers ──

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    critical: { label: 'Critical', bg: colors.danger[50], text: colors.danger[700], border: colors.danger[200] },
    warning: { label: 'Warning', bg: colors.warning[50], text: colors.warning[700], border: colors.warning[200] },
    info: { label: 'Info', bg: colors.info[50], text: colors.info[700], border: colors.info[200] },
};

function categorizeException(exc: any): string {
    const type = (exc.exceptionType ?? exc.category ?? exc.type ?? '').toLowerCase();
    if (type.includes('critical') || type.includes('missing') || type.includes('error')) return 'critical';
    if (type.includes('warning') || type.includes('mismatch') || type.includes('late')) return 'warning';
    return 'info';
}

// ── Component ──

export function Step2PayrollExceptions({ runId, runDetail, completedStep, onStepAction, anyMutating }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const entriesQuery = usePayrollEntries(runId);

    const entries: any[] = (entriesQuery.data as any)?.data ?? [];
    const exceptions = entries.filter((e: any) => e.isException);

    // Pull from runDetail.exceptions if available
    const allExceptions: any[] = runDetail?.exceptions?.length ? runDetail.exceptions : exceptions;

    // Group by category
    const grouped: Record<string, any[]> = { critical: [], warning: [], info: [] };
    allExceptions.forEach((exc: any) => {
        const cat = categorizeException(exc);
        grouped[cat].push(exc);
    });

    const counts = {
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length,
    };

    if (entriesQuery.isLoading) {
        return (
            <Animated.View entering={FadeInDown.duration(400)}>
                <View style={s.wizardCard}>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Review Exceptions</Text>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Review Exceptions</Text>

                {allExceptions.length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Svg width={32} height={32} viewBox="0 0 24 24">
                            <Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.success[500]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="mt-2 font-inter text-sm text-success-700 font-semibold">No exceptions found</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">All attendance records are clean</Text>
                    </View>
                ) : (
                    <>
                        {/* Count badges row */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {counts.critical > 0 && (
                                <View style={[s.countBadge, { backgroundColor: colors.danger[100], borderColor: colors.danger[200] }]}>
                                    <Text style={{ color: colors.danger[700], fontFamily: 'Inter', fontSize: 11, fontWeight: '700' }}>{counts.critical} Critical</Text>
                                </View>
                            )}
                            {counts.warning > 0 && (
                                <View style={[s.countBadge, { backgroundColor: colors.warning[100], borderColor: colors.warning[200] }]}>
                                    <Text style={{ color: colors.warning[700], fontFamily: 'Inter', fontSize: 11, fontWeight: '700' }}>{counts.warning} Warning</Text>
                                </View>
                            )}
                            {counts.info > 0 && (
                                <View style={[s.countBadge, { backgroundColor: colors.info[100], borderColor: colors.info[200] }]}>
                                    <Text style={{ color: colors.info[700], fontFamily: 'Inter', fontSize: 11, fontWeight: '700' }}>{counts.info} Info</Text>
                                </View>
                            )}
                            <Text className="font-inter text-xs text-neutral-500 font-semibold self-center">
                                {allExceptions.length} total exception(s)
                            </Text>
                        </View>

                        {/* Exception cards by category */}
                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {(['critical', 'warning', 'info'] as const).map((cat) => {
                                const items = grouped[cat];
                                if (items.length === 0) return null;
                                const config = CATEGORY_CONFIG[cat];
                                return (
                                    <View key={cat} style={{ marginBottom: 12 }}>
                                        <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">{config.label}</Text>
                                        {items.map((exc: any, idx: number) => (
                                            <View key={exc.id ?? idx} style={[s.exceptionCard, { borderLeftColor: config.border, borderLeftWidth: 3, backgroundColor: config.bg }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                    <View style={[s.typeBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                                                        <Text style={{ color: config.text, fontFamily: 'Inter', fontSize: 9, fontWeight: '700' }}>
                                                            {exc.exceptionType ?? exc.type ?? 'Exception'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={3}>
                                                    {exc.description ?? exc.note ?? `${exc.daysAffected ?? 1} day(s) affected`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {/* Mark All Reviewed button */}
                {completedStep === 1 && (() => {
                    const unresolvedCritical = grouped.critical.filter((e: any) => !e.resolved).length;
                    return (
                        <View>
                            <Pressable onPress={onStepAction} disabled={anyMutating} style={[s.primaryBtn, anyMutating && { opacity: 0.5 }]}>
                                {anyMutating ? <ActivityIndicator size="small" color={colors.white} /> : (
                                    <Text className="font-inter text-sm font-bold text-white">Mark All Reviewed</Text>
                                )}
                            </Pressable>
                            {unresolvedCritical > 0 && (
                                <View style={s.criticalWarning}>
                                    <Svg width={12} height={12} viewBox="0 0 24 24">
                                        <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M12 9v4M12 17h.01" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                    <Text className="font-inter text-xs font-semibold text-danger-600 ml-1">
                                        {unresolvedCritical} critical exception{unresolvedCritical > 1 ? 's' : ''} unresolved
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })()}

                {completedStep > 1 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M9 12l2 2 4-4" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text className="font-inter text-sm font-bold text-success-600">Exceptions reviewed</Text>
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
        countBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1,
        },
        exceptionCard: {
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: colors.neutral[200],
        },
        avatarCircle: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
        typeBadge: {
            alignSelf: 'flex-start',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            borderWidth: 1,
            marginTop: 2,
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
        criticalWarning: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            paddingHorizontal: 4,
        },
    });
