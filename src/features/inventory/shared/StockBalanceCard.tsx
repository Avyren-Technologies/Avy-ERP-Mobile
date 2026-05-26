import { View, Text, StyleSheet } from 'react-native';

import colors from '@/components/ui/colors';
import { STOCK_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

interface BalanceItem {
  status: string;
  qty: number;
}

interface StockBalanceCardProps {
  partName?: string;
  partNumber?: string;
  balances: BalanceItem[];
  totalQty?: number;
  uom?: string;
}

const STATUS_ORDER = ['AVAILABLE', 'RESERVED', 'QC_HOLD', 'BLOCKED', 'IN_TRANSIT', 'QUARANTINE', 'EXPIRED'];

export function StockBalanceCard({ partName, partNumber, balances, totalQty, uom }: StockBalanceCardProps) {
  const total = totalQty ?? balances.reduce((sum, b) => sum + b.qty, 0);

  const ordered = STATUS_ORDER
    .map((s) => {
      const found = balances.find((b) => b.status === s);
      return found ? found : { status: s, qty: 0 };
    })
    .filter((b) => b.qty > 0 || b.status === 'AVAILABLE');

  const extra = balances.filter((b) => !STATUS_ORDER.includes(b.status) && b.qty > 0);
  const allItems = [...ordered, ...extra];

  return (
    <View style={styles.card}>
      {(partName || partNumber) && (
        <View style={styles.headerSection}>
          {partNumber && (
            <Text className="text-[10px] font-bold font-inter text-primary-600 uppercase tracking-wider">
              {partNumber}
            </Text>
          )}
          {partName && (
            <Text className="text-sm font-semibold font-inter text-neutral-900" numberOfLines={1}>
              {partName}
            </Text>
          )}
        </View>
      )}

      <View style={styles.grid}>
        {allItems.map((item) => {
          const config = STOCK_STATUS_CONFIG[item.status] || {
            bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: item.status,
          };
          return (
            <View key={item.status} className={`rounded-lg border px-3 py-2 ${config.bg} ${config.border}`} style={styles.gridItem}>
              <Text className={`text-[10px] font-medium font-inter ${config.text}`}>
                {config.label}
              </Text>
              <Text className={`text-lg font-bold font-inter ${config.text}`}>
                {Number(item.qty).toLocaleString()}
              </Text>
              {uom && (
                <Text className="text-[10px] font-inter text-neutral-400">{uom}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.totalRow}>
        <Text className="text-xs font-medium font-inter text-neutral-500">Total on Hand</Text>
        <Text className="text-sm font-bold font-inter text-neutral-900">
          {Number(total).toLocaleString()}{uom ? ` ${uom}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  headerSection: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    minWidth: '45%',
    flexGrow: 1,
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
