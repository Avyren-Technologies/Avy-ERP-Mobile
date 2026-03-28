/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useStatutoryFilings } from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useGenerateForm16,
    useGenerateForm24Q,
    useBulkEmailForm16,
} from '@/features/company-admin/api/use-payroll-run-mutations';

// ============ TYPES ============

const FINANCIAL_YEARS = ['2024-25', '2025-26', '2026-27'];
const QUARTERS = ['1', '2', '3', '4'];
const QUARTER_LABELS: Record<string, string> = { '1': 'Q1 (Apr-Jun)', '2': 'Q2 (Jul-Sep)', '3': 'Q3 (Oct-Dec)', '4': 'Q4 (Jan-Mar)' };

// ============ STATUS BADGE ============

function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase();
    const bg = s === 'completed' || s === 'generated' ? colors.success[50] : s === 'processing' || s === 'in_progress' ? colors.warning[50] : s === 'failed' ? colors.danger[50] : colors.neutral[100];
    const textCls = s === 'completed' || s === 'generated' ? 'text-success-700' : s === 'processing' || s === 'in_progress' ? 'text-warning-700' : s === 'failed' ? 'text-danger-700' : 'text-neutral-500';
    return (
        <View style={[styles.typeBadge, { backgroundColor: bg }]}>
            <Text className={`font-inter text-[10px] font-bold uppercase ${textCls}`}>{status}</Text>
        </View>
    );
}

// ============ TYPE BADGE ============

