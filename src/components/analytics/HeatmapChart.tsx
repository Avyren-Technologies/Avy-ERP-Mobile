import * as React from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export interface HeatmapChartProps {
  data: HeatmapCell[];
  rowLabels: string[];
  colLabels: string[];
  height?: number;
  colorScale?: { low: string; mid: string; high: string };
}

const DEFAULT_COLOR_SCALE = {
  low: colors.success[100],
  mid: colors.warning[300],
  high: colors.danger[500],
};

const LABEL_LEFT = 60;
const LABEL_TOP = 28;
const CELL_SIZE = 32;
const CELL_GAP = 2;
const LEGEND_HEIGHT = 32;

function interpolateColor(low: string, mid: string, high: string, t: number): string {
  const parseHex = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const c0 = parseHex(low);
  const c1 = parseHex(mid);
  const c2 = parseHex(high);

  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const f = t * 2;
    r = Math.round(c0.r + (c1.r - c0.r) * f);
    g = Math.round(c0.g + (c1.g - c0.g) * f);
    b = Math.round(c0.b + (c1.b - c0.b) * f);
  } else {
    const f = (t - 0.5) * 2;
    r = Math.round(c1.r + (c2.r - c1.r) * f);
    g = Math.round(c1.g + (c2.g - c1.g) * f);
    b = Math.round(c1.b + (c2.b - c1.b) * f);
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function HeatmapChart({
  data,
  rowLabels,
  colLabels,
  height: propHeight,
  colorScale = DEFAULT_COLOR_SCALE,
}: HeatmapChartProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const computed = useMemo(() => {
    if (data.length === 0) return null;

    // Build lookup
    const valueMap = new Map<string, number>();
    let maxVal = 0;
    for (const cell of data) {
      const key = `${cell.row}::${cell.col}`;
      valueMap.set(key, cell.value);
      if (cell.value > maxVal) maxVal = cell.value;
    }

    const gridWidth = LABEL_LEFT + colLabels.length * (CELL_SIZE + CELL_GAP);
    const gridHeight =
      LABEL_TOP + rowLabels.length * (CELL_SIZE + CELL_GAP) + LEGEND_HEIGHT + 8;

    const cells = rowLabels.flatMap((row, ri) =>
      colLabels.map((col, ci) => {
        const key = `${row}::${col}`;
        const value = valueMap.get(key) ?? 0;
        const t = maxVal > 0 ? value / maxVal : 0;
        const fill = interpolateColor(colorScale.low, colorScale.mid, colorScale.high, t);
        const x = LABEL_LEFT + ci * (CELL_SIZE + CELL_GAP);
        const y = LABEL_TOP + ri * (CELL_SIZE + CELL_GAP);
        return { key: `${ri}-${ci}`, x, y, fill, value };
      }),
    );

    return { cells, gridWidth, gridHeight, maxVal };
  }, [data, rowLabels, colLabels, colorScale]);

  if (!computed) {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text className="font-inter text-[13px] text-neutral-400">No data</Text>
        </View>
      </Animated.View>
    );
  }

  const { cells, gridWidth, gridHeight, maxVal } = computed;
  const chartHeight = propHeight ?? gridHeight;

  const legendY = LABEL_TOP + rowLabels.length * (CELL_SIZE + CELL_GAP) + 8;
  const legendWidth = Math.min(gridWidth - LABEL_LEFT, 180);
  const legendX = LABEL_LEFT;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg
          width={Math.max(gridWidth, 300)}
          height={chartHeight}
          viewBox={`0 0 ${Math.max(gridWidth, 300)} ${chartHeight}`}
        >
          <Defs>
            <LinearGradient id="legend-gradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={colorScale.low} />
              <Stop offset="50%" stopColor={colorScale.mid} />
              <Stop offset="100%" stopColor={colorScale.high} />
            </LinearGradient>
          </Defs>

          {/* Column labels */}
          {colLabels.map((col, ci) => (
            <SvgText
              key={`col-${ci}`}
              x={LABEL_LEFT + ci * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
              y={LABEL_TOP - 8}
              textAnchor="middle"
              fill={colors.neutral[500]}
              fontSize={9}
              fontFamily="Inter"
            >
              {col.length > 4 ? col.slice(0, 4) : col}
            </SvgText>
          ))}

          {/* Row labels */}
          {rowLabels.map((row, ri) => (
            <SvgText
              key={`row-${ri}`}
              x={LABEL_LEFT - 6}
              y={LABEL_TOP + ri * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 4}
              textAnchor="end"
              fill={colors.neutral[500]}
              fontSize={9}
              fontFamily="Inter"
            >
              {row.length > 7 ? `${row.slice(0, 6)}..` : row}
            </SvgText>
          ))}

          {/* Cells */}
          {cells.map((cell) => (
            <React.Fragment key={cell.key}>
              <Rect
                x={cell.x}
                y={cell.y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={4}
                ry={4}
                fill={cell.fill}
              />
              <SvgText
                x={cell.x + CELL_SIZE / 2}
                y={cell.y + CELL_SIZE / 2 + 4}
                textAnchor="middle"
                fill={colors.neutral[700]}
                fontSize={9}
                fontFamily="Inter"
                fontWeight="600"
              >
                {cell.value}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Legend bar */}
          <Rect
            x={legendX}
            y={legendY}
            width={legendWidth}
            height={10}
            rx={5}
            fill="url(#legend-gradient)"
          />
          <SvgText
            x={legendX}
            y={legendY + 22}
            textAnchor="start"
            fill={colors.neutral[400]}
            fontSize={9}
            fontFamily="Inter"
          >
            0
          </SvgText>
          <SvgText
            x={legendX + legendWidth}
            y={legendY + 22}
            textAnchor="end"
            fill={colors.neutral[400]}
            fontSize={9}
            fontFamily="Inter"
          >
            {maxVal}
          </SvgText>
        </Svg>
      </ScrollView>
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
