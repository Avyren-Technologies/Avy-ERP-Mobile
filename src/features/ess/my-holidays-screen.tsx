/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useMyHolidays } from '@/features/company-admin/api/use-ess-queries';

type HolidayType = 'NATIONAL' | 'REGIONAL' | 'COMPANY' | 'OPTIONAL';

const TYPE_COLORS: Record<HolidayType, { bg: string; text: string }> = {
    NATIONAL: { bg: colors.info[50], text: colors.info[700] },
    REGIONAL: { bg: colors.accent[50], text: colors.accent[700] },
    COMPANY: { bg: colors.success[50], text: colors.success[700] },
    OPTIONAL: { bg: colors.warning[50], text: colors.warning[700] },
};

function TypeBadge({ type }: { type: string }) {
    const t = TYPE_COLORS[type as HolidayType] ?? TYPE_COLORS.NATIONAL;
    return (
        <View style={[styles.typeBadge, { backgroundColor: t.bg }]}>
            <Text style={{ color: t.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
        </View>
    );
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function MyHolidaysScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = React.useState(currentYear);
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const { data, isLoading, refetch } = useMyHolidays(selectedYear);
    const holidays = (data as any)?.data ?? [];

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.name}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mt-1">{formatDate(item.date)}</Text>
                </View>
                <TypeBadge type={item.type ?? 'NATIONAL'} />
            </View>
            {item.description ? (
                <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.description}</Text>
            ) : null}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={open} />
                    <Text className="font-inter text-lg font-bold text-white ml-3">Holiday Calendar</Text>
                </View>
            </LinearGradient>

            {/* Year selector chips */}
            <View style={styles.yearRow}>
                {years.map((year) => (
                    <Pressable
                        key={year}
                        onPress={() => setSelectedYear(year)}
                        style={[
                            styles.yearChip,
                            selectedYear === year && styles.yearChipActive,
                        ]}
                    >
                        <Text
                            className={`font-inter text-sm font-semibold ${selectedYear === year ? 'text-white' : 'text-primary-700'}`}
                        >
                            {year}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <FlatList
                data={holidays}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text className="font-inter text-sm text-neutral-400">No holidays for {selectedYear}</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    yearRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    yearChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    yearChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
});
