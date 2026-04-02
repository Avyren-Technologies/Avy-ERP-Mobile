import type { ColorSchemeType } from '@/lib/hooks/use-selected-theme';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { translate } from '@/lib/i18n';

export function ThemeItem() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();
  const [expanded, setExpanded] = React.useState(false);

  const themes = React.useMemo(
    () => [
      { label: `${translate('settings.theme.dark')} 🌙`, value: 'dark' },
      { label: `${translate('settings.theme.light')} 🌞`, value: 'light' },
      { label: `${translate('settings.theme.system')} ⚙️`, value: 'system' },
    ],
    [],
  );

  const theme = React.useMemo(
    () => themes.find(t => t.value === selectedTheme),
    [selectedTheme, themes],
  );

  const handleSelectTheme = React.useCallback(
    (value: ColorSchemeType) => {
      setSelectedTheme(value);
      setExpanded(false);
    },
    [setSelectedTheme],
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <View style={styles.textGroup}>
          <Text className="font-inter text-sm font-bold text-primary-950" tx="settings.theme.title" />
          <Text className="font-inter text-xs text-neutral-500">{theme?.label}</Text>
        </View>
        <ChevronDown
          size={18}
          color={colors.neutral[500]}
          style={expanded ? styles.chevronExpanded : undefined}
        />
      </Pressable>

      {expanded && (
        <View style={styles.dropdown}>
          {themes.map(option => {
            const selected = option.value === selectedTheme;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelectTheme(option.value as ColorSchemeType)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text
                  className="font-inter text-sm"
                  style={[styles.optionText, selected && styles.optionTextSelected]}
                >
                  {option.label}
                </Text>
                {selected && <Check size={16} color={colors.primary[700]} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.white,
  },
  triggerPressed: {
    backgroundColor: colors.primary[50],
  },
  textGroup: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  option: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
  },
  optionPressed: {
    backgroundColor: colors.primary[50],
  },
  optionSelected: {
    backgroundColor: colors.primary[100],
  },
  optionText: {
    color: colors.primary[900],
  },
  optionTextSelected: {
    color: colors.primary[800],
    fontWeight: '700',
  },
});
