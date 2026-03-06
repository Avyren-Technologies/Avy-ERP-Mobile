/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { StatusBadge } from '@/components/ui/status-badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

// ============ MOCK DATA ============

interface RevenueKPI {
    label: string;
    value: string;
    change: string;
    positive: boolean;
    iconColor: string;
    iconBg: string;
}

const REVENUE_KPIS: RevenueKPI[] = [
    { label: 'Total MRR', value: '₹18.4L', change: '+12.3%', positive: true, iconColor: colors.primary[600], iconBg: colors.primary[100] },
    { label: 'Total ARR', value: '₹2.2Cr', change: '+8.1%', positive: true, iconColor: colors.accent[600], iconBg: colors.accent[100] },
    { label: 'Overdue', value: '₹3.6L', change: '+2 invoices', positive: false, iconColor: colors.danger[600], iconBg: colors.danger[100] },
    { label: 'Pending', value: '12', change: '₹5.1L total', positive: true, iconColor: colors.warning[600], iconBg: colors.warning[100] },
];

interface InvoiceItem {
    id: string;
    company: string;
    amount: string;
    date: string;
    status: 'paid' | 'pending' | 'overdue';
}

const RECENT_INVOICES: InvoiceItem[] = [
    { id: 'INV-2026-148', company: 'Apex Manufacturing', amount: '₹1,84,500', date: 'Mar 1, 2026', status: 'paid' },
    { id: 'INV-2026-147', company: 'Steel Dynamics', amount: '₹3,42,000', date: 'Mar 1, 2026', status: 'paid' },
    { id: 'INV-2026-146', company: 'Rathi Engineering', amount: '₹2,15,000', date: 'Feb 28, 2026', status: 'pending' },
    { id: 'INV-2026-145', company: 'Indo Metals Corp', amount: '₹98,500', date: 'Feb 15, 2026', status: 'overdue' },
    { id: 'INV-2026-144', company: 'Sahara Industries', amount: '₹45,000', date: 'Feb 10, 2026', status: 'paid' },
    { id: 'INV-2026-143', company: 'Precision Machining', amount: '₹1,22,000', date: 'Feb 1, 2026', status: 'overdue' },
];

// Revenue chart (simplified bar chart using Views)
const MONTHLY_REVENUE = [
    { month: 'Oct', value: 12.5 },
    { month: 'Nov', value: 14.2 },
    { month: 'Dec', value: 13.8 },
    { month: 'Jan', value: 15.6 },
    { month: 'Feb', value: 17.1 },
    { month: 'Mar', value: 18.4 },
];

const MAX_REVENUE = Math.max(...MONTHLY_REVENUE.map(r => r.value));

// ============ COMPONENTS ============

function RevenueChart() {
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.chartCard}>
            <View style={styles.chartHeader}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Revenue Trend
                </Text>
                <View style={styles.chartPeriod}>
                    <Text className="font-inter text-[10px] font-bold text-primary-600">Last 6 Months</Text>
                </View>
            </View>
            <View style={styles.chartBars}>
                {MONTHLY_REVENUE.map((item, index) => {
                    const heightPercent = (item.value / MAX_REVENUE) * 100;
                    const isLast = index === MONTHLY_REVENUE.length - 1;
                    return (
                        <Animated.View
                            key={item.month}
                            entering={FadeIn.duration(400).delay(500 + index * 80)}
                            style={styles.chartBarColumn}
                        >
                            <Text className="mb-1 font-inter text-[9px] font-bold text-neutral-500">
                                {item.value}L
                            </Text>
                            <View style={styles.chartBarBg}>
                                {isLast ? (
                                    <LinearGradient
                                        colors={[colors.primary[500], colors.accent[500]]}
                                        style={[styles.chartBarFill, { height: `${heightPercent}%` }]}
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.chartBarFill,
                                            {
                                                height: `${heightPercent}%`,
                                                backgroundColor: colors.primary[200],
                                            },
                                        ]}
                                    />
                                )}
                            </View>
                            <Text className="mt-1 font-inter text-[10px] font-medium text-neutral-500">
                                {item.month}
                            </Text>
                        </Animated.View>
                    );
                })}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function BillingOverviewScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                bounces={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Billing</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Revenue & invoice management</Text>
                </Animated.View>

                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                    {REVENUE_KPIS.map((kpi, index) => (
                        <Animated.View
                            key={kpi.label}
                            entering={FadeInUp.duration(350).delay(100 + index * 80)}
                            style={styles.kpiCard}
                        >
                            <View style={[styles.kpiIcon, { backgroundColor: kpi.iconBg }]}>
                                <Svg width={18} height={18} viewBox="0 0 24 24">
                                    <Path
                                        d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                                        stroke={kpi.iconColor}
                                        strokeWidth="1.8"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </Svg>
                            </View>
                            <Text className="mt-2 font-inter text-xl font-bold text-primary-950">
                                {kpi.value}
                            </Text>
                            <Text className="font-inter text-[10px] font-medium text-neutral-500">
                                {kpi.label}
                            </Text>
                            <View style={[styles.kpiChange, { backgroundColor: kpi.positive ? colors.success[50] : colors.danger[50] }]}>
                                <Text className={`font-inter text-[10px] font-bold ${kpi.positive ? 'text-success-600' : 'text-danger-600'}`}>
                                    {kpi.change}
                                </Text>
                            </View>
                        </Animated.View>
                    ))}
                </View>

                {/* Revenue Chart */}
                <View style={styles.sectionPadded}>
                    <RevenueChart />
                </View>

                {/* Recent Invoices */}
                <View style={styles.sectionPadded}>
                    <Animated.View entering={FadeInUp.duration(400).delay(600)}>
                        <View style={styles.sectionHeaderRow}>
                            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                                Recent Invoices
                            </Text>
                            <Pressable style={styles.seeAllBtn}>
                                <Text className="font-inter text-sm font-semibold text-primary-500">See All</Text>
                            </Pressable>
                        </View>

                        <View style={styles.invoiceCard}>
                            {RECENT_INVOICES.map((inv, index) => (
                                <Animated.View key={inv.id} entering={FadeInRight.duration(300).delay(700 + index * 60)}>
                                    <Pressable style={[styles.invoiceRow, index < RECENT_INVOICES.length - 1 && styles.invoiceRowBorder]}>
                                        <View style={styles.invoiceLeft}>
                                            <Text className="font-inter text-sm font-bold text-primary-950">
                                                {inv.company}
                                            </Text>
                                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">
                                                {inv.id} • {inv.date}
                                            </Text>
                                        </View>
                                        <View style={styles.invoiceRight}>
                                            <Text className="font-inter text-sm font-bold text-primary-950">
                                                {inv.amount}
                                            </Text>
                                            <StatusBadge status={inv.status} size="sm" />
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 4,
    },
    // KPI
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        marginTop: 16,
        gap: 12,
    },
    kpiCard: {
        width: CARD_W,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 14,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    kpiIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiChange: {
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    // Chart
    sectionPadded: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    chartCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 18,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartPeriod: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
    },
    chartBarColumn: {
        flex: 1,
        alignItems: 'center',
    },
    chartBarBg: {
        width: 28,
        height: 100,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    chartBarFill: {
        width: '100%',
        borderRadius: 8,
    },
    // Invoices
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAllBtn: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    invoiceCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingVertical: 4,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    invoiceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    invoiceRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    invoiceLeft: {
        flex: 1,
        marginRight: 12,
    },
    invoiceRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
});
