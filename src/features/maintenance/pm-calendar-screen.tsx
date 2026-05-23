/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePMCalendar } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[month]} ${year}`;
}

export function PMCalendarScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const now = new Date();
    const [year, setYear] = React.useState(now.getFullYear());
    const [month, setMonth] = React.useState(now.getMonth());
    const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

    const apiMonth = month + 1;
    const startDate = `${year}-${String(apiMonth).padStart(2, '0')}-01`;
    const endDate = DateTime.fromObject({ year, month: apiMonth }).endOf('month').toISODate()!;
    const { data: response, isLoading } = usePMCalendar({ startDate, endDate });
    const calendarData: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    // Map: day number -> PM events
    const dayMap = React.useMemo(() => {
        const map: Record<number, any[]> = {};
        calendarData.forEach((item: any) => {
            const date = item.dueDate ?? item.nextDueDate;
            if (!date) return;
            const d = new Date(date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(item);
            }
        });
        return map;
    }, [calendarData, year, month]);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        if (month === 0) { setYear(year - 1); setMonth(11); }
        else setMonth(month - 1);
        setSelectedDay(null);
    };

    const nextMonth = () => {
        if (month === 11) { setYear(year + 1); setMonth(0); }
        else setMonth(month + 1);
        setSelectedDay(null);
    };

    const selectedDayPMs = selectedDay ? (dayMap[selectedDay] ?? []) : [];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-white">PM Calendar</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
                {/* Month navigation */}
                <View style={styles.monthNav}>
                    <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15 18l-6-6 6-6" stroke={isDark ? colors.white : colors.primary[900]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{formatMonth(year, month)}</Text>
                    <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 18l6-6-6-6" stroke={isDark ? colors.white : colors.primary[900]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>

                {/* Calendar grid */}
                {isLoading ? (
                    <SkeletonCard />
                ) : (
                    <View style={[styles.calendarCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                        {/* Weekday headers */}
                        <View style={styles.weekdayRow}>
                            {WEEKDAYS.map((d) => (
                                <View key={d} style={styles.weekdayCell}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-400">{d}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Day cells */}
                        <View style={styles.daysGrid}>
                            {/* Empty cells for offset */}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <View key={`empty-${i}`} style={styles.dayCell} />
                            ))}
                            {/* Day cells */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const hasPMs = !!dayMap[day];
                                const isSelected = selectedDay === day;
                                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

                                return (
                                    <Pressable
                                        key={day}
                                        onPress={() => setSelectedDay(isSelected ? null : day)}
                                        style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                                    >
                                        <Text className={`font-inter text-xs ${isSelected ? 'font-bold text-white' : isToday ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{day}</Text>
                                        {hasPMs ? (
                                            <View style={[styles.pmDot, isSelected && { backgroundColor: colors.white }]} />
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Selected day PM list */}
                {selectedDay ? (
                    <Animated.View entering={FadeInUp.duration(250)}>
                        <Text className="mb-3 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">
                            PMs on {formatMonth(year, month).split(' ')[0]} {selectedDay}
                        </Text>
                        {selectedDayPMs.length === 0 ? (
                            <EmptyState icon="search" title="No PMs" message="No PM schedules on this day." />
                        ) : (
                            selectedDayPMs.map((pm: any, i: number) => (
                                <Pressable
                                    key={i}
                                    onPress={() => pm.id ? router.push({ pathname: '/maintenance/pm-schedule-detail' as any, params: { id: pm.id } }) : undefined}
                                    style={[styles.pmCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}
                                >
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{pm.name ?? pm.scheduleName ?? 'PM'}</Text>
                                    <Text className="font-inter text-xs text-neutral-500">{pm.asset?.name ?? pm.assetName ?? '-'}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-400">{pm.strategyType ?? '-'}</Text>
                                </Pressable>
                            ))
                        )}
                    </Animated.View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
    calendarCard: { borderRadius: 20, padding: 12, borderWidth: 1, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    weekdayRow: { flexDirection: 'row' },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
    dayCellSelected: { backgroundColor: colors.primary[600], borderRadius: 12 },
    dayCellToday: { backgroundColor: colors.primary[50], borderRadius: 12 },
    pmDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary[500] },
    pmCard: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 4 },
});
