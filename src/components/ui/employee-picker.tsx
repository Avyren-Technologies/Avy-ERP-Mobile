import type { EmployeeDropdownItem } from '@/lib/api/hr';
/**
 * EmployeePicker
 *
 * Reusable, bottom-sheet-based employee picker backed by the standardised
 * `GET /hr/employees/dropdown` endpoint. Solves the long-standing employee
 * dropdown pagination/search bug across the mobile app — drop this into any
 * form that needs to select a single employee and you get:
 *
 *   - Server-side debounced search (300ms)
 *   - Infinite scrolling via `FlatList.onEndReached` (page size 50)
 *   - Status / department / location filtering
 *   - Optional `initialEmployee` to render the selected name before the
 *     picker is opened (no extra fetch required on edit screens)
 *   - Dark-mode aware, `font-inter` everywhere
 *
 * NOTE: Does NOT use `Alert.alert` — selection is silent.
 */
import { BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import * as React from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { renderBackdrop } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import {
  EMPLOYEE_DROPDOWN_PAGE_SIZE,
  useEmployeesDropdown,
} from '@/features/company-admin/api/use-hr-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// Re-export the item type so screens can reference it via the picker module.
export type { EmployeeDropdownItem } from '@/lib/api/hr';

export type EmployeePickerInitialEmployee = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  employeeId?: string;
};

export type EmployeePickerProps = {
  value: string | null;
  onChange: (id: string | null, employee?: EmployeeDropdownItem) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  status?: 'ACTIVE' | 'ALL';
  departmentId?: string;
  locationId?: string;
  excludeIds?: string[];
  error?: string;
  /**
   * Pre-rendered display when `value` is set but the picker hasn't been
   * opened yet (e.g. edit screens hydrating from an existing record).
   */
  initialEmployee?: EmployeePickerInitialEmployee;
};

function buildFullName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(' ')
    .trim();
}

