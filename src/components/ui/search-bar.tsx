/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';

const DEBOUNCE_MS = 400;

// Module-level flag: when a SearchBar is actively focused and the user is
// typing, FlashList header re-mounts can cause the TextInput to lose focus.
// This flag lets the newly mounted instance know it should auto-refocus.
let _shouldRestoreFocus = false;

interface FilterChip {
    key: string;
    label: string;
    count?: number;
}

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    filters?: FilterChip[];
    activeFilter?: string;
    onFilterChange?: (key: string) => void;
}

export function SearchBar({
    value,
    onChangeText,
    placeholder = 'Search...',
    filters,
    activeFilter,
    onFilterChange,
}: SearchBarProps) {
    const isDark = useIsDark();
    const s = createStyles(isDark);

    const inputRef = React.useRef<TextInput>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChangeTextRef = React.useRef(onChangeText);
    onChangeTextRef.current = onChangeText;

    // Internal display value — updates instantly on every keystroke so the
    // TextInput feels responsive.  The parent only receives updates after the
    // debounce delay.
    const [displayValue, setDisplayValue] = React.useState(value);
    const [focused, setFocused] = React.useState(false);

    // Track whether the latest displayValue change came from internal typing
    // so we can skip the value-prop sync useEffect in that case.
    const isInternalChange = React.useRef(false);

    // Sync displayValue when the parent resets value externally (e.g. clear
    // from outside, or navigating away and back). Skip when the change
    // originated from the user typing inside this component.
    React.useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        setDisplayValue(value);
    }, [value]);

    const handleChangeText = React.useCallback((text: string) => {
        isInternalChange.current = true;
        setDisplayValue(text);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChangeTextRef.current(text);
        }, DEBOUNCE_MS);
    }, []);

    const handleClear = React.useCallback(() => {
        isInternalChange.current = true;
        setDisplayValue('');
        if (timerRef.current) clearTimeout(timerRef.current);
        onChangeTextRef.current('');
    }, []);

    const handleFocus = React.useCallback(() => {
        setFocused(true);
        _shouldRestoreFocus = true;
    }, []);

    const handleBlur = React.useCallback(() => {
        setFocused(false);
        _shouldRestoreFocus = false;
    }, []);

    // Cleanup debounce timer on unmount
    React.useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Auto-restore focus when remounted (e.g. FlashList header re-mount).
    // If the user was actively typing when the previous instance unmounted,
    // the module-level flag tells us to refocus immediately.
    React.useEffect(() => {
        if (_shouldRestoreFocus) {
            const raf = requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
            return () => cancelAnimationFrame(raf);
        }
    }, []);

    return (
        <View style={s.container}>
            {/* Search Input */}
            <View style={[s.inputWrapper, focused && s.inputWrapperFocused]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" style={s.searchIcon}>
                    <Circle
                        cx="11"
                        cy="11"
                        r="8"
                        stroke={focused ? colors.primary[500] : colors.neutral[400]}
                        strokeWidth="1.8"
                        fill="none"
                    />
                    <Path
                        d="M21 21l-4.35-4.35"
                        stroke={focused ? colors.primary[500] : colors.neutral[400]}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                </Svg>
                <TextInput
                    ref={inputRef}
                    style={s.input}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={displayValue}
                    onChangeText={handleChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {displayValue.length > 0 && (
                    <Pressable onPress={handleClear} style={s.clearButton}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Circle cx="12" cy="12" r="10" fill={colors.neutral[300]} />
                            <Path
                                d="M15 9l-6 6M9 9l6 6"
                                stroke={colors.white}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </Svg>
                    </Pressable>
                )}
            </View>

            {/* Filter Chips */}
            {filters && filters.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.filtersContainer}
                    contentContainerStyle={s.filtersContent}
                >
                    {filters.map((filter) => {
                        const isActive = activeFilter === filter.key;
                        return (
                            <Pressable
                                key={filter.key}
                                onPress={() => onFilterChange?.(filter.key)}
                                style={[
                                    s.chip,
                                    isActive && s.chipActive,
                                ]}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                                        }`}
                                >
                                    {filter.label}
                                </Text>
                                {filter.count !== undefined && (
                                    <View style={[s.chipBadge, isActive && s.chipBadgeActive]}>
                                        <Text
                                            className={`font-inter text-[10px] font-bold ${isActive ? 'text-primary-600' : 'text-neutral-500 dark:text-neutral-400'
                                                }`}
                                        >
                                            {filter.count}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14,
        height: 48,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    inputWrapperFocused: {
        borderColor: colors.primary[400],
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: colors.primary[950],
        height: '100%',
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    filtersContainer: {
        flexGrow: 0,
    },
    filtersContent: {
        gap: 8,
        paddingRight: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        gap: 6,
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    chipBadge: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    chipBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
});
const styles = createStyles(false);
