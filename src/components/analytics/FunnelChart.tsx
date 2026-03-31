import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  height?: number;
}

const DEFAULT_COLORS = [
  colors.primary[300],
  colors.primary[400],
  colors.primary[500],
  colors.primary[600],
  colors.primary[700],
  colors.primary[800],
  colors.accent[500],
  colors.accent[600],
];

const CHART_WIDTH = 340;
const SIDE_PADDING = 16;
const BAR_SPACING = 4;

export function FunnelChart({ stages, height: propHeight }: FunnelChartProps) {
  const computed = useMemo(() => {
    if (stages.length === 0) return null;

    const maxValue = Math.max(...stages.map((s) => s.value), 1);
    const maxBarWidth = CHART_WIDTH - SIDE_PADDING * 2;
    const barHeight = 36;
    const conversionHeight = 20;
    const totalHeight =
      stages.length * barHeight +
      (stages.length - 1) * conversionHeight +
      24; // top/bottom padding

    const bars = stages.map((stage, i) => {
      const widthRatio = stage.value / maxValue;
      const barWidth = Math.max(widthRatio * maxBarWidth, 60);
      const x = (CHART_WIDTH - barWidth) / 2;
      const y = 12 + i * (barHeight + conversionHeight);
      const fillColor = stage.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

      return { ...stage, barWidth, x, y, fillColor };
    });

    const conversions = stages.slice(0, -1).map((stage, i) => {
      const next = stages[i + 1];
      const rate = stage.value > 0 ? ((next.value / stage.value) * 100).toFixed(0) : '0';
      const y = 12 + (i + 1) * barHeight + i * conversionHeight + conversionHeight / 2;
      return { rate, y };
    });

    return { bars, conversions, totalHeight };
  }, [stages]);

  if (!computed) {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text className="font-inter text-[13px] text-neutral-400">No data</Text>
        </View>
      </Animated.View>
    );
  }

  const { bars, conversions, totalHeight } = computed;
  const chartHeight = propHeight ?? totalHeight;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <Svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${CHART_WIDTH} ${totalHeight}`}
      >
        {bars.map((bar, i) => (
          <React.Fragment key={`bar-${i}`}>
            {/* Bar */}
            <Rect
              x={bar.x}
              y={bar.y}
              width={bar.barWidth}
              height={36}
              rx={8}
              ry={8}
              fill={bar.fillColor}
            />
            {/* Label */}
            <SvgText
              x={CHART_WIDTH / 2}
              y={bar.y + 16}
              textAnchor="middle"
              fill={colors.white}
              fontSize={11}
              fontFamily="Inter"
              fontWeight="600"
            >
              {bar.label}
            </SvgText>
            {/* Value */}
            <SvgText
              x={CHART_WIDTH / 2}
              y={bar.y + 30}
              textAnchor="middle"
              fill={colors.white}
              fontSize={10}
              fontFamily="Inter"
              opacity={0.85}
            >
              {bar.value.toLocaleString()}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Conversion rates */}
        {conversions.map((conv, i) => (
          <SvgText
            key={`conv-${i}`}
            x={CHART_WIDTH / 2}
            y={conv.y + 4}
            textAnchor="middle"
            fill={colors.neutral[400]}
            fontSize={10}
            fontFamily="Inter"
            fontWeight="600"
          >
            {conv.rate}%
          </SvgText>
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