function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '?';
  if (tokens.length === 1) return tokens[0]!.charAt(0).toUpperCase();
  return (tokens[0]!.charAt(0) + tokens[tokens.length - 1]!.charAt(0)).toUpperCase();
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function EmployeePicker({
  value,
  onChange,
  label,
  placeholder = 'Select employee...',
  disabled = false,
  required = false,
  status = 'ACTIVE',
  departmentId,
  locationId,
  excludeIds,
  error,
  initialEmployee,
}: EmployeePickerProps) {
  const isDark = useIsDark();
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Cache of employees we've fully loaded — keeps selected display name
  // available even after the sheet closes / filters change. We use a ref +
  // a version counter to bump renders without churning identity each render.
  const cacheRef = React.useRef<Record<string, EmployeeDropdownItem>>({});
  const [cacheVersion, setCacheVersion] = React.useState(0);

  const queryParams = React.useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      status,
      ...(departmentId ? { departmentId } : {}),
      ...(locationId ? { locationId } : {}),
    }),
    [debouncedSearch, status, departmentId, locationId],
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useEmployeesDropdown(queryParams, isOpen);

  const allEmployees = React.useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((p) => p.data);
    if (!excludeIds || excludeIds.length === 0) return flat;
    const excluded = new Set(excludeIds);
    return flat.filter((e) => !excluded.has(e.id));
  }, [data?.pages, excludeIds]);

  // Cache every loaded employee so we can render the trigger label
  // even after the user closes the sheet or changes search.
  React.useEffect(() => {
    if (allEmployees.length === 0) return;
    let mutated = false;
    for (const e of allEmployees) {
      if (!cacheRef.current[e.id]) {
        cacheRef.current[e.id] = e;
        mutated = true;
      }
    }
    if (mutated) {
      setCacheVersion((v) => v + 1);
    }
  }, [allEmployees]);

  const selectedFromCache = React.useMemo(
    () => (value ? cacheRef.current[value] : undefined),
    // cacheVersion bumps whenever the cache mutates so the memo recomputes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, cacheVersion],
  );

  const displayName = React.useMemo(() => {
    if (selectedFromCache) {
      return buildFullName({
        firstName: selectedFromCache.firstName,
        middleName: selectedFromCache.middleName,
        lastName: selectedFromCache.lastName,
      });
    }
    if (initialEmployee && initialEmployee.id === value) {
      return buildFullName({
        firstName: initialEmployee.firstName,
        middleName: initialEmployee.middleName,
        lastName: initialEmployee.lastName,
      });
    }
    return '';
  }, [selectedFromCache, initialEmployee, value]);

  const displaySubtitle = React.useMemo(() => {
    if (selectedFromCache) return selectedFromCache.employeeId;
    if (initialEmployee && initialEmployee.id === value) {
      return initialEmployee.employeeId ?? '';
    }
    return '';
  }, [selectedFromCache, initialEmployee, value]);

  const openSheet = React.useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    sheetRef.current?.present();
  }, [disabled]);

  const closeSheet = React.useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleSheetChange = React.useCallback((index: number) => {
    if (index < 0) {
      setIsOpen(false);
      setSearch('');
    }
  }, []);

  const handleSelect = React.useCallback(
    (employee: EmployeeDropdownItem) => {
      onChange(employee.id, employee);
      closeSheet();
    },
    [onChange, closeSheet],
  );

  const handleClear = React.useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleEndReached = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = React.useCallback(
    ({ item }: { item: EmployeeDropdownItem }) => {
      const fullName = buildFullName({
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
      });
      const initials = getInitials(fullName);
      const isSelected = item.id === value;
      const subtitle = [item.employeeId, item.department?.name]
        .filter(Boolean)
        .join(' · ');

      return (
        <Pressable
          onPress={() => handleSelect(item)}
          style={[
            styles.row,
            {
              backgroundColor: isSelected
                ? isDark
                  ? colors.primary[900]
                  : colors.primary[50]
                : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? colors.primary[800] : colors.primary[100],
              },
            ]}
          >
            <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-100">
              {initials}
            </Text>
          </View>
          <View style={styles.rowText}>
            <Text
              className="font-inter text-sm font-semibold text-primary-950 dark:text-white"
              numberOfLines={1}
            >
              {fullName}
            </Text>
            {subtitle ? (
              <Text
                className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {isSelected ? (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 13l4 4L19 7"
                stroke={isDark ? colors.primary[200] : colors.primary[600]}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </Pressable>
      );
    },
    [handleSelect, isDark, value],
  );

  const keyExtractor = React.useCallback(
    (item: EmployeeDropdownItem) => item.id,
    [],
  );

  const ListFooter = React.useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage]);

  const ListEmpty = React.useMemo(() => {
    if (isLoading || isFetching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-300">
          No employees found
        </Text>
        <Text className="mt-1 font-inter text-xs text-neutral-400 dark:text-neutral-500">
          {debouncedSearch
            ? 'Try a different search term.'
            : 'No employees match the current filters.'}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, debouncedSearch]);

  const totalLoaded = allEmployees.length;
  const totalAvailable = data?.pages?.[0]?.meta.total;

  return (
    <View style={styles.field}>
      {label ? (
        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
          {label}
          {required ? <Text className="text-danger-500"> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        onPress={openSheet}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: disabled
              ? isDark
                ? colors.charcoal[800]
                : colors.neutral[200]
              : isDark
                ? '#1E1B4B'
                : colors.neutral[50],
            borderColor: error
              ? colors.danger[400]
              : isDark
                ? colors.neutral[700]
                : colors.neutral[200],
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.triggerContent}>
          <Text
            className={`font-inter text-sm ${displayName ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
            numberOfLines={1}
          >
            {displayName || placeholder}
          </Text>
          {displaySubtitle ? (
            <Text
              className="mt-0.5 font-inter text-[11px] text-neutral-500 dark:text-neutral-400"
              numberOfLines={1}
            >
              {displaySubtitle}
            </Text>
          ) : null}
        </View>

        {value && !disabled ? (
          <Pressable
            onPress={handleClear}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.clearButton}
            accessibilityLabel="Clear selection"
            accessibilityRole="button"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 6l12 12M18 6L6 18"
                stroke={colors.neutral[400]}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        ) : (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9l6 6 6-6"
              stroke={colors.neutral[400]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </Pressable>

      {error ? (
        <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text>
      ) : null}

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        index={0}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? '#1A1730' : colors.white,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? colors.neutral[700] : colors.neutral[300],
        }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={handleSheetChange}
      >
        <View style={styles.sheetHeader}>
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
            Select Employee
          </Text>
          {typeof totalAvailable === 'number' ? (
            <Text className="mt-0.5 font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
              {totalLoaded} of {totalAvailable}
              {EMPLOYEE_DROPDOWN_PAGE_SIZE ? '' : ''}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
              borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              stroke={colors.neutral[400]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <BottomSheetTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, ID or department..."
            placeholderTextColor={colors.neutral[400]}
            style={[
              styles.searchInput,
              {
                color: isDark ? colors.white : colors.primary[950],
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 6l12 12M18 6L6 18"
                  stroke={colors.neutral[400]}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          ) : null}
        </View>

        <BottomSheetFlatList
          data={allEmployees}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={() => refetch()}
        />
      </BottomSheetModal>
    </View>
  );
}

const SNAP_POINTS: (string | number)[] = ['85%'];

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  trigger: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerContent: { flex: 1 },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
