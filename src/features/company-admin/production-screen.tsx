/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';

const PLANNED_FEATURES = [
    { title: 'Production Planning', desc: 'Demand-driven production scheduling with capacity planning' },
    { title: 'Work Orders', desc: 'Create, track, and manage production work orders end-to-end' },
    { title: 'OEE Tracking', desc: 'Overall Equipment Effectiveness monitoring with real-time dashboards' },
    { title: 'Scrap Management', desc: 'Track and analyse production scrap with root cause classification' },
    { title: 'Bill of Materials', desc: 'Multi-level BOM management with version control and cost roll-up' },
];

export function ProductionScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const { toggle } = useSidebar();

    return (
        <View style={styles.container}>
            <AppTopHeader title="Production" onMenuPress={toggle} />

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
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                                stroke={colors.primary[500]}
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Rect x="9" y="3" width="6" height="4" rx="1" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" />
                            <Path d="M9 12h6M9 16h6" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                        </Svg>
                    </View>

                    {/* Badge */}
                    <View style={styles.badge}>
                        <Text className="font-inter text-primary-700 text-xs font-bold">COMING SOON</Text>
                    </View>

                    <Text className="font-inter text-neutral-900 dark:text-white text-lg font-bold text-center mt-3">
                        Production Module
                    </Text>
                    <Text className="font-inter text-neutral-500 dark:text-neutral-400 text-sm text-center mt-2 leading-5">
                        End-to-end manufacturing execution system with production planning, work order management, and real-time OEE tracking.
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
