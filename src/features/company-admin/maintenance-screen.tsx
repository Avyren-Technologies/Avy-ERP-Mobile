/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';

const PLANNED_FEATURES = [
    { title: 'Preventive Maintenance', desc: 'Schedule and track time-based and usage-based preventive maintenance plans' },
    { title: 'Breakdown Tracking', desc: 'Log and manage unplanned equipment breakdowns with root cause analysis' },
    { title: 'Spare Parts', desc: 'Spare parts inventory with min-stock alerts and consumption tracking' },
    { title: 'Maintenance Work Orders', desc: 'Create, assign, and close work orders with labour and parts tracking' },
    { title: 'Machine Registry', desc: 'Centralised equipment master with specifications, documents, and maintenance history' },
];

export function MaintenanceScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">Maintenance</Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Coming Soon Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Svg width={32} height={32} viewBox="0 0 24 24">
                            <Path
                                d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                                stroke={colors.primary[500]}
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>

                    {/* Badge */}
                    <View style={styles.badge}>
                        <Text className="font-inter text-primary-700 text-xs font-bold">COMING SOON</Text>
                    </View>

                    <Text className="font-inter text-neutral-900 text-lg font-bold text-center mt-3">
                        Maintenance Module
                    </Text>
                    <Text className="font-inter text-neutral-500 text-sm text-center mt-2 leading-5">
                        Comprehensive maintenance management with preventive scheduling, breakdown tracking, and a full machine registry for all your equipment.
                    </Text>

                    {/* Feature List */}
                    <View style={styles.featureList}>
                        {PLANNED_FEATURES.map((f, i) => (
                            <Animated.View
                                key={f.title}
                                entering={FadeInDown.delay(200 + i * 80).duration(300)}
                                style={styles.featureItem}
                            >
                                <View style={styles.featureDot} />
                                <View style={styles.featureText}>
                                    <Text className="font-inter text-neutral-800 text-sm font-semibold">{f.title}</Text>
                                    <Text className="font-inter text-neutral-500 text-xs mt-0.5">{f.desc}</Text>
                                </View>
                            </Animated.View>
                        ))}
                    </View>

                    {/* Footer */}
                    <Text className="font-inter text-neutral-400 text-xs text-center mt-4 italic">
                        This module is under development.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        marginTop: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
    },
    featureList: { width: '100%', marginTop: 20, gap: 12 },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    featureDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary[400],
        marginTop: 5,
    },
    featureText: { flex: 1 },
});
