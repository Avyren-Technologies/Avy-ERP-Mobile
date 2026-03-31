import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton } from '@/components/ui/sidebar';

interface AppTopHeaderProps {
    title: string;
    onMenuPress: () => void;
    rightSlot?: React.ReactNode;
    subtitle?: string;
}

export function AppTopHeader({ title, onMenuPress, rightSlot, subtitle }: AppTopHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
            <View style={styles.headerDecor1} />
            <View style={styles.headerDecor2} />

            <View style={styles.headerRow}>
                <View style={styles.sideSlot}>
                    <HamburgerButton onPress={onMenuPress} />
                </View>
                <View style={styles.titleWrap}>
                    <Text className="font-inter text-lg font-bold text-white" numberOfLines={1}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text className="mt-0.5 font-inter text-[11px] text-white/80" numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.sideSlot}>
                    {rightSlot ?? <View style={styles.rightSpacer} />}
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    headerGradient: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sideSlot: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    rightSpacer: {
        width: 36,
    },
});
