/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusBadge } from '@/components/ui/status-badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ TYPES ============

type TenantStatus = 'active' | 'trial' | 'suspended' | 'expired';

interface CompanyItem {
    id: string;
    name: string;
    industry: string;
    status: TenantStatus;
    userCount: number;
    maxUsers: number;
    moduleCount: number;
    tier: string;
    adminEmail: string;
    serverType: 'default' | 'custom';
    createdAt: string;
}

// ============ MOCK DATA ============

const MOCK_COMPANIES: CompanyItem[] = [
    {
        id: '1',
        name: 'Apex Manufacturing Pvt. Ltd',
        industry: 'Automotive',
        status: 'active',
        userCount: 156,
        maxUsers: 200,
        moduleCount: 7,
        tier: 'Growth',
        adminEmail: 'admin@apexmfg.com',
        serverType: 'default',
        createdAt: '2025-06-15',
    },
    {
        id: '2',
        name: 'Steel Dynamics Industries',
        industry: 'Steel & Metal',
        status: 'active',
        userCount: 412,
        maxUsers: 500,
        moduleCount: 9,
        tier: 'Scale',
        adminEmail: 'it@steeldynamics.in',
        serverType: 'custom',
        createdAt: '2025-03-22',
    },
    {
        id: '3',
        name: 'Sahara Industries Ltd',
        industry: 'Textiles',
        status: 'trial',
        userCount: 23,
        maxUsers: 100,
        moduleCount: 4,
        tier: 'Starter',
        adminEmail: 'ops@saharaindustries.co.in',
        serverType: 'default',
        createdAt: '2026-02-28',
    },
    {
        id: '4',
        name: 'Indo Metals Corporation',
        industry: 'Metal Fabrication',
        status: 'active',
        userCount: 89,
        maxUsers: 100,
        moduleCount: 6,
        tier: 'Starter',
        adminEmail: 'admin@indometals.com',
        serverType: 'default',
        createdAt: '2025-09-10',
    },
    {
        id: '5',
        name: 'Precision Machining Corp',
        industry: 'CNC Machining',
        status: 'suspended',
        userCount: 0,
        maxUsers: 200,
        moduleCount: 5,
        tier: 'Growth',
        adminEmail: 'info@precmach.in',
        serverType: 'default',
        createdAt: '2025-01-05',
    },
    {
        id: '6',
        name: 'GreenTech Polymers',
        industry: 'Plastics',
        status: 'expired',
        userCount: 0,
        maxUsers: 100,
        moduleCount: 3,
        tier: 'Starter',
        adminEmail: 'admin@greentechpoly.com',
        serverType: 'default',
        createdAt: '2024-11-20',
    },
    {
        id: '7',
        name: 'Rathi Engineering Works',
        industry: 'Heavy Engineering',
        status: 'active',
        userCount: 245,
        maxUsers: 500,
        moduleCount: 8,
        tier: 'Scale',
        adminEmail: 'erp@rathiengg.com',
        serverType: 'custom',
        createdAt: '2025-04-18',
    },
    {
        id: '8',
        name: 'Vishwa Electronics',
        industry: 'Electronics',
        status: 'trial',
        userCount: 12,
        maxUsers: 50,
        moduleCount: 3,
        tier: 'Starter',
        adminEmail: 'cto@vishwaelec.in',
        serverType: 'default',
        createdAt: '2026-03-01',
    },
];

const FILTER_CHIPS = [
    { key: 'all', label: 'All', count: MOCK_COMPANIES.length },
    { key: 'active', label: 'Active', count: MOCK_COMPANIES.filter(c => c.status === 'active').length },
    { key: 'trial', label: 'Trial', count: MOCK_COMPANIES.filter(c => c.status === 'trial').length },
    { key: 'suspended', label: 'Suspended', count: MOCK_COMPANIES.filter(c => c.status === 'suspended').length },
    { key: 'expired', label: 'Expired', count: MOCK_COMPANIES.filter(c => c.status === 'expired').length },
];

// ============ COMPANY CARD ============

