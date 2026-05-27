import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useBreakdowns, useRecurringFailures } from '@/features/maintenance/api/use-maintenance-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useResolveBreakdown } from '@/features/maintenance/api/use-maintenance-mutations';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Status badge ── */

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    OPEN: { label: 'Open', bgColor: colors.danger[50], textColor: colors.danger[700] },
    DRAFT: { label: 'Draft', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    PLANNED: { label: 'Planned', bgColor: colors.info[50], textColor: colors.info[700] },
    APPROVED: { label: 'Approved', bgColor: '#ECFDF5', textColor: '#047857' },
    ASSIGNED: { label: 'Assigned', bgColor: '#EFF6FF', textColor: '#1D4ED8' },
    ACKNOWLEDGED: { label: 'Acknowledged', bgColor: '#F0FDF4', textColor: '#15803D' },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700] },
    RESOLVED: { label: 'Resolved', bgColor: colors.success[50], textColor: colors.success[700] },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
};

function BreakdownStatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Live timer ── */

function LiveTimer({ startedAt }: { startedAt: string }) {
    const [elapsed, setElapsed] = React.useState('');

    React.useEffect(() => {
        const start = new Date(startedAt).getTime();
        const tick = () => {
            const diff = Date.now() - start;
            if (diff <= 0) {
                setElapsed('0s');
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            const parts = [];
            if (h > 0) parts.push(`${h}h`);
            if (m > 0) parts.push(`${m}m`);
            if (s > 0 || parts.length === 0) parts.push(`${s}s`);
            setElapsed(parts.join(' '));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startedAt]);

    return (
        <View style={[badgeStyles.badge, { backgroundColor: colors.danger[50] }]}>
            <Text className="font-inter font-bold" style={[badgeStyles.label, { color: colors.danger[700] }]}>{elapsed}</Text>
        </View>
    );
}

function getMobileDowntimeDuration(item: any): string {
    const start = item.downtimeStart || item.reportedAt || item.createdAt;
    const end = item.downtimeEnd || item.actualEnd || item.closedAt;
    if (!start || !end) return '---';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff <= 0) return '0s';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

/* ── Filters ── */

const BD_STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' },
];

/* ── Card ── */

function BreakdownCard({
    item,
    index,
    isDark,
    onPress,
    fmt,
    technicianName,
    recurringPattern,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress: () => void;
    fmt: CompanyFormatter;
    technicianName?: string;
    recurringPattern?: string | null;
}) {
    const isActive = item.status === 'OPEN' || item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED';

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.danger[900] : isActive ? colors.danger[100] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-danger-700">
                            {item.workOrder?.woNumber ?? item.woNumber ?? 'BD'}
                        </Text>
                    </View>
                    <BreakdownStatusBadge status={item.status ?? 'OPEN'} />
                </View>

                <Text
                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                    numberOfLines={1}
                    style={{ marginTop: 8 }}
                >
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>

                {item.description ? (
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2} style={{ marginTop: 4 }}>
                        {item.description}
                    </Text>
                ) : null}

                {technicianName ? (
                    <Text className="font-inter text-[11px] font-semibold text-primary-700 dark:text-primary-300" style={{ marginTop: 6 }}>
                        Assigned to: {technicianName}
                    </Text>
                ) : null}

                {recurringPattern ? (
                    <View style={{
                        marginTop: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                        borderWidth: 1,
                        borderColor: isDark ? '#78350F' : '#FDE68A',
                        alignSelf: 'flex-start',
                    }}>
                        <Text className="font-inter font-bold text-[10px]" style={{ color: isDark ? '#FCD34D' : '#B45309' }}>
                            ⚠️ {recurringPattern}
                        </Text>
                    </View>
                ) : null}

                <View style={cardStyles.detailsRow}>
                    <PriorityBadge priority={item.priority ?? 'EMERGENCY'} />
                    {isActive ? (
                        (item.downtimeStart || item.reportedAt || item.createdAt) ? (
                            <LiveTimer startedAt={item.downtimeStart || item.reportedAt || item.createdAt} />
                        ) : null
                    ) : (
                        <View style={[badgeStyles.badge, { backgroundColor: isDark ? '#2D2954' : colors.neutral[100] }]}>
                            <Text className="font-inter font-bold text-[10px]" style={{ color: isDark ? colors.white : colors.neutral[600] }}>
                                {getMobileDowntimeDuration(item)}
                            </Text>
                        </View>
                    )}
                    {item.rootCauseCode || item.workOrder?.rootCauseCode ? (
                        <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>
                            Cause: {item.rootCauseCode || item.workOrder?.rootCauseCode}
                        </Text>
                    ) : null}
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.reportedAt || item.createdAt ? fmt.date(item.reportedAt || item.createdAt) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function formatDowntimeMs(ms: number): string {
    if (!ms || ms <= 0) return '---';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

function RecurringFailureCard({
    item,
    isDark,
    fmt,
}: {
    item: any;
    isDark: boolean;
    fmt: CompanyFormatter;
}) {
    const totalDt = formatDowntimeMs(item.totalDowntimeMs);

    return (
        <View
            style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.danger[900] : colors.danger[100],
                },
            ]}
        >
            <View style={cardStyles.headerRow}>
                <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]}>
                    <Text className="font-inter text-[10px] font-bold text-danger-700">
                        RECURRING
                    </Text>
                </View>
                <View style={[badgeStyles.badge, { backgroundColor: colors.danger[50] }]}>
                    <Text className="font-inter" style={[badgeStyles.label, { color: colors.danger[700] }]}>
                        {item.count ?? 0}x repeat
                    </Text>
                </View>
            </View>

            <Text
                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                numberOfLines={1}
                style={{ marginTop: 8 }}
            >
                {item.asset?.name ?? 'Unknown Asset'}
            </Text>
            <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 2 }}>
                {item.asset?.assetNumber ?? ''}
            </Text>

            <View style={{
                marginTop: 8,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: isDark ? '#2D2954' : colors.neutral[50],
                flexDirection: 'row',
                justifyContent: 'space-between',
            }}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-[10px] text-neutral-400">Failure Mode</Text>
                    <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white mt-0.5">{item.rootCauseCode ?? '---'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text className="font-inter text-[10px] text-neutral-400">Total Downtime</Text>
                    <Text className="font-inter text-xs font-bold text-danger-700 dark:text-danger-400 mt-0.5">{totalDt}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text className="font-inter text-[10px] text-neutral-400">Last Occurred:</Text>
                <Text className="font-inter text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 ml-1">
                    {item.lastOccurred ? fmt.date(item.lastOccurred) : '---'}
                </Text>
            </View>
        </View>
    );
}

