import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface KPICard {
  key: string;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  accentColor?: string;
  drilldownType?: string;
}

interface KPIGridProps {
  kpis: KPICard[];
  onDrilldown?: (type: string) => void;
}

function TrendIndicator({ trend, label }: { trend?: number; label?: string }) {
  if (trend === undefined || trend === null) return null;

  const isPositive = trend > 0;
  const isNeutral = trend === 0;
  const trendColor = isNeutral
    ? colors.neutral[500]
    : isPositive
      ? colors.success[600]
      : colors.danger[600];
  const bgColor = isNeutral
    ? colors.neutral[50]
    : isPositive
      ? colors.success[50]
      : colors.danger[50];

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <View style={[trendStyles.container, { backgroundColor: bgColor }]}>
      <Icon size={12} color={trendColor} />
      <Text
        className="font-inter text-[11px] font-semibold"
        style={{ color: trendColor }}
      >
        {isPositive ? '+' : ''}{trend}%{label ? ` ${label}` : ''}
      </Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
});

export function KPIGrid({ kpis, onDrilldown }: KPIGridProps) {
  return (
    <View style={styles.grid}>
      {kpis.map((kpi, index) => (
        <Animated.View
          key={kpi.key}
          entering={FadeInDown.delay(index * 80).duration(400).springify()}
          style={styles.cardWrapper}
        >
          <Pressable
            style={styles.card}
            onPress={() => kpi.drilldownType && onDrilldown?.(kpi.drilldownType)}
            disabled={!kpi.drilldownType}
          >
            {/* Accent bar */}
            <View
              style={[
                styles.accentBar,
                { backgroundColor: kpi.accentColor ?? colors.primary[500] },
              ]}
            />

            <View style={styles.cardContent}>
              <Text className="font-inter text-[13px] font-medium text-neutral-500">
                {kpi.label}
              </Text>
              <Text className="font-inter text-[28px] font-bold text-neutral-900">
                {kpi.value}
              </Text>
              <TrendIndicator trend={kpi.trend} label={kpi.trendLabel} />
            </View>
          </Pressable>
        </Animated.View>
      ))}
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
    width: '48%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: {
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    padding: 16,
    gap: 6,
  },
});
