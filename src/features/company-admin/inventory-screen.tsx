/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';

const PLANNED_FEATURES = [
    { title: 'Stock Management', desc: 'Real-time stock levels across all warehouses and locations' },
    { title: 'Goods Receipt', desc: 'Inward material receipt with quality inspection workflow' },
    { title: 'Material Issue', desc: 'Issue materials against work orders or departments' },
    { title: 'Stock Transfer', desc: 'Inter-warehouse and inter-location stock movement' },
    { title: 'Cycle Counting', desc: 'Scheduled and ad-hoc inventory audits with variance analysis' },
];

export function InventoryScreen() {
    const { toggle } = useSidebar();

    return (
        <View style={styles.container}>
            <AppTopHeader title="Inventory" onMenuPress={toggle} />

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
                                d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4A2 2 0 012 16.76V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z"
                                stroke={colors.primary[500]}
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Path d="M2.32 6.16L12 11l9.68-4.84M12 22.76V11" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>

                    {/* Badge */}
                    <View style={styles.badge}>
                        <Text className="font-inter text-primary-700 text-xs font-bold">COMING SOON</Text>
                    </View>

                    <Text className="font-inter text-neutral-900 text-lg font-bold text-center mt-3">
                        Inventory Module
                    </Text>
                    <Text className="font-inter text-neutral-500 text-sm text-center mt-2 leading-5">
                        Comprehensive inventory management with real-time stock tracking, automated reorder points, and multi-warehouse support.
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