function CompanyCard({ company, index }: { company: CompanyItem; index: number }) {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/(app)/tenant/${company.id}`);
    };

    const usagePercent = company.maxUsers > 0 ? (company.userCount / company.maxUsers) * 100 : 0;
    const usageColor = usagePercent > 80 ? colors.warning[500] : colors.success[500];

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                ]}
            >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={styles.companyInfo}>
                        {/* Company Initial Avatar */}
                        <LinearGradient
                            colors={company.status === 'active'
                                ? [colors.primary[500], colors.accent[500]] as const
                                : company.status === 'trial'
                                    ? [colors.info[400], colors.info[600]] as const
                                    : [colors.neutral[400], colors.neutral[500]] as const
                            }
                            style={styles.companyAvatar}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {company.name.substring(0, 2).toUpperCase()}
                            </Text>
                        </LinearGradient>

                        <View style={styles.companyNameContainer}>
                            <Text
                                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                numberOfLines={1}
                            >
                                {company.name}
                            </Text>
                            <View style={styles.industryRow}>
                                <Text className="font-inter text-xs text-neutral-500">
                                    {company.industry}
                                </Text>
                                {company.serverType === 'custom' && (
                                    <View style={styles.customServerTag}>
                                        <Text className="font-inter text-[9px] font-bold text-info-700">
                                            SELF-HOSTED
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                    <StatusBadge status={company.status} size="sm" />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path
                                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <Circle cx="9" cy="7" r="4" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-neutral-600">
                            {company.userCount}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-400">
                            / {company.maxUsers}
                        </Text>
                    </View>

                    <View style={[styles.statDivider]} />

                    <View style={styles.statItem}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Rect x="3" y="3" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="14" y="3" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="3" y="14" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="14" y="14" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-neutral-600">
                            {company.moduleCount} modules
                        </Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <Text className="font-inter text-xs font-semibold text-primary-500">
                            {company.tier}
                        </Text>
                    </View>
                </View>

                {/* User Usage Bar */}
                {company.status === 'active' || company.status === 'trial' ? (
                    <View style={styles.usageBarContainer}>
                        <View style={styles.usageBarBg}>
                            <View
                                style={[
                                    styles.usageBarFill,
                                    {
                                        width: `${Math.min(usagePercent, 100)}%`,
                                        backgroundColor: usageColor,
                                    },
                                ]}
                            />
                        </View>
                        <Text className="font-inter text-[10px] font-medium text-neutral-400">
                            {Math.round(usagePercent)}% users
                        </Text>
                    </View>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyListScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const filteredCompanies = React.useMemo(() => {
        let list = MOCK_COMPANIES;

        if (activeFilter !== 'all') {
            list = list.filter(c => c.status === activeFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                c =>
                    c.name.toLowerCase().includes(q) ||
                    c.industry.toLowerCase().includes(q) ||
                    c.adminEmail.toLowerCase().includes(q),
            );
        }

        return list;
    }, [search, activeFilter]);

    const handleAddCompany = () => {
        router.push('/(app)/tenant/add-company');
    };

    const renderCompany = ({ item, index }: { item: CompanyItem; index: number }) => (
        <CompanyCard company={item} index={index} />
    );

    const renderHeader = () => (
        <>
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Companies
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {MOCK_COMPANIES.length} tenants on the platform
                    </Text>
                </View>
            </Animated.View>

            {/* Search & Filters */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search companies..."
                    filters={FILTER_CHIPS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24">
                <Path
                    d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"
                    stroke={colors.neutral[300]}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
            <Text className="mt-4 font-inter text-base font-semibold text-neutral-400">
                No companies found
            </Text>
            <Text className="mt-1 font-inter text-sm text-neutral-400">
                Try adjusting your search or filters
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={filteredCompanies}
                renderItem={renderCompany}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />

            <FAB onPress={handleAddCompany} />
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
    },
    searchSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    listContent: {
        paddingHorizontal: 24,
    },
    // Card
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
    cardPressed: {
        backgroundColor: colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    companyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    companyNameContainer: {
        flex: 1,
    },
    industryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 6,
    },
    customServerTag: {
        backgroundColor: colors.info[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 14,
        backgroundColor: colors.neutral[200],
    },
    // Usage bar
    usageBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8,
    },
    usageBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: colors.neutral[100],
        borderRadius: 2,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    // Empty
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
});
