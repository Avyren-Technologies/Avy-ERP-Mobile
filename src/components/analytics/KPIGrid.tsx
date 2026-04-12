import { TrendingDown, TrendingUp } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface KPICard {
  key: string;
  label: string;
  value: string | number;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  drilldownType?: string;
}

interface KPIGridProps {
  kpis: KPICard[];
  onDrilldown?: (type: string) => void;
}

/* ── Unique pastel palettes that rotate per card ── */
const CARD_PALETTES = [
  {
    bg: '#EEF2FF',
    border: '#E0E7FF',
    accent: colors.primary[500],
    iconBg: '#E0E7FF',
    wave: colors.primary[400],
  },
  {
    bg: '#F5F3FF',
    border: '#EDE9FE',
    accent: colors.accent[500],
    iconBg: '#EDE9FE',
    wave: colors.accent[400],
  },
  {
    bg: '#FFFBEB',
    border: '#FEF3C7',
    accent: colors.warning[500],
    iconBg: '#FEF3C7',
    wave: colors.warning[400],
  },
  {
    bg: '#ECFDF5',
    border: '#D1FAE5',
    accent: colors.success[500],
    iconBg: '#D1FAE5',
    wave: colors.success[400],
  },
  {
    bg: '#FFF1F2',
    border: '#FFE4E6',
    accent: colors.danger[500],
    iconBg: '#FFE4E6',
    wave: colors.danger[400],
  },
  {
    bg: '#F0F9FF',
    border: '#E0F2FE',
    accent: colors.info[500],
    iconBg: '#E0F2FE',
    wave: colors.info[400],
  },
];

/* Mini sparkline SVG wave decoration */
function SparklineWave({ color }: { color: string }) {
  return (
    <Svg
      width={100}
      height={40}
      viewBox="0 0 100 40"
      style={styles.sparklineWave}
    >
      <Path
        d="M0 32 C12 22, 20 30, 32 24 S52 14, 64 18 S80 28, 100 16 L100 40 L0 40 Z"
        fill={color}
        opacity={0.08}
      />
      <Path
        d="M0 36 C16 28, 24 34, 40 28 S60 18, 72 24 S86 32, 100 22 L100 40 L0 40 Z"
        fill={color}
        opacity={0.05}
      />
    </Svg>
  );
}

export function KPIGrid({ kpis, onDrilldown }: KPIGridProps) {
  return (
    <View style={styles.grid}>
      {kpis.map((kpi, idx) => {
        const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
        const isClickable = !!(kpi.drilldownType && onDrilldown);

        const trendColor =
          kpi.trendDirection === 'up'
            ? colors.success[600]
            : kpi.trendDirection === 'down'
              ? colors.danger[500]
              : colors.neutral[400];

        const trendBg =
          kpi.trendDirection === 'up'
            ? colors.success[50]
            : kpi.trendDirection === 'down'
              ? colors.danger[50]
              : colors.neutral[100];

        const TrendIcon =
          kpi.trendDirection === 'up'
            ? TrendingUp
            : kpi.trendDirection === 'down'
              ? TrendingDown
              : null;

        return (
          <Animated.View
            key={kpi.key}
            entering={FadeInDown.delay(idx * 80).duration(400).springify()}
            style={styles.cardWrapper}
          >
            <Pressable
              onPress={() => isClickable && onDrilldown?.(kpi.drilldownType!)}
              disabled={!isClickable}
              style={[
                styles.card,
                {
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                },
              ]}
            >
              {/* Top accent bar */}
              <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />

              {/* Sparkline wave */}
              <SparklineWave color={palette.wave} />

              {/* Label */}
              <Text
                className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400"
                style={styles.kpiLabel}
                numberOfLines={1}
              >
                {kpi.label}
              </Text>

              {/* Value */}
              <Text
                className="font-inter text-[28px] font-extrabold text-neutral-800"
                style={styles.kpiValue}
                numberOfLines={1}
              >
                {kpi.value}
              </Text>

              {/* Trend badge */}
              {kpi.trend !== undefined && (
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: trendBg },
                  ]}
                >
                  {TrendIcon && <TrendIcon size={12} color={trendColor} />}
                  <Text
                    className="font-inter text-[11px] font-bold"
                    style={{ color: trendColor }}
                  >
                    {Math.abs(kpi.trend).toFixed(1)}%
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    minWidth: 150,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    paddingTop: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sparklineWave: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  kpiLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  kpiValue: {
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
});
