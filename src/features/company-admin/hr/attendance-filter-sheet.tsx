/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Search, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';

export interface AttendanceFilterValues {
    departmentId?: string;
    locationId?: string;
    designationId?: string;
    employeeTypeId?: string;
    shiftId?: string;
    statuses?: string[];
    sources?: string[];
    search?: string;
}

export interface FilterOption {
    label: string;
    value: string;
}

interface AttendanceFilterSheetProps {
    visible: boolean;
    onClose: () => void;
    initial: AttendanceFilterValues;
    onApply: (values: AttendanceFilterValues) => void;
    departments: FilterOption[];
    locations: FilterOption[];
    designations: FilterOption[];
    employeeTypes: FilterOption[];
    shifts: FilterOption[];
    /** When false, the Status filter section is hidden (e.g. range views). */
    showStatus?: boolean;
    /** When false, the Source filter section is hidden. */
    showSource?: boolean;
}

const STATUS_OPTIONS: FilterOption[] = [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Half Day', value: 'HALF_DAY' },
    { label: 'Late', value: 'LATE' },
    { label: 'On Leave', value: 'ON_LEAVE' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Week Off', value: 'WEEK_OFF' },
    { label: 'LOP', value: 'LOP' },
];

const SOURCE_OPTIONS: FilterOption[] = [
    { label: 'Mobile', value: 'MOBILE_GPS' },
    { label: 'Web', value: 'WEB' },
    { label: 'Biometric', value: 'BIOMETRIC' },
    { label: 'Manual', value: 'MANUAL' },
    { label: 'System', value: 'SYSTEM' },
    { label: 'Face ID', value: 'FACE_RECOGNITION' },
];

function SingleSelectSection({
    title,
    options,
    selectedValue,
    onSelect,
    isDark,
}: {
    title: string;
    options: FilterOption[];
    selectedValue?: string;
    onSelect: (value: string | undefined) => void;
    isDark: boolean;
}) {
    if (options.length === 0) return null;
    return (
        <View style={sectionStyles.container}>
            <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {title}
            </Text>
            <View style={sectionStyles.chipRow}>
                <Pressable
                    onPress={() => onSelect(undefined)}
                    style={[
                        sectionStyles.chip,
                        { backgroundColor: isDark ? '#13112B' : colors.neutral[100], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
                        !selectedValue && sectionStyles.chipSelected,
                    ]}
                >
                    <Text className={`font-inter text-[13px] font-medium ${!selectedValue ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        All
                    </Text>
                </Pressable>
                {options.map((option) => {
                    const isSelected = selectedValue === option.value;
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onSelect(isSelected ? undefined : option.value)}
                            style={[
                                sectionStyles.chip,
                                { backgroundColor: isDark ? '#13112B' : colors.neutral[100], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
                                isSelected && sectionStyles.chipSelected,
                            ]}
                        >
                            <Text className={`font-inter text-[13px] font-medium ${isSelected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function MultiSelectSection({
    title,
    options,
    selectedValues,
    onToggle,
    isDark,
}: {
    title: string;
    options: FilterOption[];
    selectedValues: string[];
    onToggle: (value: string) => void;
    isDark: boolean;
}) {
    return (
        <View style={sectionStyles.container}>
            <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {title}
            </Text>
            <View style={sectionStyles.chipRow}>
                {options.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onToggle(option.value)}
                            style={[
                                sectionStyles.chip,
                                { backgroundColor: isDark ? '#13112B' : colors.neutral[100], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
                                isSelected && sectionStyles.chipSelected,
                            ]}
                        >
                            <Text className={`font-inter text-[13px] font-medium ${isSelected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    container: { gap: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 22,
        borderWidth: 1,
        minHeight: 36,
        justifyContent: 'center',
    },
    chipSelected: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
});

export function AttendanceFilterSheet({
    visible,
    onClose,
    initial,
    onApply,
    departments,
    locations,
    designations,
    employeeTypes,
    shifts,
    showStatus = true,
    showSource = true,
}: AttendanceFilterSheetProps) {
    const isDark = useIsDark();
    const styles = createStyles(isDark);

    const bottomSheetRef = React.useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['80%', '95%'], []);

    const [draft, setDraft] = React.useState<AttendanceFilterValues>(initial);

    React.useEffect(() => {
        if (visible) setDraft(initial);
    }, [visible, initial]);

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
                pressBehavior="close"
            />
        ),
        [],
    );

    const updateField = React.useCallback((key: keyof AttendanceFilterValues, value: any) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }, []);

    const toggleMulti = React.useCallback((key: 'statuses' | 'sources', value: string) => {
        setDraft((prev) => {
            const current = prev[key] ?? [];
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value];
            return { ...prev, [key]: next.length > 0 ? next : undefined };
        });
    }, []);

    const handleReset = React.useCallback(() => {
        setDraft({});
    }, []);

    const handleApply = React.useCallback(() => {
        onApply(draft);
        onClose();
    }, [draft, onApply, onClose]);

    const activeCount = React.useMemo(() => {
        let count = 0;
        if (draft.departmentId) count++;
        if (draft.locationId) count++;
        if (draft.designationId) count++;
        if (draft.employeeTypeId) count++;
        if (draft.shiftId) count++;
        if (draft.statuses?.length) count += draft.statuses.length;
        if (draft.sources?.length) count += draft.sources.length;
        if (draft.search) count++;
        return count;
    }, [draft]);

    if (!visible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={styles.indicator}
            backgroundStyle={styles.background}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text className="font-inter text-[18px] font-bold text-primary-950 dark:text-white">
                        Filters
                    </Text>
                    {activeCount > 0 && (
                        <View style={styles.badge}>
                            <Text className="font-inter text-[11px] font-bold text-white">
                                {activeCount}
                            </Text>
                        </View>
                    )}
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                    <X size={20} color={colors.neutral[500]} />
                </Pressable>
            </View>

            <BottomSheetScrollView contentContainerStyle={styles.content}>
                <View style={[styles.searchWrap, { backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                    <Search size={16} color={colors.neutral[400]} />
                    <TextInput
                        placeholder="Search employee, code…"
                        placeholderTextColor={colors.neutral[400]}
                        value={draft.search ?? ''}
                        onChangeText={(t) => updateField('search', t || undefined)}
                        style={[styles.searchInput, { color: isDark ? colors.white : colors.primary[950] }]}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                </View>

                <SingleSelectSection
                    title="Department"
                    options={departments}
                    selectedValue={draft.departmentId}
                    onSelect={(v) => updateField('departmentId', v)}
                    isDark={isDark}
                />
                <SingleSelectSection
                    title="Location"
                    options={locations}
                    selectedValue={draft.locationId}
                    onSelect={(v) => updateField('locationId', v)}
                    isDark={isDark}
                />
                <SingleSelectSection
                    title="Designation"
                    options={designations}
                    selectedValue={draft.designationId}
                    onSelect={(v) => updateField('designationId', v)}
                    isDark={isDark}
                />
                <SingleSelectSection
                    title="Employee Type"
                    options={employeeTypes}
                    selectedValue={draft.employeeTypeId}
                    onSelect={(v) => updateField('employeeTypeId', v)}
                    isDark={isDark}
                />
                <SingleSelectSection
                    title="Shift"
                    options={shifts}
                    selectedValue={draft.shiftId}
                    onSelect={(v) => updateField('shiftId', v)}
                    isDark={isDark}
                />

                {showStatus && (
                    <MultiSelectSection
                        title="Status"
                        options={STATUS_OPTIONS}
                        selectedValues={draft.statuses ?? []}
                        onToggle={(v) => toggleMulti('statuses', v)}
                        isDark={isDark}
                    />
                )}
                {showSource && (
                    <MultiSelectSection
                        title="Source"
                        options={SOURCE_OPTIONS}
                        selectedValues={draft.sources ?? []}
                        onToggle={(v) => toggleMulti('sources', v)}
                        isDark={isDark}
                    />
                )}
            </BottomSheetScrollView>

            <View style={styles.footer}>
                <Pressable onPress={handleReset} style={styles.resetBtn} hitSlop={4}>
                    <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">Reset</Text>
                </Pressable>
                <Pressable onPress={handleApply} style={styles.applyBtn} hitSlop={4}>
                    <Text className="font-inter text-sm font-bold text-white">
                        Apply{activeCount > 0 ? ` (${activeCount})` : ''}
                    </Text>
                </Pressable>
            </View>
        </BottomSheet>
    );
}

const createStyles = (isDark: boolean) =>
    StyleSheet.create({
        indicator: { backgroundColor: colors.neutral[300], width: 40 },
        background: {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100],
        },
        headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        closeBtn: { padding: 6, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
        badge: {
            backgroundColor: colors.primary[600],
            borderRadius: 12,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 6,
            justifyContent: 'center',
            alignItems: 'center',
        },
        content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 22 },
        searchWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1,
        },
        searchInput: {
            flex: 1,
            paddingVertical: 6,
            fontFamily: 'Inter',
            fontSize: 14,
        },
        footer: {
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
        },
        resetBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[600] : colors.neutral[200],
            alignItems: 'center',
            minHeight: 48,
            justifyContent: 'center',
        },
        applyBtn: {
            flex: 2,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.primary[600],
            alignItems: 'center',
            minHeight: 48,
            justifyContent: 'center',
        },
    });
