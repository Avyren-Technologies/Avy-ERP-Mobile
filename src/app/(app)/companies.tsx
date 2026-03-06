/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

export default function CompaniesScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                <Text className="font-inter text-2xl font-bold text-primary-950">
                    Companies
                </Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">
                    Manage all registered tenants
                </Text>
            </Animated.View>

            {/* Coming Soon Content */}
            <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.comingSoonContainer}>
                <View style={styles.iconWrapper}>
                    <LinearGradient
                        colors={[colors.primary[500], colors.accent[500]]}
                        style={styles.iconGradient}
                    >
                        <Svg width={40} height={40} viewBox="0 0 24 24">
                            <Path
                                d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </LinearGradient>
                </View>
                <Text className="mt-6 font-inter text-xl font-bold text-primary-950">
                    Company Management
                </Text>
                <Text className="mt-2 px-8 text-center font-inter text-sm text-neutral-500">
                    This section will allow you to create, manage, and monitor all tenant companies on the platform.
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    comingSoonContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    iconWrapper: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
