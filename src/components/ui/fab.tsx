import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Pressable,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';

interface FABProps {
    onPress: () => void;
    icon?: 'plus' | 'edit';
    style?: ViewStyle;
    gradient?: readonly [string, string];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FAB({
    onPress,
    icon = 'plus',
    style,
    gradient = [colors.gradient.start, colors.gradient.end] as const,
}: FABProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const renderIcon = () => {
        switch (icon) {
            case 'plus':
                return (
                    <Svg width={26} height={26} viewBox="0 0 24 24">
                        <Path
                            d="M12 5v14M5 12h14"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                    </Svg>
                );
            case 'edit':
                return (
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                        <Path
                            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                            stroke="#ffffff"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <Path
                            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="#ffffff"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.fab, animatedStyle, style]}
        >
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {renderIcon()}
            </LinearGradient>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 20,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
        zIndex: 100,
    },
    gradient: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
