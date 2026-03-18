/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
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

import { useBillingSummary, useInvoices, useRevenueChart } from '@/features/super-admin/api/use-dashboard-queries';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

// ============ TYPES ============

interface RevenueKPI {
    label: string;
    value: string;
    change: string;
    positive: boolean;
    iconColor: string;
    iconBg: string;
}

interface InvoiceItem {
    id: string;
    company: string;
    amount: string;
    date: string;
    status: 'paid' | 'pending' | 'overdue';
}

// ============ HELPERS ============

function formatIndianCurrency(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthLabel(monthStr: string): string {
    const [, mm] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(mm, 10) - 1] ?? monthStr;
}

function buildBillingKPIs(summary: any): RevenueKPI[] {
    return [
        { label: 'Total MRR', value: formatIndianCurrency(summary?.mrr ?? 0), change: summary?.mrrChange ?? '', positive: (summary?.mrrChange ?? '+0').startsWith('+'), iconColor: colors.primary[600], iconBg: colors.primary[100] },
        { label: 'Total ARR', value: formatIndianCurrency(summary?.arr ?? 0), change: summary?.arrChange ?? '', positive: (summary?.arrChange ?? '+0').startsWith('+'), iconColor: colors.accent[600], iconBg: colors.accent[100] },
        { label: 'Overdue', value: formatIndianCurrency(summary?.overdue ?? 0), change: summary?.overdueCount ? `${summary.overdueCount} invoices` : '', positive: false, iconColor: colors.danger[600], iconBg: colors.danger[100] },
        { label: 'Pending', value: String(summary?.pendingCount ?? 0), change: summary?.pendingTotal ? formatIndianCurrency(summary.pendingTotal) + ' total' : '', positive: true, iconColor: colors.warning[600], iconBg: colors.warning[100] },
    ];
}

function mapInvoiceStatus(status: string): 'paid' | 'pending' | 'overdue' {
    const s = status?.toLowerCase();
    if (s === 'paid') return 'paid';
    if (s === 'overdue') return 'overdue';
    return 'pending';
}

// ============ COMPONENTS ============

function RevenueChart({ chartData, isLoading }: { chartData: Array<{ month: string; value: number }>; isLoading: boolean }) {
    if (isLoading) {
        return (
            <View style={[styles.chartCard, { alignItems: 'center', justifyContent: 'center', height: 200 }]}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
        );
    }

    const maxRevenue = Math.max(...chartData.map(r => r.value), 1);

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
                {chartData.map((item, index) => {
                    const heightPercent = (item.value / maxRevenue) * 100;
                    const isLast = index === chartData.length - 1;
                    return (
                        <Animated.View
                            key={item.month}
                            entering={FadeIn.duration(400).delay(500 + index * 80)}
                            style={styles.chartBarColumn}
                        >
                            <Text className="mb-1 font-inter text-[9px] font-bold text-neutral-500">
                                {item.value >= 100000 ? `${(item.value / 100000).toFixed(1)}L` : `${item.value}`}
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

    const { data: summaryResponse, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useBillingSummary();
    const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({ page: 1, limit: 6 });
    const { data: chartResponse, isLoading: chartLoading } = useRevenueChart();

    const summary = summaryResponse?.data ?? summaryResponse;
    const revenueKpis = buildBillingKPIs(summary);

    const rawInvoices = invoicesResponse?.data ?? invoicesResponse ?? [];
    const invoices: InvoiceItem[] = Array.isArray(rawInvoices)
        ? rawInvoices.map((inv: any) => ({
            id: inv.invoiceNumber ?? inv.id ?? '',
            company: inv.company?.displayName ?? inv.companyName ?? 'Unknown',
            amount: typeof inv.amount === 'number' ? formatIndianCurrency(inv.amount) : (inv.amount ?? ''),
            date: inv.dueDate ? formatDate(inv.dueDate) : (inv.date ?? ''),
            status: mapInvoiceStatus(inv.status ?? 'pending'),
        }))
        : [];

    const rawChart = chartResponse?.data ?? chartResponse;
    const chartMonths = rawChart?.months ?? [];
    const chartData = Array.isArray(chartMonths)
        ? chartMonths.map((item: any) => ({
            month: getMonthLabel(item.month ?? ''),
            value: item.revenue ?? item.value ?? 0,
        }))
        : [];

    if (summaryLoading && invoicesLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text className="mt-3 font-inter text-sm text-neutral-500">Loading billing...</Text>
            </View>
        );
    }

    if (summaryError) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
                <Text className="font-inter text-base font-semibold text-danger-600">Failed to load billing data</Text>
                <Pressable onPress={() => refetchSummary()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary[500] }}>
                    <Text className="font-inter text-sm font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

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
                    {revenueKpis.map((kpi, index) => (
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
                            {kpi.change ? (
                                <View style={[styles.kpiChange, { backgroundColor: kpi.positive ? colors.success[50] : colors.danger[50] }]}>
                                    <Text className={`font-inter text-[10px] font-bold ${kpi.positive ? 'text-success-600' : 'text-danger-600'}`}>
                                        {kpi.change}
                                    </Text>
                                </View>
                            ) : null}
                        </Animated.View>
                    ))}
                </View>

                {/* Revenue Chart */}
                <View style={styles.sectionPadded}>
                    <RevenueChart chartData={chartData} isLoading={chartLoading} />
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

                        {invoicesLoading ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <ActivityIndicator size="small" color={colors.primary[500]} />
                            </View>
                        ) : invoices.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <Text className="font-inter text-sm text-neutral-400">No invoices found</Text>
                            </View>
                        ) : (
                            <View style={styles.invoiceCard}>
                                {invoices.map((inv, index) => (
                                    <Animated.View key={inv.id} entering={FadeInRight.duration(300).delay(700 + index * 60)}>
                                        <Pressable style={[styles.invoiceRow, index < invoices.length - 1 && styles.invoiceRowBorder]}>
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
                        )}
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
