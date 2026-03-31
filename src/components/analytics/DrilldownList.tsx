import { ChevronDown, ChevronUp, Search } from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface DrilldownColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DrilldownListProps {
  data: Record<string, unknown>[];
  columns: DrilldownColumn[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  expandedRowRender?: (row: Record<string, unknown>) => React.ReactNode;
}

function ExpandableRow({
  row,
  columns,
  index,
  expandedRowRender,
}: {
  row: Record<string, unknown>;
  columns: DrilldownColumn[];
  index: number;
  expandedRowRender?: (row: Record<string, unknown>) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !!expandedRowRender;

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
      <Pressable
        onPress={() => canExpand && setExpanded(!expanded)}
        style={[styles.row, index % 2 === 0 && styles.rowEven]}
        disabled={!canExpand}
      >
        {columns.map((col) => (
          <View
            key={col.key}
            style={[
              styles.cell,
              col.width ? { flex: 0, width: col.width } : { flex: 1 },
              { alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' },
            ]}
          >
            {col.render ? (
              col.render(row[col.key], row)
            ) : (
              <Text className="font-inter text-[13px] text-neutral-700" numberOfLines={1}>
                {String(row[col.key] ?? '-')}
              </Text>
            )}
          </View>
        ))}
        {canExpand && (
          <View style={styles.expandIcon}>
            {expanded ? (
              <ChevronUp size={16} color={colors.neutral[400]} />
            ) : (
              <ChevronDown size={16} color={colors.neutral[400]} />
            )}
          </View>
        )}
      </Pressable>

      {expanded && expandedRowRender && (
        <View style={styles.expandedContent}>
          {expandedRowRender(row)}
        </View>
      )}
    </Animated.View>
  );
}

export function DrilldownList({
  data,
  columns,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  expandedRowRender,
}: DrilldownListProps) {
  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <View
            key={col.key}
            style={[
              styles.cell,
              col.width ? { flex: 0, width: col.width } : { flex: 1 },
              { alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' },
            ]}
          >
            <Text className="font-inter text-[12px] font-bold text-neutral-500">
              {col.label}
            </Text>
          </View>
        ))}
        {expandedRowRender && <View style={styles.expandIcon} />}
      </View>
    ),
    [columns, expandedRowRender],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Record<string, unknown>; index: number }) => (
      <ExpandableRow
        row={item}
        columns={columns}
        index={index}
        expandedRowRender={expandedRowRender}
      />
    ),
    [columns, expandedRowRender],
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      {onSearch && (
        <View style={styles.searchWrapper}>
          <Search size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.neutral[400]}
            onChangeText={onSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      )}

      {/* Table */}
      <View style={styles.tableContainer}>
        {renderHeader()}
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, i) => String(item.id ?? i)}
          scrollEnabled={false}
        />
      </View>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <View style={styles.pagination}>
          <Pressable
            onPress={() => onPageChange(page - 1)}
            disabled={page <= 1}
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          >
            <Text className={`font-inter text-[13px] font-semibold ${page <= 1 ? 'text-neutral-300' : 'text-primary-600'}`}>
              Previous
            </Text>
          </Pressable>

          <Text className="font-inter text-[13px] text-neutral-500">
            {page} / {totalPages}
          </Text>

          <Pressable
            onPress={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
          >
            <Text className={`font-inter text-[13px] font-semibold ${page >= totalPages ? 'text-neutral-300' : 'text-primary-600'}`}>
              Next
            </Text>
          </Pressable>
        </View>
      )}

      {/* Total */}
      {total !== undefined && (
        <Text className="font-inter text-[12px] text-neutral-400" style={styles.totalText}>
          {total} total records
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[800],
  },
  tableContainer: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: colors.neutral[50],
  },
  cell: {
    paddingHorizontal: 4,
  },
  expandIcon: {
    width: 24,
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  totalText: {
    textAlign: 'center',
  },
});
