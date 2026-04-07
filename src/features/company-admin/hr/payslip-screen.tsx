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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmailPayslip } from '@/features/company-admin/api/use-payroll-run-mutations';
import { usePayslip, usePayslips } from '@/features/company-admin/api/use-payroll-run-queries';

// ============ TYPES ============

interface PayslipItem {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    month: number;
    year: number;
    netPay: number;
    grossPay: number;
    totalDeductions: number;
    emailed: boolean;
    earnings: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
    employerContributions: { label: string; amount: number }[];
}

// ============ CONSTANTS ============

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

function AvatarCircle({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatar}>
            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

// ============ PAYSLIP TABLE ============

function PayslipTable({ title, items, color }: { title: string; items: { label: string; amount: number }[]; color: string }) {
    if (!items || items.length === 0) return null;
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    return (
        <View style={styles.tableCard}>
            <Text className="font-inter text-xs font-bold uppercase tracking-wider mb-2" style={{ color }}>{title}</Text>
            {items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                    <Text className="font-inter text-xs text-neutral-600 flex-1">{item.label}</Text>
                    <Text className="font-inter text-xs font-semibold text-primary-950">{formatCurrency(item.amount)}</Text>
                </View>
            ))}
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.neutral[200], marginTop: 4, paddingTop: 8 }]}>
                <Text className="font-inter text-xs font-bold text-primary-950">Total</Text>
                <Text className="font-inter text-sm font-bold" style={{ color }}>{formatCurrency(total)}</Text>
            </View>
        </View>
    );
}

// ============ DETAIL VIEW ============

