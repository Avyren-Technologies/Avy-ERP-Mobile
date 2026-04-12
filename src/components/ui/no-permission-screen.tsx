import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useIsDark } from '@/hooks/use-is-dark';

interface NoPermissionScreenProps {
    /** Override the default title. */
    title?: string;
    /** Override the default description. */
    description?: string;
    /** Label for the back button. Defaults to 'Go Back'. */
    backLabel?: string;
    /** If provided, a secondary action button is rendered. */
    action?: {
        label: string;
        onPress: () => void;
    };
}

function ShieldIcon() {
    return (
        <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke={colors.primary[400]}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Circle cx={12} cy={11} r={2} fill={colors.primary[400]} />
            <Path
                d="M12 13v3"
                stroke={colors.primary[400]}
                strokeWidth={1.5}
                strokeLinecap="round"
            />
        </Svg>
    );
}

export function NoPermissionScreen({
    title = "Access Restricted",
    description = "You don't have permission to view this screen. Please contact your administrator if you believe this is a mistake.",
    backLabel = "Go Back",
    action,
}: NoPermissionScreenProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.content}>
                {/* Icon */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.iconWrap}>
                    <View style={styles.iconBg}>
                        <ShieldIcon />
                    </View>
                </Animated.View>

                {/* Text */}
                <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.textWrap}>
                    <Text
                        className="font-inter text-center text-2xl font-bold"
                        style={{ color: colors.primary[900] }}
                    >
                        {title}
                    </Text>
                    <Text
                        className="font-inter text-center text-sm leading-6 mt-3"
                        style={{ color: colors.neutral?.[500] ?? '#64748b' }}
                    >
                        {description}
                    </Text>
                </Animated.View>

                {/* Actions */}
                <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.actions}>
                    <Button
                        label={backLabel}
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                        variant="outline"
                        style={styles.btn}
                    />
                    {action && (
                        <Button
                            label={action.label}
                            onPress={action.onPress}
                            variant="default"
                            style={styles.btn}
                        />
                    )}
                </Animated.View>
            </View>
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 24,
    },
    iconWrap: {
        alignItems: 'center',
    },
    iconBg: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        alignItems: 'center',
        gap: 4,
    },
    actions: {
        width: '100%',
        gap: 12,
        marginTop: 8,
    },
    btn: {
        width: '100%',
    },
});
const styles = createStyles(false);
