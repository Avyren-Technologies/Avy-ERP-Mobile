/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useBankFile,
    useESIChallan,
    usePFECR,
    usePTChallan,
    useSalaryRegister,
    useVarianceReport,
} from '@/features/company-admin/api/use-payroll-run-queries';

// ============ TYPES ============

type ReportType = 'salary_register' | 'bank_file' | 'pf_ecr' | 'esi_challan' | 'pt_challan' | 'variance';

interface ReportCardData {
    type: ReportType;
    title: string;
    description: string;
    color: string;
    iconColor: string;
}

// ============ CONSTANTS ============

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const REPORTS: ReportCardData[] = [
    { type: 'salary_register', title: 'Salary Register', description: 'Complete salary breakup for all employees', color: colors.primary[50], iconColor: colors.primary[600] },
    { type: 'bank_file', title: 'Bank File', description: 'NEFT/RTGS disbursement file', color: colors.success[50], iconColor: colors.success[600] },
    { type: 'pf_ecr', title: 'PF ECR', description: 'PF Electronic Challan Return', color: colors.info[50], iconColor: colors.info[600] },
    { type: 'esi_challan', title: 'ESI Challan', description: 'ESI contribution details', color: colors.warning[50], iconColor: colors.warning[600] },
    { type: 'pt_challan', title: 'PT Challan', description: 'Professional Tax return', color: colors.accent[50], iconColor: colors.accent[600] },
    { type: 'variance', title: 'Variance Report', description: 'Month-on-month salary changes', color: colors.danger[50], iconColor: colors.danger[600] },
];

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ============ ATOMS ============

function MonthYearPicker({ month, year, onMonthChange, onYearChange }: {
    month: number; year: number; onMonthChange: (m: number) => void; onYearChange: (y: number) => void;
}) {
    return (
        <View style={styles.monthYearPicker}>
            <Pressable onPress={() => { if (month === 1) { onMonthChange(12); onYearChange(year - 1); } else { onMonthChange(month - 1); } }} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <Text className="font-inter text-sm font-bold text-primary-950">{MONTH_LABELS[month - 1]} {year}</Text>
            </View>
            <Pressable onPress={() => { if (month === 12) { onMonthChange(1); onYearChange(year + 1); } else { onMonthChange(month + 1); } }} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
        </View>
    );
}

function ReportIcon({ type, color }: { type: ReportType; color: string }) {
    switch (type) {
        case 'salary_register':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'bank_file':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'pf_ecr':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'esi_challan':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'pt_challan':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'variance':
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        default:
            return <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" /><Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none" /></Svg>;
    }
}

// ============ REPORT TABLE VIEW ============

