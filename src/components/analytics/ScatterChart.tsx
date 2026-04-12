import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface ScatterChartProps {
  data: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  quadrantLabels?: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
}

const PADDING = { top: 24, right: 16, bottom: 40, left: 48 };
const CHART_WIDTH = 340;

export function ScatterChart({
  data,
  xLabel,
  yLabel,
  height = 260,
  quadrantLabels,
}: ScatterChartProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const computed = useMemo(() => {
    if (data.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of data) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Add 10% padding to ranges
    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;
    minX = minX - xRange * 0.1;
    maxX = maxX + xRange * 0.1;
    minY = minY - yRange * 0.1;
    maxY = maxY + yRange * 0.1;

    const midPx = PADDING.left + plotWidth / 2;
    const midPy = PADDING.top + plotHeight / 2;

    const points = data.map((p) => ({
      px: PADDING.left + ((p.x - minX) / (maxX - minX)) * plotWidth,
      py: PADDING.top + plotHeight - ((p.y - minY) / (maxY - minY)) * plotHeight,
      color: p.color ?? colors.primary[500],
      size: p.size ?? 6,
      label: p.label,
    }));

    return { minX, maxX, minY, maxY, midPx, midPy, points };
  }, [data, plotWidth, plotHeight]);

  if (!computed) {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text className="font-inter text-[13px] text-neutral-400">No data</Text>
        </View>
      </Animated.View>
    );
  }

  const { midPx, midPy, points } = computed;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      >
        {/* Plot background */}
        <Rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotWidth}
          height={plotHeight}
          fill={colors.neutral[50]}
          rx={4}
        />

        {/* X axis */}
        <Line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={CHART_WIDTH - PADDING.right}
          y2={PADDING.top + plotHeight}
          stroke={colors.neutral[200]}
          strokeWidth={1}
        />

        {/* Y axis */}
        <Line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + plotHeight}
          stroke={colors.neutral[200]}
          strokeWidth={1}
        />

        {/* Quadrant dividers (dashed) */}
        <Line
          x1={midPx}
          y1={PADDING.top}
          x2={midPx}
          y2={PADDING.top + plotHeight}
          stroke={colors.neutral[300]}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <Line
          x1={PADDING.left}
          y1={midPy}
          x2={CHART_WIDTH - PADDING.right}
          y2={midPy}
          stroke={colors.neutral[300]}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Quadrant labels */}
        {quadrantLabels && (
          <>
            <SvgText
              x={PADDING.left + plotWidth * 0.25}
              y={PADDING.top + plotHeight * 0.15}
              textAnchor="middle"
              fill={colors.neutral[300]}
              fontSize={9}
              fontFamily="Inter"
              fontWeight="600"
            >
              {quadrantLabels.topLeft}
            </SvgText>
            <SvgText
              x={PADDING.left + plotWidth * 0.75}
              y={PADDING.top + plotHeight * 0.15}
              textAnchor="middle"
              fill={colors.neutral[300]}
              fontSize={9}
              fontFamily="Inter"
              fontWeight="600"
            >
              {quadrantLabels.topRight}
            </SvgText>
            <SvgText
              x={PADDING.left + plotWidth * 0.25}
              y={PADDING.top + plotHeight * 0.9}
              textAnchor="middle"
              fill={colors.neutral[300]}
              fontSize={9}
              fontFamily="Inter"
              fontWeight="600"
            >
              {quadrantLabels.bottomLeft}
            </SvgText>
            <SvgText
              x={PADDING.left + plotWidth * 0.75}
              y={PADDING.top + plotHeight * 0.9}
              textAnchor="middle"
              fill={colors.neutral[300]}
              fontSize={9}
              fontFamily="Inter"
              fontWeight="600"
            >
              {quadrantLabels.bottomRight}
            </SvgText>
          </>
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <React.Fragment key={`point-${i}`}>
            <Circle
              cx={p.px}
              cy={p.py}
              r={p.size}
              fill={p.color}
              opacity={0.85}
              stroke={colors.white}
              strokeWidth={1.5}
            />
            {p.label && (
              <SvgText
                x={p.px}
                y={p.py - p.size - 4}
                textAnchor="middle"
                fill={colors.neutral[600]}
                fontSize={9}
                fontFamily="Inter"
              >
                {p.label}
              </SvgText>
            )}
          </React.Fragment>
        ))}

        {/* X axis label */}
        {xLabel && (
          <SvgText
            x={PADDING.left + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fill={colors.neutral[500]}
            fontSize={11}
            fontFamily="Inter"
            fontWeight="600"
          >
            {xLabel}
          </SvgText>
        )}

        {/* Y axis label */}
        {yLabel && (
          <SvgText
            x={12}
            y={PADDING.top + plotHeight / 2}
            textAnchor="middle"
            fill={colors.neutral[500]}
            fontSize={11}
            fontFamily="Inter"
            fontWeight="600"
            rotation={-90}
            originX={12}
            originY={PADDING.top + plotHeight / 2}
          >
            {yLabel}
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
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
const styles = createStyles(false);