function PayslipDetail({ payslip, onBack, onEmail, isEmailing }: {
    payslip: PayslipItem; onBack: () => void; onEmail: () => void; isEmailing: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Payslip</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    {/* Employee Header */}
                    <View style={styles.detailHeader}>
                        <AvatarCircle name={payslip.employeeName} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text className="font-inter text-base font-bold text-primary-950">{payslip.employeeName}</Text>
                            <Text className="font-inter text-xs text-neutral-500">{payslip.employeeCode}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text className="font-inter text-xs text-neutral-400">{MONTH_LABELS[payslip.month - 1]} {payslip.year}</Text>
                            {payslip.emailed && (
                                <View style={[styles.emailedBadge, { marginTop: 4 }]}>
                                    <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Emailed</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Net Pay Banner */}
                    <View style={styles.netPayBanner}>
                        <Text className="font-inter text-xs text-neutral-500">Net Pay</Text>
                        <Text className="font-inter text-2xl font-bold text-primary-800">{formatCurrency(payslip.netPay)}</Text>
                    </View>

                    {/* Earnings */}
                    <PayslipTable title="Earnings" items={payslip.earnings} color={colors.success[600]} />

                    {/* Deductions */}
                    <PayslipTable title="Deductions" items={payslip.deductions} color={colors.danger[600]} />

                    {/* Employer Contributions */}
                    <PayslipTable title="Employer Contributions" items={payslip.employerContributions} color={colors.info[600]} />

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onEmail} disabled={isEmailing} style={[styles.actionBtn, { backgroundColor: colors.primary[600] }, isEmailing && { opacity: 0.5 }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke={colors.white} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-sm font-bold text-white">{isEmailing ? 'Sending...' : 'Email Payslip'}</Text>
                        </Pressable>
                        <Pressable style={[styles.actionBtn, { backgroundColor: colors.neutral[100] }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={colors.neutral[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-sm font-semibold text-neutral-600">Download</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ============ PAYSLIP CARD ============

function PayslipCard({ item, index, onPress }: { item: PayslipItem; index: number; onPress: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 50)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="font-inter text-[10px] text-neutral-500">{MONTH_LABELS[item.month - 1]} {item.year}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-sm font-bold text-primary-800">{formatCurrency(item.netPay)}</Text>
                        {item.emailed && (
                            <View style={styles.emailedBadge}>
                                <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Emailed</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function PayslipScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const now = new Date();
    const [filterMonth, setFilterMonth] = React.useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = React.useState(now.getFullYear());
    const [search, setSearch] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    const { data: response, isLoading, error, refetch, isFetching } = usePayslips({ month: filterMonth, year: filterYear } as any);
    const { data: detailResponse } = usePayslip(selectedId ?? '');
    const emailMutation = useEmailPayslip();

    const payslips: PayslipItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            employeeCode: item.employeeCode ?? '',
            month: item.month ?? filterMonth,
            year: item.year ?? filterYear,
            netPay: item.netPay ?? 0,
            grossPay: item.grossPay ?? 0,
            totalDeductions: item.totalDeductions ?? 0,
            emailed: item.emailed ?? false,
            earnings: Array.isArray(item.earnings) ? item.earnings : [],
            deductions: Array.isArray(item.deductions) ? item.deductions : [],
            employerContributions: Array.isArray(item.employerContributions) ? item.employerContributions : [],
        }));
    }, [response, filterMonth, filterYear]);

    const selectedPayslip: PayslipItem | null = React.useMemo(() => {
        if (!selectedId) return null;
        const raw = (detailResponse as any)?.data ?? detailResponse;
        if (raw) return {
            id: raw.id ?? '',
            employeeId: raw.employeeId ?? '',
            employeeName: raw.employeeName ?? '',
            employeeCode: raw.employeeCode ?? '',
            month: raw.month ?? filterMonth,
            year: raw.year ?? filterYear,
            netPay: raw.netPay ?? 0,
            grossPay: raw.grossPay ?? 0,
            totalDeductions: raw.totalDeductions ?? 0,
            emailed: raw.emailed ?? false,
            earnings: Array.isArray(raw.earnings) ? raw.earnings : [],
            deductions: Array.isArray(raw.deductions) ? raw.deductions : [],
            employerContributions: Array.isArray(raw.employerContributions) ? raw.employerContributions : [],
        };
        return payslips.find(p => p.id === selectedId) ?? null;
    }, [selectedId, detailResponse, payslips, filterMonth, filterYear]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return payslips;
        const q = search.toLowerCase();
        return payslips.filter(p => p.employeeName.toLowerCase().includes(q) || p.employeeCode.toLowerCase().includes(q));
    }, [payslips, search]);

    const handleEmail = () => {
        if (!selectedId) return;
        showConfirm({
            title: 'Email Payslip',
            message: `Send payslip to ${selectedPayslip?.employeeName}?`,
            confirmText: 'Send', variant: 'primary',
            onConfirm: () => { emailMutation.mutate(selectedId); },
        });
    };

    // Detail view
    if (selectedPayslip) {
        return (
            <>
                <PayslipDetail payslip={selectedPayslip} onBack={() => setSelectedId(null)} onEmail={handleEmail} isEmailing={emailMutation.isPending} />
                <ConfirmModal {...confirmModalProps} />
            </>
        );
    }

    // List view
    const renderItem = ({ item, index }: { item: PayslipItem; index: number }) => (
        <PayslipCard item={item} index={index} onPress={() => setSelectedId(item.id)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Payslips</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{payslips.length} payslip{payslips.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}>
                <MonthYearPicker month={filterMonth} year={filterYear} onMonthChange={setFilterMonth} onYearChange={setFilterYear} />
            </View>
            <View style={{ marginTop: 12 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name or code..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load payslips" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No payslips match your search." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No payslips" message="No payslips found for this period." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Payslips" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    emailedBadge: { backgroundColor: colors.success[50], borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    monthYearPicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    // Detail
    detailHeader: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    netPayBanner: {
        backgroundColor: colors.primary[50], borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16,
    },
    tableCard: {
        backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    actionBtn: {
        flex: 1, flexDirection: 'row', height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
    },
});
