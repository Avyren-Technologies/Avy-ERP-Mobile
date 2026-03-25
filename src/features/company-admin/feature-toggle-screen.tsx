/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useUpdateFeatureToggles } from '@/features/company-admin/api/use-company-admin-mutations';
import {
    useCompanyUsers,
    useFeatureToggleCatalogue,
    useFeatureToggles,
} from '@/features/company-admin/api/use-company-admin-queries';

// ============ TYPES ============

interface UserItem {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
}

interface FeatureToggle {
    id?: string;
    feature: string;
    enabled: boolean;
    source: 'role' | 'override' | 'default';
}

// ============ TYPES (catalogue) ============

interface CatalogueItem {
    key: string;
    label: string;
    module: string;
    description?: string;
}

// ============ HELPERS ============

function getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapApiUser(item: any): UserItem {
    return {
        id: item.id ?? '',
        fullName: item.fullName ?? item.name ?? '',
        email: item.email ?? '',
        isActive: item.isActive ?? true,
    };
}

function mapApiToggle(item: any): FeatureToggle {
    return {
        id: item.id,
        feature: item.feature ?? item.name ?? '',
        enabled: item.enabled ?? false,
        source: item.source ?? 'default',
    };
}

// ============ TOGGLE ITEM ============

function ToggleItem({
    toggle,
    onToggle,
    isPending,
}: {
    toggle: FeatureToggle;
    onToggle: (feature: string, enabled: boolean) => void;
    isPending: boolean;
}) {
    const isOverride = toggle.source === 'override';
    const isRole = toggle.source === 'role';

    return (
        <View style={toggleStyles.item}>
            <View style={{ flex: 1 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">
                    {toggle.feature}
                </Text>
                <View style={toggleStyles.sourceBadgeRow}>
                    <View
                        style={[
                            toggleStyles.sourceBadge,
                            {
                                backgroundColor: isOverride
                                    ? colors.accent[50]
                                    : isRole
                                      ? colors.info[50]
                                      : colors.neutral[100],
                            },
                        ]}
                    >
                        <Text
                            className={`font-inter text-[9px] font-bold ${
                                isOverride
                                    ? 'text-accent-700'
                                    : isRole
                                      ? 'text-info-700'
                                      : 'text-neutral-500'
                            }`}
                        >
                            {toggle.source === 'override'
                                ? 'Override'
                                : toggle.source === 'role'
                                  ? 'Role'
                                  : 'Default'}
                        </Text>
                    </View>
                </View>
            </View>
            <Switch
                value={toggle.enabled}
                onValueChange={(val) => onToggle(toggle.feature, val)}
                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                thumbColor={toggle.enabled ? colors.primary[600] : colors.neutral[300]}
                disabled={isPending}
            />
        </View>
    );
}

// ============ USER ROW (EXPANDABLE) ============

function UserRow({
    user,
    index,
    isExpanded,
    onToggleExpand,
    allToggles,
    onToggleFeature,
    isPending,
}: {
    user: UserItem;
    index: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    allToggles: FeatureToggle[];
    onToggleFeature: (userId: string, feature: string, enabled: boolean) => void;
    isPending: boolean;
}) {
    // Use per-user toggles passed from parent
    const userToggles = allToggles;

    return (
        <Animated.View entering={FadeInUp.duration(300).delay(60 + index * 40)}>
            <View style={userRowStyles.card}>
                {/* User header row */}
                <Pressable onPress={onToggleExpand} style={userRowStyles.header}>
                    <LinearGradient
                        colors={
                            user.isActive
                                ? ([colors.primary[500], colors.accent[500]] as const)
                                : ([colors.neutral[400], colors.neutral[500]] as const)
                        }
                        style={userRowStyles.avatar}
                    >
                        <Text className="font-inter text-xs font-bold text-white">
                            {getInitials(user.fullName)}
                        </Text>
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                        <Text
                            className="font-inter text-sm font-bold text-primary-950"
                            numberOfLines={1}
                        >
                            {user.fullName}
                        </Text>
                        <Text
                            className="font-inter text-xs text-neutral-500"
                            numberOfLines={1}
                        >
                            {user.email}
                        </Text>
                    </View>

                    <View style={userRowStyles.expandIndicator}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path
                                d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                </Pressable>

                {/* Expanded toggles */}
                {isExpanded && (
                    <Animated.View entering={FadeIn.duration(200)} style={userRowStyles.togglesContainer}>
                        {userToggles.length === 0 ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <Text className="font-inter text-xs text-neutral-400">
                                    No feature toggles configured
                                </Text>
                            </View>
                        ) : (
                            userToggles.map((toggle) => (
                                <ToggleItem
                                    key={`${user.id}-${toggle.feature}`}
                                    toggle={toggle}
                                    onToggle={(feature, enabled) =>
                                        onToggleFeature(user.id, feature, enabled)
                                    }
                                    isPending={isPending}
                                />
                            ))
                        )}
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function FeatureToggleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [expandedUserId, setExpandedUserId] = React.useState<string | null>(null);

    // Fetch users
    const {
        data: usersResponse,
        isLoading: usersLoading,
        error: usersError,
        refetch: refetchUsers,
        isFetching: usersFetching,
    } = useCompanyUsers({ search: search.trim() || undefined });

    const users: UserItem[] = React.useMemo(() => {
        const raw = (usersResponse as any)?.data ?? usersResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(mapApiUser);
    }, [usersResponse]);

    // Fetch feature toggle catalogue
    const {
        data: catalogueResponse,
        isLoading: catalogueLoading,
    } = useFeatureToggleCatalogue();

    const catalogue: CatalogueItem[] = React.useMemo(() => {
        const raw = (catalogueResponse as any)?.data ?? catalogueResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [catalogueResponse]);

    // Fetch toggles for the expanded user
    const {
        data: togglesResponse,
        refetch: refetchToggles,
    } = useFeatureToggles(expandedUserId ?? undefined);

    // Merge catalogue with user toggles to show all available features
    const allToggles: FeatureToggle[] = React.useMemo(() => {
        const raw = (togglesResponse as any)?.data ?? togglesResponse ?? [];
        const userToggleList: FeatureToggle[] = Array.isArray(raw) ? raw.map(mapApiToggle) : [];

        // Build a map of user's current toggles
        const toggleMap = new Map<string, FeatureToggle>();
        for (const t of userToggleList) {
            toggleMap.set(t.feature, t);
        }

        // Merge with catalogue: show catalogue items with user's state, defaults to off
        if (catalogue.length > 0) {
            const merged: FeatureToggle[] = [];
            for (const cat of catalogue) {
                const existing = toggleMap.get(cat.key);
                if (existing) {
                    merged.push(existing);
                } else {
                    merged.push({
                        feature: cat.key,
                        enabled: false,
                        source: 'default',
                    });
                }
            }
            return merged;
        }

        return userToggleList;
    }, [togglesResponse, catalogue]);

    const updateToggle = useUpdateFeatureToggles();

    const handleToggleFeature = (userId: string, feature: string, enabled: boolean) => {
        updateToggle.mutate(
            { userId, toggles: { [feature]: enabled } },
            {
                onSuccess: () => {
                    refetchToggles();
                },
            }
        );
    };

    const handleRefresh = () => {
        refetchUsers();
        if (expandedUserId) {
            refetchToggles();
        }
    };

    const isLoading = usersLoading || catalogueLoading;
    const isFetching = usersFetching;

    const renderUser = ({ item, index }: { item: UserItem; index: number }) => (
        <UserRow
            user={item}
            index={index}
            isExpanded={expandedUserId === item.id}
            onToggleExpand={() =>
                setExpandedUserId((prev) => (prev === item.id ? null : item.id))
            }
            allToggles={allToggles}
            onToggleFeature={handleToggleFeature}
            isPending={updateToggle.isPending}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                            d="M19 12H5M12 19l-7-7 7-7"
                            stroke={colors.primary[600]}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">
                        Feature Toggles
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {users.length} user{users.length !== 1 ? 's' : ''} /{' '}
                        {catalogue.length} feature{catalogue.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </Animated.View>

            {/* Search */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
                        <Circle
                            cx="11"
                            cy="11"
                            r="8"
                            stroke={colors.neutral[400]}
                            strokeWidth="1.8"
                            fill="none"
                        />
                        <Path
                            d="M21 21l-4.35-4.35"
                            stroke={colors.neutral[400]}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    </Svg>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor={colors.neutral[400]}
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Circle cx="12" cy="12" r="10" fill={colors.neutral[300]} />
                                <Path
                                    d="M15 9l-6 6M9 9l6 6"
                                    stroke={colors.white}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </Svg>
                        </Pressable>
                    )}
                </View>

                {/* Instruction */}
                <View style={styles.infoCard}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke={colors.info[500]}
                            strokeWidth="2"
                            fill="none"
                        />
                        <Path
                            d="M12 16v-4M12 8h.01"
                            stroke={colors.info[500]}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        />
                    </Svg>
                    <Text className="flex-1 font-inter text-xs text-neutral-500">
                        Tap a user to view and override their feature toggles. Role-inherited
                        toggles are shown with a "Role" badge.
                    </Text>
                </View>
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }
        if (usersError) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load data"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: handleRefresh }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No users found"
                message="Try adjusting your search."
            />
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={users}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 48,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.primary[950],
        height: '100%',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: colors.info[50],
        borderRadius: 12,
        padding: 12,
    },
    listContent: {
        paddingHorizontal: 24,
    },
});

const toggleStyles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    sourceBadgeRow: {
        flexDirection: 'row',
        marginTop: 2,
    },
    sourceBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
});

const userRowStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandIndicator: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    togglesContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
});