function ReportTableView({ type, month, year, onBack }: {
    type: ReportType; month: number; year: number; onBack: () => void;
}) {
    const insets = useSafeAreaInsets();
    const params = { month, year } as any;

    const salaryRegister = useSalaryRegister(type === 'salary_register' ? params : undefined);
    const bankFile = useBankFile(type === 'bank_file' ? params : undefined);
    const pfECR = usePFECR(type === 'pf_ecr' ? params : undefined);
    const esiChallan = useESIChallan(type === 'esi_challan' ? params : undefined);
    const ptChallan = usePTChallan(type === 'pt_challan' ? params : undefined);
    const variance = useVarianceReport(type === 'variance' ? params : undefined);

    const queryMap: Record<ReportType, any> = {
        salary_register: salaryRegister,
        bank_file: bankFile,
        pf_ecr: pfECR,
        esi_challan: esiChallan,
        pt_challan: ptChallan,
        variance,
    };

    const query = queryMap[type];
    const { data: response, isLoading, error, refetch } = query;

    const rows: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const reportConfig = REPORTS.find(r => r.type === type)!;

    // Column definitions per report type
    const columns: { key: string; label: string; format?: (v: any) => string }[] = React.useMemo(() => {
        switch (type) {
            case 'salary_register':
                return [
                    { key: 'employeeName', label: 'Employee' },
                    { key: 'basic', label: 'Basic', format: formatCurrency },
                    { key: 'hra', label: 'HRA', format: formatCurrency },
                    { key: 'gross', label: 'Gross', format: formatCurrency },
                    { key: 'deductions', label: 'Deductions', format: formatCurrency },
                    { key: 'netPay', label: 'Net Pay', format: formatCurrency },
                ];
            case 'bank_file':
                return [
                    { key: 'employeeName', label: 'Employee' },
                    { key: 'bankName', label: 'Bank' },
                    { key: 'ifsc', label: 'IFSC' },
                    { key: 'accountNo', label: 'Account' },
                    { key: 'amount', label: 'Amount', format: formatCurrency },
                ];
            case 'pf_ecr':
                return [
                    { key: 'uan', label: 'UAN' },
                    { key: 'employeeName', label: 'Name' },
                    { key: 'pfWage', label: 'PF Wage', format: formatCurrency },
                    { key: 'epf', label: 'EPF', format: formatCurrency },
                    { key: 'eps', label: 'EPS', format: formatCurrency },
                ];
            case 'esi_challan':
                return [
                    { key: 'employeeName', label: 'Name' },
                    { key: 'ipNumber', label: 'IP No.' },
                    { key: 'grossWage', label: 'Gross Wage', format: formatCurrency },
                    { key: 'employeeShare', label: 'Emp Share', format: formatCurrency },
                    { key: 'employerShare', label: 'Er Share', format: formatCurrency },
                ];
            case 'pt_challan':
                return [
                    { key: 'employeeName', label: 'Name' },
                    { key: 'grossSalary', label: 'Gross Salary', format: formatCurrency },
                    { key: 'ptAmount', label: 'PT Amount', format: formatCurrency },
                ];
            case 'variance':
                return [
                    { key: 'employeeName', label: 'Employee' },
                    { key: 'prevMonth', label: 'Prev Month', format: formatCurrency },
                    { key: 'currentMonth', label: 'Current', format: formatCurrency },
                    { key: 'variance', label: 'Variance', format: formatCurrency },
                    { key: 'variancePercent', label: '%', format: (v: number) => `${(v ?? 0).toFixed(1)}%` },
                ];
            default:
                return [];
        }
    }, [type]);

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">{reportConfig.title}</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={styles.reportPeriod}>
                        <Text className="font-inter text-xs text-neutral-500">Period</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950">{MONTH_LABELS[month - 1]} {year}</Text>
                    </View>

                    {isLoading ? (
                        <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
                    ) : error ? (
                        <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load report" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
                    ) : rows.length === 0 ? (
                        <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No data" message="No report data available for this period." /></View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 8 }}>
                            <View>
                                {/* Header */}
                                <View style={styles.tableHeader}>
                                    {columns.map(col => (
                                        <View key={col.key} style={[styles.tableCell, col.key === 'employeeName' ? { minWidth: 140 } : { minWidth: 90 }]}>
                                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{col.label}</Text>
                                        </View>
                                    ))}
                                </View>
                                {/* Rows */}
                                {rows.map((row: any, idx: number) => {
                                    const isVarianceHighlight = type === 'variance' && Math.abs(row.variancePercent ?? 0) > 10;
                                    return (
                                        <Animated.View key={row.id ?? idx} entering={FadeInUp.duration(300).delay(50 + idx * 30)}>
                                            <View style={[styles.tableRow, isVarianceHighlight && { backgroundColor: colors.warning[50] }]}>
                                                {columns.map(col => (
                                                    <View key={col.key} style={[styles.tableCell, col.key === 'employeeName' ? { minWidth: 140 } : { minWidth: 90 }]}>
                                                        <Text className="font-inter text-xs text-primary-950" numberOfLines={1}>
                                                            {col.format ? col.format(row[col.key]) : (row[col.key] ?? '--')}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ============ REPORT CARD ============

function ReportCardItem({ item, index, onPress }: { item: ReportCardData; index: number; onPress: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 80)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}>
                <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                    <ReportIcon type={item.type} color={item.iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.title}</Text>
                    <Text className="mt-1 font-inter text-xs text-neutral-500">{item.description}</Text>
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PayrollReportScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());
    const [selectedReport, setSelectedReport] = React.useState<ReportType | null>(null);

    // Report detail view
    if (selectedReport) {
        return (
            <ReportTableView
                type={selectedReport}
                month={selectedMonth}
                year={selectedYear}
                onBack={() => setSelectedReport(null)}
            />
        );
    }

    // Report hub view
    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Payroll Reports" onMenuPress={toggle} />
            <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Reports</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Generate and view payroll reports</Text>
                </Animated.View>

                <View style={{ marginTop: 16, marginBottom: 20 }}>
                    <MonthYearPicker month={selectedMonth} year={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
                </View>

                {REPORTS.map((report, idx) => (
                    <ReportCardItem key={report.type} item={report} index={idx} onPress={() => setSelectedReport(report.type)} />
                ))}
            </ScrollView>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 24 },
    monthYearPicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    reportCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    reportCardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    iconWrap: {
        width: 48, height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    // Report table view
    reportPeriod: {
        backgroundColor: colors.primary[50], borderRadius: 12, padding: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row', backgroundColor: colors.neutral[50], borderRadius: 10, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[200],
    },
    tableRow: {
        flexDirection: 'row', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    },
    tableCell: { paddingHorizontal: 8, justifyContent: 'center' },
});
