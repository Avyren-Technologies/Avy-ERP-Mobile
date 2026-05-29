/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { pmScheduleListHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePMSchedules } from '@/features/maintenance/api/use-maintenance-queries';
import { formatPMStrategyLabel } from '@/features/maintenance/pm-schedule-form';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

const STRATEGY_FILTERS = [
    { key: 'all', label: 'All Strategies' },
    { key: 'PREVENTIVE_CALENDAR', label: 'Calendar-based' },
    { key: 'PREVENTIVE_METER', label: 'Meter-based' },
    { key: 'CORRECTIVE', label: 'Corrective' },
    { key: 'CONDITION_BASED', label: 'Condition-based' },
    { key: 'PREDICTIVE', label: 'Predictive' },
    { key: 'SEASONAL', label: 'Seasonal' },
    { key: 'STATUTORY', label: 'Statutory' },
    { key: 'AMC_MANAGED', label: 'AMC-managed' },
    { key: 'RUN_TO_FAILURE', label: 'Run-to-failure' },
    { key: 'SHUTDOWN_OVERHAUL', label: 'Shutdown overhaul' },
];

const STATUS_FILTERS = [
    { key: 'all', label: 'All Statuses' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'INACTIVE', label: 'Inactive' },
];

function PMCard({ item, index, isDark, onPress, fmt }: {
    item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter;
}) {
    const isOverdue = item.isOverdue || (item.nextDueDate && new Date(item.nextDueDate) < new Date());
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50], borderLeftWidth: isOverdue ? 3 : 1, borderLeftColor: isOverdue ? colors.danger[500] : (isDark ? colors.primary[900] : colors.primary[50]) }]}>
                <View style={cardStyles.headerRow}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1 }}>
                        {item.name ?? 'PM Schedule'}
                    </Text>
                    <View style={[cardStyles.statusBadge, { backgroundColor: item.isActive !== false ? colors.success[50] : colors.neutral[100] }]}>
                        <Text className={`font-inter text-[10px] font-bold ${item.isActive !== false ? 'text-success-700' : 'text-neutral-500'}`}>
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 4 }}>
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>

                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                            {formatPMStrategyLabel(item.strategyType)}
                        </Text>
                    </View>
                    {isOverdue ? (
                        <View style={[cardStyles.overdueBadge]}>
                            <Text className="font-inter text-[10px] font-bold text-danger-700">Overdue</Text>
                        </View>
                    ) : null}
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.nextDueDate ? `Due: ${fmt.date(item.nextDueDate)}` : 'No due date'}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export function PMScheduleListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [strategyFilter, setStrategyFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [openFilterDropdown, setOpenFilterDropdown] = React.useState<string | null>(null);

    const params: Record<string, unknown> = { search: search.trim() || undefined };
    if (statusFilter === 'ACTIVE') params.isActive = true;
    if (statusFilter === 'OVERDUE') params.isOverdue = true;
    if (statusFilter === 'INACTIVE') params.isActive = false;
    if (strategyFilter !== 'all') params.strategyType = strategyFilter;

    const { data: response, isLoading, error, refetch, isFetching } = usePMSchedules(params);

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <PMCard item={item} index={index} isDark={isDark} fmt={fmt} onPress={() => router.push({ pathname: '/maintenance/pm-schedule-detail' as any, params: { id: item.id } })} />
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <EmptyState icon="search" title="No PM schedules found" message="Try adjusting your search or create a new schedule." />;
    };

    const renderDropdownFilter = (
        label: string,
        name: string,
        selectedValue: string,
        placeholder: string,
        options: { key: string; label: string }[],
        onSelect: (key: string) => void
    ) => {
        const isOpen = openFilterDropdown === name;
        const selectedLabel = options.find((o) => o.key === selectedValue)?.label;
        return (
            <View style={styles.filterField}>
                <Text className="mb-1 font-inter text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</Text>
                <Pressable
                    onPress={() => setOpenFilterDropdown(isOpen ? null : name)}
                    style={[
                        styles.filterInput,
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                        isOpen && { borderColor: colors.primary[400] },
                    ]}
                >
                    <Text className={`font-inter text-xs ${selectedValue !== 'all' ? 'text-primary-950 dark:text-white font-bold' : 'text-neutral-500'}`} numberOfLines={1}>
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Svg width={10} height={10} viewBox="0 0 24 24">
                        <Path
                            d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                            stroke={colors.neutral[400]}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                {isOpen && (
                    <View
                        style={[
                            styles.filterDropdown,
                            {
                                backgroundColor: isDark ? '#1A1730' : '#fff',
                                borderColor: isDark ? colors.primary[800] : colors.primary[200],
                            },
                        ]}
                    >
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => {
                                        onSelect(opt.key);
                                        setOpenFilterDropdown(null);
                                    }}
                                    style={[
                                        styles.filterDropdownItem,
                                        opt.key === selectedValue && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                                        idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                                    ]}
                                >
                                    <Text
                                        className={`font-inter text-xs ${opt.key === selectedValue ? 'font-bold text-primary-600' : 'text-primary-950 dark:text-white'}`}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            
            <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
                <AppTopHeader title="PM Schedules" subtitle={`${totalCount} schedule${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} rightSlot={<HelpDrawer help={pmScheduleListHelp} />} />
                
                <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search PM schedules..." />
                </View>

                {/* Dropdown Filters Row */}
                <View style={styles.filterRow}>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter(
                            'Strategy',
                            'strategy',
                            strategyFilter,
                            'All Strategies',
                            STRATEGY_FILTERS,
                            setStrategyFilter
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        {renderDropdownFilter(
                            'Status',
                            'status',
                            statusFilter,
                            'All Statuses',
                            STATUS_FILTERS,
                            setStatusFilter
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : items.length === 0 ? (
                    renderEmpty()
                ) : (
                    <FlashList
                        data={items}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
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
                )}
            </View>
            <FAB onPress={() => router.push('/maintenance/pm-schedule-create' as any)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 16,
        gap: 12,
        zIndex: 50,
    },
    filterField: {
        gap: 4,
    },
    filterInput: {
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    filterDropdown: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 100,
        borderRadius: 10,
        borderWidth: 1,
        padding: 4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    filterDropdownItem: {
        padding: 10,
        borderRadius: 6,
    },
});

const cardStyles = StyleSheet.create({
    card: { borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100], gap: 8, flexWrap: 'wrap' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    overdueBadge: { backgroundColor: colors.danger[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
