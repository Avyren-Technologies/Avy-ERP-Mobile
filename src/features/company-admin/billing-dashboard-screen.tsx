/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import {
    useMyCostBreakdown,
    useMyInvoices,
    useMySubscription,
} from '@/features/company-admin/api/use-company-admin-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface SubscriptionInfo {
    planId: string;
    tierLabel: string;
    billingType: string;
    status: string;
    startDate?: string;
    endDate?: string | null;
    trialEndsAt?: string | null;
    tierBasePrice: number;
    tierPerUserPrice: number;
    activeModuleCount: number;
    activeModuleNames: string[];
}

interface CostBreakdownModule {
    moduleId: string;
    moduleName: string;
    cataloguePrice: number;
    customPrice: number | null;
    effectivePrice: number;
}

interface CostBreakdownData {
    tier: { key: string; label: string; basePrice: number; perUserPrice: number };
    modules: CostBreakdownModule[];
    locations: Array<{ locationId: string; locationName: string; monthly: number; annual: number }>;
    totals: { monthly: number; annual: number; locationCount: number; moduleCount: number };
}

interface InvoiceItem {
    id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
}

// ============ HELPERS ============

function formatCurrency(amount: number, currency = 'INR') {
    if (currency === 'INR') {
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

function mapInvoiceStatus(status: string): 'paid' | 'pending' | 'overdue' {
    const s = status?.toLowerCase();
    if (s === 'paid') return 'paid';
    if (s === 'overdue') return 'overdue';
    return 'pending';
}

function mapSubscriptionStatus(status: string): 'active' | 'trial' | 'suspended' | 'expired' | 'pending' {
    const s = status?.toLowerCase();
    if (s === 'active') return 'active';
    if (s === 'trial' || s === 'pilot') return 'trial';
    if (s === 'suspended' || s === 'inactive') return 'suspended';
    if (s === 'expired') return 'expired';
    return 'pending';
}

// ============ COMPONENTS ============

function SubscriptionCard({ sub, isLoading }: { sub: SubscriptionInfo | null; isLoading: boolean }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    if (isLoading) {
        return (
            <View style={styles.sectionCard}>
                <Skeleton
                    isLoading={true}
                    layout={[
                        { key: 't', width: '50%', height: 18, borderRadius: 4, marginBottom: 12 },
                        { key: 'r1', width: '100%', height: 14, borderRadius: 4, marginBottom: 8 },
                        { key: 'r2', width: '80%', height: 14, borderRadius: 4, marginBottom: 8 },
                        { key: 'r3', width: '60%', height: 14, borderRadius: 4 },
                    ]}
                >
                    <View />
                </Skeleton>
            </View>
        );
    }

    if (!sub) return null;

    // Compute next billing from startDate + cycle
    let nextBilling = '--';
    if (sub.startDate) {
        const d = new Date(sub.startDate);
        const bt = sub.billingType?.toUpperCase();
        if (bt === 'MONTHLY') d.setMonth(d.getMonth() + 1);
        else if (bt === 'ANNUAL' || bt === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
        else if (bt === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
        nextBilling = formatDate(d.toISOString());
    }

    const rows = [
        { label: 'Plan', value: sub.planId || '--' },
        { label: 'Tier', value: sub.tierLabel || '--' },
        { label: 'Billing Cycle', value: (sub.billingType || 'Monthly').toLowerCase() },
        { label: 'Active Modules', value: String(sub.activeModuleCount) },
        { label: 'Per User', value: `₹${sub.tierPerUserPrice}/user` },
        { label: 'Next Billing', value: nextBilling },
    ];

    if (sub.trialEndsAt) {
        rows.push({ label: 'Trial Ends', value: formatDate(sub.trialEndsAt) });
    }

    return (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary[50] }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Rect x="1" y="4" width="22" height="16" rx="2" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" />
                        <Path d="M1 10h22" stroke={colors.primary[600]} strokeWidth="1.8" />
                    </Svg>
                </View>
                <Text className="flex-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                    Subscription
                </Text>
                <StatusBadge status={mapSubscriptionStatus(sub.status)} />
            </View>

            <View style={styles.divider} />

            {rows.map((row, i) => (
                <View key={i} style={styles.detailRow}>
                    <Text className="font-inter text-xs text-neutral-400">{row.label}</Text>
                    <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{row.value}</Text>
                </View>
            ))}

            <View style={[styles.detailRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">Base Price</Text>
                <Text className="font-inter text-lg font-bold text-primary-700">
                    {formatCurrency(sub.tierBasePrice)}
                    <Text className="font-inter text-xs text-neutral-400">/{(sub.billingType || 'month').toLowerCase()}</Text>
                </Text>
            </View>
        </Animated.View>
    );
}

function CostBreakdownSection({ data, isLoading }: { data: CostBreakdownData | null; isLoading: boolean }) {
    if (isLoading) {
        return (
            <View style={styles.sectionCard}>
                <Skeleton
                    isLoading={true}
                    layout={[
                        { key: 't', width: '40%', height: 16, borderRadius: 4, marginBottom: 12 },
                        { key: 'r1', width: '100%', height: 14, borderRadius: 4, marginBottom: 8 },
                        { key: 'r2', width: '100%', height: 14, borderRadius: 4, marginBottom: 8 },
                        { key: 'r3', width: '100%', height: 14, borderRadius: 4 },
                    ]}
                >
                    <View />
                </Skeleton>
            </View>
        );
    }

    if (!data || data.modules.length === 0) return null;

    return (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.accent[50] }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
                        <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
                        <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
                        <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
                    </Svg>
                </View>
                <Text className="flex-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                    Cost Breakdown
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Tier info */}
            <View style={styles.detailRow}>
                <Text className="flex-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">Tier ({data.tier.label})</Text>
                <Text className="font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">
                    {formatCurrency(data.tier.basePrice)} + {formatCurrency(data.tier.perUserPrice)}/user
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Module breakdown */}
            {data.modules.map((mod) => (
                <View key={mod.moduleId} style={styles.detailRow}>
                    <Text className="flex-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{mod.moduleName}</Text>
                    <Text className="font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">
                        {formatCurrency(mod.effectivePrice)}/mo
                    </Text>
                </View>
            ))}

            <View style={[styles.detailRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">Monthly Total</Text>
                <Text className="font-inter text-sm font-bold text-primary-700">
                    {formatCurrency(data.totals.monthly)}
                </Text>
            </View>
            {data.totals.annual > 0 && (
                <View style={styles.detailRow}>
                    <Text className="font-inter text-xs text-neutral-400">Annual</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(data.totals.annual)}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

function RecentInvoiceRow({ item }: { item: InvoiceItem }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    return (
        <View style={styles.invoiceRow}>
            <View style={{ flex: 1 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                    {item.invoiceNumber}
                </Text>
                <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
                    {formatDate(item.date)}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text className="font-inter text-sm font-bold text-primary-800">
                    {formatCurrency(item.amount, item.currency)}
                </Text>
                <StatusBadge
                    status={mapInvoiceStatus(item.status)}
                    size="sm"
                />
            </View>
        </View>
    );
}

// ============ MAIN SCREEN ============

export function BillingDashboardScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();

    const subscriptionQuery = useMySubscription();
    const costQuery = useMyCostBreakdown();
    const invoicesQuery = useMyInvoices({ limit: 5 });

    const isRefreshing =
        subscriptionQuery.isRefetching || costQuery.isRefetching || invoicesQuery.isRefetching;

    const handleRefresh = () => {
        subscriptionQuery.refetch();
        costQuery.refetch();
        invoicesQuery.refetch();
    };

    const subscription: SubscriptionInfo | null = React.useMemo(() => {
        const raw = (subscriptionQuery.data as any)?.data ?? subscriptionQuery.data;
        if (!raw) return null;

        const modules: Record<string, boolean> = raw.modules ?? {};
        const activeEntries = Object.entries(modules).filter(([, v]) => v);

        return {
            planId: raw.planId ?? '',
            tierLabel: raw.tierLabel ?? raw.userTier ?? '',
            billingType: raw.billingType ?? '',
            status: raw.status ?? '',
            startDate: raw.startDate,
            endDate: raw.endDate,
            trialEndsAt: raw.trialEndsAt,
            tierBasePrice: raw.tierBasePrice ?? 0,
            tierPerUserPrice: raw.tierPerUserPrice ?? 0,
            activeModuleCount: activeEntries.length,
            activeModuleNames: activeEntries.map(([k]) => k),
        };
    }, [subscriptionQuery.data]);

    const costData: CostBreakdownData | null = React.useMemo(() => {
        const raw = (costQuery.data as any)?.data ?? costQuery.data;
        if (!raw || !raw.modules) return null;
        return raw as CostBreakdownData;
    }, [costQuery.data]);

    const recentInvoices: InvoiceItem[] = React.useMemo(() => {
        const wrapper = (invoicesQuery.data as any)?.data ?? invoicesQuery.data;
        const raw = wrapper?.invoices ?? (Array.isArray(wrapper) ? wrapper : []);
        return raw.slice(0, 5).map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `INV-${inv.id}`,
            date: inv.createdAt ?? '',
            amount: inv.totalAmount ?? inv.amount ?? 0,
            currency: 'INR',
            status: inv.status ?? 'pending',
        }));
    }, [invoicesQuery.data]);

    return (
        <View style={styles.container}>
            <AppTopHeader
                title="Billing"
                subtitle="Subscription & payment overview"
                onMenuPress={toggle}
            />

            {/* ── Content ── */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            >
                <SubscriptionCard
                    sub={subscription}
                    isLoading={subscriptionQuery.isLoading}
                />

                <CostBreakdownSection
                    data={costData}
                    isLoading={costQuery.isLoading}
                />

                {/* ── Recent Invoices ── */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionIcon, { backgroundColor: colors.info[50] }]}>
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path
                                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                    stroke={colors.info[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                />
                                <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.info[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </View>
                        <Text className="flex-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                            Recent Invoices
                        </Text>
                        <Pressable onPress={() => router.push('/company/billing-invoices' as any)}>
                            <Text className="font-inter text-xs font-semibold text-primary-500">View All</Text>
                        </Pressable>
                    </View>

                    <View style={styles.divider} />

                    {invoicesQuery.isLoading ? (
                        <Skeleton
                            isLoading={true}
                            layout={[
                                { key: 'r1', width: '100%', height: 44, borderRadius: 8, marginBottom: 8 },
                                { key: 'r2', width: '100%', height: 44, borderRadius: 8, marginBottom: 8 },
                                { key: 'r3', width: '100%', height: 44, borderRadius: 8 },
                            ]}
                        >
                            <View />
                        </Skeleton>
                    ) : recentInvoices.length === 0 ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Text className="font-inter text-xs text-neutral-400">No invoices yet</Text>
                        </View>
                    ) : (
                        recentInvoices.map((inv) => (
                            <RecentInvoiceRow key={inv.id} item={inv} />
                        ))
                    )}
                </Animated.View>

                {/* ── Quick Links ── */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.quickLinksRow}>
                    <Pressable
                        style={styles.quickLinkBtn}
                        onPress={() => router.push('/company/billing-invoices' as any)}
                    >
                        <LinearGradient
                            colors={[colors.primary[500], colors.primary[700]]}
                            style={styles.quickLinkGradient}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path
                                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                    stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                />
                                <Path d="M14 2v6h6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </LinearGradient>
                        <Text className="mt-1.5 font-inter text-[10px] font-semibold text-primary-900 dark:text-primary-100">Invoices</Text>
                    </Pressable>

                    <Pressable
                        style={styles.quickLinkBtn}
                        onPress={() => router.push('/company/billing-payments' as any)}
                    >
                        <LinearGradient
                            colors={[colors.accent[500], colors.accent[700]]}
                            style={styles.quickLinkGradient}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Rect x="1" y="4" width="22" height="16" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
                                <Path d="M1 10h22" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" />
                            </Svg>
                        </LinearGradient>
                        <Text className="mt-1.5 font-inter text-[10px] font-semibold text-primary-900 dark:text-primary-100">Payments</Text>
                    </Pressable>

                    <Pressable
                        style={styles.quickLinkBtn}
                        onPress={() => router.push('/company/module-catalogue' as any)}
                    >
                        <LinearGradient
                            colors={[colors.success[500], colors.success[700]]}
                            style={styles.quickLinkGradient}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8" fill="none" />
                                <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8" fill="none" />
                                <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8" fill="none" />
                                <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8" fill="none" />
                            </Svg>
                        </LinearGradient>
                        <Text className="mt-1.5 font-inter text-[10px] font-semibold text-primary-900 dark:text-primary-100">Modules</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
        gap: 16,
    },
    sectionCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 16,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        marginVertical: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    invoiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[50],
    },
    quickLinksRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    quickLinkBtn: {
        alignItems: 'center',
        flex: 1,
    },
    quickLinkGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
});
const styles = createStyles(false);
