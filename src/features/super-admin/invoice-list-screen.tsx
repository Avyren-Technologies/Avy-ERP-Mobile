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
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { useInvoiceList } from '@/features/super-admin/api/use-invoice-queries';
import type { Invoice, InvoiceStatus, InvoiceType } from '@/lib/api/invoice';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

// ============ CONSTANTS ============

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'PAID', label: 'Paid' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_FILTERS = [
    { key: 'all', label: 'All Types' },
    { key: 'SUBSCRIPTION', label: 'Subscription' },
    { key: 'ONE_TIME_LICENSE', label: 'One-Time' },
    { key: 'AMC', label: 'AMC' },
    { key: 'PRORATED_ADJUSTMENT', label: 'Prorated' },
];

const TYPE_BADGE_COLORS: Record<InvoiceType, { bg: string; text: string }> = {
    SUBSCRIPTION: { bg: colors.info[50], text: colors.info[700] },
    ONE_TIME_LICENSE: { bg: colors.accent[50], text: colors.accent[700] },
    AMC: { bg: colors.primary[50], text: colors.primary[700] },
    PRORATED_ADJUSTMENT: { bg: colors.warning[50], text: colors.warning[700] },
};

const TYPE_LABELS: Record<InvoiceType, string> = {
    SUBSCRIPTION: 'Subscription',
    ONE_TIME_LICENSE: 'One-Time',
    AMC: 'AMC',
    PRORATED_ADJUSTMENT: 'Prorated',
};

// ============ HELPERS ============

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

function toStatusBadge(status: InvoiceStatus): 'paid' | 'pending' | 'overdue' | 'cancelled' {
    switch (status) {
        case 'PAID': return 'paid';
        case 'OVERDUE': return 'overdue';
        case 'CANCELLED': return 'cancelled';
        default: return 'pending';
    }
}

// ============ INVOICE CARD ============

function InvoiceCard({ invoice, index }: { invoice: Invoice; index: number }) {
    const router = useRouter();
    const fmt = useCompanyFormatter();
    const formatDate = (d?: string) => !d ? '' : fmt.date(d);
    const typeColor = TYPE_BADGE_COLORS[invoice.invoiceType] ?? TYPE_BADGE_COLORS.SUBSCRIPTION;
    const typeLabel = TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType;

    const handlePress = () => {
        router.push(`/(app)/billing/invoice/${invoice.id}`);
    };

    const billingPeriod = invoice.billingPeriodStart && invoice.billingPeriodEnd
        ? `${formatDate(invoice.billingPeriodStart)} — ${formatDate(invoice.billingPeriodEnd)}`
        : '';

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                ]}
            >
                {/* Top row: Invoice # + Status */}
                <View style={styles.cardHeader}>
                    <View style={styles.invoiceIdContainer}>
                        <Text
                            className="font-inter text-sm font-bold text-primary-950"
                            numberOfLines={1}
                            style={styles.monoText}
                        >
                            {invoice.invoiceNumber}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                            <Text
                                className="font-inter text-[9px] font-bold"
                                style={{ color: typeColor.text }}
                            >
                                {typeLabel}
                            </Text>
                        </View>
                    </View>
                    <StatusBadge status={toStatusBadge(invoice.status)} size="sm" />
                </View>

                {/* Tenant name + billing period */}
                <View style={styles.infoRow}>
                    <Text className="font-inter text-xs font-medium text-neutral-700" numberOfLines={1}>
                        {invoice.company?.displayName ?? 'Unknown Tenant'}
                    </Text>
                    {billingPeriod ? (
                        <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1}>
                            {billingPeriod}
                        </Text>
                    ) : null}
                </View>

                {/* Bottom row: Amount + Due date */}
                <View style={styles.amountRow}>
                    <Text className="font-inter text-lg font-bold text-primary-950">
                        {formatCurrency(invoice.grandTotal)}
                    </Text>
                    {invoice.dueDate ? (
                        <Text className="font-inter text-[10px] text-neutral-400">
                            Due {formatDate(invoice.dueDate)}
                        </Text>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ FILTER CHIP ROW ============

function FilterChipRow({
    filters,
    activeFilter,
    onFilterChange,
}: {
    filters: { key: string; label: string }[];
    activeFilter: string;
    onFilterChange: (key: string) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRowContent}
        >
            {filters.map((f) => {
                const isActive = f.key === activeFilter;
                return (
                    <Pressable
                        key={f.key}
                        onPress={() => onFilterChange(f.key)}
                        style={[
                            styles.chip,
                            isActive && styles.chipActive,
                        ]}
                    >
                        <Text
                            className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                        >
                            {f.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ MAIN COMPONENT ============

export function InvoiceListScreen() {
    const insets = useSafeAreaInsets();
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [typeFilter, setTypeFilter] = React.useState('all');
    const [page, setPage] = React.useState(1);

    const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
    const typeParam = typeFilter !== 'all' ? typeFilter : undefined;

    const { data: response, isLoading, error, refetch, isFetching } = useInvoiceList({
        search: search.trim() || undefined,
        status: statusParam,
        invoiceType: typeParam,
        page,
        limit: 20,
    });

    const rawData = (response as any)?.data ?? response ?? [];
    const invoices: Invoice[] = React.useMemo(() => {
        if (!Array.isArray(rawData)) return [];
        return rawData;
    }, [rawData]);

    const meta = (response as any)?.meta;
    const totalCount = meta?.total ?? invoices.length;

    const handleLoadMore = () => {
        if (meta && page < meta.totalPages && !isFetching) {
            setPage((p) => p + 1);
        }
    };

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [search, statusFilter, typeFilter]);

    const renderInvoice = ({ item, index }: { item: Invoice; index: number }) => (
        <InvoiceCard invoice={item} index={index} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Invoices
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {totalCount} invoice{totalCount !== 1 ? 's' : ''}
                    </Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search invoices..."
                />
            </Animated.View>

            {/* Status filter chips */}
            <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.filterSection}>
                <FilterChipRow
                    filters={STATUS_FILTERS}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
            </Animated.View>

            {/* Type filter chips */}
            <Animated.View entering={FadeIn.duration(400).delay(250)} style={styles.filterSection}>
                <FilterChipRow
                    filters={TYPE_FILTERS}
                    activeFilter={typeFilter}
                    onFilterChange={setTypeFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 24 }]}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                    <EmptyState
                        icon="error"
                        title="Failed to load invoices"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon="search"
                    title="No invoices found"
                    message="Try adjusting your search or filters."
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlashList
                data={invoices}
                renderItem={renderInvoice}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => {
                            setPage(1);
                            refetch();
                        }}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />
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
    searchSection: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    filterSection: {
        paddingBottom: 8,
    },
    chipRowContent: {
        paddingHorizontal: 24,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardPressed: {
        backgroundColor: colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    invoiceIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    monoText: {
        fontFamily: 'monospace',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    infoRow: {
        marginTop: 10,
        gap: 2,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
});
