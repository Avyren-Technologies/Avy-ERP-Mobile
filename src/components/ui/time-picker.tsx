import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { DEFAULT_FORMAT_SETTINGS } from '@/lib/format/company-formatter';

type AmPm = 'AM' | 'PM';

function parseTimeValue(value: string): { hour24: number; minute: number } {
    if (!value?.trim()) return { hour24: 9, minute: 0 };
    const [h, m] = value.split(':').map(Number);
    return {
        hour24: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
        minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
    };
}

function to24Hour(hour12: number, period: AmPm): number {
    if (period === 'AM') return hour12 === 12 ? 0 : hour12;
    return hour12 === 12 ? 12 : hour12 + 12;
}

function to12Hour(hour24: number): { hour12: number; period: AmPm } {
    const period: AmPm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, period };
}

function formatTime24(hour24: number, minute: number): string {
    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function PickerColumn({
    title,
    items,
    selected,
    onSelect,
    formatLabel,
    isDark,
}: {
    title: string;
    items: number[] | AmPm[];
    selected: number | AmPm;
    onSelect: (v: number | AmPm) => void;
    formatLabel?: (v: number | AmPm) => string;
    isDark: boolean;
}) {
    return (
        <View style={{ flex: 1 }}>
            <Text className="font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 text-center">{title}</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {items.map((item) => {
                    const isSelected = item === selected;
                    const label = formatLabel ? formatLabel(item) : String(item);
                    return (
                        <Pressable
                            key={String(item)}
                            onPress={() => onSelect(item)}
                            style={[
                                modalStyles.pickerItem,
                                isDark && { backgroundColor: colors.neutral[800] },
                                isSelected && modalStyles.pickerItemSelected,
                            ]}
                        >
                            <Text
                                className={`font-inter text-sm font-semibold ${isSelected ? 'text-white' : 'text-primary-900 dark:text-primary-100'}`}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export function TimePickerField({
    label,
    value,
    onChange,
    hint,
    error,
    editable = true,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
    error?: string;
    editable?: boolean;
}) {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const { data: settingsData } = useCompanySettings();
    const timeFormat =
        (settingsData as { data?: { timeFormat?: string } } | undefined)?.data?.timeFormat ??
        DEFAULT_FORMAT_SETTINGS.timeFormat;
    const is12HourDisplay = timeFormat === 'TWELVE_HOUR';
    const S = fieldStyles(isDark);
    const [open, setOpen] = React.useState(false);

    const parsed = parseTimeValue(value);
    const initial12 = to12Hour(parsed.hour24);

    const [selectedHour24, setSelectedHour24] = React.useState(parsed.hour24);
    const [selectedMinute, setSelectedMinute] = React.useState(parsed.minute);
    const [selectedHour12, setSelectedHour12] = React.useState(initial12.hour12);
    const [selectedPeriod, setSelectedPeriod] = React.useState<AmPm>(initial12.period);

    React.useEffect(() => {
        if (!open) return;
        const next = parseTimeValue(value);
        const h12 = to12Hour(next.hour24);
        setSelectedHour24(next.hour24);
        setSelectedMinute(next.minute);
        setSelectedHour12(h12.hour12);
        setSelectedPeriod(h12.period);
    }, [open, value]);

    const hours24 = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
    const hours12 = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const minutes = React.useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
    const periods: AmPm[] = ['AM', 'PM'];

    const displayLabel = value ? fmt.shiftTime(value) : 'Select time';
    const sheetBg = isDark ? '#1A1730' : colors.white;
    const use24Picker = !is12HourDisplay;

    const handleConfirm = () => {
        const hour24 = use24Picker ? selectedHour24 : to24Hour(selectedHour12, selectedPeriod);
        onChange(formatTime24(hour24, selectedMinute));
        setOpen(false);
    };

    return (
        <View style={S.wrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <Pressable
                onPress={() => editable && setOpen(true)}
                style={[S.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, !editable && S.inputReadOnly, error ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]}
            >
                <Text className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                    {displayLabel}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                        d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
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

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={modalStyles.overlay}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[modalStyles.sheet, { backgroundColor: sheetBg }]}>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">{label}</Text>
                        <View style={modalStyles.pickerRow}>
                            {use24Picker ? (
                                <>
                                    <PickerColumn
                                        title="Hour"
                                        items={hours24}
                                        selected={selectedHour24}
                                        onSelect={(v) => setSelectedHour24(v as number)}
                                        formatLabel={(v) => String(v as number).padStart(2, '0')}
                                        isDark={isDark}
                                    />
                                    <Text className="font-inter text-xl font-bold text-primary-600 self-center">:</Text>
                                    <PickerColumn
                                        title="Minute"
                                        items={minutes}
                                        selected={selectedMinute}
                                        onSelect={(v) => setSelectedMinute(v as number)}
                                        formatLabel={(v) => String(v as number).padStart(2, '0')}
                                        isDark={isDark}
                                    />
                                </>
                            ) : (
                                <>
                                    <PickerColumn
                                        title="Hour"
                                        items={hours12}
                                        selected={selectedHour12}
                                        onSelect={(v) => setSelectedHour12(v as number)}
                                        isDark={isDark}
                                    />
                                    <Text className="font-inter text-xl font-bold text-primary-600 self-center">:</Text>
                                    <PickerColumn
                                        title="Min"
                                        items={minutes}
                                        selected={selectedMinute}
                                        onSelect={(v) => setSelectedMinute(v as number)}
                                        formatLabel={(v) => String(v as number).padStart(2, '0')}
                                        isDark={isDark}
                                    />
                                    <PickerColumn
                                        title="AM/PM"
                                        items={periods}
                                        selected={selectedPeriod}
                                        onSelect={(v) => setSelectedPeriod(v as AmPm)}
                                        isDark={isDark}
                                    />
                                </>
                            )}
                        </View>
                        <View style={modalStyles.footerRow}>
                            <Pressable
                                style={[modalStyles.footerBtn, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}
                                onPress={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-300">Clear</Text>
                            </Pressable>
                            <Pressable
                                style={[modalStyles.footerBtn, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}
                                onPress={() => setOpen(false)}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-300">Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[modalStyles.footerBtn, { backgroundColor: colors.primary[600] }]}
                                onPress={handleConfirm}
                            >
                                <Text className="font-inter text-sm font-bold text-white">Confirm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const fieldStyles = (isDark: boolean) =>
    StyleSheet.create({
        wrap: { marginBottom: 0 },
        input: {
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            borderRadius: 12,
            height: 48,
            paddingHorizontal: 16,
            backgroundColor: isDark ? '#1A1730' : colors.white,
        },
        inputReadOnly: {
            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
            borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
        },
    });

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(8, 15, 40, 0.32)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    pickerItem: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 4,
        alignItems: 'center',
        backgroundColor: colors.neutral[50],
    },
    pickerItemSelected: {
        backgroundColor: colors.primary[600],
    },
    footerRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    footerBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
