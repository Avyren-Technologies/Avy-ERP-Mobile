import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Types ── */

interface ReportDef {
    key: string;
    label: string;
    description: string;
    fetcher: (params?: any) => Promise<any>;
}

/* ── Report Definitions ── */

const OPERATIONAL_REPORTS: ReportDef[] = [
    { key: 'pm-due', label: 'PM Due & Overdue', description: 'Preventive maintenance status', fetcher: maintenanceApi.getReportPMDueOverdue },
    { key: 'open-bd', label: 'Open Breakdowns', description: 'Active breakdown records', fetcher: maintenanceApi.getReportOpenBreakdowns },
    { key: 'tech-load', label: 'Technician Workload', description: 'Work distribution', fetcher: maintenanceApi.getReportTechnicianWorkload },
    { key: 'vendor-sla', label: 'Vendor SLA', description: 'Vendor performance', fetcher: maintenanceApi.getReportVendorSLA },
    { key: 'parts', label: 'Parts Availability', description: 'Spare parts readiness', fetcher: maintenanceApi.getReportPartsAvailability },
    { key: 'asset-move', label: 'Asset Movement', description: 'Transfer history', fetcher: maintenanceApi.getReportAssetMovement },
    { key: 'shutdown', label: 'Shutdown Progress', description: 'Shutdown execution', fetcher: maintenanceApi.getReportShutdownProgress },
];

const MANAGEMENT_REPORTS: ReportDef[] = [
    { key: 'avail', label: 'Availability Trend', description: 'Asset uptime trend', fetcher: maintenanceApi.getReportAvailabilityTrend },
    { key: 'recur', label: 'Recurring Failures', description: 'Repeat failure patterns', fetcher: maintenanceApi.getReportRecurringFailures },
    { key: 'pvu', label: 'Planned vs Unplanned', description: 'PM vs breakdown ratio', fetcher: maintenanceApi.getReportPlannedVsUnplanned },
    { key: 'cost', label: 'Cost Breakdown', description: 'Cost by category', fetcher: maintenanceApi.getReportCostBreakdown },
    { key: 'rvr', label: 'Repair vs Replace', description: 'Replacement candidates', fetcher: maintenanceApi.getReportRepairVsReplace },
    { key: 'warranty', label: 'Warranty & AMC', description: 'Recovery amounts', fetcher: maintenanceApi.getReportWarrantyAMCRecovery },
];

const COMPLIANCE_REPORTS: ReportDef[] = [
    { key: 'calib', label: 'Calibration Due', description: 'Calibration schedule', fetcher: maintenanceApi.getReportCalibrationDue },
    { key: 'statutory', label: 'Statutory Due', description: 'Regulatory compliance', fetcher: maintenanceApi.getReportStatutoryDueOverdue },
    { key: 'evidence', label: 'Missing Evidence', description: 'WOs without evidence', fetcher: maintenanceApi.getReportClosureEvidenceMissing },
    { key: 'audit', label: 'Approval Audit', description: 'Approval trail', fetcher: maintenanceApi.getReportApprovalAuditTrail },
    { key: 'ptw', label: 'PTW Compliance', description: 'Permit compliance', fetcher: maintenanceApi.getReportPTWCompliance },
];

const CATEGORIES = [
    { key: 'operational', label: 'Operational', reports: OPERATIONAL_REPORTS },
    { key: 'management', label: 'Management', reports: MANAGEMENT_REPORTS },
    { key: 'compliance', label: 'Compliance', reports: COMPLIANCE_REPORTS },
] as const;

type CatKey = (typeof CATEGORIES)[number]['key'];

/* ── Tab Chip ── */

function TabChip({ label, active, count, onPress, isDark }: { label: string; active: boolean; count: number; onPress: () => void; isDark: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                tabStyles.chip,
                {
                    backgroundColor: active ? colors.primary[600] : isDark ? '#1A1730' : colors.white,
                    borderColor: active ? colors.primary[600] : isDark ? colors.primary[900] : colors.neutral[200],
                },
            ]}
        >
            <Text className="font-inter text-xs font-bold" style={{ color: active ? colors.white : isDark ? colors.neutral[400] : colors.neutral[600] }}>
                {label} ({count})
            </Text>
        </Pressable>
    );
}

/* ── Report Card ── */

function ReportCard({
    report,
    onGenerate,
    isLoading,
    isDark,
}: {
    report: ReportDef;
    onGenerate: () => void;
    isLoading: boolean;
    isDark: boolean;
}) {
    return (
        <View
            style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.neutral[100],
                },
            ]}
        >
            <View style={cardStyles.info}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{report.label}</Text>
                <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">{report.description}</Text>
            </View>
            <Pressable
                onPress={onGenerate}
                disabled={isLoading}
                style={[cardStyles.btn, { opacity: isLoading ? 0.6 : 1 }]}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                ) : (
                    <Text className="font-inter text-xs font-bold" style={{ color: colors.white }}>Generate</Text>
                )}
            </Pressable>
        </View>
    );
}

