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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { usePendingApprovals, useApprovalRequests } from '@/features/company-admin/api/use-ess-queries';
import { useApproveRequest, useRejectRequest } from '@/features/company-admin/api/use-ess-mutations';

// ============ TYPES ============

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Escalated';
type TabKey = 'pending' | 'all';

interface ApprovalRequestItem {
    id: string;
    requesterName: string;
    entityType: string;
    summary: string;
    submittedDate: string;
    status: RequestStatus;
    currentStep: number;
    totalSteps: number;
}

// ============ CONSTANTS ============

const STATUS_COLORS: Record<RequestStatus, { bg: string; text: string; dot: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    Escalated: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
};

const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
    'Leave': { bg: colors.info[50], text: colors.info[700] },
    'Attendance': { bg: colors.warning[50], text: colors.warning[700] },
    'Reimbursement': { bg: colors.success[50], text: colors.success[700] },
    'Loan': { bg: colors.primary[50], text: colors.primary[700] },
    'Overtime': { bg: colors.accent[50], text: colors.accent[700] },
    'Resignation': { bg: colors.danger[50], text: colors.danger[700] },
};

const STATUS_FILTERS: ('All' | RequestStatus)[] = ['All', 'Pending', 'Approved', 'Rejected', 'Escalated'];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: RequestStatus }) {
    const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function EntityBadge({ type }: { type: string }) {
    const c = ENTITY_COLORS[type] ?? { bg: colors.neutral[100], text: colors.neutral[700] };
    return (
        <View style={[styles.entityBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
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

function StepProgress({ current, total }: { current: number; total: number }) {
    return (
        <View style={styles.stepProgress}>
            {Array.from({ length: total }, (_, i) => (
                <View key={i} style={[styles.stepDot, i < current ? styles.stepDotDone : i === current ? styles.stepDotCurrent : styles.stepDotPending]} />
            ))}
            <Text className="ml-2 font-inter text-[10px] text-neutral-400">{current}/{total}</Text>
        </View>
    );
}

// ============ REQUEST CARD ============

function RequestCard({
    item, index, showActions, onApprove, onReject,
}: {
    item: ApprovalRequestItem; index: number;
    showActions: boolean; onApprove: () => void; onReject: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.requesterName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.requesterName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.submittedDate}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <EntityBadge type={item.entityType} />
                    <Text className="font-inter text-xs text-neutral-600 flex-1" numberOfLines={2}>{item.summary}</Text>
                </View>
                {item.totalSteps > 0 && (
                    <View style={{ marginTop: 8 }}>
                        <StepProgress current={item.currentStep} total={item.totalSteps} />
                    </View>
                )}
                {showActions && item.status === 'Pending' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onApprove} style={styles.approveBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                        <Pressable onPress={onReject} style={styles.rejectBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ApprovalRequestScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: pendingResponse, isLoading: pendingLoading, error: pendingError, refetch: pendingRefetch, isFetching: pendingFetching } = usePendingApprovals();
    const { data: allResponse, isLoading: allLoading, error: allError, refetch: allRefetch, isFetching: allFetching } = useApprovalRequests();
    const approveMutation = useApproveRequest();
    const rejectMutation = useRejectRequest();

    const [tab, setTab] = React.useState<TabKey>('pending');
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | RequestStatus>('All');

    const parseItems = (resp: any): ApprovalRequestItem[] => {
        const raw = resp?.data ?? resp ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            requesterName: item.requesterName ?? item.employeeName ?? '',
            entityType: item.entityType ?? item.type ?? '',
            summary: item.summary ?? item.description ?? '',
            submittedDate: item.submittedDate ?? item.createdAt ?? '',
            status: item.status ?? 'Pending',
            currentStep: item.currentStep ?? 0,
            totalSteps: item.totalSteps ?? 0,
        }));
    };

    const pendingItems = React.useMemo(() => parseItems(pendingResponse), [pendingResponse]);
    const allItems = React.useMemo(() => {
        let list = parseItems(allResponse);
        if (statusFilter !== 'All') list = list.filter(r => r.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r => r.requesterName.toLowerCase().includes(q) || r.entityType.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q));
        }
        return list;
    }, [allResponse, statusFilter, search]);

    const isLoading = tab === 'pending' ? pendingLoading : allLoading;
    const currentError = tab === 'pending' ? pendingError : allError;
    const refetch = tab === 'pending' ? pendingRefetch : allRefetch;
    const isFetching = tab === 'pending' ? pendingFetching : allFetching;
    const items = tab === 'pending' ? pendingItems : allItems;

    const handleApprove = (item: ApprovalRequestItem) => {
        showConfirm({
            title: 'Approve Request', message: `Approve ${item.entityType} request from ${item.requesterName}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => approveMutation.mutate({ id: item.id }),
        });
    };

    const handleReject = (item: ApprovalRequestItem) => {
        showConfirm({
            title: 'Reject Request', message: `Reject ${item.entityType} request from ${item.requesterName}?`,
            confirmText: 'Reject', variant: 'danger',
            onConfirm: () => rejectMutation.mutate({ id: item.id }),
        });
    };

    const renderItem = ({ item, index }: { item: ApprovalRequestItem; index: number }) => (
        <RequestCard item={item} index={index} showActions={tab === 'pending'} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Approval Queue</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} request{items.length !== 1 ? 's' : ''}</Text>
            {/* Tab Selector */}
            <View style={styles.tabRow}>
                {(['pending', 'all'] as TabKey[]).map(t => {
                    const active = t === tab;
                    const label = t === 'pending' ? `Pending (${pendingItems.length})` : 'All Requests';
                    return (
                        <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, active && styles.tabBtnActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            {tab === 'all' && (
                <>
                    <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search requests..." /></View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                        {STATUS_FILTERS.map(s => {
                            const active = s === statusFilter;
                            return (
                                <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                                    <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{s}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </>
            )}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (currentError) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (tab === 'pending') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="All caught up" message="No pending approvals." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No requests" message="No approval requests found." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Approval Queue</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
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
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    tabRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' },
    tabBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    entityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    stepProgress: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepDot: { width: 8, height: 8, borderRadius: 4 },
    stepDotDone: { backgroundColor: colors.success[500] },
    stepDotCurrent: { backgroundColor: colors.primary[500] },
    stepDotPending: { backgroundColor: colors.neutral[200] },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.success[600] },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
