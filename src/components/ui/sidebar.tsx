/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_FULL_WIDTH = Math.min(280, SCREEN_WIDTH * 0.8);
const SIDEBAR_COLLAPSED_WIDTH = 68;

// ============ TYPES ============

export interface SidebarNavItem {
    id: string;
    label: string;
    icon: SidebarIconType;
    badge?: number;
    isActive?: boolean;
    onPress: () => void;
}

export interface SidebarSection {
    title?: string;
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
    isOpen: boolean;
    onClose: () => void;
    sections: SidebarSection[];
    userName: string;
    userRole: string;
    userInitials: string;
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
            style={styles.hamburger}
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

// ============ SIDEBAR COMPONENT ============

export function Sidebar({
    isOpen,
    onClose,
    sections,
    userName,
    userRole,
    userInitials,
    onSignOut,
    collapsible = false,
}: SidebarProps) {
    const insets = useSafeAreaInsets();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const translateX = useSharedValue(-SIDEBAR_FULL_WIDTH);
    const backdropOpacity = useSharedValue(0);
    const sidebarWidth = useSharedValue(SIDEBAR_FULL_WIDTH);

    const ANIM_DURATION = 250;

    React.useEffect(() => {
        if (isOpen) {
            translateX.value = withTiming(0, { duration: ANIM_DURATION });
            backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
        } else {
            translateX.value = withTiming(-SIDEBAR_FULL_WIDTH, { duration: ANIM_DURATION });
            backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
        }
    }, [isOpen, translateX, backdropOpacity]);

    React.useEffect(() => {
        if (collapsible) {
            sidebarWidth.value = withTiming(
                isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_FULL_WIDTH,
                { duration: 200 }
            );
        }
    }, [isCollapsed, collapsible, sidebarWidth]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const sidebarStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
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

    if (!isOpen) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} pointerEvents="auto">
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
                        <LinearGradient
                            colors={[colors.accent[300], colors.primary[400]]}
                            style={styles.avatar}
                        >
                            <Text className="font-inter text-base font-bold text-white">
                                {userInitials}
                            </Text>
                        </LinearGradient>

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
                            <Pressable onPress={onClose} style={styles.collapseBtn}>
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

                {/* Navigation Items */}
                <View style={styles.navContainer}>
                    {sections.map((section, sIdx) => (
                        <View key={sIdx} style={styles.navSection}>
                            {section.title && (
                                <Animated.View style={[styles.sectionTitleWrap, labelOpacityStyle]}>
                                    <Text className="mb-1 font-inter text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                        {section.title}
                                    </Text>
                                </Animated.View>
                            )}
                            {section.items.map((item) => (
                                <Pressable
                                    key={item.id}
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
                                    <Animated.View style={[styles.navLabelRow, labelOpacityStyle]}>
                                        <Text
                                            className={`font-inter text-sm font-semibold ${item.isActive ? 'text-primary-700' : 'text-neutral-600'}`}
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
                                    </Animated.View>
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Sign Out */}
                <Pressable
                    onPress={() => {
                        onSignOut();
                        onClose();
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
        </View>
    );
}

// ============ CONTEXT ============

interface SidebarContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
    isOpen: false,
    open: () => {},
    close: () => {},
    toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const open = React.useCallback(() => setIsOpen(true), []);
    const close = React.useCallback(() => setIsOpen(false), []);
    const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

    return (
        <SidebarContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return React.useContext(SidebarContext);
}

// ============ STYLES ============

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: colors.white,
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
        overflow: 'hidden',
    },
    navSection: {
        marginBottom: 4,
        paddingTop: 8,
        paddingHorizontal: 10,
    },
    sectionTitleWrap: {
        paddingHorizontal: 8,
        marginBottom: 4,
        overflow: 'hidden',
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
        backgroundColor: colors.primary[50],
    },
    navItemPressed: {
        backgroundColor: colors.neutral[100],
    },
    navIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
        flexShrink: 0,
    },
    navIconWrapActive: {
        backgroundColor: colors.primary[100],
    },
    navLabelRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
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
});
