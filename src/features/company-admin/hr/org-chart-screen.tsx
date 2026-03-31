/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Image as RNImage,
    LayoutAnimation,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    UIManager,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useOrgChart } from '@/features/company-admin/api/use-hr-queries';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============ TYPES ============

interface OrgNode {
    id: string;
    name: string;
    designation?: string;
    department?: string;
    employeeId?: string;
    imageUrl?: string;
    joiningDate?: string;
    officialEmail?: string;
    status?: string;
    location?: string;
    reportees: OrgNode[];
}

interface DeptGroup {
    department: string;
    colorIndex: number;
    members: OrgNode[];
}

// ============ CONSTANTS ============

const DEPT_COLORS = [
    { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', line: '#059669', dot: '#10B981' },
    { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', line: '#0D9488', dot: '#14B8A6' },
    { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', line: '#4338CA', dot: '#6366F1' },
    { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', line: '#7C3AED', dot: '#8B5CF6' },
    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', line: '#DC2626', dot: '#EF4444' },
    { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', line: '#D97706', dot: '#F59E0B' },
    { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD', line: '#2563EB', dot: '#3B82F6' },
] as const;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.15;

// ============ HELPERS ============

function transformNode(node: any): OrgNode {
    return {
        id: node.id,
        name: [node.firstName, node.lastName].filter(Boolean).join(' ') || node.name || 'Unknown',
        designation: node.designation?.name ?? node.designation ?? undefined,
        department: node.department?.name ?? node.department ?? undefined,
        employeeId: node.employeeId,
        imageUrl: node.profilePhotoUrl ?? node.imageUrl ?? undefined,
        joiningDate: node.joiningDate ?? undefined,
        officialEmail: node.officialEmail ?? undefined,
        status: node.status ?? undefined,
        location: node.location?.name ?? node.location ?? undefined,
        reportees: (node.reportees ?? node.children ?? []).map(transformNode),
    };
}

function flattenNodes(nodes: OrgNode[]): OrgNode[] {
    const result: OrgNode[] = [];
    const walk = (list: OrgNode[]) => {
        for (const n of list) {
            result.push(n);
            if (n.reportees.length) walk(n.reportees);
        }
    };
    walk(nodes);
    return result;
}

function findAncestors(nodes: OrgNode[], targetId: string): string[] {
    const ancestors: string[] = [];
    const walk = (list: OrgNode[], path: string[]): boolean => {
        for (const n of list) {
            if (n.id === targetId) { ancestors.push(...path); return true; }
            if (n.reportees.length && walk(n.reportees, [...path, n.id])) return true;
        }
        return false;
    };
    walk(nodes, []);
    return ancestors;
}

function groupByDepartment(reportees: OrgNode[]): DeptGroup[] {
    const map = new Map<string, OrgNode[]>();
    for (const emp of reportees) {
        const dept = emp.department || 'Unassigned';
        if (!map.has(dept)) map.set(dept, []);
        map.get(dept)!.push(emp);
    }
    const groups: DeptGroup[] = [];
    let idx = 0;
    for (const [department, members] of map) {
        groups.push({ department, colorIndex: idx % DEPT_COLORS.length, members });
        idx++;
    }
    return groups;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] ?? '?').toUpperCase();
}

// ============ AVATAR ============

function Avatar({ name, imageUrl, size = 'md' }: {
    name: string;
    imageUrl?: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const sizeMap = { sm: 32, md: 44, lg: 56 };
    const fontMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
    const dim = sizeMap[size];
    const initials = getInitials(name);

    if (imageUrl) {
        return (
            <RNImage
                source={{ uri: imageUrl }}
                style={[
                    styles.avatarImage,
                    { width: dim, height: dim, borderRadius: dim / 2 },
                ]}
            />
        );
    }

    return (
        <LinearGradient
            colors={[colors.primary[400], colors.accent[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.avatarGradient,
                { width: dim, height: dim, borderRadius: dim / 2 },
            ]}
        >
            <Text className={`font-inter font-bold text-white ${fontMap[size]}`}>{initials}</Text>
        </LinearGradient>
    );
}

// ============ ROOT CARD (CEO/Founder) ============

function RootCard({ node, isHighlighted, onPress }: {
    node: OrgNode;
    isHighlighted: boolean;
    onPress?: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <Animated.View entering={FadeInDown.duration(400)} style={[
                styles.rootCard,
                isHighlighted && styles.cardHighlighted,
            ]}>
                <Avatar name={node.name} imageUrl={node.imageUrl} size="lg" />
                <View style={styles.rootCardInfo}>
                    <Text className="font-inter text-base font-bold text-primary-950" numberOfLines={1}>
                        {node.name}
                    </Text>
                    {node.designation ? (
                        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>
                            {node.designation}
                        </Text>
                    ) : null}
                    {node.department ? (
                        <View style={styles.rootDeptBadge}>
                            <Text className="font-inter text-[10px] font-semibold text-primary-700">
                                {node.department}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ============ DEPARTMENT PILL ============

function DepartmentPill({ group, isSelected, onPress }: {
    group: DeptGroup;
    isSelected: boolean;
    onPress: () => void;
}) {
    const color = DEPT_COLORS[group.colorIndex];

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.deptPill,
                {
                    backgroundColor: isSelected ? color.dot : color.bg,
                    borderColor: isSelected ? color.dot : color.border,
                },
                pressed && { opacity: 0.8 },
            ]}
        >
            <Text
                className="font-inter text-xs font-bold"
                style={{ color: isSelected ? colors.white : color.text }}
            >
                {group.department}
            </Text>
            <View style={[
                styles.deptPillCount,
                { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : color.border },
            ]}>
                <Text
                    className="font-inter text-[10px] font-bold"
                    style={{ color: isSelected ? colors.white : color.text }}
                >
                    {group.members.length}
                </Text>
            </View>
        </Pressable>
    );
}

// ============ EMPLOYEE CARD ============

function EmployeeCard({ node, isHighlighted, level, hasChildren, isExpanded, childCount, onToggle, onPress }: {
    node: OrgNode;
    isHighlighted: boolean;
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    childCount: number;
    onToggle: () => void;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.employeeCard,
                isHighlighted && styles.cardHighlighted,
                pressed && { opacity: 0.9 },
            ]}
        >
            <Avatar name={node.name} imageUrl={node.imageUrl} size="sm" />
            <View style={styles.employeeCardInfo}>
                <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>
                    {node.name}
                </Text>
                {node.designation ? (
                    <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>
                        {node.designation}
                    </Text>
                ) : null}
            </View>
            {hasChildren && (
                <Pressable onPress={onToggle} hitSlop={8} style={styles.expandButton}>
                    <Svg width={12} height={12} viewBox="0 0 24 24">
                        <Path
                            d={isExpanded ? 'M6 9l6 6 6-6' : 'M9 18l6-6-6-6'}
                            stroke={colors.primary[500]}
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    <Text className="font-inter text-[9px] font-bold text-primary-500">{childCount}</Text>
                </Pressable>
            )}
        </Pressable>
    );
}

// ============ TREE CONNECTOR LINE ============

function TreeConnector({ isLast, colorHex }: { isLast: boolean; colorHex: string }) {
    return (
        <View style={styles.connectorRow}>
            {/* Vertical line */}
            <View style={[
                styles.connectorVertical,
                { backgroundColor: colorHex, height: isLast ? 20 : '100%' as any },
            ]} />
            {/* Horizontal branch */}
            <View style={[styles.connectorHorizontal, { backgroundColor: colorHex }]} />
            {/* Dot at junction */}
            <View style={[styles.connectorDot, { backgroundColor: colorHex }]} />
        </View>
    );
}

// ============ EMPLOYEE SUBTREE (recursive) ============

function EmployeeSubTree({ node, level, highlightId, expanded, onToggle, onSelectEmployee, colorHex, isLast, index }: {
    node: OrgNode;
    level: number;
    highlightId: string | null;
    expanded: Set<string>;
    onToggle: (id: string) => void;
    onSelectEmployee: (node: OrgNode) => void;
    colorHex: string;
    isLast: boolean;
    index: number;
}) {
    const hasChildren = node.reportees.length > 0;
    const isExpanded = expanded.has(node.id);
    const isHighlighted = highlightId === node.id;

    return (
        <Animated.View
            entering={FadeInUp.duration(250).delay(50 + index * 30)}
            style={styles.subTreeContainer}
        >
            <View style={styles.subTreeRow}>
                {/* Tree connector */}
                <TreeConnector isLast={isLast && (!hasChildren || !isExpanded)} colorHex={colorHex} />

                {/* Card */}
                <View style={styles.subTreeCardWrap}>
                    <EmployeeCard
                        node={node}
                        isHighlighted={isHighlighted}
                        level={level}
                        hasChildren={hasChildren}
                        isExpanded={isExpanded}
                        childCount={node.reportees.length}
                        onToggle={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            onToggle(node.id);
                        }}
                        onPress={() => onSelectEmployee(node)}
                    />
                </View>
            </View>

            {/* Children */}
            {hasChildren && isExpanded && (
                <View style={[styles.childrenContainer, { borderLeftColor: colorHex }]}>
                    {node.reportees.map((child, i) => (
                        <EmployeeSubTree
                            key={child.id}
                            node={child}
                            level={level + 1}
                            highlightId={highlightId}
                            expanded={expanded}
                            onToggle={onToggle}
                            onSelectEmployee={onSelectEmployee}
                            colorHex={colorHex}
                            isLast={i === node.reportees.length - 1}
                            index={i}
                        />
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

// ============ DEPARTMENT SECTION ============

function DepartmentSection({ group, highlightId, expanded, onToggle, onSelectEmployee }: {
    group: DeptGroup;
    highlightId: string | null;
    expanded: Set<string>;
    onToggle: (id: string) => void;
    onSelectEmployee: (node: OrgNode) => void;
}) {
    const color = DEPT_COLORS[group.colorIndex];

    return (
        <Animated.View entering={FadeInUp.duration(350)} style={styles.deptSection}>
            {/* Department header */}
            <View style={[styles.deptSectionHeader, { borderLeftColor: color.dot }]}>
                <View style={[styles.deptSectionDot, { backgroundColor: color.dot }]} />
                <Text className="font-inter text-sm font-bold" style={{ color: color.text }}>
                    {group.department}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400 ml-1">
                    ({group.members.length})
                </Text>
            </View>

            {/* Employee tree */}
            <View style={[styles.deptTreeContainer, { borderLeftColor: color.line + '40' }]}>
                {group.members.map((member, i) => (
                    <EmployeeSubTree
                        key={member.id}
                        node={member}
                        level={1}
                        highlightId={highlightId}
                        expanded={expanded}
                        onToggle={onToggle}
                        onSelectEmployee={onSelectEmployee}
                        colorHex={color.line}
                        isLast={i === group.members.length - 1}
                        index={i}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

// ============ EMPLOYEE DETAIL TOOLTIP ============

function EmployeeTooltip({ node, onClose }: {
    node: OrgNode;
    onClose: () => void;
}) {
    const joinDate = node.joiningDate
        ? new Date(node.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;
    const statusLabel = node.status ? node.status.replace(/_/g, ' ') : null;

    return (
        <Pressable style={styles.tooltipOverlay} onPress={onClose}>
            <Animated.View
                entering={FadeInUp.duration(200)}
                style={styles.tooltipCard}
            >
                {/* Header with gradient */}
                <View style={styles.tooltipHeader}>
                    <Avatar name={node.name} imageUrl={node.imageUrl} size="lg" />
                    <View style={styles.tooltipInfo}>
                        <Text className="font-inter text-base font-bold text-white" numberOfLines={1}>{node.name}</Text>
                        {node.designation ? (
                            <Text className="font-inter text-xs text-white" style={{ opacity: 0.8 }} numberOfLines={1}>{node.designation}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Status badge */}
                {statusLabel ? (
                    <View style={styles.tooltipStatusRow}>
                        <View style={[
                            styles.tooltipStatusBadge,
                            node.status === 'ACTIVE'
                                ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                                : node.status === 'PROBATION'
                                    ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                                    : { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
                        ]}>
                            <Text
                                className="font-inter text-[10px] font-bold"
                                style={{
                                    color: node.status === 'ACTIVE' ? '#047857'
                                        : node.status === 'PROBATION' ? '#B45309'
                                            : colors.neutral[600],
                                }}
                            >
                                {statusLabel}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* Details grid */}
                <View style={styles.tooltipDetails}>
                    {node.department ? (
                        <View style={styles.tooltipDetailRow}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={colors.accent[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M9 22V12h6v10" stroke={colors.accent[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-700 ml-2 flex-1" numberOfLines={1}>{node.department}</Text>
                        </View>
                    ) : null}
                    {node.location ? (
                        <View style={styles.tooltipDetailRow}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                                <Circle cx="12" cy="9" r="2.5" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-500 ml-2 flex-1" numberOfLines={1}>{node.location}</Text>
                        </View>
                    ) : null}
                    {node.employeeId ? (
                        <View style={styles.tooltipDetailRow}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                <Circle cx="12" cy="7" r="4" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-500 ml-2">{node.employeeId}</Text>
                        </View>
                    ) : null}
                    {node.officialEmail ? (
                        <View style={styles.tooltipDetailRow}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M22 6l-10 7L2 6" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-500 ml-2 flex-1" numberOfLines={1}>{node.officialEmail}</Text>
                        </View>
                    ) : null}
                    {joinDate ? (
                        <View style={styles.tooltipDetailRow}>
                            <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-xs text-neutral-500 ml-2">Joined {joinDate}</Text>
                        </View>
                    ) : null}
                </View>

                {node.reportees.length > 0 && (
                    <View style={styles.tooltipFooter}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            <Circle cx="9" cy="7" r="4" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" />
                            <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-primary-600 ml-1.5">
                            {node.reportees.length} direct report{node.reportees.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

// ============ ZOOM CONTROLS ============

function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.zoomContainer}>
            <View style={styles.zoomCard}>
                <Pressable
                    onPress={onZoomIn}
                    disabled={zoom >= ZOOM_MAX}
                    style={({ pressed }) => [
                        styles.zoomButton,
                        pressed && { backgroundColor: colors.neutral[50] },
                        zoom >= ZOOM_MAX && { opacity: 0.3 },
                    ]}
                >
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Circle cx="11" cy="11" r="8" stroke={colors.neutral[600]} strokeWidth="1.5" fill="none" />
                        <Path d="M21 21l-4.35-4.35M8 11h6M11 8v6" stroke={colors.neutral[600]} strokeWidth="1.5" strokeLinecap="round" />
                    </Svg>
                </Pressable>
                <View style={styles.zoomDivider} />
                <Pressable onPress={onReset} style={styles.zoomPercentButton}>
                    <Text className="font-inter text-[10px] font-bold text-neutral-500">
                        {Math.round(zoom * 100)}%
                    </Text>
                </Pressable>
                <View style={styles.zoomDivider} />
                <Pressable
                    onPress={onZoomOut}
                    disabled={zoom <= ZOOM_MIN}
                    style={({ pressed }) => [
                        styles.zoomButton,
                        pressed && { backgroundColor: colors.neutral[50] },
                        zoom <= ZOOM_MIN && { opacity: 0.3 },
                    ]}
                >
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Circle cx="11" cy="11" r="8" stroke={colors.neutral[600]} strokeWidth="1.5" fill="none" />
                        <Path d="M21 21l-4.35-4.35M8 11h6" stroke={colors.neutral[600]} strokeWidth="1.5" strokeLinecap="round" />
                    </Svg>
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function OrgChartScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    // State
    const [search, setSearch] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
    const [highlightId, setHighlightId] = React.useState<string | null>(null);
    const [selectedDept, setSelectedDept] = React.useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = React.useState<OrgNode | null>(null);
    const [zoom, setZoom] = React.useState(1.0);

    // Data
    const { data: response, isLoading, error, refetch, isFetching } = useOrgChart();

    const orgData: OrgNode[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        const arr = Array.isArray(raw) ? raw : raw?.tree ? [raw.tree] : raw?.root ? [raw.root] : [];
        return arr.map(transformNode);
    }, [response]);

    const allNodes = React.useMemo(() => flattenNodes(orgData), [orgData]);

    const rootNode = orgData[0] ?? null;

    const deptGroups = React.useMemo(() => {
        if (!rootNode) return [];
        return groupByDepartment(rootNode.reportees);
    }, [rootNode]);

    const visibleGroups = React.useMemo(() => {
        if (!selectedDept) return deptGroups;
        return deptGroups.filter(g => g.department === selectedDept);
    }, [deptGroups, selectedDept]);

    // Auto-expand first two levels on data load
    React.useEffect(() => {
        if (orgData.length > 0 && expanded.size === 0) {
            const toExpand = new Set<string>();
            for (const root of orgData) {
                toExpand.add(root.id);
                for (const child of root.reportees) {
                    toExpand.add(child.id);
                }
            }
            setExpanded(toExpand);
        }
    }, [orgData]); // eslint-disable-line react-hooks/exhaustive-deps

    // Toggle expand/collapse
    const handleToggle = React.useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Search
    const handleSearch = React.useCallback((value: string) => {
        setSearch(value);
        if (!value.trim()) { setHighlightId(null); return; }
        const s = value.toLowerCase();
        const match = allNodes.find(n =>
            n.name?.toLowerCase().includes(s) ||
            n.employeeId?.toLowerCase().includes(s) ||
            n.designation?.toLowerCase().includes(s) ||
            n.department?.toLowerCase().includes(s)
        );
        if (match) {
            setHighlightId(match.id);
            const ancestors = findAncestors(orgData, match.id);
            setExpanded(prev => {
                const next = new Set(prev);
                ancestors.forEach(a => next.add(a));
                return next;
            });
            // Auto-select the matching department
            if (match.department) {
                setSelectedDept(match.department);
            }
        } else {
            setHighlightId(null);
        }
    }, [allNodes, orgData]);

    const matchCount = React.useMemo(() => {
        if (!search.trim()) return 0;
        const s = search.toLowerCase();
        return allNodes.filter(n =>
            n.name?.toLowerCase().includes(s) ||
            n.employeeId?.toLowerCase().includes(s) ||
            n.designation?.toLowerCase().includes(s) ||
            n.department?.toLowerCase().includes(s)
        ).length;
    }, [search, allNodes]);

    // Zoom
    const handleZoomIn = React.useCallback(() => {
        setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
    }, []);

    const handleZoomOut = React.useCallback(() => {
        setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
    }, []);

    const handleZoomReset = React.useCallback(() => {
        setZoom(1.0);
    }, []);

    // Department selection
    const handleDeptSelect = React.useCallback((dept: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedDept(prev => prev === dept ? null : dept);
    }, []);

    // ============ RENDER HEADER ============

    const renderHeader = () => (
        <>
            <AppTopHeader
                title="Organization Chart"
                subtitle={`${allNodes.length} member${allNodes.length !== 1 ? 's' : ''}`}
                onMenuPress={toggle}
                rightSlot={(
                    <Pressable
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setShowSearch(prev => !prev);
                            if (showSearch) { setSearch(''); setHighlightId(null); }
                        }}
                        style={styles.headerIconBtn}
                    >
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            {showSearch ? (
                                <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
                            ) : (
                                <>
                                    <Circle cx="11" cy="11" r="8" stroke={colors.white} strokeWidth="1.8" fill="none" />
                                    <Path d="M21 21l-4.35-4.35" stroke={colors.white} strokeWidth="1.8" strokeLinecap="round" />
                                </>
                            )}
                        </Svg>
                    </Pressable>
                )}
            />

            {showSearch && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.searchBarWrapper}>
                    <View style={styles.searchBar}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                            <Circle cx="11" cy="11" r="8" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Path d="M21 21l-4.35-4.35" stroke={colors.neutral[400]} strokeWidth="1.5" strokeLinecap="round" />
                        </Svg>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search name, ID, designation, dept..."
                            placeholderTextColor={colors.neutral[400]}
                            value={search}
                            onChangeText={handleSearch}
                            autoFocus
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <View style={styles.searchCountBadge}>
                                <Text className="font-inter text-[10px] font-bold text-primary-600">
                                    {matchCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            )}
        </>
    );

    // ============ RENDER LOADING ============

    if (isLoading) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.loadingContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    // ============ RENDER ERROR ============

    if (error) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.errorContainer}>
                    <EmptyState
                        icon="error"
                        title="Failed to load"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    // ============ RENDER EMPTY ============

    if (orgData.length === 0) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.errorContainer}>
                    <EmptyState
                        icon="inbox"
                        title="No org data"
                        message="Organization chart data is not available yet. Add employees with reporting relationships to see the chart."
                    />
                </View>
            </View>
        );
    }

    // ============ RENDER MAIN ============

    return (
        <View style={styles.container}>
            {renderHeader()}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
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
                minimumZoomScale={ZOOM_MIN}
                maximumZoomScale={ZOOM_MAX}
                bouncesZoom
            >
                {/* Dotted background canvas */}
                <View style={styles.canvasArea}>
                    <View style={{ transform: [{ scale: zoom }], transformOrigin: 'top center' }}>
                        {/* Root Card */}
                        {rootNode && (
                            <View style={styles.rootSection}>
                                <RootCard
                                    node={rootNode}
                                    isHighlighted={highlightId === rootNode.id}
                                    onPress={() => setSelectedEmployee(rootNode)}
                                />

                                {/* Vertical connector from root */}
                                {deptGroups.length > 0 && (
                                    <View style={styles.rootConnector}>
                                        <View style={styles.rootConnectorLine} />
                                        <View style={styles.rootConnectorDot} />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Department Pills (horizontal scroll) */}
                        {deptGroups.length > 0 && (
                            <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.deptPillsContent}
                                    style={styles.deptPillsScroll}
                                >
                                    {/* All departments button */}
                                    <Pressable
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setSelectedDept(null);
                                        }}
                                        style={[
                                            styles.deptPill,
                                            {
                                                backgroundColor: selectedDept === null ? colors.primary[600] : colors.white,
                                                borderColor: selectedDept === null ? colors.primary[600] : colors.neutral[200],
                                            },
                                        ]}
                                    >
                                        <Text
                                            className="font-inter text-xs font-bold"
                                            style={{ color: selectedDept === null ? colors.white : colors.neutral[600] }}
                                        >
                                            All
                                        </Text>
                                        <View style={[
                                            styles.deptPillCount,
                                            { backgroundColor: selectedDept === null ? 'rgba(255,255,255,0.3)' : colors.neutral[100] },
                                        ]}>
                                            <Text
                                                className="font-inter text-[10px] font-bold"
                                                style={{ color: selectedDept === null ? colors.white : colors.neutral[600] }}
                                            >
                                                {rootNode?.reportees.length ?? 0}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    {deptGroups.map(group => (
                                        <DepartmentPill
                                            key={group.department}
                                            group={group}
                                            isSelected={selectedDept === group.department}
                                            onPress={() => handleDeptSelect(group.department)}
                                        />
                                    ))}
                                </ScrollView>
                            </Animated.View>
                        )}

                        {/* Department Sections with Employee Trees */}
                        <View style={styles.treeSections}>
                            {visibleGroups.map(group => (
                                <DepartmentSection
                                    key={group.department}
                                    group={group}
                                    highlightId={highlightId}
                                    expanded={expanded}
                                    onToggle={handleToggle}
                                    onSelectEmployee={setSelectedEmployee}
                                />
                            ))}
                        </View>

                        {/* Legend */}
                        <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={styles.legendLine} />
                                <Text className="font-inter text-[10px] text-neutral-400">Reports to</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={styles.legendDot} />
                                <Text className="font-inter text-[10px] text-neutral-400">Junction</Text>
                            </View>
                        </Animated.View>
                    </View>
                </View>
            </ScrollView>

            {/* Zoom Controls (floating) */}
            <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleZoomReset}
            />

            {/* Employee Tooltip */}
            {selectedEmployee && (
                <EmployeeTooltip
                    node={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },

    // ── Header ──
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarWrapper: {
        marginTop: 12,
        marginHorizontal: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: colors.primary[950],
        fontFamily: 'Inter',
    },
    searchCountBadge: {
        backgroundColor: colors.primary[50],
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },

    // ── Scroll / Canvas ──
    scrollContent: {
        paddingHorizontal: 16,
    },
    canvasArea: {
        backgroundColor: colors.white,
        borderRadius: 20,
        marginTop: 16,
        padding: 20,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        overflow: 'hidden',
    },
    loadingContainer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        gap: 12,
    },
    errorContainer: {
        paddingTop: 60,
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    // ── Root Card ──
    rootSection: {
        alignItems: 'center',
    },
    rootCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 14,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1.5,
        borderColor: colors.primary[100],
        alignSelf: 'center',
        maxWidth: 320,
    },
    rootCardInfo: {
        flex: 1,
        gap: 2,
    },
    rootDeptBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary[50],
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 4,
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    rootConnector: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    rootConnectorLine: {
        width: 2,
        height: 24,
        backgroundColor: colors.neutral[300],
        borderRadius: 1,
    },
    rootConnectorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.neutral[400],
    },

    // ── Department Pills ──
    deptPillsScroll: {
        marginTop: 12,
        flexGrow: 0,
    },
    deptPillsContent: {
        gap: 8,
        paddingHorizontal: 4,
    },
    deptPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        gap: 6,
    },
    deptPillCount: {
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },

    // ── Department Sections ──
    treeSections: {
        marginTop: 20,
        gap: 24,
    },
    deptSection: {
        gap: 8,
    },
    deptSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 3,
        paddingLeft: 10,
        paddingVertical: 4,
    },
    deptSectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    deptTreeContainer: {
        marginLeft: 4,
        paddingLeft: 16,
        borderLeftWidth: 2,
    },

    // ── Employee Card ──
    employeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    employeeCardInfo: {
        flex: 1,
        gap: 1,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    cardHighlighted: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[300],
        borderWidth: 2,
        shadowColor: colors.primary[500],
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },

    // ── Tree Connectors ──
    subTreeContainer: {
        marginBottom: 6,
    },
    subTreeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    subTreeCardWrap: {
        flex: 1,
    },
    connectorRow: {
        width: 24,
        alignItems: 'flex-end',
        paddingTop: 18,
        marginRight: 4,
    },
    connectorVertical: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 2,
        borderRadius: 1,
    },
    connectorHorizontal: {
        height: 2,
        width: 14,
        borderRadius: 1,
        position: 'absolute',
        left: 0,
        top: 18,
    },
    connectorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        position: 'absolute',
        left: -2,
        top: 15,
    },
    childrenContainer: {
        marginLeft: 12,
        paddingLeft: 12,
        borderLeftWidth: 2,
        marginTop: 2,
    },

    // ── Avatar ──
    avatarImage: {
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarGradient: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },

    // ── Tooltip ──
    tooltipOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    tooltipCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 24,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
        maxWidth: 340,
        width: '100%',
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        paddingBottom: 16,
        backgroundColor: colors.primary[600],
    },
    tooltipInfo: {
        flex: 1,
        gap: 2,
    },
    tooltipStatusRow: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 4,
    },
    tooltipStatusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
    },
    tooltipDetails: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
        gap: 8,
    },
    tooltipDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tooltipFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 18,
        marginBottom: 18,
        paddingTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[100],
    },

    // ── Zoom Controls ──
    zoomContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 50,
    },
    zoomCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
    },
    zoomButton: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomPercentButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
    },
    zoomDivider: {
        height: 1,
        backgroundColor: colors.neutral[200],
    },

    // ── Legend ──
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 24,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendLine: {
        width: 16,
        height: 2,
        borderRadius: 1,
        backgroundColor: colors.neutral[300],
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.neutral[400],
    },
});
