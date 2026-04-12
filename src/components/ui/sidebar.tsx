/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    LayoutAnimation,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_FULL_WIDTH = Math.min(280, SCREEN_WIDTH * 0.8);
const SIDEBAR_COLLAPSED_WIDTH = 68;

const OPEN_DURATION = 200;
const CLOSE_DURATION = 160;

// ============ TYPES ============

export interface SidebarNavItem {
    id: string;
    label: string;
    icon: SidebarIconType;
    badge?: number;
    isActive?: boolean;
    children?: { label: string; path: string; isActive?: boolean; onPress?: () => void }[];
    onPress: () => void;
}

export interface SidebarSection {
    title?: string;
    /** When set, renders a styled module divider above this section (e.g. "HRMS", "COMPANY ADMIN") */
    moduleSeparator?: string;
    items: SidebarNavItem[];
}

export type SidebarIconType =
    | 'dashboard'
    | 'companies'
    | 'billing'
    | 'users'
    | 'reports'
    | 'settings'
    | 'support'
    | 'logout'
    | 'more'
    | 'audit'
    | 'onboarding';

interface SidebarProps {
    sections: SidebarSection[];
    userName: string;
    userRole: string;
    userInitials: string;
    profilePhotoUrl?: string | null;
    onSignOut: () => void;
    collapsible?: boolean;
}

// ============ ICONS ============

export function SidebarNavIcon({
    type,
    color,
    size = 22,
}: {
    type: SidebarIconType;
    color: string;
    size?: number;
}) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const props = {
        stroke: color,
        strokeWidth: '1.8',
        fill: 'none',
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    };

    switch (type) {
        case 'dashboard':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Rect x="3" y="3" width="7" height="7" rx="2" {...props} />
                    <Rect x="14" y="3" width="7" height="7" rx="2" {...props} />
                    <Rect x="3" y="14" width="7" height="7" rx="2" {...props} />
                    <Rect x="14" y="14" width="7" height="7" rx="2" {...props} />
                </Svg>
            );
        case 'companies':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2" {...props} />
                </Svg>
            );
        case 'onboarding':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" {...props} />
                    <Rect x="3" y="3" width="18" height="18" rx="3" {...props} />
                </Svg>
            );
        case 'billing':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Rect x="1" y="4" width="22" height="16" rx="2" {...props} />
                    <Path d="M1 10h22" {...props} />
                </Svg>
            );
        case 'users':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" {...props} />
                </Svg>
            );
        case 'reports':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M18 20V10M12 20V4M6 20v-6" {...props} />
                </Svg>
            );
        case 'settings':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="3" {...props} />
                    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...props} />
                </Svg>
            );
        case 'support':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...props} />
                </Svg>
            );
        case 'audit':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...props} />
                </Svg>
            );
        case 'logout':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24">
                    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" {...props} />
                </Svg>
            );
        default:
            return null;
    }
}

// ============ HAMBURGER BUTTON ============

export function HamburgerButton({
    onPress,
    color = colors.white,
}: {
    onPress: () => void;
    color?: string;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.hamburger,
                pressed && styles.hamburgerPressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                    d="M3 12h18M3 6h18M3 18h18"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </Svg>
        </Pressable>
    );
}

// ============ MEMOIZED NAV ITEM (prevents 79 re-renders) ============

