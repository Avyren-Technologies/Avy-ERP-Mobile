/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useMyForm16 } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

function formatCurrency(val: number | null | undefined): string {
    if (val == null) return '--';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

export function MyForm16Screen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { data, isLoading, refetch } = useMyForm16();
    // essApi.getMyForm16() does client.get() (interceptor strips axios wrapper → API envelope)
    // then returns r.data (extracts the data array from envelope).
    // So hook data is already the array. Fall back to envelope unwrap for safety.
    const records = React.useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        const raw = data as any;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [data]);

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">{item.financialYear ?? item.fy ?? `FY ${item.year ?? '--'}`}</Text>
                    {item.generatedAt && <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Generated: {item.generatedAt}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: item.status === 'AVAILABLE' ? colors.success[50] : colors.warning[50] }]}>
                    <Text className="font-inter text-[10px] font-bold" style={{ color: item.status === 'AVAILABLE' ? colors.success[700] : colors.warning[700] }}>{item.status ?? 'PENDING'}</Text>
                </View>
            </View>
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-400">Gross</Text>
                    <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{formatCurrency(item.grossSalary)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-400">TDS</Text>
                    <Text className="font-inter text-xs font-bold text-danger-600">{formatCurrency(item.totalTds ?? item.tds)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text className="font-inter text-[10px] text-neutral-400">Net</Text>
                    <Text className="font-inter text-xs font-bold text-success-700">{formatCurrency(item.netSalary ?? item.netPay)}</Text>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
            <AppTopHeader title="My Form-16" onMenuPress={open} />
            <FlashList
                data={records}
                keyExtractor={(item) => item.id ?? item.financialYear ?? String(item.year)}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No tax records yet</Text></View> : null}
            />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    summaryRow: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    summaryItem: { flex: 1, alignItems: 'center' },
    empty: { alignItems: 'center', paddingTop: 60 },
});
const styles = createStyles(false);
