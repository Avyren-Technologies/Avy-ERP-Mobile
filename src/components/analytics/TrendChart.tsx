import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export interface TrendDataPoint {
  x: string | number;
  y: number;
}

export interface TrendSeries {
  label: string;
  data: TrendDataPoint[];
  color?: string;
  showArea?: boolean;
}

interface TrendChartProps {
  series: TrendSeries[];
  height?: number;
  title?: string;
  showLegend?: boolean;
}

const CHART_COLORS = [
  colors.primary[500],
  colors.accent[500],
  colors.success[500],
  colors.warning[500],
  colors.info[500],
  colors.danger[500],
];

const PADDING = { top: 20, right: 16, bottom: 36, left: 48 };

function buildSmoothPath(points: { px: number; py: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].px},${points[0].py}`;

  let path = `M${points[0].px},${points[0].py}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx = (p0.px + p1.px) / 2;
    path += ` C${cpx},${p0.py} ${cpx},${p1.py} ${p1.px},${p1.py}`;
  }
  return path;
}

function formatAxisValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(Math.round(value));
}

export function TrendChart({
  series,
  height = 220,
  title,
  showLegend = true,
}: TrendChartProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const chartWidth = 340; // Will be scaled via viewBox
  const chartHeight = height;
  const plotWidth = chartWidth - PADDING.left - PADDING.right;
  const plotHeight = chartHeight - PADDING.top - PADDING.bottom;

  const computed = useMemo(() => {
    if (series.length === 0 || series[0].data.length === 0) return null;

    // Find global min/max
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of series) {
      for (const d of s.data) {
        if (d.y < minY) minY = d.y;
        if (d.y > maxY) maxY = d.y;
      }
    }

    // Add 10% padding to y range
    const yRange = maxY - minY || 1;
    minY = Math.max(0, minY - yRange * 0.1);
    maxY = maxY + yRange * 0.1;

    // X positions (use first series as reference for x labels)
    const xLabels = series[0].data.map((d) => String(d.x));
    const xCount = xLabels.length;

    // Compute grid lines for Y axis
    const yTickCount = 4;
    const yTicks: number[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      yTicks.push(minY + (yRange + yRange * 0.2) * (i / yTickCount));
    }

    // Map series to pixel coordinates
    const seriesData = series.map((s) => {
      const points = s.data.map((d, i) => ({
        px: PADDING.left + (xCount > 1 ? (i / (xCount - 1)) * plotWidth : plotWidth / 2),
        py: PADDING.top + plotHeight - ((d.y - minY) / (maxY - minY)) * plotHeight,
        value: d.y,
      }));
      return { ...s, points };
    });

    return { xLabels, yTicks, minY, maxY, seriesData };
  }, [series, plotWidth, plotHeight]);

  if (!computed || series.length === 0) return null;

  const { xLabels, yTicks, minY, maxY, seriesData } = computed;

  return (
    <View style={styles.container}>
      {/* Chart header */}
      {title && (
        <View style={styles.headerSection}>
          <View>
            <Text className="font-inter text-[14px] font-bold text-neutral-800" style={styles.title}>
              {title}
            </Text>
            <Text className="font-inter text-[11px] text-neutral-400" style={styles.subtitle}>
              Showing trend over time
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text className="font-inter text-[10px] font-bold text-neutral-400">
              Live
            </Text>
          </View>
        </View>
      )}

      <Svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <Defs>
          {seriesData.map((s, i) => {
            const seriesColor = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
            return (
              <LinearGradient key={`grad-${s.label}`} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={seriesColor} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={seriesColor} stopOpacity={0.02} />
              </LinearGradient>
            );
          })}
        </Defs>

        {/* Y-axis grid lines */}
        {yTicks.map((tick, i) => {
          const py = PADDING.top + plotHeight - ((tick - minY) / (maxY - minY)) * plotHeight;
          return (
            <G key={`ytick-${i}`}>
              <Line
                x1={PADDING.left}
                y1={py}
                x2={chartWidth - PADDING.right}
                y2={py}
                stroke={colors.neutral[100]}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={PADDING.left - 8}
                y={py + 4}
                textAnchor="end"
                fill={colors.neutral[400]}
                fontSize={10}
                fontFamily="Inter"
              >
                {formatAxisValue(tick)}
              </SvgText>
            </G>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const px = PADDING.left + (xLabels.length > 1 ? (i / (xLabels.length - 1)) * plotWidth : plotWidth / 2);
          // Show fewer labels if too many
          if (xLabels.length > 8 && i % Math.ceil(xLabels.length / 6) !== 0 && i !== xLabels.length - 1) return null;
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={px}
              y={chartHeight - 8}
              textAnchor="middle"
              fill={colors.neutral[400]}
              fontSize={10}
              fontFamily="Inter"
            >
              {label.length > 6 ? label.slice(0, 6) : label}
            </SvgText>
          );
        })}

        {/* X-axis base line */}
        <Line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={chartWidth - PADDING.right}
          y2={PADDING.top + plotHeight}
          stroke={colors.neutral[200]}
          strokeWidth={1}
        />

        {/* Series */}
        {seriesData.map((s, i) => {
          const seriesColor = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
          const linePath = buildSmoothPath(s.points);

          // Area path: line path + close to bottom
          const areaPath =
            s.showArea !== false && s.points.length > 1
              ? `${linePath} L${s.points[s.points.length - 1].px},${PADDING.top + plotHeight} L${s.points[0].px},${PADDING.top + plotHeight} Z`
              : '';

          return (
            <G key={s.label}>
              {areaPath ? (
                <Path d={areaPath} fill={`url(#area-${i})`} />
              ) : null}
              <Path
                d={linePath}
                stroke={seriesColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              {/* Data points */}
              {s.points.map((p, j) => (
                <Circle
                  key={`dot-${j}`}
                  cx={p.px}
                  cy={p.py}
                  r={3}
                  fill={colors.white}
                  stroke={seriesColor}
                  strokeWidth={2}
                />
              ))}
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <View style={styles.legend}>
          {seriesData.map((s, i) => (
            <View key={s.label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: s.color ?? CHART_COLORS[i % CHART_COLORS.length] },
                ]}
              />
              <Text className="font-inter text-[12px] text-neutral-500 dark:text-neutral-400">
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success[400],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
const styles = createStyles(false);
