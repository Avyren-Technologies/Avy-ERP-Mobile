/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useMyPayments } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface PaymentItem {
    id: string;
    date: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    method: string;
    transactionId?: string;
}

// ============ HELPERS ============

function formatCurrency(amount: number, currency = 'INR') {
    if (currency === 'INR') {
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

function getMethodColor(method: string): { bg: string; text: string } {
    const m = method?.toLowerCase();
    if (m?.includes('upi') || m?.includes('gpay') || m?.includes('phonepe')) {
        return { bg: colors.success[50], text: colors.success[700] };
    }
    if (m?.includes('card') || m?.includes('credit') || m?.includes('debit')) {
        return { bg: colors.primary[50], text: colors.primary[700] };
    }
    if (m?.includes('bank') || m?.includes('neft') || m?.includes('rtgs') || m?.includes('imps')) {
        return { bg: colors.info[50], text: colors.info[700] };
    }
    if (m?.includes('cheque') || m?.includes('check')) {
        return { bg: colors.warning[50], text: colors.warning[700] };
    }
    return { bg: colors.accent[50], text: colors.accent[700] };
}

// ============ PAYMENT CARD ============

function PaymentCard({ item, index }: { item: PaymentItem; index: number }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d: string) => !d ? '--' : fmt.date(d);
    const methodColor = getMethodColor(item.method);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            style={styles.card}
        >
            <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.success[50] }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M9 11l3 3L22 4" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={colors.success[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.cardTopRow}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                            {formatCurrency(item.amount, item.currency)}
                        </Text>
                        <View style={[styles.methodBadge, { backgroundColor: methodColor.bg }]}>
                            <Text style={{ color: methodColor.text, fontSize: 10, fontWeight: '700', fontFamily: 'Inter' }}>
                                {item.method}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardDetailRow}>
                        <Text className="font-inter text-[10px] text-neutral-400">
                            {formatDate(item.date)}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-400">
                            {item.invoiceNumber}
                        </Text>
                    </View>

                    {item.transactionId ? (
                        <Text className="mt-1 font-inter text-[10px] text-neutral-300" numberOfLines={1}>
                            Txn: {item.transactionId}
                        </Text>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function MyPaymentsScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data, isLoading, refetch, isRefetching } = useMyPayments();

    const payments: PaymentItem[] = React.useMemo(() => {
        const wrapper = (data as any)?.data ?? data;
        const raw = wrapper?.payments ?? (Array.isArray(wrapper) ? wrapper : []);
        return raw.map((p: any) => ({
            id: p.id,
            date: p.paidAt ?? p.createdAt ?? '',
            invoiceNumber: p.invoice?.invoiceNumber ?? p.invoiceId ?? '',
            amount: p.amount ?? 0,
            currency: 'INR',
            method: p.method ?? 'Online',
            transactionId: p.reference ?? p.transactionId,
        }));
    }, [data]);

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <View style={styles.container}>
            <AppTopHeader
                title="Payments"
                subtitle={`${payments.length} payment${payments.length !== 1 ? 's' : ''}${payments.length > 0 ? ` | Total: ${formatCurrency(totalPaid)}` : ''}`}
                onMenuPress={toggle}
            />

            {/* ── Content ── */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    {[0, 1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </View>
            ) : payments.length === 0 ? (
                <EmptyState
                    title="No Payments"
                    message="No payments have been recorded yet."
                    icon="list"
                />
            ) : (
                <FlashList
                    data={payments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <PaymentCard item={item} index={index} />
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

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    loadingContainer: {
        padding: 20,
        gap: 12,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
        gap: 10,
    },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 14,
        padding: 14,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    methodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
});
const styles = createStyles(false);
