import { View, Text } from 'react-native';

import { STOCK_STATUS_CONFIG, TRANSACTION_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

export function InventoryStatusBadge({ status }: { status: string }) {
  const config = STOCK_STATUS_CONFIG[status] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
  return (
    <View className={`flex-row items-center rounded-full px-2 py-0.5 ${config.bg} border ${config.border}`}>
      <Text className={`text-xs font-medium font-inter ${config.text}`}>{config.label}</Text>
    </View>
  );
}

export function TransactionStatusBadge({ status }: { status: string }) {
  const config = TRANSACTION_STATUS_CONFIG[status] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
  return (
    <View className={`flex-row items-center rounded-full px-2 py-0.5 ${config.bg} border ${config.border}`}>
      <Text className={`text-xs font-medium font-inter ${config.text}`}>{config.label}</Text>
    </View>
  );
}
