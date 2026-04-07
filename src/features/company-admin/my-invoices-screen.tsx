/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import {
    useMyInvoiceDetail,
    useMyInvoices,
} from '@/features/company-admin/api/use-company-admin-queries';

// ============ TYPES ============

interface InvoiceItem {
    id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
}

interface InvoiceLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

interface InvoiceDetail {
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    status: string;
    subtotal: number;
    gst: number;
    gstPercent: number;
    total: number;
    currency: string;
    lineItems: InvoiceLineItem[];
}

// ============ CONSTANTS ============

const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Overdue'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// ============ HELPERS ============

function formatCurrency(amount: number, currency = 'INR') {
    if (currency === 'INR') {
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

function mapStatus(status: string): 'paid' | 'pending' | 'overdue' {
    const s = status?.toLowerCase();
    if (s === 'paid') return 'paid';
    if (s === 'overdue') return 'overdue';
    return 'pending';
}

function getStatusColor(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'paid') return colors.success[600];
    if (s === 'overdue') return colors.danger[600];
    return colors.warning[600];
}

// ============ FILTER CHIPS ============

function FilterChips({
    selected,
    onSelect,
}: {
    selected: StatusFilter;
    onSelect: (f: StatusFilter) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
        >
            {STATUS_FILTERS.map((f) => {
                const active = f === selected;
                return (
                    <Pressable
                        key={f}
                        onPress={() => onSelect(f)}
                        style={[
                            styles.filterChip,
                            active && { backgroundColor: colors.primary[500] },
                        ]}
                    >
                        <Text
                            className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-500'}`}
                        >
                            {f}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ INVOICE DETAIL PANEL ============

function InvoiceDetailPanel({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    const { data, isLoading } = useMyInvoiceDetail(invoiceId);

    const detail: InvoiceDetail | null = React.useMemo(() => {
        const raw = (data as any)?.data ?? data;
        if (!raw) return null;
        return {
            id: raw.id,
            invoiceNumber: raw.invoiceNumber ?? `INV-${raw.id}`,
            date: raw.createdAt ?? '',
            dueDate: raw.dueDate ?? '',
            status: raw.status ?? 'pending',
            subtotal: raw.subtotal ?? raw.amount ?? 0,
            gst: raw.totalTax ?? 0,
            gstPercent: raw.totalTax && raw.subtotal ? Math.round((raw.totalTax / raw.subtotal) * 100) : 18,
            total: raw.totalAmount ?? raw.amount ?? 0,
            currency: 'INR',
            lineItems: (raw.lineItems ?? raw.payments ?? []).filter((li: any) => li.description).map((li: any, idx: number) => ({
                id: li.id ?? String(idx),
                description: li.description ?? '',
                quantity: li.quantity ?? 1,
                unitPrice: li.unitPrice ?? li.price ?? 0,
                amount: li.amount ?? 0,
            })),
        };
    }, [data]);

    if (isLoading) {
        return (
            <View style={styles.detailPanel}>
                <SkeletonCard />
            </View>
        );
    }

    if (!detail) return null;

    return (
        <Animated.View entering={FadeInDown.springify()} style={styles.detailPanel}>
            <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-base font-bold text-primary-950">
                        {detail.invoiceNumber}
                    </Text>
                    <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
                        Issued: {formatDate(detail.date)} | Due: {formatDate(detail.dueDate)}
                    </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" />
                    </Svg>
                </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Line Items */}
            {detail.lineItems.length > 0 && (
                <>
                    <View style={styles.lineItemHeader}>
                        <Text className="flex-1 font-inter text-[10px] font-bold text-neutral-400">ITEM</Text>
                        <Text className="w-10 text-right font-inter text-[10px] font-bold text-neutral-400">QTY</Text>
                        <Text className="w-20 text-right font-inter text-[10px] font-bold text-neutral-400">RATE</Text>
                        <Text className="w-20 text-right font-inter text-[10px] font-bold text-neutral-400">AMOUNT</Text>
                    </View>
                    {detail.lineItems.map((li) => (
                        <View key={li.id} style={styles.lineItemRow}>
                            <Text className="flex-1 font-inter text-xs text-primary-900" numberOfLines={1}>{li.description}</Text>
                            <Text className="w-10 text-right font-inter text-xs text-neutral-500">{li.quantity}</Text>
                            <Text className="w-20 text-right font-inter text-xs text-neutral-500">
                                {formatCurrency(li.unitPrice, detail.currency)}
                            </Text>
                            <Text className="w-20 text-right font-inter text-xs font-semibold text-primary-900">
                                {formatCurrency(li.amount, detail.currency)}
                            </Text>
                        </View>
                    ))}
                    <View style={styles.divider} />
                </>
            )}

            {/* Totals */}
            <View style={styles.totalRow}>
                <Text className="font-inter text-xs text-neutral-400">Subtotal</Text>
                <Text className="font-inter text-xs font-semibold text-primary-900">
                    {formatCurrency(detail.subtotal, detail.currency)}
                </Text>
            </View>
            <View style={styles.totalRow}>
                <Text className="font-inter text-xs text-neutral-400">GST ({detail.gstPercent}%)</Text>
                <Text className="font-inter text-xs font-semibold text-primary-900">
                    {formatCurrency(detail.gst, detail.currency)}
                </Text>
            </View>
            <View style={[styles.totalRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                <Text className="font-inter text-sm font-bold text-primary-900">Total</Text>
                <Text className="font-inter text-base font-bold text-primary-700">
                    {formatCurrency(detail.total, detail.currency)}
                </Text>
            </View>
        </Animated.View>
    );
}

// ============ INVOICE ROW ============

function InvoiceRow({
    item,
    index,
    isExpanded,
    onToggle,
}: {
    item: InvoiceItem;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <Pressable style={styles.invoiceCard} onPress={onToggle}>
                <View style={styles.invoiceCardRow}>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">
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
                            status={mapStatus(item.status)}
                            size="sm"
                        />
                    </View>
                    <View style={{ marginLeft: 8 }}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path
                                d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                </View>
            </Pressable>

            {isExpanded && (
                <InvoiceDetailPanel invoiceId={item.id} onClose={onToggle} />
            )}
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function MyInvoicesScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [filter, setFilter] = React.useState<StatusFilter>('All');
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const params = React.useMemo(() => {
        const p: { status?: string } = {};
        if (filter !== 'All') p.status = filter.toLowerCase();
        return p;
    }, [filter]);

    const { data, isLoading, refetch, isRefetching } = useMyInvoices(params);

    const invoices: InvoiceItem[] = React.useMemo(() => {
        const wrapper = (data as any)?.data ?? data;
        const raw = wrapper?.invoices ?? (Array.isArray(wrapper) ? wrapper : []);
        return raw.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `INV-${inv.id}`,
            date: inv.createdAt ?? '',
            amount: inv.totalAmount ?? inv.amount ?? 0,
            currency: 'INR',
            status: inv.status ?? 'pending',
        }));
    }, [data]);

    const handleToggle = React.useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    return (
        <View style={styles.container}>
            <AppTopHeader
                title="Invoices"
                subtitle={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
                onMenuPress={toggle}
            />

            {/* ── Filters ── */}
            <FilterChips selected={filter} onSelect={setFilter} />

            {/* ── Content ── */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    {[0, 1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </View>
            ) : invoices.length === 0 ? (
                <EmptyState
                    title="No Invoices"
                    message={filter !== 'All' ? `No ${filter.toLowerCase()} invoices found.` : 'No invoices have been generated yet.'}
                    icon="list"
                />
            ) : (
                <FlashList
                    data={invoices}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <InvoiceRow
                            item={item}
                            index={index}
                            isExpanded={expandedId === item.id}
                            onToggle={() => handleToggle(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor={colors.primary[500]}
                            colors={[colors.primary[500]]}
                        />
                    }
                />
            )}
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    filterRow: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    loadingContainer: {
        padding: 20,
        gap: 12,
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 100,
        gap: 10,
    },
    invoiceCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 14,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    invoiceCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 4,
        height: 36,
        borderRadius: 2,
        marginRight: 12,
    },
    detailPanel: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 16,
        marginTop: 4,
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[100],
        marginVertical: 10,
    },
    lineItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    lineItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
});
