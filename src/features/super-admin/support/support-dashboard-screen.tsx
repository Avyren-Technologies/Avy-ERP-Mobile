/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import {
    usePlatformSupportStats,
    usePlatformSupportTickets,
} from '@/features/super-admin/api/use-support-queries';

// ============ TYPES ============

interface StatCard {
    label: string;
    key: string;
    color: string;
    bg: string;
    iconType: 'open' | 'progress' | 'waiting' | 'resolved';
}

const STAT_CARDS: StatCard[] = [
    { label: 'Open', key: 'open', color: colors.info[600], bg: colors.info[50], iconType: 'open' },
    { label: 'In Progress', key: 'inProgress', color: colors.warning[600], bg: colors.warning[50], iconType: 'progress' },
    { label: 'Waiting', key: 'waiting', color: colors.accent[600], bg: colors.accent[50], iconType: 'waiting' },
    { label: 'Resolved Today', key: 'resolvedToday', color: colors.success[600], bg: colors.success[50], iconType: 'resolved' },
];

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'] as const;
const CATEGORY_FILTERS = ['All', 'Module Change', 'Billing', 'Technical', 'General'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const STATUS_MAP: Record<string, string> = {
    'All': '',
    'Open': 'OPEN',
    'In Progress': 'IN_PROGRESS',
    'Waiting': 'WAITING',
    'Resolved': 'RESOLVED',
    'Closed': 'CLOSED',
};

const CATEGORY_MAP: Record<string, string> = {
    'All': '',
    'Module Change': 'MODULE_CHANGE',
    'Billing': 'BILLING',
    'Technical': 'TECHNICAL',
    'General': 'GENERAL',
};

// ============ ICONS ============

function StatIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'open':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
                    <Path d="M12 8v4M12 16h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            );
        case 'progress':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
                    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            );
        case 'waiting':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
                    <Path d="M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            );
        case 'resolved':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
                    <Path d="M8 12l2.5 2.5L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        default:
            return null;
    }
}

function TicketIcon() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
                d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z"
                stroke={colors.neutral[400]}
                strokeWidth={1.5}
                fill="none"
            />
            <Path d="M13 2v7h7" stroke={colors.neutral[400]} strokeWidth={1.5} />
        </Svg>
    );
}

// ============ HELPERS ============

function getRelativeTime(dateStr: string, fmtDate: (iso: string) => string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return fmtDate(dateStr);
}

function getStatusBadgeStyle(status: string) {
    switch (status) {
        case 'OPEN': return { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] };
        case 'IN_PROGRESS': return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] };
        case 'WAITING': return { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] };
        case 'RESOLVED': return { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] };
        case 'CLOSED': return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
        default: return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
    }
}

function getPriorityBadgeStyle(priority: string) {
    switch (priority) {
        case 'HIGH':
        case 'URGENT': return { bg: colors.danger[50], text: colors.danger[700] };
        case 'MEDIUM': return { bg: colors.warning[50], text: colors.warning[700] };
        case 'LOW': return { bg: colors.neutral[100], text: colors.neutral[600] };
        default: return { bg: colors.neutral[100], text: colors.neutral[600] };
    }
}

function formatStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCategoryLabel(category: string): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============ SUB-COMPONENTS ============

function StatsRow({ stats }: { stats: any }) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
        >
            {STAT_CARDS.map((card, index) => (
                <Animated.View
                    key={card.key}
                    entering={FadeInDown.delay(index * 80).duration(400)}
                    style={[styles.statCard, { borderColor: card.bg }]}
                >
                    <View style={[styles.statIconWrap, { backgroundColor: card.bg }]}>
                        <StatIcon type={card.iconType} color={card.color} />
                    </View>
                    <Text className="font-inter text-xl font-bold" style={{ color: card.color }}>
                        {stats?.[card.key] ?? 0}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-500">{card.label}</Text>
                </Animated.View>
            ))}
        </ScrollView>
    );
}

