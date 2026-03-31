/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
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
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useDepartments, useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type EmployeeStatus = 'Active' | 'Probation' | 'Confirmed' | 'On Notice' | 'Exited';

interface EmployeeListItem {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    designationName: string;
    departmentName: string;
    locationName: string;
    status: EmployeeStatus;
    photoUrl?: string;
}

// ============ HELPERS ============

function getInitials(firstName: string, lastName: string): string {
    const f = firstName?.trim()?.[0] ?? '';
    const l = lastName?.trim()?.[0] ?? '';
    if (f && l) return (f + l).toUpperCase();
    if (f) return f.toUpperCase();
    return '??';
}

function statusBadgeStyle(status: EmployeeStatus) {
    switch (status) {
        case 'Active':
            return { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] };
        case 'Probation':
            return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] };
        case 'Confirmed':
            return { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] };
        case 'On Notice':
            return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[600] };
        case 'Exited':
            return { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] };
        default:
            return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
    }
}

function mapApiEmployee(item: any): EmployeeListItem {
    return {
        id: item.id ?? '',
        employeeId: item.employeeId ?? item.empId ?? item.code ?? '',
        firstName: item.firstName ?? '',
        lastName: item.lastName ?? '',
        email: item.email ?? item.personalEmail ?? '',
        designationName: item.designation?.name ?? item.designationName ?? '',
        departmentName: item.department?.name ?? item.departmentName ?? '',
        locationName: item.location?.name ?? item.locationName ?? '',
        status: item.status ?? 'Active',
        photoUrl: item.photoUrl ?? item.profilePhoto ?? undefined,
    };
}

// ============ EMPLOYEE CARD ============

function EmployeeCard({
    employee,
    index,
    onPress,
}: {
    employee: EmployeeListItem;
    index: number;
    onPress: () => void;
}) {
    const badge = statusBadgeStyle(employee.status);
    const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 40)}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
            >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    {/* Avatar */}
                    <LinearGradient
                        colors={
                            employee.status === 'Exited'
                                ? ([colors.neutral[400], colors.neutral[500]] as const)
                                : ([colors.primary[500], colors.accent[500]] as const)
                        }
                        style={styles.avatar}
                    >
                        <Text className="font-inter text-sm font-bold text-white">
                            {getInitials(employee.firstName, employee.lastName)}
                        </Text>
                    </LinearGradient>

                    {/* Name + Designation */}
                    <View style={styles.nameContainer}>
                        <View style={styles.nameRow}>
                            <Text
                                className="font-inter text-sm font-bold text-primary-950"
                                numberOfLines={1}
                                style={{ flex: 1 }}
                            >
                                {fullName || 'Unnamed'}
                            </Text>
                        </View>
                        {employee.designationName ? (
                            <Text
                                className="font-inter text-xs text-neutral-500"
                                numberOfLines={1}
                            >
                                {employee.designationName}
                            </Text>
                        ) : null}
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
                        <Text
                            style={{ color: badge.text }}
                            className="font-inter text-[10px] font-bold"
                        >
                            {employee.status}
                        </Text>
                    </View>
                </View>

                {/* Details Row */}
                <View style={styles.detailsRow}>
                    {/* Employee ID */}
                    {employee.employeeId ? (
                        <View style={styles.idBadge}>
                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                {employee.employeeId}
                            </Text>
                        </View>
                    ) : null}

                    {/* Department */}
                    {employee.departmentName ? (
                        <View style={styles.detailItem}>
                            <Svg width={11} height={11} viewBox="0 0 24 24">
                                <Path
                                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                                <Circle
                                    cx="9"
                                    cy="7"
                                    r="4"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                />
                                <Path
                                    d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </Svg>
                            <Text
                                className="font-inter text-[11px] text-neutral-600"
                                numberOfLines={1}
                            >
                                {employee.departmentName}
                            </Text>
                        </View>
                    ) : null}

                    {/* Location */}
                    {employee.locationName ? (
                        <View style={styles.detailItem}>
                            <Svg width={11} height={11} viewBox="0 0 24 24">
                                <Path
                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <Circle
                                    cx="12"
                                    cy="10"
                                    r="3"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                />
                            </Svg>
                            <Text
                                className="font-inter text-[11px] text-neutral-500"
                                numberOfLines={1}
                            >
                                {employee.locationName}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'Active', label: 'Active' },
    { key: 'Probation', label: 'Probation' },
    { key: 'Confirmed', label: 'Confirmed' },
    { key: 'On Notice', label: 'On Notice' },
    { key: 'Exited', label: 'Exited' },
];

const PAGE_SIZE = 20;

