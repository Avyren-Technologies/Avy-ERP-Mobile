/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { S } from './shared-styles';

export function StepIndicator({
    currentStep,
    totalSteps,
}: {
    currentStep: number;
    totalSteps: number;
}) {
    const scrollRef = React.useRef<ScrollView>(null);

    React.useEffect(() => {
        const offset = Math.max(0, (currentStep - 3) * 40);
        scrollRef.current?.scrollTo({ x: offset, animated: true });
    }, [currentStep]);

    return (
        <View style={S.stepIndicatorWrap}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.stepIndicatorContent}
            >
                {Array.from({ length: totalSteps }, (_, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;
                    return (
                        <React.Fragment key={i}>
                            <View
                                style={[
                                    S.stepDot,
                                    isActive && S.stepDotActive,
                                    isCompleted && S.stepDotCompleted,
                                ]}
                            >
                                {isCompleted ? (
                                    <Svg width={10} height={10} viewBox="0 0 24 24">
                                        <Path
                                            d="M5 12l5 5L20 7"
                                            stroke="#fff"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                ) : (
                                    <Text
                                        className={`font-inter text-[10px] font-bold ${isActive ? 'text-white' : 'text-neutral-400'}`}
                                    >
                                        {stepNum}
                                    </Text>
                                )}
                            </View>
                            {i < totalSteps - 1 && (
                                <View
                                    style={[
                                        S.stepLine,
                                        isCompleted && S.stepLineCompleted,
                                    ]}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </ScrollView>
            <View style={S.stepProgress}>
                <View
                    style={[
                        S.stepProgressFill,
                        { width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` },
                    ]}
                />
            </View>
        </View>
    );
}
