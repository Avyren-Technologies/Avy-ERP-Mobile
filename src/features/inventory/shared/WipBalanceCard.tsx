import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface WipItem {
  label: string;
  qty: number;
}

interface WipBalanceCardProps {
  partName?: string;
  partNumber?: string;
  items: WipItem[];
  totalQty?: number;
  freeToAllocate?: number;
  uom?: string;
}

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  'Available in Store': { bg: '#ecfdf5', text: '#047857' },
  'In Production / WIP': { bg: '#eff6ff', text: '#1d4ed8' },
  Reserved: { bg: '#f5f3ff', text: '#6d28d9' },
};

export function WipBalanceCard({
  partName,
  partNumber,
  items,
  totalQty,
  freeToAllocate,
  uom,
}: WipBalanceCardProps) {
  const total = totalQty ?? items.reduce((sum, b) => sum + b.qty, 0);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      {(partName || partNumber) && (
        <View style={{ marginBottom: 10 }}>
          {partNumber && (
            <Text className="text-[10px] font-bold font-inter text-primary-600 uppercase tracking-wider">{partNumber}</Text>
          )}
          {partName && (
            <Text className="text-sm font-semibold font-inter text-neutral-900" numberOfLines={1}>{partName}</Text>
          )}
        </View>
      )}

      <View style={styles.grid}>
        {items.map((item) => {
          const colors = LABEL_COLORS[item.label] || { bg: '#f9fafb', text: '#525252' };
          return (
            <View key={item.label} style={[styles.metric, { backgroundColor: colors.bg }]}>
              <Text style={[styles.metricLabel, { color: colors.text }]} className="font-inter">{item.label}</Text>
              <Text style={[styles.metricValue, { color: colors.text }]} className="font-inter">{Number(item.qty).toLocaleString()}</Text>
              {uom && <Text className="text-[10px] font-inter text-neutral-400">{uom}</Text>}
            </View>
          );
        })}
      </View>

      <View style={styles.totalRow}>
        <Text className="text-xs font-medium font-inter text-neutral-500">Total</Text>
        <Text className="text-sm font-bold font-inter text-neutral-900">
          {Number(total).toLocaleString()}{uom ? ` ${uom}` : ''}
        </Text>
      </View>

      {freeToAllocate !== undefined && (
        <View style={styles.totalRow}>
          <Text className="text-xs font-medium font-inter text-teal-600">Free to Allocate</Text>
          <Text className="text-sm font-bold font-inter text-teal-700">
            {Number(freeToAllocate).toLocaleString()}{uom ? ` ${uom}` : ''}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 14,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '30%',
    flexGrow: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
