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
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useOrgChart } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

interface OrgNode {
    id: string;
    name: string;
    designation?: string;
    department?: string;
    employeeId?: string;
    imageUrl?: string;
    children?: OrgNode[];
    reportees?: OrgNode[];
}

// ============ HELPERS ============

function flattenNodes(nodes: OrgNode[]): OrgNode[] {
    const result: OrgNode[] = [];
    const walk = (list: OrgNode[]) => {
        for (const n of list) {
            result.push(n);
            const children = n.children ?? n.reportees ?? [];
            if (children.length) walk(children);
        }
    };
    walk(nodes);
    return result;
}

function findAncestors(nodes: OrgNode[], targetId: string): string[] {
    const ancestors: string[] = [];
    const walk = (list: OrgNode[], path: string[]): boolean => {
        for (const n of list) {
            const children = n.children ?? n.reportees ?? [];
            if (n.id === targetId) { ancestors.push(...path); return true; }
            if (children.length && walk(children, [...path, n.id])) return true;
        }
        return false;
    };
    walk(nodes, []);
    return ancestors;
}

// ============ PROFILE CIRCLE ============

function ProfileCircle({ name, size = 36 }: { name: string; size?: number }) {
    const initial = (name ?? '?')[0]?.toUpperCase();
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text className="font-inter text-sm font-bold text-white">{initial}</Text>
        </View>
    );
}

// ============ ORG NODE (Nested list for mobile) ============

function OrgNodeRow({
    node,
    level,
    expanded,
    onToggle,
    highlightId,
    index,
}: {
    node: OrgNode;
    level: number;
    expanded: Set<string>;
    onToggle: (id: string) => void;
    highlightId: string | null;
    index: number;
}) {
    const children = node.children ?? node.reportees ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isHighlighted = highlightId === node.id;

    return (
        <Animated.View entering={FadeInUp.duration(300).delay(50 + index * 30)}>
            <Pressable
                onPress={() => hasChildren && onToggle(node.id)}
                style={({ pressed }) => [
                    styles.nodeRow,
                    { marginLeft: level * 20 },
                    isHighlighted && styles.nodeHighlighted,
                    pressed && hasChildren && { opacity: 0.8 },
                ]}
            >
                {/* Indent line */}
                {level > 0 && (
                    <View style={[styles.indentLine, { left: -10 }]} />
                )}
                <ProfileCircle name={node.name} size={32} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{node.name}</Text>
                    {node.designation ? (
                        <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>{node.designation}</Text>
                    ) : null}
                    {node.department ? (
                        <View style={[styles.deptBadge, { marginTop: 3 }]}>
                            <Text className="font-inter text-[9px] font-bold text-accent-700">{node.department}</Text>
                        </View>
                    ) : null}
                </View>
                {hasChildren && (
                    <View style={styles.expandIcon}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path
                                d={isExpanded ? 'M6 9l6 6 6-6' : 'M9 18l6-6-6-6'}
                                stroke={colors.primary[500]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text className="font-inter text-[9px] text-neutral-400 ml-0.5">{children.length}</Text>
                    </View>
                )}
            </Pressable>
            {hasChildren && isExpanded && children.map((child, i) => (
                <OrgNodeRow
                    key={child.id}
                    node={child}
                    level={level + 1}
                    expanded={expanded}
                    onToggle={onToggle}
                    highlightId={highlightId}
                    index={i}
                />
            ))}
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function OrgChartScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [search, setSearch] = React.useState('');
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
    const [highlightId, setHighlightId] = React.useState<string | null>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useOrgChart();

    const orgData: OrgNode[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        const arr = Array.isArray(raw) ? raw : raw?.tree ? [raw.tree] : raw?.root ? [raw.root] : [];

        // Transform backend format to frontend OrgNode format
        function transformNode(node: any): OrgNode {
            return {
                id: node.id,
                name: [node.firstName, node.lastName].filter(Boolean).join(' ') || node.name || 'Unknown',
                designation: node.designation?.name ?? node.designation ?? undefined,
                department: node.department?.name ?? node.department ?? undefined,
                employeeId: node.employeeId,
                imageUrl: node.profilePhotoUrl ?? node.imageUrl ?? undefined,
                reportees: (node.reportees ?? node.children ?? []).map(transformNode),
            };
        }

        return arr.map(transformNode);
    }, [response]);

    const allNodes = React.useMemo(() => flattenNodes(orgData), [orgData]);

    // Auto-expand first level
    React.useEffect(() => {
        if (orgData.length > 0 && expanded.size === 0) {
            setExpanded(new Set(orgData.map(n => n.id)));
        }
    }, [orgData]);

    const handleToggle = React.useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSearch = (value: string) => {
        setSearch(value);
        if (!value.trim()) { setHighlightId(null); return; }
        const s = value.toLowerCase();
        const match = allNodes.find(n => n.name?.toLowerCase().includes(s) || n.employeeId?.toLowerCase().includes(s));
        if (match) {
            setHighlightId(match.id);
            const ancestors = findAncestors(orgData, match.id);
            setExpanded(prev => {
                const next = new Set(prev);
                ancestors.forEach(a => next.add(a));
                return next;
            });
        } else {
            setHighlightId(null);
        }
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950">Org Chart</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">{allNodes.length} member{allNodes.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={handleSearch} placeholder="Search employee..." />
            </View>
        </Animated.View>
    );

    const renderContent = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (orgData.length === 0) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No org data" message="Organization chart data is not available yet." /></View>;

        return (
            <View style={{ marginTop: 8 }}>
                {orgData.map((root, i) => (
                    <OrgNodeRow
                        key={root.id}
                        node={root}
                        level={0}
                        expanded={expanded}
                        onToggle={handleToggle}
                        highlightId={highlightId}
                        index={i}
                    />
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Org Chart</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                {renderHeader()}
                {renderContent()}
            </ScrollView>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    avatar: {
        backgroundColor: colors.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    nodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    nodeHighlighted: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[300],
        shadowColor: colors.primary[500],
        shadowOpacity: 0.15,
    },
    indentLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: colors.primary[100],
        borderRadius: 1,
    },
    deptBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.accent[50],
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    expandIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
});
