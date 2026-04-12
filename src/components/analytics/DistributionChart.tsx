import * as React from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

export interface Distribution {
  title?: string;
  type?: 'pie' | 'donut' | 'bar';
  items: DistributionItem[];
}

interface DistributionChartProps {
  distribution: Distribution;
  height?: number;
}

const PALETTE = [
  colors.primary[500],
  colors.accent[500],
  colors.success[500],
  colors.warning[500],
  colors.info[500],
  colors.danger[400],
  colors.primary[300],
  colors.accent[300],
  colors.success[300],
  colors.warning[300],
];

// --- Donut / Pie ---

function DonutChart({ items, size }: { items: DistributionItem[]; size: number }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.6;

  const sliceData = useMemo(() => {
    if (total === 0) return [];
    let runningAngle = 0;
    return items.map((item, i) => {
      const sliceAngle = (item.value / total) * 360;
      const angle = Math.min(sliceAngle, 359.99);
      const startAngle = runningAngle;
      const endAngle = runningAngle + angle;
      runningAngle += sliceAngle;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const outerX1 = cx + outerR * Math.cos(startRad);
      const outerY1 = cy + outerR * Math.sin(startRad);
      const outerX2 = cx + outerR * Math.cos(endRad);
      const outerY2 = cy + outerR * Math.sin(endRad);
      const innerX1 = cx + innerR * Math.cos(endRad);
      const innerY1 = cy + innerR * Math.sin(endRad);
      const innerX2 = cx + innerR * Math.cos(startRad);
      const innerY2 = cy + innerR * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;
      const fillColor = item.color ?? PALETTE[i % PALETTE.length];

      const d = [
        `M${outerX1},${outerY1}`,
        `A${outerR},${outerR} 0 ${largeArc} 1 ${outerX2},${outerY2}`,
        `L${innerX1},${innerY1}`,
        `A${innerR},${innerR} 0 ${largeArc} 0 ${innerX2},${innerY2}`,
        'Z',
      ].join(' ');

      return { key: item.label, d, fillColor };
    });
  }, [items, total, cx, cy, outerR, innerR]);

  if (total === 0) return null;

  return (
    <View style={donutStyles.wrapper}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {sliceData.map((s) => (
          <Path key={s.key} d={s.d} fill={s.fillColor} stroke={colors.white} strokeWidth={2} />
        ))}
      </Svg>
      <View style={donutStyles.center}>
        <Text className="font-inter text-[22px] font-bold text-neutral-800">
          {total}
        </Text>
        <Text className="font-inter text-[11px] text-neutral-400">Total</Text>
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
});

// --- Bar Chart ---

function BarChart({ items, height }: { items: DistributionItem[]; height: number }) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const chartWidth = 320;
  const plotLeft = 48;
  const plotRight = 16;
  const plotTop = 12;
  const plotBottom = 40;
  const plotWidth = chartWidth - plotLeft - plotRight;
  const plotHeight = height - plotTop - plotBottom;
  const barWidth = Math.min(28, (plotWidth / items.length) * 0.6);
  const gap = (plotWidth - barWidth * items.length) / (items.length + 1);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const value = Math.round(maxValue * frac);
        const py = plotTop + plotHeight - frac * plotHeight;
        return (
          <G key={`y-${i}`}>
            <SvgText
              x={plotLeft - 8}
              y={py + 4}
              textAnchor="end"
              fill={colors.neutral[400]}
              fontSize={10}
              fontFamily="Inter"
            >
              {value}
            </SvgText>
            {i > 0 && (
              <Path
                d={`M${plotLeft},${py} L${chartWidth - plotRight},${py}`}
                stroke={colors.neutral[100]}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            )}
          </G>
        );
      })}

      {/* Bars */}
      {items.map((item, i) => {
        const barHeight = (item.value / maxValue) * plotHeight;
        const x = plotLeft + gap + i * (barWidth + gap);
        const y = plotTop + plotHeight - barHeight;
        const fillColor = item.color ?? PALETTE[i % PALETTE.length];

        return (
          <G key={item.label}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              ry={4}
              fill={fillColor}
            />
            {/* Value on top */}
            <SvgText
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fill={colors.neutral[600]}
              fontSize={10}
              fontFamily="Inter"
              fontWeight="600"
            >
              {item.value}
            </SvgText>
            {/* X label */}
            <SvgText
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fill={colors.neutral[500]}
              fontSize={9}
              fontFamily="Inter"
            >
              {item.label.length > 8 ? `${item.label.slice(0, 7)  }..` : item.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// --- Main Component ---

export function DistributionChart({
  distribution,
  height = 220,
}: DistributionChartProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const { items, type = 'donut', title } = distribution;
  const [activeType, setActiveType] = useState(type);

  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const isDonut = activeType === 'donut' || activeType === 'pie';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {title && (
          <Text className="font-inter text-[15px] font-bold text-neutral-800" style={styles.title}>
            {title}
          </Text>
        )}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setActiveType('donut')}
            style={[styles.toggleButton, isDonut && styles.toggleButtonActive]}
          >
            <Text
              className={`font-inter text-[11px] font-semibold ${isDonut ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Donut
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveType('bar')}
            style={[styles.toggleButton, !isDonut && styles.toggleButtonActive]}
          >
            <Text
              className={`font-inter text-[11px] font-semibold ${!isDonut ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Bar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Chart */}
      {isDonut ? (
        <DonutChart items={items} size={height} />
      ) : (
        <BarChart items={items} height={height} />
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {items.map((item, i) => (
          <View key={item.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: item.color ?? PALETTE[i % PALETTE.length] },
              ]}
            />
            <Text className="font-inter text-[12px] text-neutral-600 dark:text-neutral-400" numberOfLines={1} style={styles.legendLabel}>
              {item.label}
            </Text>
            <Text className="font-inter text-[12px] font-bold text-neutral-800">
              {item.value}
            </Text>
            {total > 0 && (
              <Text className="font-inter text-[10px] font-semibold text-neutral-400">
                {((item.value / total) * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        ))}
      </View>
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    letterSpacing: -0.2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary[600],
    shadowColor: colors.primary[600],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  legend: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  legendLabel: {
    flex: 1,
  },
});
const styles = createStyles(false);
