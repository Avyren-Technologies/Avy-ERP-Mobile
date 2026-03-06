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
    const [focused, setFocused] = React.useState(false);

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.searchIcon}>
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
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {value.length > 0 && (
                    <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
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
                    style={styles.filtersContainer}
                    contentContainerStyle={styles.filtersContent}
                >
                    {filters.map((filter) => {
                        const isActive = activeFilter === filter.key;
                        return (
                            <Pressable
                                key={filter.key}
                                onPress={() => onFilterChange?.(filter.key)}
                                style={[
                                    styles.chip,
                                    isActive && styles.chipActive,
                                ]}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                                        }`}
                                >
                                    {filter.label}
                                </Text>
                                {filter.count !== undefined && (
                                    <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                                        <Text
                                            className={`font-inter text-[10px] font-bold ${isActive ? 'text-primary-600' : 'text-neutral-500'
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

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
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
        backgroundColor: colors.primary[50],
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
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        gap: 6,
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    chipBadge: {
        backgroundColor: colors.neutral[100],
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