/* ── Screen ── */

export function BreakdownListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [activeTab, setActiveTab] = React.useState<'list' | 'recurring'>('list');

    const statusParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useBreakdowns({
        search: search.trim() || undefined,
        status: statusParam,
    });

    const { data: recurringRes } = useRecurringFailures();
    const recurringFailures = React.useMemo(() => {
        const raw = (recurringRes as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [recurringRes]);

    const { data: closedRes } = useBreakdowns({ status: 'CLOSED', limit: 200 });
    const closedBreakdowns = React.useMemo(() => {
        const raw = (closedRes as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [closedRes]);

    const enrichedRecurringFailures = React.useMemo(() => {
        return recurringFailures.map((rf: any) => {
            const matches = closedBreakdowns.filter(
                (bd: any) =>
                    bd.assetId === rf.assetId &&
                    (bd.rootCauseCode === rf.rootCauseCode || bd.rootCause === rf.rootCauseCode)
            );

            let lastOccurred: string | null = null;
            let totalDowntimeMs = 0;

            for (const bd of matches) {
                const dateVal = bd.closedAt || bd.actualEnd || bd.createdAt;
                if (dateVal && (!lastOccurred || new Date(dateVal) > new Date(lastOccurred))) {
                    lastOccurred = dateVal;
                }

                const start = bd.downtimeStart || bd.reportedAt || bd.createdAt;
                const end = bd.downtimeEnd || bd.actualEnd || bd.closedAt;
                if (start && end) {
                    const diff = new Date(end).getTime() - new Date(start).getTime();
                    if (diff > 0) {
                        totalDowntimeMs += diff;
                    }
                }
            }

            return {
                ...rf,
                lastOccurred: lastOccurred || rf.lastOccurred || null,
                totalDowntimeMs: totalDowntimeMs || 0,
            };
        });
    }, [recurringFailures, closedBreakdowns]);

    const getRecurringPattern = React.useCallback((bd: any) => {
        const rc = bd.rootCauseCode ?? bd.workOrder?.rootCauseCode;
        if (!bd.assetId) return null;
        if (rc) {
            const match = enrichedRecurringFailures.find(rf => rf.assetId === bd.assetId && rf.rootCauseCode === rc);
            if (match) return `Recurring ${rc} pattern (${match.count}x)`;
        }
        const assetMatch = recurringFailures.find(rf => rf.assetId === bd.assetId);
        if (assetMatch) return `Recurring Asset Failure Pattern (${assetMatch.count}x)`;
        return null;
    }, [recurringFailures]);

    const { data: empRes } = useEmployees({ limit: 500 });
    const employeeOptions = React.useMemo(() => {
        const raw: any[] = (empRes as any)?.data ?? [];
        return raw.map((e: any) => ({
            id: e.id ?? '',
            name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.name || e.employeeId,
        }));
    }, [empRes]);

    const getTechName = (wo: any): string => {
        if (wo.leadTechnician) {
            const t = wo.leadTechnician;
            const full = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
            if (full || t.name) return full || t.name;
        }
        if (wo.leadTechnicianName) return wo.leadTechnicianName;
        const id = wo.leadTechnicianId ?? wo.workOrder?.leadTechnicianId;
        if (id) {
            const emp = employeeOptions.find(e => e.id === id);
            if (emp) return emp.name;
            return id;
        }
        return '';
    };

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'recurring') {
            return (
                <RecurringFailureCard
                    item={item}
                    isDark={isDark}
                    fmt={fmt}
                />
            );
        }
        return (
            <BreakdownCard
                item={item}
                index={index}
                isDark={isDark}
                fmt={fmt}
                technicianName={getTechName(item)}
                recurringPattern={getRecurringPattern(item)}
                onPress={() => {
                    if (item.workOrder?.id) {
                        router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: item.workOrder.id } });
                    } else if (item.id) {
                        router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: item.id } });
                    }
                }}
            />
        );
    };

    const subtitleText = activeTab === 'list'
        ? `${totalCount} breakdown${totalCount !== 1 ? 's' : ''}`
        : `${enrichedRecurringFailures.length} recurring pattern${enrichedRecurringFailures.length !== 1 ? 's' : ''}`;

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Breakdowns"
                    subtitle={subtitleText}
                    onMenuPress={toggle}
                />
            </Animated.View>

            <View style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#1C1936' : colors.neutral[100],
                borderRadius: 10,
                padding: 3,
                marginBottom: 16,
                marginTop: 8,
            }}>
                <Pressable
                    onPress={() => setActiveTab('list')}
                    style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: activeTab === 'list' ? (isDark ? '#2D2954' : '#fff') : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: activeTab === 'list' ? 0.05 : 0,
                        shadowRadius: 2,
                        elevation: activeTab === 'list' ? 1 : 0,
                    }}
                >
                    <Text className="font-inter text-xs font-bold" style={{ color: activeTab === 'list' ? (isDark ? colors.white : colors.primary[950]) : colors.neutral[500] }}>
                        All Breakdowns
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('recurring')}
                    style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: activeTab === 'recurring' ? (isDark ? '#2D2954' : '#fff') : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: activeTab === 'recurring' ? 0.05 : 0,
                        shadowRadius: 2,
                        elevation: activeTab === 'recurring' ? 1 : 0,
                    }}
                >
                    <Text className="font-inter text-xs font-bold" style={{ color: activeTab === 'recurring' ? (isDark ? colors.white : colors.primary[950]) : colors.neutral[500] }}>
                        Recurring Failures
                    </Text>
                </Pressable>
            </View>

            {activeTab === 'list' && (
                <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                    <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search breakdowns..."
                        filters={BD_STATUS_FILTERS}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                    />
                </Animated.View>
            )}
        </>
    );

    const renderEmpty = () => {
        if (activeTab === 'recurring') {
            return (
                <EmptyState
                    icon="search"
                    title="No recurring failures"
                    message="No assets with repeated breakdown patterns (3+ times in 30 days) detected."
                />
            );
        }
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load breakdowns"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No breakdowns found"
                message="No active breakdowns. Log a new one when equipment fails."
            />
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <FlashList
                data={activeTab === 'list' ? items : enrichedRecurringFailures}
                renderItem={renderItem}
                keyExtractor={(item, index) => activeTab === 'list' ? item.id : `${item.assetId}::${item.rootCauseCode}::${index}`}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />
            <FAB onPress={() => router.push('/maintenance/breakdown-log' as any)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    label: { fontSize: 10, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
        flexWrap: 'wrap',
    },
});
