/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';

const PLANNED_FEATURES = [
    { title: 'Preventive Maintenance', desc: 'Schedule and track time-based and usage-based preventive maintenance plans' },
    { title: 'Breakdown Tracking', desc: 'Log and manage unplanned equipment breakdowns with root cause analysis' },
    { title: 'Spare Parts', desc: 'Spare parts inventory with min-stock alerts and consumption tracking' },
    { title: 'Maintenance Work Orders', desc: 'Create, assign, and close work orders with labour and parts tracking' },
    { title: 'Machine Registry', desc: 'Centralised equipment master with specifications, documents, and maintenance history' },
];

export function MaintenanceScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const { toggle } = useSidebar();

    return (
        <View style={styles.container}>
            <AppTopHeader title="Maintenance" onMenuPress={toggle} />

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

                    <Text className="font-inter text-neutral-900 dark:text-white text-lg font-bold text-center mt-3">
                        Maintenance Module
                    </Text>
                    <Text className="font-inter text-neutral-500 dark:text-neutral-400 text-sm text-center mt-2 leading-5">
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
                                    <Text className="font-inter text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">{f.desc}</Text>
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

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
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
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        marginTop: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    featureList: { width: '100%', marginTop: 20, gap: 12 },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
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
const styles = createStyles(false);
