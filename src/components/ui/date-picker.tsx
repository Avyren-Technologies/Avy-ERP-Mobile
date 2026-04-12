import * as React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';

function formatDateDDMMYYYY(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = `${date.getFullYear()}`;
    return `${day}/${month}/${year}`;
}

function parseDateValue(value: string): Date {
    if (!value) return new Date();

    const parts = value.split('/');
    if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        const parsed = new Date(year, month, day);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return new Date();
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type PickerView = 'calendar' | 'month' | 'year';

export function DatePickerField({
    label,
    value,
    onChange,
    required,
    hint,
    error,
    editable = true,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    hint?: string;
    error?: string;
    editable?: boolean;
}) {
  const isDark = useIsDark();
  const S = _createStyles(isDark);
    const [open, setOpen] = React.useState(false);
    const [pickerView, setPickerView] = React.useState<PickerView>('calendar');
    const selectedDate = React.useMemo(() => {
        if (!value) return null;
        return parseDateValue(value);
    }, [value]);
    const [viewMonth, setViewMonth] = React.useState<Date>(selectedDate ?? new Date());
    const [yearRangeStart, setYearRangeStart] = React.useState(
        Math.floor((selectedDate ?? new Date()).getFullYear() / 12) * 12
    );

    React.useEffect(() => {
        if (!open) return;
        setViewMonth(selectedDate ?? new Date());
        setPickerView('calendar');
        setYearRangeStart(
            Math.floor((selectedDate ?? new Date()).getFullYear() / 12) * 12
        );
    }, [open, selectedDate]);

    const monthStart = React.useMemo(
        () => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1),
        [viewMonth]
    );
    const gridStart = React.useMemo(() => {
        const first = new Date(monthStart);
        first.setDate(first.getDate() - first.getDay());
        return first;
    }, [monthStart]);
    const days = React.useMemo(() => {
        return Array.from({ length: 42 }, (_, index) => {
            const day = new Date(gridStart);
            day.setDate(gridStart.getDate() + index);
            day.setHours(0, 0, 0, 0);
            return day;
        });
    }, [gridStart]);
    const today = React.useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }, []);
    const selectedKey = selectedDate ? formatDateDDMMYYYY(selectedDate) : '';

    // Only show 6 weeks if needed, otherwise 5
    const weeksNeeded = React.useMemo(() => {
        const lastDay = days[41];
        if (lastDay.getMonth() !== viewMonth.getMonth() && days[35].getMonth() !== viewMonth.getMonth()) {
            return 5;
        }
        return 6;
    }, [days, viewMonth]);
    const visibleDays = days.slice(0, weeksNeeded * 7);

    const yearRange = React.useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
    }, [yearRangeStart]);

    return (
        <View style={S.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label}
                {required && <Text className="text-danger-500"> *</Text>}
            </Text>
            <Pressable
                onPress={() => {
                    if (editable) setOpen(true);
                }}
                style={[
                    S.fieldInput,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                    !editable && S.fieldInputReadOnly,
                    error ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined,
                ]}
            >
                <Text
                    className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                >
                    {value || 'YYYY-MM-DD'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                        d="M8 2v3M16 2v3M3 10h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                        stroke={colors.neutral[500]}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>
            {error ? (
                <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text>
            ) : hint ? (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            ) : null}

            {open && (
                <Modal
                    visible
                    transparent
                    animationType="fade"
                    onRequestClose={() => setOpen(false)}
                >
                    <View style={styles.overlay}>
                        <Pressable
                            style={StyleSheet.absoluteFillObject}
                            onPress={() => setOpen(false)}
                        />

                        <View style={styles.card}>
                            {/* ─── Header ─── */}
                            <View style={styles.headerRow}>
                                <Pressable
                                    style={styles.navBtn}
                                    onPress={() => {
                                        if (pickerView === 'calendar') {
                                            setViewMonth(
                                                (prev) =>
                                                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                            );
                                        } else if (pickerView === 'year') {
                                            setYearRangeStart((prev) => prev - 12);
                                        } else {
                                            setViewMonth(
                                                (prev) =>
                                                    new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                                            );
                                        }
                                    }}
                                >
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path
                                            d="M15 18l-6-6 6-6"
                                            stroke={colors.primary[700]}
                                            strokeWidth="2.2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </Pressable>

                                <Pressable
                                    style={styles.monthYearBtn}
                                    onPress={() => {
                                        if (pickerView === 'calendar') setPickerView('month');
                                        else if (pickerView === 'month') setPickerView('year');
                                        else setPickerView('calendar');
                                    }}
                                >
                                    <Text className="font-inter text-sm font-bold text-primary-800">
                                        {pickerView === 'year'
                                            ? `${yearRangeStart} – ${yearRangeStart + 11}`
                                            : pickerView === 'month'
                                              ? `${viewMonth.getFullYear()}`
                                              : `${MONTHS_SHORT[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`}
                                    </Text>
                                    <Svg width={12} height={12} viewBox="0 0 24 24">
                                        <Path
                                            d={pickerView === 'calendar' ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'}
                                            stroke={colors.primary[600]}
                                            strokeWidth="2.4"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </Pressable>

                                <Pressable
                                    style={styles.navBtn}
                                    onPress={() => {
                                        if (pickerView === 'calendar') {
                                            setViewMonth(
                                                (prev) =>
                                                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                            );
                                        } else if (pickerView === 'year') {
                                            setYearRangeStart((prev) => prev + 12);
                                        } else {
                                            setViewMonth(
                                                (prev) =>
                                                    new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                                            );
                                        }
                                    }}
                                >
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path
                                            d="M9 18l6-6-6-6"
                                            stroke={colors.primary[700]}
                                            strokeWidth="2.2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </Pressable>
                            </View>

                            {/* ─── Year Grid ─── */}
                            {pickerView === 'year' && (
                                <View style={styles.pickerGrid}>
                                    {yearRange.map((yr) => {
                                        const isCurrent = yr === viewMonth.getFullYear();
                                        const isThisYear = yr === today.getFullYear();
                                        return (
                                            <Pressable
                                                key={yr}
                                                style={[
                                                    styles.pickerCell,
                                                    isCurrent && styles.pickerCellSelected,
                                                    !isCurrent && isThisYear && styles.pickerCellToday,
                                                ]}
                                                onPress={() => {
                                                    setViewMonth(
                                                        new Date(yr, viewMonth.getMonth(), 1)
                                                    );
                                                    setPickerView('month');
                                                }}
                                            >
                                                <Text
                                                    className={`font-inter text-xs ${
                                                        isCurrent
                                                            ? 'font-bold text-white'
                                                            : isThisYear
                                                              ? 'font-semibold text-primary-700'
                                                              : 'text-primary-800'
                                                    }`}
                                                >
                                                    {yr}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* ─── Month Grid ─── */}
                            {pickerView === 'month' && (
                                <View style={styles.pickerGrid}>
                                    {MONTHS_SHORT.map((mon, idx) => {
                                        const isCurrent =
                                            idx === viewMonth.getMonth();
                                        const isThisMonth =
                                            idx === today.getMonth() &&
                                            viewMonth.getFullYear() === today.getFullYear();
                                        return (
                                            <Pressable
                                                key={mon}
                                                style={[
                                                    styles.pickerCell,
                                                    isCurrent && styles.pickerCellSelected,
                                                    !isCurrent && isThisMonth && styles.pickerCellToday,
                                                ]}
                                                onPress={() => {
                                                    setViewMonth(
                                                        new Date(viewMonth.getFullYear(), idx, 1)
                                                    );
                                                    setPickerView('calendar');
                                                }}
                                            >
                                                <Text
                                                    className={`font-inter text-xs ${
                                                        isCurrent
                                                            ? 'font-bold text-white'
                                                            : isThisMonth
                                                              ? 'font-semibold text-primary-700'
                                                              : 'text-primary-800'
                                                    }`}
                                                >
                                                    {mon}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* ─── Calendar Grid ─── */}
                            {pickerView === 'calendar' && (
                                <>
                                    <View style={styles.weekdayRow}>
                                        {WEEKDAYS.map((weekDay) => (
                                            <View key={weekDay} style={styles.weekdayCell}>
                                                <Text className="font-inter text-[10px] font-bold text-neutral-400">
                                                    {weekDay}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.grid}>
                                        {visibleDays.map((day) => {
                                            const dayKey = formatDateDDMMYYYY(day);
                                            const isSelected = dayKey === selectedKey;
                                            const inCurrentMonth =
                                                day.getMonth() === viewMonth.getMonth();
                                            const isFuture = day > today;
                                            const isToday =
                                                day.getDate() === today.getDate() &&
                                                day.getMonth() === today.getMonth() &&
                                                day.getFullYear() === today.getFullYear();

                                            return (
                                                <Pressable
                                                    key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                                                    style={[
                                                        styles.dayCell,
                                                        isSelected && styles.dayCellSelected,
                                                        !isSelected && isToday && styles.dayCellToday,
                                                    ]}
                                                    onPress={() => {
                                                        const yyyyMmDd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                                        onChange(yyyyMmDd);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Text
                                                        className={`font-inter text-[12px] ${
                                                            isSelected
                                                                ? 'font-bold text-white'
                                                                : inCurrentMonth
                                                                  ? isToday
                                                                    ? 'font-semibold text-primary-700'
                                                                    : 'text-primary-900 dark:text-primary-100'
                                                                  : 'text-neutral-300'
                                                        }`}
                                                    >
                                                        {day.getDate()}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </>
                            )}

                            {/* ─── Footer ─── */}
                            <View style={styles.footerRow}>
                                <Pressable
                                    style={styles.footerGhostBtn}
                                    onPress={() => {
                                        if (value) {
                                            onChange('');
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                        {value ? 'Clear' : 'Cancel'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={styles.footerPrimaryBtn}
                                    onPress={() => {
                                        const now = new Date();
                                        const yyyyMmDd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                        onChange(yyyyMmDd);
                                        setOpen(false);
                                    }}
                                >
                                    <Text className="font-inter text-xs font-bold text-primary-700">
                                        Today
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const _createStyles = (isDark: boolean) => StyleSheet.create({
    fieldWrap: { marginBottom: 16 },
    fieldInput: {
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 16,
        backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    fieldInputReadOnly: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    },
});
const S = _createStyles(false);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(8, 15, 40, 0.28)',
        paddingHorizontal: 28,
    },
    card: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    navBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    monthYearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    weekdayCell: {
        width: '14.2857%',
        alignItems: 'center',
        paddingVertical: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.2857%',
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCellToday: {
        backgroundColor: colors.primary[50],
        borderWidth: 1.5,
        borderColor: colors.primary[200],
    },
    dayCellSelected: {
        backgroundColor: colors.primary[600],
        shadowColor: colors.primary[700],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    dayCellDisabled: {
        opacity: 0.2,
    },
    // ── Month / Year picker grid (3×4) ──
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    pickerCell: {
        width: '23%',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    pickerCellSelected: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
        shadowColor: colors.primary[700],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerCellToday: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[300],
    },
    footerRow: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerGhostBtn: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    footerPrimaryBtn: {
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[100],
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
});
