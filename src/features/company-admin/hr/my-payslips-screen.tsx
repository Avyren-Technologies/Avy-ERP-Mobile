/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useMyPayslips } from '@/features/company-admin/api/use-ess-queries';

// ============ TYPES ============

interface PayslipItem {
    id: string;
    month: string;
    year: string;
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    earnings: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
}

// ============ HELPERS ============

function formatCurrency(n: number): string {
    return '\u20B9' + n.toLocaleString('en-IN');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2026', '2025', '2024'];

// ============ PAYSLIP DETAIL MODAL ============

function PayslipDetailModal({ visible, onClose, item }: { visible: boolean; onClose: () => void; item: PayslipItem | null }) {
    const insets = useSafeAreaInsets();
    if (!item) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-1">Payslip - {item.month} {item.year}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mb-4">Net Pay: {formatCurrency(item.netPay)}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Earnings */}
                        <View style={styles.detailSection}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-success-600 mb-2">Earnings</Text>
                            {item.earnings.map((e, i) => (
                                <View key={i} style={styles.detailRow}>
                                    <Text className="font-inter text-sm text-neutral-600">{e.label}</Text>
                                    <Text className="font-inter text-sm font-semibold text-primary-950">{formatCurrency(e.amount)}</Text>
                                </View>
                            ))}
                            <View style={[styles.detailRow, styles.totalRow]}>
                                <Text className="font-inter text-sm font-bold text-primary-950">Gross Earnings</Text>
                                <Text className="font-inter text-sm font-bold text-success-600">{formatCurrency(item.grossEarnings)}</Text>
                            </View>
                        </View>

                        {/* Deductions */}
                        <View style={styles.detailSection}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-danger-600 mb-2">Deductions</Text>
                            {item.deductions.map((d, i) => (
                                <View key={i} style={styles.detailRow}>
                                    <Text className="font-inter text-sm text-neutral-600">{d.label}</Text>
                                    <Text className="font-inter text-sm font-semibold text-primary-950">{formatCurrency(d.amount)}</Text>
                                </View>
                            ))}
                            <View style={[styles.detailRow, styles.totalRow]}>
                                <Text className="font-inter text-sm font-bold text-primary-950">Total Deductions</Text>
                                <Text className="font-inter text-sm font-bold text-danger-600">{formatCurrency(item.totalDeductions)}</Text>
                            </View>
                        </View>

                        {/* Net Pay */}
                        <View style={styles.netPayCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Net Pay</Text>
                            <Text className="font-inter text-2xl font-bold text-primary-700 mt-1">{formatCurrency(item.netPay)}</Text>
                        </View>

                        {/* Download */}
                        <Pressable style={styles.downloadBtn}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-sm font-bold text-primary-600">Download PDF</Text>
                        </Pressable>
                    </ScrollView>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ PAYSLIP CARD ============

function PayslipCard({ item, index, onPress }: { item: PayslipItem; index: number; onPress: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.monthBadge}>
                        <Text className="font-inter text-lg font-bold text-primary-700">{item.month}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">{item.year}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.amountRow}>
                            <Text className="font-inter text-xs text-neutral-500">Gross</Text>
                            <Text className="font-inter text-xs font-semibold text-success-600">{formatCurrency(item.grossEarnings)}</Text>
                        </View>
                        <View style={styles.amountRow}>
                            <Text className="font-inter text-xs text-neutral-500">Deductions</Text>
                            <Text className="font-inter text-xs font-semibold text-danger-600">-{formatCurrency(item.totalDeductions)}</Text>
                        </View>
                        <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 6, marginTop: 4 }]}>
                            <Text className="font-inter text-sm font-bold text-primary-950">Net Pay</Text>
                            <Text className="font-inter text-sm font-bold text-primary-700">{formatCurrency(item.netPay)}</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function MyPayslipsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch, isFetching } = useMyPayslips();

    const [selectedYear, setSelectedYear] = React.useState(YEARS[0]);
    const [detailItem, setDetailItem] = React.useState<PayslipItem | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);

    const payslips: PayslipItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            month: item.month ?? '',
            year: item.year ?? String(item.financialYear ?? ''),
            grossEarnings: item.grossEarnings ?? item.gross ?? 0,
            totalDeductions: item.totalDeductions ?? item.deductions ?? 0,
            netPay: item.netPay ?? item.net ?? 0,
            earnings: item.earnings ?? [],
            deductions: item.deductionDetails ?? item.deductionBreakdown ?? [],
        }));
    }, [response]);

    const filtered = React.useMemo(() => payslips.filter(p => p.year === selectedYear), [payslips, selectedYear]);

    const openDetail = (item: PayslipItem) => { setDetailItem(item); setDetailVisible(true); };

    const renderItem = ({ item, index }: { item: PayslipItem; index: number }) => (
        <PayslipCard item={item} index={index} onPress={() => openDetail(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">My Payslips</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">View your monthly salary details</Text>
            {/* Year Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
                {YEARS.map(yr => {
                    const active = yr === selectedYear;
                    return (
                        <Pressable key={yr} onPress={() => setSelectedYear(yr)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{yr}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No payslips" message={`No payslips found for ${selectedYear}.`} /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Payslips</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <PayslipDetailModal visible={detailVisible} onClose={() => setDetailVisible(false)} item={detailItem} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    monthBadge: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    detailSection: { marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    totalRow: { borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8, marginTop: 4 },
    netPayCard: {
        backgroundColor: colors.primary[50], borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: colors.primary[100],
    },
    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: colors.primary[50],
    },
    closeBtn: { marginTop: 12, height: 48, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
});
