/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import colors from '@/components/ui/colors';

/**
 * InfoTooltip — A small info icon that expands/collapses a description on press.
 * Mobile equivalent of the web hover-based tooltip.
 * Used across HRMS config screens to explain non-obvious fields.
 */
export function InfoTooltip({ content }: { content: string }) {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <View>
            <Pressable
                onPress={() => setExpanded((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtn}
            >
                <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Circle cx={12} cy={12} r={10} stroke={colors.neutral[400]} strokeWidth={2} fill="none" />
                    <Path d="M12 16v-4M12 8h.01" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {expanded && (
                <Animated.View
                    entering={FadeInDown.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.tooltipContainer}
                >
                    <Text className="font-inter text-xs leading-relaxed text-neutral-300">{content}</Text>
                </Animated.View>
            )}
        </View>
    );
}

/**
 * SectionDescription — A muted description line rendered below section headers.
 * Identical text to web's SectionDescription, adapted for mobile styling.
 */
export function SectionDescription({ children }: { children: string }) {
    return (
        <Text className="mb-2 font-inter text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{children}</Text>
    );
}

const styles = StyleSheet.create({
    iconBtn: {
        marginLeft: 4,
        padding: 2,
    },
    tooltipContainer: {
        marginTop: 6,
        marginBottom: 4,
        backgroundColor: 'rgba(38, 38, 38, 0.92)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
});