export function EmployeeDirectoryScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [deptFilter, setDeptFilter] = React.useState('');
    const [page, setPage] = React.useState(1);

    // Fetch departments for filter dropdown
    const { data: deptResponse } = useDepartments();
    const departments: { id: string; name: string }[] = React.useMemo(() => {
        const raw = (deptResponse as any)?.data ?? deptResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' }));
    }, [deptResponse]);

    // Fetch employees
    const queryParams = React.useMemo(
        () => ({
            search: search.trim() || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            departmentId: deptFilter || undefined,
            page,
            limit: PAGE_SIZE,
        }),
        [search, statusFilter, deptFilter, page],
    );

    const {
        data: response,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useEmployees(queryParams);

    const employees: EmployeeListItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(mapApiEmployee);
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? employees.length;
    const hasMore = employees.length >= PAGE_SIZE && page * PAGE_SIZE < totalCount;

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [search, statusFilter, deptFilter]);

    const handleLoadMore = () => {
        if (hasMore && !isFetching) {
            setPage((p) => p + 1);
        }
    };

    const handleEmployeePress = (employee: EmployeeListItem) => {
        router.push({
            pathname: '/company/hr/employee-detail',
            params: { id: employee.id },
        } as any);
    };

    const handleAddEmployee = () => {
        router.push({
            pathname: '/company/hr/employee-detail',
            params: { mode: 'create' },
        } as any);
    };

    // Filter chips with count on "All"
    const filterChips = React.useMemo(
        () =>
            STATUS_FILTERS.map((f) =>
                f.key === 'all' ? { ...f, count: totalCount } : f,
            ),
        [totalCount],
    );

    // Department filter chips
    const [showDeptFilter, setShowDeptFilter] = React.useState(false);

    const renderHeader = () => (
        <>
            {/* Gradient Header */}
            <Animated.View entering={FadeInDown.duration(400)}>
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
                >
                    <View style={styles.headerDecor1} />
                    <View style={styles.headerDecor2} />

                    <View style={styles.headerRow}>
                        <HamburgerButton onPress={toggle} />
                        <Text className="font-inter text-lg font-bold text-white">
                            Employee Directory
                        </Text>
                        <View style={styles.countBadge}>
                            <Text className="font-inter text-xs font-bold text-white">
                                {totalCount}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Search & Filters */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name, ID, or email..."
                    filters={filterChips}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />

                {/* Department filter row */}
                {departments.length > 0 && (
                    <View style={styles.deptFilterRow}>
                        <Pressable
                            onPress={() => setShowDeptFilter((v) => !v)}
                            style={[
                                styles.deptFilterBtn,
                                deptFilter && styles.deptFilterBtnActive,
                            ]}
                        >
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path
                                    d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
                                    stroke={deptFilter ? colors.primary[600] : colors.neutral[500]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                            <Text
                                className={`font-inter text-xs font-semibold ${deptFilter ? 'text-primary-700' : 'text-neutral-600'}`}
                                numberOfLines={1}
                            >
                                {deptFilter
                                    ? departments.find((d) => d.id === deptFilter)?.name ?? 'Department'
                                    : 'Department'}
                            </Text>
                            {deptFilter ? (
                                <Pressable
                                    onPress={() => {
                                        setDeptFilter('');
                                        setShowDeptFilter(false);
                                    }}
                                    hitSlop={8}
                                >
                                    <Svg width={14} height={14} viewBox="0 0 24 24">
                                        <Path
                                            d="M18 6L6 18M6 6l12 12"
                                            stroke={colors.primary[500]}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </Svg>
                                </Pressable>
                            ) : null}
                        </Pressable>

                        {showDeptFilter && (
                            <View style={styles.deptDropdown}>
                                {departments.map((dept) => {
                                    const isActive = dept.id === deptFilter;
                                    return (
                                        <Pressable
                                            key={dept.id}
                                            onPress={() => {
                                                setDeptFilter(dept.id);
                                                setShowDeptFilter(false);
                                            }}
                                            style={[
                                                styles.deptDropdownItem,
                                                isActive && { backgroundColor: colors.primary[50] },
                                            ]}
                                        >
                                            <Text
                                                className={`font-inter text-sm ${isActive ? 'font-semibold text-primary-700' : 'text-primary-950'}`}
                                                numberOfLines={1}
                                            >
                                                {dept.name}
                                            </Text>
                                            {isActive && (
                                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                                    <Path
                                                        d="M5 12l5 5L20 7"
                                                        stroke={colors.primary[600]}
                                                        strokeWidth="2.5"
                                                        fill="none"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </Svg>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}
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
                    <SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load employees"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No employees found"
                message={
                    search.trim() || statusFilter !== 'all' || deptFilter
                        ? 'Try adjusting your search or filters.'
                        : 'No employees have been added yet. Tap + to add one.'
                }
            />
        );
    };

    const renderEmployee = ({ item, index }: { item: EmployeeListItem; index: number }) => (
        <EmployeeCard
            employee={item}
            index={index}
            onPress={() => handleEmployeePress(item)}
        />
    );

    const renderFooter = () => {
        if (!hasMore || !isFetching) return null;
        return (
            <View style={styles.loadingFooter}>
                <SkeletonCard />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={employees}
                renderItem={renderEmployee}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />

            <FAB onPress={handleAddEmployee} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerGradient: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    searchSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 50,
    },
    deptFilterRow: {
        marginTop: 8,
        zIndex: 100,
    },
    deptFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        gap: 6,
    },
    deptFilterBtnActive: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[300],
    },
    deptDropdown: {
        position: 'absolute',
        top: 44,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary[200],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
        maxHeight: 240,
        overflow: 'hidden',
    },
    deptDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    nameContainer: {
        flex: 1,
        marginRight: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 10,
        flexWrap: 'wrap',
    },
    idBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
    },
    loadingFooter: {
        paddingVertical: 16,
    },
});
