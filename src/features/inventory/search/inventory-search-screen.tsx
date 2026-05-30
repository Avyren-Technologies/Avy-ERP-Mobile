import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
    const { toggle } = useSidebar();
import Animated, { FadeInDown } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useGlobalSearch } from '@/features/inventory/api/use-inventory-queries';

const ENTITY_TYPES = [
  { key: '', label: 'All' },
  { key: 'parts', label: 'Parts' },
  { key: 'lots', label: 'Lots' },
  { key: 'serials', label: 'Serials' },
  { key: 'warehouses', label: 'Warehouses' },
  { key: 'bins', label: 'Bins' },
  { key: 'transactions', label: 'Transactions' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  part: { bg: '#eef2ff', text: '#4338ca' },
  lot: { bg: '#ecfdf5', text: '#047857' },
  serial: { bg: '#f5f3ff', text: '#6d28d9' },
  warehouse: { bg: '#eff6ff', text: '#1d4ed8' },
  bin: { bg: '#fffbeb', text: '#b45309' },
  transaction: { bg: '#fff1f2', text: '#be123c' },
};

export function InventorySearchScreen() {
  const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [entityType, setEntityType] = useState('');
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);

  const params = {
    q: debouncedQuery,
    ...(entityType ? { entityType } : {}),
  };

  const { data, isLoading, isFetching } = useGlobalSearch(params);
  const results = (data as any)?.data || [];
  const hasQuery = debouncedQuery.length >= 2;

  const renderResult = ({ item, index }: { item: any; index: number }) => {
    const typeColor = TYPE_COLORS[item.type] || { bg: '#f3f4f6', text: '#6b7280' };
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} style={styles.resultCard}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
            <Text style={{ color: typeColor.text, fontSize: 10, fontWeight: '600' }}>{item.type || 'item'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-sm font-semibold font-inter text-neutral-900" numberOfLines={1}>
              {item.label || item.name || item.code}
            </Text>
            {item.subtitle ? (
              <Text className="text-xs font-inter text-neutral-500 mt-0.5" numberOfLines={1}>{item.subtitle}</Text>
            ) : null}
            {item.description ? (
              <Text className="text-[10px] font-inter text-neutral-400 mt-0.5" numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="text-xl font-bold text-white font-inter ml-3">Inventory Search</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search items, lots, serials, bins..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isFetching && <ActivityIndicator size="small" color={colors.primary[500]} style={styles.spinner} />}
        </View>
      </LinearGradient>

      {/* Entity Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {ENTITY_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setEntityType(t.key)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              entityType === t.key && styles.chipActive,
            ]}
          >
            <Text
              className={`text-xs font-medium font-inter ${entityType === t.key ? 'text-primary-700' : 'text-neutral-600'}`}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {!hasQuery && (
        <View style={styles.emptyState}>
          <Text className="text-base font-semibold font-inter text-neutral-400">Type to search</Text>
          <Text className="text-xs font-inter text-neutral-400 mt-1">Minimum 2 characters</Text>
        </View>
      )}

      {hasQuery && isLoading && (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}

      {hasQuery && !isLoading && results.length === 0 && (
        <View style={styles.emptyState}>
          <Text className="text-base font-semibold font-inter text-neutral-400">No results found</Text>
          <Text className="text-xs font-inter text-neutral-400 mt-1">for &apos;{debouncedQuery}&apos;</Text>
        </View>
      )}

      {hasQuery && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderResult}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text className="text-xs font-inter text-neutral-500 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: {
    marginTop: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
  },
  spinner: { position: 'absolute', right: 14, top: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipActive: {
    backgroundColor: '#e0e7ff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
});
