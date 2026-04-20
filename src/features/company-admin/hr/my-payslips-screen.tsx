/* eslint-disable better-tailwindcss/no-unknown-classes */
/* eslint-disable unicorn/prefer-node-protocol */
import { Buffer } from 'buffer';
import { File, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

import * as Sharing from 'expo-sharing';
import * as React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useDownloadPayslipPdf } from '@/features/company-admin/api/use-ess-mutations';
import { useMyPayslips, useMyPayslipDetail } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface PayslipItem {
    id: string;
    month: string;
    year: string;
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    arrearsAmount: number;
    earnings: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
    employerContributions?: Record<string, number>;
    overtimeHours?: number;
    overtimeAmount?: number;
    lopDays?: number;
    workingDays?: number;
    presentDays?: number;
    ytd?: {
        fyLabel: string;
        grossEarnings: number;
        totalDeductions: number;
        netPay: number;
        tdsAmount: number;
    };
    leaveBalance?: { type: string; code: string; balance: number; used: number; total: number }[];
}

// ============ HELPERS ============

function formatCurrency(n: number): string {
    return `₹${  n.toLocaleString('en-IN')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FILTERS = [
    { label: 'All', value: '' },
    ...MONTHS.map((m, i) => ({ label: m, value: String(i + 1).padStart(2, '0') })),
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => String(currentYear - i));

// ============ PAYSLIP DETAIL MODAL ============

const COMPONENT_LABELS: Record<string, string> = {
    PF_EMPLOYER: 'Provident Fund (Employer)',
    ESI_EMPLOYER: 'ESI (Employer)',
    LWF_EMPLOYER: 'LWF (Employer)',
    GRATUITY_PROVISION: 'Gratuity Provision',
};

function PayslipDetailModal({ visible, onClose, item, onDownload, isDownloading, downloadError }: {
    visible: boolean; onClose: () => void; item: PayslipItem | null;
    onDownload: (payslipId: string, month: string, year: string) => void; isDownloading: boolean;
    downloadError?: boolean;
}) {
    const insets = useSafeAreaInsets();
    if (!item) return null;

    const employerEntries = item.employerContributions
        ? Object.entries(item.employerContributions).filter(([, amt]) => Number(amt) > 0)
        : [];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Payslip - {item.month} {item.year}</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">Net Pay: {formatCurrency(item.netPay)}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Earnings */}
                        <View style={styles.detailSection}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-success-600 mb-2">Earnings</Text>
                            {item.earnings.map((e, i) => (
                                <View key={i} style={styles.detailRow}>
                                    <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">{e.label}</Text>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{formatCurrency(e.amount)}</Text>
                                </View>
                            ))}
                            {item.arrearsAmount > 0 && (
                                <View style={styles.detailRow}>
                                    <Text className="font-inter text-sm font-medium text-accent-600">Arrears</Text>
                                    <Text className="font-inter text-sm font-semibold text-accent-600">{formatCurrency(item.arrearsAmount)}</Text>
                                </View>
                            )}
                            {/* OT Breakdown */}
                            {item.overtimeAmount != null && Number(item.overtimeAmount) > 0 && (
                                <View style={styles.detailRow}>
                                    <Text className="font-inter text-sm text-primary-600">Overtime ({item.overtimeHours ?? 0} hrs)</Text>
                                    <Text className="font-inter text-sm font-semibold text-primary-600">{formatCurrency(Number(item.overtimeAmount))}</Text>
                                </View>
                            )}
                            <View style={[styles.detailRow, styles.totalRow]}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Gross Earnings</Text>
                                <Text className="font-inter text-sm font-bold text-success-600">{formatCurrency(item.grossEarnings)}</Text>
                            </View>
                            {/* LOP Detail */}
                            {Number(item.lopDays ?? 0) > 0 && (
                                <Text className="font-inter text-[10px] text-neutral-400 mt-1">
                                    LOP: {Number(item.lopDays)} days (Working: {item.workingDays}, Present: {Number(item.presentDays)})
                                </Text>
                            )}
                        </View>

                        {/* Deductions */}
                        <View style={styles.detailSection}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-danger-600 mb-2">Deductions</Text>
                            {item.deductions.map((d, i) => (
                                <View key={i} style={styles.detailRow}>
                                    <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">{d.label}</Text>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{formatCurrency(d.amount)}</Text>
                                </View>
                            ))}
                            <View style={[styles.detailRow, styles.totalRow]}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Total Deductions</Text>
                                <Text className="font-inter text-sm font-bold text-danger-600">{formatCurrency(item.totalDeductions)}</Text>
                            </View>
                        </View>

                        {/* Employer Contributions */}
                        {employerEntries.length > 0 && (
                            <View style={styles.detailSection}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-info-600 mb-2">Employer Contributions</Text>
                                {employerEntries.map(([code, amount]) => (
                                    <View key={code} style={styles.detailRow}>
                                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">
                                            {COMPONENT_LABELS[code] ?? code.replace(/_/g, ' ')}
                                        </Text>
                                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{formatCurrency(Number(amount))}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Net Pay */}
                        <View style={styles.netPayCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Net Pay</Text>
                            <Text className="font-inter text-2xl font-bold text-primary-700 mt-1">{formatCurrency(item.netPay)}</Text>
                        </View>

                        {/* YTD Section */}
                        {item.ytd && (
                            <View style={[styles.detailSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }]}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Year-to-Date (FY {item.ytd.fyLabel})</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    <View style={{ width: '48%' }}>
                                        <Text className="font-inter text-[10px] text-neutral-400">Gross</Text>
                                        <Text className="font-inter text-xs">{formatCurrency(item.ytd.grossEarnings)}</Text>
                                    </View>
                                    <View style={{ width: '48%' }}>
                                        <Text className="font-inter text-[10px] text-neutral-400">Deductions</Text>
                                        <Text className="font-inter text-xs">{formatCurrency(item.ytd.totalDeductions)}</Text>
                                    </View>
                                    <View style={{ width: '48%' }}>
                                        <Text className="font-inter text-[10px] text-neutral-400">TDS</Text>
                                        <Text className="font-inter text-xs">{formatCurrency(item.ytd.tdsAmount)}</Text>
                                    </View>
                                    <View style={{ width: '48%' }}>
                                        <Text className="font-inter text-[10px] text-neutral-400">Net</Text>
                                        <Text className="font-inter text-xs font-bold">{formatCurrency(item.ytd.netPay)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Leave Balance */}
                        {item.leaveBalance && item.leaveBalance.length > 0 && (
                            <View style={[styles.detailSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Leave Balance</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {item.leaveBalance.map((l) => (
                                        <Text key={l.code} className="font-inter text-[10px] text-neutral-400">
                                            {l.code}: <Text className="font-inter text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">{l.balance}/{l.total}</Text>
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Download */}
                        <Pressable onPress={() => onDownload(item.id, item.month, item.year)} disabled={isDownloading} style={[styles.downloadBtn, isDownloading && { opacity: 0.6 }]}>
                            {isDownloading ? (
                                <ActivityIndicator size="small" color={colors.primary[600]} />
                            ) : (
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            )}
                            <Text className="font-inter text-sm font-bold text-primary-600">{isDownloading ? 'Downloading...' : 'Download PDF'}</Text>
                        </Pressable>
                        {downloadError && (
                            <Text className="font-inter text-xs text-red-500 mt-2 text-center">
                                Failed to download payslip. Please try again.
                            </Text>
                        )}
                    </ScrollView>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Close</Text>
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
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.year}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.amountRow}>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Gross</Text>
                            <Text className="font-inter text-xs font-semibold text-success-600">{formatCurrency(item.grossEarnings)}</Text>
                        </View>
                        <View style={styles.amountRow}>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Deductions</Text>
                            <Text className="font-inter text-xs font-semibold text-danger-600">-{formatCurrency(item.totalDeductions)}</Text>
                        </View>
                        <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 6, marginTop: 4 }]}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Net Pay</Text>
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
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useMyPayslips();
    const downloadPdf = useDownloadPayslipPdf();

    const [selectedYear, setSelectedYear] = React.useState(YEARS[0]);
    const [selectedMonth, setSelectedMonth] = React.useState('');
    const [detailItem, setDetailItem] = React.useState<PayslipItem | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);
    const [downloadError, setDownloadError] = React.useState(false);

    // Fetch enriched detail (YTD, leave balance, employer contributions) when modal opens
    const { data: detailResponse } = useMyPayslipDetail(detailVisible && detailItem ? detailItem.id : null);

    const handleDownload = async (payslipId: string, month: string, year: string) => {
        try {
            setDownloadError(false);
            const data = await downloadPdf.mutateAsync(payslipId);
            const base64 = Buffer.from(data).toString('base64');
            const file = new File(Paths.document, `payslip-${month}-${year}.pdf`);
            file.create();
            file.write(base64, { encoding: 'base64' });
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                setDownloadError(true);
                return;
            }
            await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: `Payslip ${month}/${year}` });
        } catch {
            setDownloadError(true);
        }
    };

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
            arrearsAmount: Number(item.arrearsAmount) || 0,
            earnings: item.earnings ?? [],
            deductions: item.deductionDetails ?? item.deductionBreakdown ?? [],
            employerContributions: item.employerContributions ?? undefined,
            overtimeHours: item.overtimeHours != null ? Number(item.overtimeHours) : undefined,
            overtimeAmount: item.overtimeAmount != null ? Number(item.overtimeAmount) : undefined,
            lopDays: item.lopDays != null ? Number(item.lopDays) : undefined,
            workingDays: item.workingDays != null ? Number(item.workingDays) : undefined,
            presentDays: item.presentDays != null ? Number(item.presentDays) : undefined,
        }));
    }, [response]);

    // Merge detail API response (YTD, leave balance) into the selected payslip
    const enrichedDetailItem: PayslipItem | null = React.useMemo(() => {
        if (!detailItem) return null;
        const detailData = (detailResponse as any)?.data ?? detailResponse;
        if (!detailData) return detailItem;
        return {
            ...detailItem,
            employerContributions: detailData.employerContributions ?? detailItem.employerContributions,
            overtimeHours: detailData.overtimeHours != null ? Number(detailData.overtimeHours) : detailItem.overtimeHours,
            overtimeAmount: detailData.overtimeAmount != null ? Number(detailData.overtimeAmount) : detailItem.overtimeAmount,
            lopDays: detailData.lopDays != null ? Number(detailData.lopDays) : detailItem.lopDays,
            workingDays: detailData.workingDays != null ? Number(detailData.workingDays) : detailItem.workingDays,
            presentDays: detailData.presentDays != null ? Number(detailData.presentDays) : detailItem.presentDays,
            ytd: detailData.ytd ?? undefined,
            leaveBalance: detailData.leaveBalance ?? undefined,
        };
    }, [detailItem, detailResponse]);

    const filtered = React.useMemo(() => payslips.filter(p => {
        if (p.year !== selectedYear) return false;
        if (selectedMonth && String(p.month) !== selectedMonth) return false;
        return true;
    }), [payslips, selectedYear, selectedMonth]);

    const openDetail = (item: PayslipItem) => { setDetailItem(item); setDetailVisible(true); };

    const renderItem = ({ item, index }: { item: PayslipItem; index: number }) => (
        <PayslipCard item={item} index={index} onPress={() => openDetail(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">My Payslips</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">View your monthly salary details</Text>
            {/* Year Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
                {YEARS.map(yr => {
                    const active = yr === selectedYear;
                    return (
                        <Pressable key={yr} onPress={() => setSelectedYear(yr)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{yr}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            {/* Month Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {MONTH_FILTERS.map(m => {
                    const active = m.value === selectedMonth;
                    return (
                        <Pressable key={m.value} onPress={() => setSelectedMonth(m.value)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{m.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No payslips" message={`No payslips found for ${selectedMonth ? `${MONTHS[Number(selectedMonth) - 1]} ` : ''}${selectedYear}.`} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="My Payslips" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <PayslipDetailModal visible={detailVisible} onClose={() => setDetailVisible(false)} item={enrichedDetailItem} onDownload={handleDownload} isDownloading={downloadPdf.isPending} downloadError={downloadError} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    monthBadge: { width: 56, height: 56, borderRadius: 14, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    detailSection: { marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    totalRow: { borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8, marginTop: 4 },
    netPayCard: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    closeBtn: { marginTop: 12, height: 48, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
});
const styles = createStyles(false);