/* ── Results Table ── */

function ResultsTable({ data, label, isDark }: { data: any; label: string; isDark: boolean }) {
    const rows: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    if (rows.length === 0 || !rows[0] || typeof rows[0] !== 'object') {
        return <EmptyState icon="list" title="No Data" message="This report returned no results." />;
    }

    const headers = Object.keys(rows[0]).slice(0, 5); // Show first 5 columns on mobile

    const handleShare = async () => {
        const csvRows = [
            headers.join(','),
            ...rows.map((row) => headers.map((h) => String(row[h] ?? '')).join(',')),
        ];
        try {
            await Share.share({
                message: `${label}\n\n${csvRows.join('\n')}`,
                title: label,
            });
        } catch (_) { /* user cancelled */ }
    };

    return (
        <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    {label} ({rows.length})
                </Text>
                <Pressable onPress={handleShare} style={shareStyles.btn}>
                    <Text className="font-inter text-xs font-bold" style={{ color: colors.white }}>Share</Text>
                </Pressable>
            </View>

            <View style={[tableStyles.container, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                {/* Header */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                        <View style={[tableStyles.headerRow, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                            {headers.map((h) => (
                                <Text key={h} className="font-inter text-[10px] font-bold text-neutral-400" style={{ width: 100, paddingHorizontal: 8 }}>
                                    {h.replace(/([A-Z])/g, ' $1').toUpperCase()}
                                </Text>
                            ))}
                        </View>
                        {rows.slice(0, 50).map((row: any, idx: number) => (
                            <View key={idx} style={[tableStyles.dataRow, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                {headers.map((h) => (
                                    <Text key={h} className="font-inter text-[11px] text-primary-950 dark:text-white" style={{ width: 100, paddingHorizontal: 8 }} numberOfLines={1}>
                                        {row[h] != null ? String(row[h]) : '-'}
                                    </Text>
                                ))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
                {data.length > 50 && (
                    <Text className="font-inter text-[10px] text-neutral-400 text-center py-2">
                        Showing 50 of {data.length}. Share for full data.
                    </Text>
                )}
            </View>
        </View>
    );
}

/* ── Main Screen ── */

export function ReportsScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [activeCategory, setActiveCategory] = React.useState<CatKey>('operational');
    const [loadingReport, setLoadingReport] = React.useState<string | null>(null);
    const [reportData, setReportData] = React.useState<any[] | null>(null);
    const [activeLabel, setActiveLabel] = React.useState('');

    const currentCategory = CATEGORIES.find((c) => c.key === activeCategory)!;

    const handleGenerate = async (report: ReportDef) => {
        setLoadingReport(report.key);
        try {
            const result = await report.fetcher();
            const d = (result as any)?.data ?? [];
            setReportData(d);
            setActiveLabel(report.label);
        } catch (_) {
            setReportData([]);
            setActiveLabel(report.label);
        } finally {
            setLoadingReport(null);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    <AppTopHeader title="Reports" subtitle="Generate & Export Reports" onMenuPress={toggle} />
                </Animated.View>

                <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
                    {/* Category Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {CATEGORIES.map((cat) => (
                            <TabChip
                                key={cat.key}
                                label={cat.label}
                                count={cat.reports.length}
                                active={activeCategory === cat.key}
                                onPress={() => { setActiveCategory(cat.key); setReportData(null); }}
                                isDark={isDark}
                            />
                        ))}
                    </ScrollView>

                    {/* Report Cards */}
                    <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ gap: 8 }}>
                        {currentCategory.reports.map((report) => (
                            <ReportCard
                                key={report.key}
                                report={report}
                                onGenerate={() => handleGenerate(report)}
                                isLoading={loadingReport === report.key}
                                isDark={isDark}
                            />
                        ))}
                    </Animated.View>

                    {/* Results */}
                    {reportData != null && (
                        <Animated.View entering={FadeInDown.duration(300)}>
                            <ResultsTable data={reportData} label={activeLabel} isDark={isDark} />
                        </Animated.View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

/* ── Styles ── */

const tabStyles = StyleSheet.create({
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
});

const cardStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    btn: {
        backgroundColor: colors.primary[600],
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 10,
    },
});

const shareStyles = StyleSheet.create({
    btn: {
        backgroundColor: colors.success[600],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
});

const tableStyles = StyleSheet.create({
    container: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    dataRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
});
