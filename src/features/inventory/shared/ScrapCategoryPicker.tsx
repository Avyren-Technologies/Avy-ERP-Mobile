import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

import colors from '@/components/ui/colors';
import { useScrapCategories } from '@/features/inventory/api/use-inventory-queries';

interface ScrapCategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ScrapCategoryPicker({ value, onChange, disabled }: ScrapCategoryPickerProps) {
  const { data, isLoading } = useScrapCategories();
  const categories = (data as any)?.data || [];

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text className="text-xs font-inter text-neutral-400 ml-2">Loading categories...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return <Text className="text-xs font-inter text-neutral-400">No scrap categories configured</Text>;
  }

  return (
    <View style={styles.wrap}>
      {categories.map((cat: any) => {
        const isSelected = value === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onChange(cat.id)}
            disabled={disabled}
            style={[styles.chip, isSelected && styles.chipActive]}
          >
            <Text
              className={`text-xs font-inter ${isSelected ? 'text-white font-bold' : 'text-neutral-700'}`}
            >
              {cat.code ? `${cat.code} - ` : ''}{cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  chipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
