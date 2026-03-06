/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

// ============ MODULE DATA ============

interface ModuleInfo {
    key: string;
    name: string;
    description: string;
    price: string;
    deps: string[];
    icon: 'masters' | 'security' | 'hr' | 'production' | 'maintenance' | 'inventory' | 'vendor' | 'sales' | 'finance' | 'visitor';
}

const MODULES: ModuleInfo[] = [
    { key: 'masters', name: 'Masters', description: 'Item, Machine, Shift, No Series masters', price: 'Included', deps: [], icon: 'masters' },
    { key: 'security', name: 'Security', description: 'Gate management, Face scan, QR codes', price: '₹4,500/mo', deps: ['masters'], icon: 'security' },
    { key: 'hr', name: 'HR Management', description: 'Attendance, Leave, Payroll, Incentives', price: '₹8,500/mo', deps: ['security'], icon: 'hr' },
    { key: 'production', name: 'Production', description: 'Production slips, OEE, Scrap/NC tracking', price: '₹7,500/mo', deps: ['machine-maint', 'masters'], icon: 'production' },
    { key: 'machine-maint', name: 'Machine Maintenance', description: 'PM scheduling, Breakdown tracking, Spares', price: '₹6,000/mo', deps: ['masters'], icon: 'maintenance' },
    { key: 'inventory', name: 'Inventory', description: 'Stock management, Reorder, GRN', price: '₹5,500/mo', deps: ['masters'], icon: 'inventory' },
    { key: 'vendor', name: 'Vendor Management', description: 'POs, ASN, GRN, Vendor rating', price: '₹5,000/mo', deps: ['inventory', 'masters'], icon: 'vendor' },
    { key: 'sales', name: 'Sales & Invoicing', description: 'Invoices, Quotations, Sales orders', price: '₹6,500/mo', deps: ['finance', 'masters'], icon: 'sales' },
    { key: 'finance', name: 'Finance', description: 'Receivables, Payables, P&L, Balance Sheet', price: '₹9,000/mo', deps: ['masters'], icon: 'finance' },
    { key: 'visitor', name: 'Visitor Management', description: 'Pre-registration, Check-in/out, Audit', price: '₹3,500/mo', deps: ['security'], icon: 'visitor' },
];

// Mock initial active modules
const INITIAL_ACTIVE = ['masters', 'security', 'hr', 'production', 'machine-maint', 'inventory', 'sales'];

// ============ MODULE ICON ============

function ModuleIcon({ type, size = 20, color }: { type: string; size?: number; color: string }) {
    switch (type) {
        case 'masters':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'security':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'hr':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'production':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none" /><Path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke={color} strokeWidth="1.5" fill="none" /></Svg>;
        case 'maintenance':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'inventory':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={color} strokeWidth="1.5" fill="none" /><Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth="1.5" fill="none" /></Svg>;
        case 'vendor':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" /><Path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.5" fill="none" /></Svg>;
        case 'sales':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'finance':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></Svg>;
        case 'visitor':
            return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="2" y="3" width="20" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" /><Path d="M8 7h.01M12 7h.01M16 7h.01" stroke={color} strokeWidth="2" strokeLinecap="round" /><Path d="M2 11h20" stroke={color} strokeWidth="1.5" /></Svg>;
        default:
            return null;
    }
}

// ============ MAIN COMPONENT ============

export function ModuleAssignmentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [activeModules, setActiveModules] = React.useState<string[]>(INITIAL_ACTIVE);
    const [hasChanges, setHasChanges] = React.useState(false);

    const toggleModule = (key: string) => {
        if (key === 'masters') return;
        const mod = MODULES.find(m => m.key === key);
        if (!mod) return;

        setHasChanges(true);
        if (activeModules.includes(key)) {
            // Remove this module (and warn if others depend on it)
            setActiveModules(prev => prev.filter(k => k !== key));
        } else {
            // Add + auto-resolve deps
            const toAdd = [key, ...mod.deps].filter(d => !activeModules.includes(d));
            setActiveModules(prev => [...prev, ...toAdd]);
        }
    };

    const handleSave = () => {
        setHasChanges(false);
        router.back();
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.headerBack}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' as const }}>
                    <Text className="font-inter text-base font-bold text-primary-950">Module Assignment</Text>
                    <Text className="font-inter text-xs text-neutral-500">{activeModules.length} of {MODULES.length} modules active</Text>
                </View>
                <View style={{ width: 36 }} />
            </Animated.View>

            {/* Dependency Banner */}
            <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.depBanner}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={colors.info[500]} strokeWidth="1.5" fill="none" />
                    <Path d="M12 16v-4M12 8h.01" stroke={colors.info[500]} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
                <Text className="flex-1 font-inter text-xs text-info-700">
                    Dependencies are auto-resolved when you toggle a module on.
                </Text>
            </Animated.View>

            {/* Module List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {MODULES.map((mod, index) => {
                    const isActive = activeModules.includes(mod.key);
                    const isRequired = mod.key === 'masters';
                    return (
                        <Animated.View key={mod.key} entering={FadeInUp.duration(300).delay(100 + index * 50)}>
                            <Pressable
                                onPress={() => toggleModule(mod.key)}
                                disabled={isRequired}
                                style={[styles.moduleCard, isActive && styles.moduleCardActive]}
                            >
                                <View style={styles.moduleCardLeft}>
                                    <View style={[styles.moduleIconContainer, { backgroundColor: isActive ? colors.primary[100] : colors.neutral[100] }]}>
                                        <ModuleIcon type={mod.icon} color={isActive ? colors.primary[600] : colors.neutral[400]} />
                                    </View>
                                    <View style={styles.moduleCardInfo}>
                                        <Text className={`font-inter text-sm font-bold ${isActive ? 'text-primary-800' : 'text-primary-950'}`}>
                                            {mod.name}
                                        </Text>
                                        <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>
                                            {mod.description}
                                        </Text>
                                        {mod.deps.length > 0 && (
                                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                                Deps: {mod.deps.map(d => MODULES.find(m => m.key === d)?.name).join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.moduleCardRight}>
                                    <Text className={`font-inter text-xs font-bold ${isActive ? 'text-success-600' : 'text-neutral-400'}`}>
                                        {mod.price}
                                    </Text>
                                    {isRequired ? (
                                        <View style={styles.requiredBadge}>
                                            <Text className="font-inter text-[9px] font-bold text-primary-600">REQUIRED</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.toggleTrack, isActive && styles.toggleTrackActive]}>
                                            <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        </Animated.View>
                    );
                })}
            </ScrollView>

            {/* Save Button */}
            {hasChanges && (
                <Animated.View entering={FadeIn.duration(200)} style={[styles.saveCTA, { paddingBottom: insets.bottom + 16 }]}>
                    <Pressable onPress={handleSave} style={styles.saveWrapper}>
                        <LinearGradient
                            colors={[colors.gradient.start, colors.gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButton}
                        >
                            <Text className="font-inter text-base font-bold text-white">
                                Save Changes
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 12,
    },
    headerBack: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    depBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.info[50],
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    // Module Card
    moduleCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    moduleCardActive: {
        borderColor: colors.primary[300],
        backgroundColor: colors.primary[50],
    },
    moduleCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    moduleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    moduleCardInfo: {
        flex: 1,
    },
    moduleCardRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    requiredBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.primary[100],
    },
    // Toggle
    toggleTrack: {
        width: 40,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.neutral[300],
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleTrackActive: {
        backgroundColor: colors.primary[500],
    },
    toggleThumb: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    // Save CTA
    saveCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    saveWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