const SidebarNavItem = React.memo(function SidebarNavItem({
    item,
    onClose,
}: {
    item: SidebarNavItem;
    onClose: () => void;
}) {
    return (
        <Pressable
            onPress={() => {
                item.onPress();
                onClose();
            }}
            style={({ pressed }) => [
                styles.navItem,
                item.isActive && styles.navItemActive,
                pressed && !item.isActive && styles.navItemPressed,
            ]}
        >
            <View
                style={[
                    styles.navIconWrap,
                    item.isActive && styles.navIconWrapActive,
                ]}
            >
                <SidebarNavIcon
                    type={item.icon}
                    color={
                        item.isActive
                            ? colors.primary[600]
                            : colors.neutral[500]
                    }
                    size={20}
                />
            </View>
            <View style={styles.navLabelRow}>
                <Text
                    className={`font-inter text-sm font-semibold ${item.isActive ? 'text-primary-700' : 'text-neutral-600 dark:text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {item.label}
                </Text>
                {item.badge != null && item.badge > 0 && (
                    <View style={styles.badge}>
                        <Text className="font-inter text-[9px] font-bold text-white">
                            {item.badge > 99 ? '99+' : item.badge}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}, (prev, next) => {
    // Only re-render if active state, label, or badge changed
    return prev.item.id === next.item.id
        && prev.item.isActive === next.item.isActive
        && prev.item.label === next.item.label
        && prev.item.badge === next.item.badge;
});

// ============ SIDEBAR COMPONENT (always mounted) ============

export function Sidebar({
    sections,
    userName,
    userRole,
    userInitials,
    profilePhotoUrl,
    onSignOut,
    collapsible = false,
}: SidebarProps) {
    const insets = useSafeAreaInsets();
    const { isOpen, close, progress } = useSidebar();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
    const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        const defaultExpanded = ['My Workspace', 'Team Management'];
        sections.forEach((section) => {
            const key = section.title ?? '';
            if (!key || defaultExpanded.includes(key)) return;
            // Skip sections whose items all have children (they're already self-collapsible)
            if (section.items.every(item => item.children && item.children.length > 0)) return;
            const hasActive = section.items.some(item => item.isActive || item.children?.some(c => c.isActive));
            if (!hasActive) initial[key] = true;
        });
        return initial;
    });
    // Module-level collapse (HRMS, Operations, etc.)
    const [collapsedModules, setCollapsedModules] = React.useState<Record<string, boolean>>({});

    // Build module→section mapping
    const sectionModuleMap: Record<string, string> = {};
    let _curMod = '';
    for (const s of sections) {
        if (s.moduleSeparator) _curMod = s.moduleSeparator;
        if (_curMod && s.title) sectionModuleMap[s.title] = _curMod;
    }

    const [searchText, setSearchText] = React.useState('');
    const searchInputRef = React.useRef<TextInput>(null);

    const sidebarWidth = useSharedValue(SIDEBAR_FULL_WIDTH);

    // Drive animation directly from shared value — no useEffect, no extra renders
    React.useEffect(() => {
        if (collapsible) {
            sidebarWidth.value = withTiming(
                isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_FULL_WIDTH,
                { duration: 200 }
            );
        }
    }, [isCollapsed, collapsible, sidebarWidth]);

    React.useEffect(() => {
        const next: Record<string, boolean> = {};
        sections.forEach((section) => {
            section.items.forEach((item) => {
                if (item.children?.some((child) => child.isActive)) {
                    next[item.id] = true;
                }
            });
        });
        setOpenGroups((prev) => ({ ...prev, ...next }));
    }, [sections]);

    // Auto-expand section containing active item
    React.useEffect(() => {
        sections.forEach((section) => {
            const key = section.title ?? '';
            if (!key) return;
            const hasActive = section.items.some(item => item.isActive || item.children?.some(c => c.isActive));
            if (hasActive) {
                setCollapsedSections(prev => {
                    if (prev[key]) return { ...prev, [key]: false };
                    return prev;
                });
            }
        });
    }, [sections]);

    // Reset search when sidebar closes; auto-focus when it opens
    React.useEffect(() => {
        if (!isOpen) {
            setSearchText('');
        } else {
            // Delay focus slightly so the sidebar animation has started
            const timer = setTimeout(() => searchInputRef.current?.focus(), OPEN_DURATION + 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Filter sections when searching
    const isSearching = searchText.trim().length > 0;
    const filteredItems = React.useMemo(() => {
        if (!isSearching) return [];
        const query = searchText.toLowerCase().trim();
        const results: SidebarNavItem[] = [];
        for (const section of sections) {
            for (const item of section.items) {
                const labelMatch = item.label.toLowerCase().includes(query);
                const childMatches = item.children?.filter((c) =>
                    c.label.toLowerCase().includes(query)
                );
                if (labelMatch || (childMatches && childMatches.length > 0)) {
                    results.push({
                        ...item,
                        children: childMatches && childMatches.length > 0 ? childMatches : item.children,
                    });
                }
            }
        }
        return results;
    }, [isSearching, searchText, sections]);

    // Animated styles — all run on UI thread
    const containerStyle = useAnimatedStyle(() => ({
        // When fully closed (progress === 0), move the whole container off-screen
        // so it doesn't capture touches. This is faster than conditional rendering.
        opacity: progress.value > 0 ? 1 : 0,
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1]),
    }));

    const sidebarStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    progress.value,
                    [0, 1],
                    [-SIDEBAR_FULL_WIDTH - 8, 0]
                ),
            },
        ],
        width: sidebarWidth.value,
    }));

    const labelOpacityStyle = useAnimatedStyle(() => ({
        opacity: collapsible
            ? interpolate(
                sidebarWidth.value,
                [SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_FULL_WIDTH],
                [0, 1]
            )
            : 1,
    }));

    return (
        <Animated.View
            style={[StyleSheet.absoluteFill, containerStyle]}
            pointerEvents={isOpen ? 'auto' : 'none'}
        >
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            </Animated.View>

            {/* Sidebar Panel */}
            <Animated.View
                style={[styles.sidebar, sidebarStyle, { paddingTop: insets.top }]}
            >
                {/* Header Gradient */}
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sidebarHeader}
                >
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.headerRow}>
                        {profilePhotoUrl ? (
                            <Image
                                source={{ uri: profilePhotoUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <LinearGradient
                                colors={[colors.accent[300], colors.primary[400]]}
                                style={styles.avatar}
                            >
                                <Text className="font-inter text-base font-bold text-white">
                                    {userInitials}
                                </Text>
                            </LinearGradient>
                        )}

                        <Animated.View style={[styles.userInfoWrap, labelOpacityStyle]}>
                            <Text
                                className="font-inter text-sm font-bold text-white"
                                numberOfLines={1}
                            >
                                {userName}
                            </Text>
                            <View style={styles.roleBadge}>
                                <Text className="font-inter text-[10px] font-bold text-primary-200">
                                    {userRole}
                                </Text>
                            </View>
                        </Animated.View>

                        {collapsible ? (
                            <Pressable
                                onPress={() => setIsCollapsed(!isCollapsed)}
                                style={styles.collapseBtn}
                            >
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path
                                        d={isCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'}
                                        stroke="rgba(255,255,255,0.85)"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                        ) : (
                            <Pressable onPress={close} style={styles.collapseBtn}>
                                <Svg width={18} height={18} viewBox="0 0 24 24">
                                    <Path
                                        d="M18 6L6 18M6 6l12 12"
                                        stroke="rgba(255,255,255,0.85)"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </Svg>
                            </Pressable>
                        )}
                    </View>
                </LinearGradient>

                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.searchIcon}>
                            <Circle
                                cx="11"
                                cy="11"
                                r="8"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                            />
                            <Path
                                d="M21 21l-4.35-4.35"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </Svg>
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search navigation..."
                            placeholderTextColor={colors.neutral[400]}
                            value={searchText}
                            onChangeText={setSearchText}
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="search"
                        />
                        {searchText.length > 0 && (
                            <Pressable
                                onPress={() => {
                                    setSearchText('');
                                    searchInputRef.current?.focus();
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.searchClearBtn}
                            >
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path
                                        d="M18 6L6 18M6 6l12 12"
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                    />
                                </Svg>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Navigation Items — Scrollable */}
                <ScrollView
                    style={styles.navContainer}
                    contentContainerStyle={styles.navContentContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    removeClippedSubviews={true}
                >
                    {isSearching ? (
                        /* Flat filtered results when searching */
                        filteredItems.length > 0 ? (
                            <View style={styles.navSection}>
                                {filteredItems.map((item) => (
                                    <View key={item.id}>
                                        <SidebarNavItem item={item} onClose={close} />
                                        {item.children && item.children.length > 0 && (
                                            <View style={styles.childContainer}>
                                                <View style={styles.childDottedLine} />
                                                {item.children.map((child) => (
                                                    <Pressable
                                                        key={child.path}
                                                        onPress={() => {
                                                            child.onPress?.();
                                                            close();
                                                        }}
                                                        style={({ pressed }) => [
                                                            styles.childItem,
                                                            child.isActive && styles.childItemActive,
                                                            pressed && !child.isActive && styles.childItemPressed,
                                                        ]}
                                                    >
                                                        <View style={[styles.childBranch, child.isActive && styles.childBranchActive]} />
                                                        <Text
                                                            className={`font-inter text-xs font-semibold ${child.isActive ? 'text-primary-700' : 'text-neutral-500 dark:text-neutral-400'}`}
                                                            numberOfLines={1}
                                                        >
                                                            {child.label}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.searchEmptyState}>
                                <Text className="font-inter text-sm text-neutral-400">
                                    No results found
                                </Text>
                            </View>
                        )
                    ) : (
                        /* Normal sections view */
                        sections.map((section) => {
                            const sectionKey = section.title ?? '';
                            const hasOnlyChildItems = section.items.every(item => item.children && item.children.length > 0);
                            const isNonCollapsible = !sectionKey || hasOnlyChildItems;
                            const isSectionCollapsed = !isNonCollapsible && !!collapsedSections[sectionKey];
                            const moduleOfSection = sectionKey ? sectionModuleMap[sectionKey] : undefined;
                            const isModuleCollapsed = !!moduleOfSection && !!collapsedModules[moduleOfSection];
                            const sectionHasActive = section.items.some(item => item.isActive || item.children?.some(c => c.isActive));

                            return (
                            <View key={section.title ?? section.items[0]?.id ?? 'default'}>
                                {/* Module separator — pressable to collapse module */}
                                {section.moduleSeparator && (
                                    <Pressable
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
                                            setCollapsedModules(prev => ({ ...prev, [section.moduleSeparator!]: !prev[section.moduleSeparator!] }));
                                        }}
                                        style={styles.moduleSeparator}
                                    >
                                        <View style={styles.moduleSeparatorLine} />
                                        <Text className="font-inter text-[9px] font-bold uppercase tracking-[2px] text-primary-500">
                                            {section.moduleSeparator}
                                        </Text>
                                        <Svg width={11} height={11} viewBox="0 0 24 24">
                                            <Path
                                                d={isModuleCollapsed ? 'M9 18l6-6-6-6' : 'M18 15l-6-6-6 6'}
                                                stroke={colors.primary[400]}
                                                strokeWidth="2.4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </Svg>
                                        <View style={styles.moduleSeparatorLine} />
                                    </Pressable>
                                )}

                                {/* Hide section content when module is collapsed */}
                                {!isModuleCollapsed && (
                                <View style={styles.navSection}>
                                    {/* Section header: static label for non-collapsible, nav-item style for collapsible */}
                                    {section.title && (isNonCollapsible ? (
                                        <View style={styles.sectionTitleWrap}>
                                            <Text className="mb-1 font-inter text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
                                                {section.title}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Pressable
                                            onPress={() => {
                                                LayoutAnimation.configureNext(LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
                                                setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
                                            }}
                                            style={[
                                                styles.navItem,
                                                sectionHasActive && styles.navItemActive,
                                            ]}
                                        >
                                            <View style={[styles.navIconWrap, sectionHasActive && styles.navIconWrapActive]}>
                                                <SidebarNavIcon
                                                    type={section.items[0]?.icon ?? 'settings'}
                                                    color={sectionHasActive ? colors.primary[600] : colors.neutral[500]}
                                                    size={20}
                                                />
                                            </View>
                                            <View style={styles.navLabelRow}>
                                                <Text
                                                    className={`font-inter text-sm font-semibold ${sectionHasActive ? 'text-primary-700' : 'text-neutral-600 dark:text-neutral-400'}`}
                                                    numberOfLines={1}
                                                >
                                                    {section.title}
                                                </Text>
                                            </View>
                                            <View style={styles.sectionChevronWrap}>
                                                <Text className="font-inter text-[9px] font-semibold text-neutral-400">
                                                    {section.items.length}
                                                </Text>
                                                <Svg width={13} height={13} viewBox="0 0 24 24">
                                                    <Path
                                                        d={isSectionCollapsed ? 'M9 18l6-6-6-6' : 'M18 15l-6-6-6 6'}
                                                        stroke={colors.neutral[500]}
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        fill="none"
                                                    />
                                                </Svg>
                                            </View>
                                        </Pressable>
                                    ))}

                                    {/* Collapsible sections: child-style items with dotted connectors */}
                                    {!isNonCollapsible && !isSectionCollapsed && (
                                        <View style={styles.childContainer}>
                                            <View style={styles.childDottedLine} />
                                            {section.items.map((item) => (
                                                <Pressable
                                                    key={item.id}
                                                    onPress={() => {
                                                        item.onPress();
                                                        close();
                                                    }}
                                                    style={({ pressed }) => [
                                                        styles.childItem,
                                                        item.isActive && styles.childItemActive,
                                                        pressed && !item.isActive && styles.childItemPressed,
                                                    ]}
                                                >
                                                    <View style={[styles.childBranch, item.isActive && styles.childBranchActive]} />
                                                    <Text
                                                        className={`font-inter text-xs font-semibold ${item.isActive ? 'text-primary-700' : 'text-neutral-500 dark:text-neutral-400'}`}
                                                        numberOfLines={1}
                                                    >
                                                        {item.label}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}

                                    {/* Non-collapsible: full nav items */}
                                    {isNonCollapsible && section.items.map((item) => (
                                        <View key={item.id}>
                                            <SidebarNavItem item={item} onClose={close} />
                                            {item.children && item.children.length > 0 && openGroups[item.id] && (
                                                <View style={styles.childContainer}>
                                                    <View style={styles.childDottedLine} />
                                                    {item.children.map((child) => (
                                                        <Pressable
                                                            key={child.path}
                                                            onPress={() => {
                                                                child.onPress?.();
                                                                close();
                                                            }}
                                                            style={({ pressed }) => [
                                                                styles.childItem,
                                                                child.isActive && styles.childItemActive,
                                                                pressed && !child.isActive && styles.childItemPressed,
                                                            ]}
                                                        >
                                                            <View style={[styles.childBranch, child.isActive && styles.childBranchActive]} />
                                                            <Text
                                                                className={`font-inter text-xs font-semibold ${child.isActive ? 'text-primary-700' : 'text-neutral-500 dark:text-neutral-400'}`}
                                                                numberOfLines={1}
                                                            >
                                                                {child.label}
                                                            </Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            )}
                                            {item.children && item.children.length > 0 && (
                                                <Pressable
                                                    onPress={() => setOpenGroups((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                    style={styles.groupToggleBtn}
                                                >
                                                    <Svg width={14} height={14} viewBox="0 0 24 24">
                                                        <Path
                                                            d={openGroups[item.id] ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                                            stroke={colors.neutral[400]}
                                                            strokeWidth="2.2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </Svg>
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                </View>
                                )}
                            </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Sign Out */}
                <Pressable
                    onPress={() => {
                        onSignOut();
                        close();
                    }}
                    style={({ pressed }) => [
                        styles.signOutButton,
                        { marginBottom: insets.bottom + 20 },
                        pressed && { opacity: 0.75 },
                    ]}
                >
                    <View style={styles.signOutIcon}>
                        <SidebarNavIcon type="logout" color={colors.danger[500]} size={20} />
                    </View>
                    <Animated.View style={labelOpacityStyle}>
                        <Text className="font-inter text-sm font-semibold text-danger-500">
                            Sign Out
                        </Text>
                    </Animated.View>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

// ============ CONTEXT ============

interface SidebarContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    /** Shared value 0→1 driving the sidebar animation on UI thread */
    progress: SharedValue<number>;
}

const SidebarContext = React.createContext<SidebarContextValue>({
    isOpen: false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    progress: { value: 0 } as SharedValue<number>,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const progress = useSharedValue(0);

    const open = React.useCallback(() => {
        setIsOpen(true);
        // Start animation immediately — runs on UI thread, no waiting for re-render
        progress.value = withTiming(1, {
            duration: OPEN_DURATION,
            easing: Easing.out(Easing.cubic),
        });
    }, [progress]);

    const close = React.useCallback(() => {
        // Start close animation immediately on UI thread
        progress.value = withTiming(0, {
            duration: CLOSE_DURATION,
            easing: Easing.in(Easing.cubic),
        });
        // Flip React state after animation completes (for pointerEvents)
        setTimeout(() => setIsOpen(false), CLOSE_DURATION);
    }, [progress]);

    const toggle = React.useCallback(() => {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }, [isOpen, open, close]);

    const value = React.useMemo(
        () => ({ isOpen, open, close, toggle, progress }),
        [isOpen, open, close, toggle, progress]
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return React.useContext(SidebarContext);
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
        overflow: 'hidden',
    },
    sidebarHeader: {
        paddingHorizontal: 16,
        paddingVertical: 18,
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        top: -25,
        right: -25,
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -12,
        left: 50,
        width: 55,
        height: 55,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    userInfoWrap: {
        flex: 1,
        overflow: 'hidden',
    },
    roleBadge: {
        marginTop: 3,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    collapseBtn: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    navContainer: {
        flex: 1,
        paddingTop: 10,
    },
    navContentContainer: {
        paddingBottom: 16,
    },
    navSection: {
        marginBottom: 4,
        paddingTop: 8,
        paddingHorizontal: 10,
    },
    sectionTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 4,
        overflow: 'hidden',
    },
    sectionChevronWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 8,
        marginVertical: 2,
        gap: 10,
    },
    navItemActive: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    navItemPressed: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
    },
    navIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        flexShrink: 0,
    },
    navIconWrapActive: {
        backgroundColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    navLabelRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    groupToggleBtn: {
        position: 'absolute',
        right: 18,
        top: 14,
        width: 22,
        height: 22,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childContainer: {
        position: 'relative',
        marginLeft: 26,
        marginTop: 2,
        marginBottom: 6,
        paddingLeft: 24,
    },
    childDottedLine: {
        position: 'absolute',
        left: 8,
        top: 4,
        bottom: 8,
        width: 1,
        borderLeftWidth: 1,
        borderStyle: 'dotted',
        borderColor: colors.neutral[300],
    },
    childItem: {
        position: 'relative',
        minHeight: 30,
        justifyContent: 'center',
        borderRadius: 8,
        paddingLeft: 12,
        paddingRight: 8,
        marginVertical: 1,
    },
    childItemActive: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    childItemPressed: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
    },
    childBranch: {
        position: 'absolute',
        left: -12,
        top: '50%',
        width: 10,
        marginTop: -1,
        borderTopWidth: 1,
        borderStyle: 'dotted',
        borderColor: colors.neutral[300],
    },
    childBranchActive: {
        borderColor: colors.primary[400],
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.danger[500],
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 10,
    },
    signOutIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.danger[50],
        flexShrink: 0,
    },
    hamburger: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hamburgerPressed: {
        opacity: 0.5,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    moduleSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
        gap: 8,
    },
    moduleSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    searchBarContainer: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 0,
        shadowColor: colors.neutral[400],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
        flexShrink: 0,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Inter',
        color: colors.neutral[700],
        paddingVertical: 10,
    },
    searchClearBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    searchEmptyState: {
        paddingVertical: 32,
        alignItems: 'center',
    },
});
const styles = createStyles(false);