function FilterChips<T extends string>({
    items,
    selected,
    onSelect,
}: {
    items: readonly T[];
    selected: T;
    onSelect: (item: T) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
        >
            {items.map((item) => {
                const isActive = selected === item;
                return (
                    <Pressable
                        key={item}
                        onPress={() => onSelect(item)}
                        style={[
                            styles.chip,
                            isActive && styles.chipActive,
                        ]}
                    >
                        <Text
                            className="font-inter text-xs font-semibold"
                            style={{ color: isActive ? '#fff' : colors.neutral[600] }}
                        >
                            {item}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

function TicketCard({ ticket, onPress }: { ticket: any; onPress: () => void }) {
    const fmt = useCompanyFormatter();
    const statusStyle = getStatusBadgeStyle(ticket.status);
    const priorityStyle = getPriorityBadgeStyle(ticket.priority);
    const isModuleChange = ticket.category === 'MODULE_CHANGE';

    return (
        <Pressable onPress={onPress} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
                <View style={styles.ticketTitleRow}>
                    {isModuleChange && (
                        <Text className="font-inter text-sm" style={{ marginRight: 4 }}>
                            {'\u26A1'}
                        </Text>
                    )}
                    <Text
                        className="font-inter text-sm font-bold text-neutral-800"
                        numberOfLines={1}
                        style={styles.ticketSubject}
                    >
                        {ticket.subject}
                    </Text>
                </View>
                <Text className="font-inter text-[11px] text-neutral-400">
                    {getRelativeTime(ticket.createdAt ?? ticket.updatedAt, fmt.date)}
                </Text>
            </View>

            <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>
                {ticket.companyName ?? ticket.company?.name ?? 'Unknown Company'}
            </Text>

            <View style={styles.ticketBadges}>
                {/* Category chip */}
                <View style={[styles.badge, { backgroundColor: colors.neutral[100] }]}>
                    <Text className="font-inter text-[10px] font-semibold text-neutral-600">
                        {formatCategoryLabel(ticket.category)}
                    </Text>
                </View>

                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                    <View style={[styles.badgeDot, { backgroundColor: statusStyle.dot }]} />
                    <Text className="font-inter text-[10px] font-bold" style={{ color: statusStyle.text }}>
                        {formatStatusLabel(ticket.status)}
                    </Text>
                </View>

                {/* Priority badge */}
                {ticket.priority && (
                    <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: priorityStyle.text }}>
                            {ticket.priority}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

// ============ MAIN SCREEN ============

export function SupportDashboardScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('All');
    const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('All');
    const [page, setPage] = React.useState(1);

    const { toggle } = useSidebar();
    const statsQuery = usePlatformSupportStats();
    const ticketsQuery = usePlatformSupportTickets({
        status: STATUS_MAP[statusFilter] || undefined,
        category: CATEGORY_MAP[categoryFilter] || undefined,
        page,
    });

    const ticketsData = ticketsQuery.data as any;
    const tickets = ticketsData?.data ?? ticketsData?.tickets ?? ticketsData ?? [];
    const ticketList = Array.isArray(tickets) ? tickets : [];
    const stats = statsQuery.data?.data ?? statsQuery.data ?? {};

    const handleStatusChange = React.useCallback((status: StatusFilter) => {
        setStatusFilter(status);
        setPage(1);
    }, []);

    const handleCategoryChange = React.useCallback((category: CategoryFilter) => {
        setCategoryFilter(category);
        setPage(1);
    }, []);

    const handleRefresh = React.useCallback(() => {
        statsQuery.refetch();
        ticketsQuery.refetch();
    }, [statsQuery, ticketsQuery]);

    const handleLoadMore = React.useCallback(() => {
        if (!ticketsQuery.isFetching) {
            setPage(p => p + 1);
        }
    }, [ticketsQuery.isFetching]);

    const renderTicket = React.useCallback(
        ({ item, index }: { item: any; index: number }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
                <TicketCard
                    ticket={item}
                    onPress={() => router.push(`/support/ticket/${item.id}` as any)}
                />
            </Animated.View>
        ),
        [router],
    );

    const isLoading = statsQuery.isLoading || ticketsQuery.isLoading;
    const isRefreshing = statsQuery.isRefetching || ticketsQuery.isRefetching;

    return (
        <View style={styles.screen}>
            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <View style={styles.headerTitleWrap}>
                        <Text className="font-inter text-xl font-bold text-white">Support Dashboard</Text>
                        <Text className="font-inter text-xs text-white/70">Manage platform tickets</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <FlashList
                data={ticketList}
                keyExtractor={(item) => item.id}
                renderItem={renderTicket}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary[500]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={
                    <View>
                        {/* Stats Row */}
                        {isLoading ? (
                            <View style={styles.loadingWrap}>
                                <ActivityIndicator size="small" color={colors.primary[500]} />
                            </View>
                        ) : (
                            <StatsRow stats={stats} />
                        )}

                        {/* Filters */}
                        <View style={styles.filterSection}>
                            <Text className="font-inter text-xs font-semibold text-neutral-400" style={styles.filterLabel}>
                                STATUS
                            </Text>
                            <FilterChips
                                items={STATUS_FILTERS}
                                selected={statusFilter}
                                onSelect={handleStatusChange}
                            />
                            <Text className="font-inter text-xs font-semibold text-neutral-400" style={[styles.filterLabel, { marginTop: 8 }]}>
                                CATEGORY
                            </Text>
                            <FilterChips
                                items={CATEGORY_FILTERS}
                                selected={categoryFilter}
                                onSelect={handleCategoryChange}
                            />
                        </View>

                        {/* Section title */}
                        <View style={styles.sectionHeader}>
                            <TicketIcon />
                            <Text className="font-inter text-sm font-bold text-neutral-700">
                                Tickets
                            </Text>
                            {ticketsQuery.isFetching && !isRefreshing && (
                                <ActivityIndicator size="small" color={colors.primary[400]} style={{ marginLeft: 8 }} />
                            )}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="inbox"
                            title="No tickets found"
                            message="Try adjusting your filters or check back later."
                        />
                    ) : null
                }
                ListFooterComponent={
                    ticketsQuery.isFetching && ticketList.length > 0 ? (
                        <View style={styles.footerLoading}>
                            <ActivityIndicator size="small" color={colors.primary[400]} />
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: 12,
    },
    statsContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
        gap: 10,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        width: 130,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterSection: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
    },
    filterLabel: {
        marginBottom: 6,
        letterSpacing: 1,
    },
    chipRow: {
        gap: 8,
        paddingBottom: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    listContent: {
        paddingBottom: 40,
    },
    ticketCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 14,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    ticketTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    ticketSubject: {
        flex: 1,
    },
    ticketBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    badgeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    loadingWrap: {
        padding: 40,
        alignItems: 'center',
    },
    footerLoading: {
        padding: 20,
        alignItems: 'center',
    },
});
