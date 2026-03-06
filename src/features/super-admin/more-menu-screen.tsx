/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { signOut } from '@/features/auth/use-auth-store';

interface MenuItem {
    id: string;
    title: string;
    subtitle: string;
    iconType: string;
    gradient: readonly [string, string];
    route?: string;
    action?: () => void;
}

// ============ ICON HELPER ============

function MenuIcon({ type }: { type: string }) {
    const c = '#fff';
    switch (type) {
        case 'catalogue':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none" /><Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none" /><Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none" /><Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none" /></Svg>;
        case 'monitor':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M18 20V10M12 20V4M6 20v-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        case 'notifications':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'profile':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Circle cx="12" cy="7" r="4" stroke={c} strokeWidth="1.5" fill="none" /></Svg>;
        case 'settings':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.5" fill="none" /><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" /></Svg>;
        case 'logout':
            return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
        default:
            return null;
    }
}

// ============ MAIN COMPONENT ============

export function MoreMenuScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const MENU_ITEMS: MenuItem[] = [
        {
            id: 'catalogue',
            title: 'Module Catalogue',
            subtitle: 'Browse all available ERP modules',
            iconType: 'catalogue',
            gradient: [colors.primary[500], colors.primary[700]],
        },
        {
            id: 'monitor',
            title: 'Platform Monitor',
            subtitle: 'System health, usage metrics & alerts',
            iconType: 'monitor',
            gradient: [colors.accent[500], colors.accent[700]],
        },
        {
            id: 'notifications',
            title: 'Notifications',
            subtitle: 'Alerts, reminders & system events',
            iconType: 'notifications',
            gradient: [colors.info[500], colors.info[700]],
        },
        {
            id: 'profile',
            title: 'Profile',
            subtitle: 'Your Super Admin account',
            iconType: 'profile',
            gradient: [colors.success[500], colors.success[700]],
        },
        {
            id: 'settings',
            title: 'Settings',
            subtitle: 'Theme, language & app preferences',
            iconType: 'settings',
            gradient: [colors.neutral[500], colors.neutral[700]],
            route: '/(app)/settings',
        },
    ];

    const handlePress = (item: MenuItem) => {
        if (item.action) {
            item.action();
        } else if (item.route) {
            router.push(item.route as any);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                bounces={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">More</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Tools & settings</Text>
                </Animated.View>

                {/* Admin Card */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.adminCard}>
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.adminGradient}
                    >
                        <View style={styles.adminDecor1} />
                        <View style={styles.adminDecor2} />
                        <View style={styles.adminContent}>
                            <LinearGradient
                                colors={[colors.accent[300], colors.primary[400]]}
                                style={styles.adminAvatar}
                            >
                                <Text className="font-inter text-xl font-bold text-white">SA</Text>
                            </LinearGradient>
                            <View style={styles.adminInfo}>
                                <Text className="font-inter text-base font-bold text-white">Super Admin</Text>
                                <Text className="font-inter text-xs text-primary-200">admin@avyren.com</Text>
                            </View>
                        </View>
                        <View style={styles.adminStats}>
                            <View style={styles.adminStatItem}>
                                <Text className="font-inter text-base font-bold text-white">148</Text>
                                <Text className="font-inter text-[10px] text-primary-200">Companies</Text>
                            </View>
                            <View style={styles.adminStatDivider} />
                            <View style={styles.adminStatItem}>
                                <Text className="font-inter text-base font-bold text-white">99.98%</Text>
                                <Text className="font-inter text-[10px] text-primary-200">Uptime</Text>
                            </View>
                            <View style={styles.adminStatDivider} />
                            <View style={styles.adminStatItem}>
                                <Text className="font-inter text-base font-bold text-white">v2.4.1</Text>
                                <Text className="font-inter text-[10px] text-primary-200">Platform</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {MENU_ITEMS.map((item, index) => (
                        <Animated.View key={item.id} entering={FadeInUp.duration(300).delay(200 + index * 60)}>
                            <Pressable
                                onPress={() => handlePress(item)}
                                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                            >
                                <LinearGradient
                                    colors={item.gradient}
                                    style={styles.menuIcon}
                                >
                                    <MenuIcon type={item.iconType} />
                                </LinearGradient>
                                <View style={styles.menuContent}>
                                    <Text className="font-inter text-sm font-bold text-primary-950">{item.title}</Text>
                                    <Text className="font-inter text-xs text-neutral-500">{item.subtitle}</Text>
                                </View>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                        </Animated.View>
                    ))}
                </View>

                {/* Sign Out */}
                <Animated.View entering={FadeIn.duration(300).delay(600)} style={styles.signOutSection}>
                    <Pressable onPress={signOut} style={styles.signOutButton}>
                        <LinearGradient
                            colors={[colors.danger[500], colors.danger[600]]}
                            style={styles.signOutGradient}
                        >
                            <MenuIcon type="logout" />
                            <Text className="ml-2 font-inter text-sm font-bold text-white">Sign Out</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </ScrollView>
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
    // Admin Card
    adminCard: {
        marginHorizontal: 24,
        marginTop: 16,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    adminGradient: {
        padding: 20,
        overflow: 'hidden',
    },
    adminDecor1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    adminDecor2: {
        position: 'absolute',
        bottom: -10,
        left: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    adminContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    adminAvatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        marginRight: 14,
    },
    adminInfo: {
        flex: 1,
    },
    adminStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    adminStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    adminStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    // Menu
    menuSection: {
        paddingHorizontal: 24,
        marginTop: 20,
        gap: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 14,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    menuItemPressed: {
        backgroundColor: colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    menuIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuContent: {
        flex: 1,
        gap: 2,
    },
    // Sign Out
    signOutSection: {
        paddingHorizontal: 24,
        marginTop: 32,
    },
    signOutButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.danger[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    signOutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 16,
    },
});
