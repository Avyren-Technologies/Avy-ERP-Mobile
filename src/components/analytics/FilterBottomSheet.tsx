import type {BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import BottomSheet, {
  BottomSheetBackdrop,
  
  BottomSheetScrollView
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

interface FilterOption {
  label: string;
  value: string;
}

interface AnalyticsFilters {
  departmentId?: string;
  locationId?: string;
  gradeId?: string;
  employeeTypeId?: string;
  dateRange?: string;
  [key: string]: string | undefined;
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  departments?: FilterOption[];
  locations?: FilterOption[];
  grades?: FilterOption[];
  employeeTypes?: FilterOption[];
}

function FilterSection({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  selectedValue?: string;
  onSelect: (value: string | undefined) => void;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text className="font-inter text-[13px] font-semibold text-neutral-500" style={sectionStyles.title}>
        {title}
      </Text>
      <View style={sectionStyles.chipRow}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(isSelected ? undefined : option.value)}
              style={[sectionStyles.chip, isSelected && sectionStyles.chipSelected]}
            >
              <Text
                className={`font-inter text-[13px] font-medium ${
                  isSelected ? 'text-white' : 'text-neutral-600'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { gap: 8 },
  title: { textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    shadowColor: colors.primary[600],
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});

const DATE_RANGE_OPTIONS: FilterOption[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'This quarter', value: 'this_quarter' },
  { label: 'This year', value: 'this_year' },
];

export function FilterBottomSheet({
  visible,
  onClose,
  filters,
  onChange,
  departments = [],
  locations = [],
  grades = [],
  employeeTypes = [],
}: FilterBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '85%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | undefined) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const handleClearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.indicator}
      backgroundStyle={styles.background}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text className="font-inter text-[18px] font-bold text-neutral-900">
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text className="font-inter text-[11px] font-bold text-white">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {activeFilterCount > 0 && (
            <Pressable onPress={handleClearAll} style={styles.clearButton}>
              <Text className="font-inter text-[13px] font-semibold text-primary-600">
                Clear all
              </Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.neutral[500]} />
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <FilterSection
          title="Date Range"
          options={DATE_RANGE_OPTIONS}
          selectedValue={filters.dateRange}
          onSelect={(v) => handleFilterChange('dateRange', v)}
        />

        {departments.length > 0 && (
          <FilterSection
            title="Department"
            options={departments}
            selectedValue={filters.departmentId}
            onSelect={(v) => handleFilterChange('departmentId', v)}
          />
        )}

        {locations.length > 0 && (
          <FilterSection
            title="Location"
            options={locations}
            selectedValue={filters.locationId}
            onSelect={(v) => handleFilterChange('locationId', v)}
          />
        )}

        {grades.length > 0 && (
          <FilterSection
            title="Grade"
            options={grades}
            selectedValue={filters.gradeId}
            onSelect={(v) => handleFilterChange('gradeId', v)}
          />
        )}

        {employeeTypes.length > 0 && (
          <FilterSection
            title="Employee Type"
            options={employeeTypes}
            selectedValue={filters.employeeTypeId}
            onSelect={(v) => handleFilterChange('employeeTypeId', v)}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: colors.neutral[300],
    width: 40,
  },
  background: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[600],
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
});
