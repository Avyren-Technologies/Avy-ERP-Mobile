/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect, Line, Polyline, Circle } from 'react-native-svg';

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

// ── Constants ──

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (v: unknown) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

interface ReportCard {
    title: string;
    description: string;
    route: string;
    iconType: 'spreadsheet' | 'bank' | 'building' | 'receipt' | 'creditcard' | 'filetext';
}

const REPORT_CARDS: ReportCard[] = [
    {
        title: 'Salary Register',
        description: 'Complete salary breakdown for all employees',
        route: '/company/hr/payroll-reports',
        iconType: 'spreadsheet',
    },
    {
        title: 'Bank File',
        description: 'Bank transfer file for salary disbursement',
        route: '/company/hr/payroll-reports',
        iconType: 'bank',
    },
    {
        title: 'PF ECR',
        description: 'Provident Fund Electronic Challan cum Return',
        route: '/company/hr/payroll-reports',
        iconType: 'building',
    },
    {
        title: 'ESI Challan',
        description: 'Employee State Insurance contribution challan',
        route: '/company/hr/payroll-reports',
        iconType: 'receipt',
    },
    {
        title: 'PT Challan',
        description: 'Professional Tax payment challan',
        route: '/company/hr/payroll-reports',
        iconType: 'creditcard',
    },
    {
        title: 'Payslips',
        description: 'View and download employee payslips',
        route: '/company/hr/payslips',
        iconType: 'filetext',
    },
];

const STATUTORY_CHECKLIST = [
    { label: 'PF ECR Filing', key: 'pf_ecr' },
    { label: 'ESI Filing', key: 'esi' },
    { label: 'PT Filing', key: 'pt' },
    { label: 'TDS 24Q (Quarterly)', key: 'tds_24q' },
];

// ── Icon Components ──

function ReportIcon({ type, size = 16 }: { type: ReportCard['iconType']; size?: number }) {
    const stroke = colors.primary[600];
    const sw = '1.5';
    switch (type) {
        case 'spreadsheet':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={stroke} strokeWidth={sw} />
                    <Line x1="3" y1="9" x2="21" y2="9" stroke={stroke} strokeWidth={sw} />
                    <Line x1="3" y1="15" x2="21" y2="15" stroke={stroke} strokeWidth={sw} />
                    <Line x1="9" y1="9" x2="9" y2="21" stroke={stroke} strokeWidth={sw} />
                </Svg>
            );
        case 'bank':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M9 22V12h6v10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'building':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 22V2l12 4v16" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M6 12H4a2 2 0 00-2 2v8h4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M18 9h2a2 2 0 012 2v11h-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M10 6h4M10 10h4M10 14h4M10 18h4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'receipt':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Polyline points="14 2 14 8 20 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Line x1="16" y1="13" x2="8" y2="13" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                    <Line x1="16" y1="17" x2="8" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                    <Polyline points="10 9 9 9 8 9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                </Svg>
            );
        case 'creditcard':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Rect x="1" y="4" width="22" height="16" rx="2" stroke={stroke} strokeWidth={sw} />
                    <Line x1="1" y1="10" x2="23" y2="10" stroke={stroke} strokeWidth={sw} />
                </Svg>
            );
        case 'filetext':
        default:
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
    }
}

// ── Component ──

export function Step7PostPayroll({ runDetail }: StepProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const router = useRouter();
    const fmt = useCompanyFormatter();

    return (
        <Animated.View entering={FadeInDown.duration(400)}>
            <View style={s.wizardCard}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <View style={s.headerIcon}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                            <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={colors.accent[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <Rect x="9" y="3" width="6" height="4" rx="1" stroke={colors.accent[600]} strokeWidth="2" />
                            <Path d="M9 12h6M9 16h4" stroke={colors.accent[600]} strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Post-Payroll Activities</Text>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Generate reports, file statutory returns, and review the payroll summary</Text>
                    </View>
                </View>

                {/* Reports Section */}
                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Reports</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {REPORT_CARDS.map((card) => (
                            <Pressable
                                key={card.title}
                                onPress={() => router.push(card.route as any)}
                                style={({ pressed }) => [s.reportCard, pressed && s.reportCardPressed]}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <View style={s.reportIconWrap}>
                                        <ReportIcon type={card.iconType} size={16} />
                                    </View>
                                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                                        <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </View>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{card.title}</Text>
                                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed" numberOfLines={2}>{card.description}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>

                {/* Statutory Filing Checklist */}
                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Statutory Filing Checklist</Text>
                <View style={s.checklistCard}>
                    {STATUTORY_CHECKLIST.map((item, idx) => (
                        <View
                            key={item.key}
                            style={[
                                s.checklistRow,
                                idx < STATUTORY_CHECKLIST.length - 1 && s.checklistRowBorder,
                            ]}
                        >
                            <View style={s.checkBox} />
                            <Text className="flex-1 font-inter text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.label}</Text>
                            <View style={s.pendingBadge}>
                                <Text style={{ color: colors.neutral[500], fontFamily: 'Inter', fontSize: 9, fontWeight: '700' }}>Pending</Text>
                            </View>
                        </View>
                    ))}
                    <Pressable
                        onPress={() => router.push('/company/hr/statutory-filings' as any)}
                        style={s.statutoryLink}
                    >
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                            <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <Polyline points="15 3 21 3 21 9" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <Line x1="10" y1="14" x2="21" y2="3" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                        <Text className="font-inter text-xs font-bold text-primary-600 ml-1">Configure in Statutory Filings</Text>
                    </Pressable>
                </View>

                {/* Payroll Summary */}
                <Text className="font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 mt-5">Payroll Summary</Text>
                <View style={s.summaryCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                            <Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.success[600]} strokeWidth="2" fill="none" />
                        </Svg>
                        <Text className="font-inter text-sm font-bold text-success-700">Payroll Completed</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {[
                            { label: 'Period', value: `${MONTHS[(runDetail?.month ?? 1) - 1]} ${runDetail?.year ?? ''}` },
                            { label: 'Total Employees', value: String(runDetail?.employeeCount ?? 0) },
                            { label: 'Gross Pay', value: formatCurrency(runDetail?.totalGross ?? 0) },
                            { label: 'Net Pay', value: formatCurrency(runDetail?.totalNet ?? runDetail?.totalNetPay ?? 0) },
                            { label: 'Disbursed On', value: runDetail?.disbursedAt ? fmt.date(runDetail.disbursedAt) : '-' },
                        ].map((item) => (
                            <View key={item.label} style={s.summaryItem}>
                                <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{item.label}</Text>
                                <Text className="font-inter text-sm font-extrabold text-success-700 mt-1">{item.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>
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
        headerIcon: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? colors.accent[900] : colors.accent[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
        reportCard: {
            width: 148,
            backgroundColor: isDark ? '#1E1B4B' : colors.white,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
            shadowColor: colors.primary[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
        },
        reportCardPressed: {
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            borderColor: colors.primary[300],
            transform: [{ scale: 0.97 }],
        },
        reportIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
        checklistCard: {
            backgroundColor: isDark ? '#1E1B4B' : colors.white,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
        },
        checklistRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
        },
        checklistRowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
        checkBox: {
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
            flexShrink: 0,
        },
        pendingBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            borderWidth: 1,
            backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100],
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        },
        statutoryLink: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
        summaryCard: {
            backgroundColor: colors.success[50],
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.success[100],
        },
        summaryItem: {
            minWidth: '45%' as any,
            flex: 1,
            alignItems: 'center',
        },
    });
