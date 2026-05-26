import { View, Text, StyleSheet } from 'react-native';

import { Select } from '@/components/ui';
import { useWarehouses, useZones, useBins } from '@/features/inventory/api/use-inventory-queries';

interface WarehouseLocationPickerProps {
  warehouseId: string;
  zoneId: string;
  binId: string;
  onWarehouseChange: (id: string) => void;
  onZoneChange: (id: string) => void;
  onBinChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  showBin?: boolean;
}

export function WarehouseLocationPicker({
  warehouseId,
  zoneId,
  binId,
  onWarehouseChange,
  onZoneChange,
  onBinChange,
  required = false,
  disabled = false,
  showBin = true,
}: WarehouseLocationPickerProps) {
  const { data: warehousesData, isLoading: loadingWarehouses } = useWarehouses();
  const { data: zonesData, isLoading: loadingZones } = useZones(
    warehouseId ? { warehouseId } : undefined,
  );
  const { data: binsData, isLoading: loadingBins } = useBins(
    zoneId ? { zoneId } : undefined,
  );

  const warehouses = (warehousesData as any)?.data || [];
  const zones = (zonesData as any)?.data || [];
  const bins = (binsData as any)?.data || [];

  const warehouseOptions = warehouses.map((w: any) => ({ value: w.id, label: `${w.code} - ${w.name}` }));
  const zoneOptions = zones.map((z: any) => ({ value: z.id, label: `${z.code} - ${z.name}` }));
  const binOptions = bins.map((b: any) => ({ value: b.id, label: `${b.code} - ${b.name}` }));

  const handleWarehouseChange = (val: string | number) => {
    onWarehouseChange(String(val));
    onZoneChange('');
    onBinChange('');
  };

  const handleZoneChange = (val: string | number) => {
    onZoneChange(String(val));
    onBinChange('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">
          Warehouse {required && <Text className="text-red-500 font-inter">*</Text>}
        </Text>
        <Select
          label=""
          options={warehouseOptions}
          value={warehouseId}
          onSelect={handleWarehouseChange}
          disabled={disabled || loadingWarehouses}
          placeholder="Select warehouse"
        />
      </View>

      <View style={styles.field}>
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Zone</Text>
        <Select
          label=""
          options={zoneOptions}
          value={zoneId}
          onSelect={handleZoneChange}
          disabled={disabled || !warehouseId || loadingZones}
          placeholder="Select zone"
        />
      </View>

      {showBin && (
        <View style={styles.field}>
          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Bin</Text>
          <Select
            label=""
            options={binOptions}
            value={binId}
            onSelect={(v) => onBinChange(String(v))}
            disabled={disabled || !zoneId || loadingBins}
            placeholder="Select bin"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  field: {
    flex: 1,
  },
});
