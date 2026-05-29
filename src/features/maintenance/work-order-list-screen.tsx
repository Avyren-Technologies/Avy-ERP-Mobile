/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { workOrderListHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useWorkOrders } from '@/features/maintenance/api/use-maintenance-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { WOStatusBadge } from '@/features/maintenance/shared/wo-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { formatMaintenanceWoType } from '@/features/maintenance/work-order-enums';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

const WO_STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'PLANNED', label: 'Planned' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'ON_HOLD', label: 'On Hold' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CLOSED', label: 'Closed' },
];

function WOCard({
    item,
    index,
    isDark,
    onPress,
    fmt,
    employeeMap,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress: () => void;
    fmt: CompanyFormatter;
    employeeMap: Map<string, string>;
}) {
    const resolvedTechName = React.useMemo(() => {
        if (item.leadTechnician) {
            const t = item.leadTechnician;
            const full = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
            if (full || t.name) return full || t.name;
        }
        if (item.leadTechnicianName) return item.leadTechnicianName;
        if (item.leadTechnicianId) {
            return employeeMap.get(item.leadTechnicianId) || item.leadTechnicianId;
        }
        return null;
    }, [item, employeeMap]);

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {item.woNumber ?? 'WO-???'}
                        </Text>
                    </View>
                    <WOStatusBadge status={item.status ?? 'DRAFT'} />
                </View>
 
                <Text
                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                    numberOfLines={1}
                    style={{ marginTop: 8 }}
                >
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>
 
                {item.description ? (
                    <Text
                        className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                        numberOfLines={2}
                        style={{ marginTop: 4 }}
                    >
                        {item.description}
                    </Text>
                ) : null}
 
                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                            {formatMaintenanceWoType(item.woType)}
                        </Text>
                    </View>
                    <PriorityBadge priority={item.priority ?? 'MEDIUM'} />
                    {resolvedTechName ? (
                        <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1}>
                            {resolvedTechName}
                        </Text>
                    ) : null}
                    <Text
                        className="font-inter text-[10px] text-neutral-400"
                        style={{ marginLeft: 'auto' }}
                    >
                        {item.plannedStart ? fmt.date(item.plannedStart) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export function WorkOrderListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const statusParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useWorkOrders({
        search: search.trim() || undefined,
        status: statusParam,
    });

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const { data: empData } = useEmployees({ limit: 500 });
    const employeeMap = React.useMemo(() => {
        const raw: any[] = (empData as any)?.data ?? [];
        return new Map<string, string>(raw.map((e: any) => [
            e.id ?? '',
            `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.name || e.employeeId,
        ]));
    }, [empData]);

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <WOCard
            item={item}
            index={index}
            isDark={isDark}
            fmt={fmt}
            employeeMap={employeeMap}
            onPress={() => router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: item.id } })}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Work Orders"
                    subtitle={`${totalCount} order${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                    rightSlot={<HelpDrawer help={workOrderListHelp} />}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search work orders..."
                    filters={WO_STATUS_FILTERS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
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
        if (error) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load work orders"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No work orders found"
                message="Try adjusting your search or filters, or create a new work order."
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
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
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
            <FAB onPress={() => router.push('/maintenance/work-order-create' as any)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
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
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
});
