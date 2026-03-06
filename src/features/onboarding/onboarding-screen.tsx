/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    iconType: 'operations' | 'insights' | 'manufacturing';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: '1',
        title: 'Streamline Your\nOperations',
        subtitle: 'ALL-IN-ONE ERP',
        description:
            'Manage HR, Production, Inventory, Sales, and more — all from a single, powerful mobile platform.',
        iconType: 'operations',
    },
    {
        id: '2',
        title: 'Real-Time\nInsights',
        subtitle: 'SMART ANALYTICS',
        description:
            'Track OEE, monitor machine health, view KPIs, and make data-driven decisions instantly from anywhere.',
        iconType: 'insights',
    },
    {
        id: '3',
        title: 'Built for\nManufacturing',
        subtitle: 'INDUSTRY READY',
        description:
            'Offline-first design for shop floors, multi-plant support, and role-based access for every team member.',
        iconType: 'manufacturing',
    },
];

// Illustration Placeholder Component
function IllustrationPlaceholder({ type, isActive }: { type: string; isActive: boolean }) {
    const scale = useSharedValue(0.8);

    React.useEffect(() => {
        scale.value = withSpring(isActive ? 1 : 0.8, { damping: 12, stiffness: 100 });
    }, [isActive, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: interpolate(scale.value, [0.8, 1], [0.6, 1]),
    }));

    const getIllustration = () => {
        switch (type) {
            case 'operations':
                return (
                    <Svg width={220} height={220} viewBox="0 0 220 220">
                        <Defs>
                            <RadialGradient id="glow1" cx="50%" cy="50%" r="50%">
                                <Stop offset="0%" stopColor={colors.primary[400]} stopOpacity="0.3" />
                                <Stop offset="100%" stopColor={colors.primary[400]} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx="110" cy="110" r="100" fill="url(#glow1)" />
                        <Circle cx="110" cy="110" r="70" fill={colors.primary[100]} opacity={0.5} />
                        <Circle cx="110" cy="110" r="45" fill={colors.primary[200]} opacity={0.6} />
                        {/* Grid / Dashboard icon */}
                        <Rect x="70" y="75" width="35" height="30" rx="6" fill={colors.primary[500]} />
                        <Rect x="115" y="75" width="35" height="30" rx="6" fill={colors.accent[400]} />
                        <Rect x="70" y="115" width="35" height="30" rx="6" fill={colors.accent[500]} />
                        <Rect x="115" y="115" width="35" height="30" rx="6" fill={colors.primary[400]} />
                        {/* Floating elements */}
                        <Circle cx="160" cy="65" r="8" fill={colors.success[400]} opacity={0.8} />
                        <Circle cx="55" cy="150" r="6" fill={colors.warning[400]} opacity={0.8} />
                        <Circle cx="170" cy="150" r="5" fill={colors.info[400]} opacity={0.8} />
                    </Svg>
                );
            case 'insights':
                return (
                    <Svg width={220} height={220} viewBox="0 0 220 220">
                        <Defs>
                            <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
                                <Stop offset="0%" stopColor={colors.accent[400]} stopOpacity="0.3" />
                                <Stop offset="100%" stopColor={colors.accent[400]} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx="110" cy="110" r="100" fill="url(#glow2)" />
                        <Circle cx="110" cy="110" r="70" fill={colors.accent[100]} opacity={0.5} />
                        {/* Chart lines */}
                        <Path
                            d="M60 150 L85 120 L110 135 L135 95 L160 80"
                            stroke={colors.primary[500]}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <Path
                            d="M60 150 L85 130 L110 140 L135 110 L160 100"
                            stroke={colors.accent[400]}
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.7}
                        />
                        {/* Data points */}
                        <Circle cx="85" cy="120" r="5" fill={colors.primary[500]} />
                        <Circle cx="110" cy="135" r="5" fill={colors.primary[500]} />
                        <Circle cx="135" cy="95" r="5" fill={colors.primary[500]} />
                        <Circle cx="160" cy="80" r="5" fill={colors.primary[500]} />
                        {/* Floating metric cards */}
                        <Rect x="45" y="70" width="40" height="24" rx="6" fill={colors.success[400]} opacity={0.9} />
                        <Rect x="140" y="55" width="40" height="24" rx="6" fill={colors.info[400]} opacity={0.9} />
                    </Svg>
                );
            case 'manufacturing':
                return (
                    <Svg width={220} height={220} viewBox="0 0 220 220">
                        <Defs>
                            <RadialGradient id="glow3" cx="50%" cy="50%" r="50%">
                                <Stop offset="0%" stopColor={colors.primary[500]} stopOpacity="0.25" />
                                <Stop offset="100%" stopColor={colors.primary[500]} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx="110" cy="110" r="100" fill="url(#glow3)" />
                        <Circle cx="110" cy="110" r="70" fill={colors.primary[50]} opacity={0.6} />
                        {/* Factory / Building */}
                        <Rect x="70" y="90" width="80" height="60" rx="6" fill={colors.primary[600]} />
                        <Rect x="80" y="80" width="20" height="70" rx="3" fill={colors.primary[700]} />
                        <Rect x="120" y="85" width="20" height="65" rx="3" fill={colors.primary[700]} />
                        {/* Windows */}
                        <Rect x="85" y="100" width="10" height="10" rx="2" fill={colors.accent[200]} />
                        <Rect x="125" y="100" width="10" height="10" rx="2" fill={colors.accent[200]} />
                        <Rect x="105" y="115" width="10" height="10" rx="2" fill={colors.accent[200]} />
                        {/* Gear icon */}
                        <Circle cx="165" cy="75" r="14" fill={colors.accent[400]} opacity={0.9} />
                        <Circle cx="165" cy="75" r="6" fill={colors.white} opacity={0.8} />
                        {/* Signal waves */}
                        <Path d="M50 80 Q55 70 60 80" stroke={colors.success[400]} strokeWidth="2" fill="none" opacity={0.7} />
                        <Path d="M45 85 Q55 65 65 85" stroke={colors.success[400]} strokeWidth="2" fill="none" opacity={0.5} />
                    </Svg>
                );
            default:
                return null;
        }
    };

    return (
        <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
            {getIllustration()}
        </Animated.View>
    );
}

