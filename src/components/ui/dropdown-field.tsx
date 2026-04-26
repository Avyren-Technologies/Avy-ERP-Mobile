/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export interface DropdownOption {
  id: string;
  name: string;
}

interface DropdownFieldProps {
  readonly label: string;
  readonly options: DropdownOption[];
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly error?: string;
}

export function DropdownField({
  label,
  options,
  selected,
  onSelect,
  required,
  placeholder = 'Select...',
  error,
}: DropdownFieldProps) {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selectedItem = options.find((o) => o.id === selected);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <View style={s.field}>
      <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
        {label}{required ? <Text className="text-danger-500"> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => { setOpen(true); setSearch(''); }}
        style={[
          s.trigger,
          !!error && { borderColor: colors.danger[300] },
        ]}
      >
        <Text
          className={`font-inter text-sm ${selectedItem ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {selectedItem?.name ?? placeholder}
        </Text>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path
            d="M6 9l6 6 6-6"
            stroke={colors.neutral[400]}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      {!!error && (
        <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{error}</Text>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">
              {label}
            </Text>
            {options.length > 6 && (
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={colors.neutral[400]}
                style={s.searchInput}
                autoFocus={false}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 350 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: opt, index: idx }) => {
                const isActive = opt.id === selected;
                return (
                  <Pressable
                    onPress={() => { onSelect(opt.id); setOpen(false); }}
                    style={[
                      s.item,
                      isActive && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                      idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                    ]}
                  >
                    <Text
                      className={`font-inter text-sm ${isActive ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-primary-950 dark:text-white'}`}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {opt.name}
                    </Text>
                    {isActive && (
                      <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="font-inter text-sm text-neutral-400 py-3 text-center">
                  No {label.toLowerCase()} available
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    field: {
      marginBottom: 16,
    },
    trigger: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingHorizontal: 14,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheet: {
      backgroundColor: isDark ? '#1A1730' : colors.white,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
      maxHeight: '65%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? colors.neutral[600] : colors.neutral[300],
      alignSelf: 'center',
      marginBottom: 16,
    },
    searchInput: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingHorizontal: 14,
      height: 44,
      fontFamily: 'Inter',
      fontSize: 14,
      color: isDark ? colors.white : colors.primary[950],
      marginBottom: 8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
  });
