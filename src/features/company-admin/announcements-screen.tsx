/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { DashboardAnnouncement } from '@/lib/api/ess';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useDashboard } from '@/features/company-admin/api/use-ess-queries';

// ================================================================
// Icons
// ================================================================

const svgProps = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ChevronLeftIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M15 18l-6-6 6-6" /></Svg>
);

const SearchIcon = ({ s = 18, c = colors.neutral[400] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" /></Svg>
);

const MegaphoneIcon = ({ s = 16, c = colors.accent[500] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M3 11l18-5v12L3 13v-2z" /><Path d="M11.6 16.8a3 3 0 11-5.8-1.6" /></Svg>
);

const InfoIcon = ({ s = 40, c = colors.neutral[300] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><Path d="M12 16v-4M12 8h.01" /></Svg>
);

// ================================================================
// Priority helpers
// ================================================================

type Priority = DashboardAnnouncement['priority'];
const ALL_PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

function priorityConfig(priority: Priority): { bg: string; fg: string; label: string } {
    switch (priority) {
        case 'URGENT': return { bg: colors.danger[500], fg: '#FFFFFF', label: 'URGENT' };
        case 'HIGH': return { bg: colors.warning[500], fg: '#FFFFFF', label: 'HIGH' };
        case 'MEDIUM': return { bg: colors.info[100], fg: colors.info[700], label: 'MEDIUM' };
        case 'LOW':
        default: return { bg: colors.neutral[100], fg: colors.neutral[600], label: 'LOW' };
    }
}

function priorityBorder(priority: Priority): string {
    switch (priority) {
        case 'URGENT': return colors.danger[400];
        case 'HIGH': return colors.warning[400];
        case 'MEDIUM': return colors.info[200];
        default: return colors.neutral[100];
    }
}

// ================================================================
// Announcement Card
// ================================================================

function AnnouncementCard({ item, index }: { item: DashboardAnnouncement; index: number }) {
    const pConfig = priorityConfig(item.priority);
    const dateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    return (
        <Animated.View entering={FadeInDown.delay(80 + index * 60).duration(400)}>
            <View style={[styles.card, { borderLeftColor: priorityBorder(item.priority), borderLeftWidth: 4 }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg }]}>
                        <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: pConfig.fg, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            {pConfig.label}
                        </Text>
                    </View>
                    {dateStr ? (
                        <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[400] }}>
                            {dateStr}
                        </Text>
                    ) : null}
                </View>
                <Text className="font-inter text-base font-semibold" style={{ color: colors.primary[950], marginTop: 8 }}>
                    {item.title}
                </Text>
                <Text className="font-inter text-sm" style={{ color: colors.neutral[500], marginTop: 6, lineHeight: 20 }}>
                    {item.body}
                </Text>
            </View>
        </Animated.View>
    );
}

// ================================================================
// Main Screen
// ================================================================

export function AnnouncementsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [selectedPriority, setSelectedPriority] = React.useState<Priority | null>(null);
    const [pullRefreshing, setPullRefreshing] = React.useState(false);

    const { data: dashboardResponse, refetch } = useDashboard();

    const announcements: DashboardAnnouncement[] = React.useMemo(() => {
        const raw = dashboardResponse as any;
        const extracted = raw?.data?.data ?? raw?.data ?? raw;
        return extracted?.announcements ?? [];
    }, [dashboardResponse]);

    const filteredAnnouncements = React.useMemo(() => {
        let result = announcements;
        if (selectedPriority) {
            result = result.filter((a) => a.priority === selectedPriority);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(
                (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
            );
        }
        return result;
    }, [announcements, selectedPriority, search]);

    const onPullRefresh = React.useCallback(async () => {
        setPullRefreshing(true);
        try { await refetch(); } finally { setPullRefreshing(false); }
    }, [refetch]);

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInUp.duration(500)}>
                <AppTopHeader
                    title="Announcements"
                    subtitle={`${announcements.length} announcement${announcements.length !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                    rightSlot={(
                        <View style={styles.headerIconWrap}>
                            <MegaphoneIcon s={18} c="#fff" />
                        </View>
                    )}
                />
            </Animated.View>

            {/* Search bar */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchContainer}>
                <View style={styles.searchInputWrap}>
                    <SearchIcon s={16} c={colors.neutral[400]} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search announcements..."
                        placeholderTextColor={colors.neutral[400]}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </Animated.View>

            {/* Priority filter chips */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.filterRow}>
                <Pressable
                    onPress={() => setSelectedPriority(null)}
                    style={[
                        styles.filterChip,
                        !selectedPriority && styles.filterChipActive,
                    ]}
                >
                    <Text
                        className="font-inter"
                        style={[
                            styles.filterChipText,
                            !selectedPriority && styles.filterChipTextActive,
                        ]}
                    >
                        All
                    </Text>
                </Pressable>
                {ALL_PRIORITIES.map((p) => {
                    const isActive = selectedPriority === p;
                    const pConf = priorityConfig(p);
                    return (
                        <Pressable
                            key={p}
                            onPress={() => setSelectedPriority(isActive ? null : p)}
                            style={[
                                styles.filterChip,
                                isActive && { backgroundColor: pConf.bg },
                            ]}
                        >
                            <Text
                                className="font-inter"
                                style={[
                                    styles.filterChipText,
                                    isActive && { color: pConf.fg },
                                ]}
                            >
                                {p}
                            </Text>
                        </Pressable>
                    );
                })}
            </Animated.View>

            {/* Announcement list */}
            <FlatList
                data={filteredAnnouncements}
                renderItem={({ item, index }) => <AnnouncementCard item={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={pullRefreshing}
                        onRefresh={onPullRefresh}
                        tintColor={colors.primary[500]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <InfoIcon s={40} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 10 }}>
                            {search || selectedPriority ? 'No matching announcements' : 'No announcements yet'}
                        </Text>
                        <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[300], marginTop: 4 }}>
                            {search || selectedPriority ? 'Try adjusting your filters' : 'Check back later for updates'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

// ================================================================
// Styles
// ================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.primary[950],
        fontFamily: 'Inter_400Regular',
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: colors.neutral[100],
    },
    filterChipActive: {
        backgroundColor: colors.primary[500],
    },
    filterChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.neutral[500],
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        gap: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
});