// Pagination Dots
function PaginationDots({ currentIndex }: { currentIndex: number }) {
    return (
        <View style={styles.paginationContainer}>
            {ONBOARDING_STEPS.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                width: isActive ? 28 : 8,
                                backgroundColor: isActive ? colors.primary[500] : colors.primary[200],
                                opacity: isActive ? 1 : 0.6,
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}

// Onboarding Page
function OnboardingPage({
    step,
    index,
    currentIndex,
}: {
    step: OnboardingStep;
    index: number;
    currentIndex: number;
}) {
    const isActive = index === currentIndex;

    return (
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {/* Illustration Area */}
            <Animated.View
                entering={FadeIn.duration(600).delay(200)}
                style={styles.illustrationWrapper}
            >
                <IllustrationPlaceholder type={step.iconType} isActive={isActive} />
            </Animated.View>

            {/* Content Area */}
            <Animated.View
                entering={FadeInUp.duration(500).delay(300)}
                style={styles.contentArea}
            >
                <Text
                    className="mb-2 text-center font-inter text-xs font-bold tracking-[3px] text-primary-400"
                >
                    {step.subtitle}
                </Text>
                <Text
                    className="mb-4 text-center font-inter text-3xl font-bold leading-10 text-primary-950 dark:text-white"
                >
                    {step.title}
                </Text>
                <Text
                    className="px-4 text-center font-inter text-base leading-6 text-neutral-500 dark:text-neutral-400"
                >
                    {step.description}
                </Text>
            </Animated.View>
        </View>
    );
}

export function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [, setIsFirstTime] = useIsFirstTime();
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const flatListRef = React.useRef<FlatList>(null);

    const handleSkip = () => {
        setIsFirstTime(false);
        router.replace('/login');
    };

    const handleNext = () => {
        if (currentIndex < ONBOARDING_STEPS.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            setIsFirstTime(false);
            router.replace('/login');
        }
    };

    const onViewableItemsChanged = React.useCallback(
        ({ viewableItems }: any) => {
            if (viewableItems.length > 0) {
                setCurrentIndex(viewableItems[0].index ?? 0);
            }
        },
        [],
    );

    const viewabilityConfig = React.useMemo(
        () => ({
            itemVisiblePercentThreshold: 50,
        }),
        [],
    );

    const isLastStep = currentIndex === ONBOARDING_STEPS.length - 1;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Background gradient */}
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative background circles */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />
            <View style={styles.bgCircle3} />

            {/* Skip Button */}
            <Animated.View
                entering={FadeIn.duration(400)}
                style={[styles.skipContainer, { top: insets.top + 16 }]}
            >
                {!isLastStep && (
                    <Pressable onPress={handleSkip} style={styles.skipButton}>
                        <Text className="font-inter text-sm font-semibold text-primary-500">
                            Skip
                        </Text>
                    </Pressable>
                )}
            </Animated.View>

            {/* Pages */}
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_STEPS}
                renderItem={({ item, index }) => (
                    <OnboardingPage
                        step={item}
                        index={index}
                        currentIndex={currentIndex}
                    />
                )}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                bounces={false}
                style={styles.flatList}
                contentContainerStyle={styles.flatListContent}
            />

            {/* Bottom Section */}
            <Animated.View
                entering={FadeInDown.duration(500).delay(400)}
                style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}
            >
                {/* Pagination Dots */}
                <PaginationDots currentIndex={currentIndex} />

                {/* CTA Button */}
                <Pressable onPress={handleNext} style={styles.ctaButtonWrapper}>
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Text className="font-inter text-base font-bold text-white">
                            {isLastStep ? 'Get Started' : 'Continue'}
                        </Text>
                    </LinearGradient>
                </Pressable>

                {/* Already have an account */}
                {isLastStep && (
                    <Pressable onPress={handleSkip} style={styles.alreadyMemberButton}>
                        <Text className="font-inter text-sm font-medium text-primary-500">
                            Already have an account?{' '}
                            <Text className="font-semibold text-primary-600">Sign In</Text>
                        </Text>
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    bgCircle1: {
        position: 'absolute',
        top: -80,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.primary[100],
        opacity: 0.3,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 120,
        left: -80,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: colors.accent[100],
        opacity: 0.25,
    },
    bgCircle3: {
        position: 'absolute',
        top: SCREEN_HEIGHT * 0.35,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary[50],
        opacity: 0.4,
    },
    skipContainer: {
        position: 'absolute',
        right: 24,
        zIndex: 10,
    },
    skipButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.primary[50],
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
        alignItems: 'center',
    },
    page: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    illustrationWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        maxHeight: SCREEN_HEIGHT * 0.4,
    },
    illustrationContainer: {
        width: 220,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentArea: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    bottomSection: {
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    ctaButtonWrapper: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alreadyMemberButton: {
        marginTop: 20,
        paddingVertical: 8,
    },
});