function TypeBadge({ type }: { type: string }) {
    const isForm16 = type?.toLowerCase().includes('16');
    const bg = isForm16 ? colors.primary[50] : colors.accent[50];
    const textCls = isForm16 ? 'text-primary-700' : 'text-accent-700';
    return (
        <View style={[styles.typeBadge, { backgroundColor: bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${textCls}`}>{type}</Text>
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({ options, value, onSelect, labels }: { options: string[]; value: string; onSelect: (v: string) => void; labels?: Record<string, string> }) {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map(opt => {
                const selected = opt === value;
                return (
                    <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{labels?.[opt] ?? opt}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ============ INFO ROW ============

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
    return (
        <View style={styles.infoRow}>
            <Text className="font-inter text-xs text-neutral-500">{label}</Text>
            {typeof value === 'string' ? <Text className="font-inter text-xs font-bold text-primary-950">{value}</Text> : value}
        </View>
    );
}

// ============ FILING CARD ============

function FilingCard({ item, index }: { item: any; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <TypeBadge type={item.type ?? item.formType ?? 'Form 16'} />
                    <StatusBadge status={item.status ?? 'Pending'} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">FY: {item.financialYear ?? '—'}</Text>
                    </View>
                    {item.quarter ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">Q{item.quarter}</Text>
                        </View>
                    ) : null}
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Records: {item.employeeCount ?? item.deducteeCount ?? item.recordCount ?? '—'}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function Form16Screen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedFY, setSelectedFY] = React.useState('2025-26');
    const [selectedQuarter, setSelectedQuarter] = React.useState('1');

    const { data: filingsRes, isLoading, error, refetch, isFetching } = useStatutoryFilings({ financialYear: selectedFY } as any);
    const generateForm16 = useGenerateForm16();
    const generateForm24Q = useGenerateForm24Q();
    const bulkEmail = useBulkEmailForm16();

    const filings: any[] = React.useMemo(() => {
        const raw = (filingsRes as any)?.data ?? filingsRes ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [filingsRes]);

    const form16Filings = React.useMemo(() => filings.filter((f: any) => f.type?.toLowerCase().includes('16')), [filings]);
    const form24QFilings = React.useMemo(() => filings.filter((f: any) => f.type?.toLowerCase().includes('24')), [filings]);

    const handleGenerateForm16 = () => {
        generateForm16.mutate({ financialYear: selectedFY });
    };

    const handleGenerateForm24Q = () => {
        generateForm24Q.mutate({ quarter: Number(selectedQuarter), financialYear: selectedFY });
    };

    const handleBulkEmail = () => {
        bulkEmail.mutate({ financialYear: selectedFY });
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950">Form 16 / 24Q</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">Statutory tax filings</Text>
            </View>

            {/* FY Selector */}
            <View style={{ marginTop: 16 }}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900">Financial Year</Text>
                <ChipSelector options={FINANCIAL_YEARS} value={selectedFY} onSelect={setSelectedFY} labels={{ '2024-25': 'FY 2024-25', '2025-26': 'FY 2025-26', '2026-27': 'FY 2026-27' }} />
            </View>

            {/* Form 16 Section */}
            <View style={[styles.sectionCard, { marginTop: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary[50] }]}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <View>
                        <Text className="font-inter text-sm font-bold text-primary-950">Form 16</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Annual TDS certificate</Text>
                    </View>
                </View>
                <InfoRow label="Financial Year" value={selectedFY} />
                {form16Filings.length > 0 && (
                    <>
                        <InfoRow label="Employees" value={String(form16Filings[0]?.employeeCount ?? '—')} />
                        <InfoRow label="Status" value={<StatusBadge status={form16Filings[0]?.status ?? 'Pending'} />} />
                    </>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable onPress={handleGenerateForm16} disabled={generateForm16.isPending} style={[styles.primaryBtn, generateForm16.isPending && { opacity: 0.5 }]}>
                        <Text className="font-inter text-xs font-bold text-white">{generateForm16.isPending ? 'Generating...' : 'Generate'}</Text>
                    </Pressable>
                    <Pressable onPress={handleBulkEmail} disabled={bulkEmail.isPending || form16Filings.length === 0} style={[styles.outlineBtn, (bulkEmail.isPending || form16Filings.length === 0) && { opacity: 0.5 }]}>
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M22 6l-10 7L2 6" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="ml-1 font-inter text-xs font-bold text-primary-700">{bulkEmail.isPending ? 'Sending...' : 'Email All'}</Text>
                    </Pressable>
                </View>
            </View>

            {/* Form 24Q Section */}
            <View style={[styles.sectionCard, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.accent[50] }]}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <View>
                        <Text className="font-inter text-sm font-bold text-primary-950">Form 24Q</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Quarterly TDS return</Text>
                    </View>
                </View>
                <View style={{ marginBottom: 12 }}>
                    <Text className="mb-2 font-inter text-xs font-bold text-primary-900">Quarter</Text>
                    <ChipSelector options={QUARTERS} value={selectedQuarter} onSelect={setSelectedQuarter} labels={QUARTER_LABELS} />
                </View>
                {form24QFilings.length > 0 && (
                    <>
                        <InfoRow label="Deductees" value={String(form24QFilings[0]?.deducteeCount ?? '—')} />
                        <InfoRow label="Total TDS" value={form24QFilings[0]?.totalTds ? `\u20B9${Number(form24QFilings[0].totalTds).toLocaleString('en-IN')}` : '—'} />
                    </>
                )}
                <Pressable onPress={handleGenerateForm24Q} disabled={generateForm24Q.isPending} style={[styles.accentBtn, generateForm24Q.isPending && { opacity: 0.5 }]}>
                    <Text className="font-inter text-xs font-bold text-white">{generateForm24Q.isPending ? 'Generating...' : `Generate Q${selectedQuarter}`}</Text>
                </Pressable>
            </View>

            {/* Filing History Header */}
            {filings.length > 0 && (
                <Text className="mt-6 mb-2 font-inter text-sm font-bold text-primary-950">Filing History</Text>
            )}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load filings" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return null; // No empty state needed since the action cards are always visible
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Form 16 / 24Q</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filings}
                renderItem={({ item, index }) => <FilingCard item={item} index={index} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    iconCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[50] },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    primaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
    accentBtn: { height: 44, borderRadius: 12, backgroundColor: colors.accent[600], justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: colors.accent[500], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 44, borderRadius: 12, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
});
