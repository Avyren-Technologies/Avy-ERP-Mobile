/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useSubmitChecklist } from '@/features/maintenance/api/use-maintenance-mutations';
import { useWorkOrder } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

type FieldValue = string | boolean | number | null;

interface ChecklistField {
    id: string;
    label: string;
    fieldType: string;
    mandatory?: boolean;
    options?: string[];
}

interface ChecklistSection {
    id: string;
    name: string;
    fields: ChecklistField[];
}

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
    return (
        <View style={fieldStyles.toggleRow}>
            <Pressable onPress={() => onChange(true)} style={[fieldStyles.toggleBtn, value === true && { backgroundColor: colors.success[500] }]}>
                <Text className={`font-inter text-sm font-bold ${value === true ? 'text-white' : 'text-neutral-600'}`}>Yes</Text>
            </Pressable>
            <Pressable onPress={() => onChange(false)} style={[fieldStyles.toggleBtn, value === false && { backgroundColor: colors.danger[500] }]}>
                <Text className={`font-inter text-sm font-bold ${value === false ? 'text-white' : 'text-neutral-600'}`}>No</Text>
            </Pressable>
        </View>
    );
}

function PassFailToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
    return (
        <View style={fieldStyles.toggleRow}>
            <Pressable onPress={() => onChange(true)} style={[fieldStyles.toggleBtn, value === true && { backgroundColor: colors.success[500] }]}>
                <Text className={`font-inter text-sm font-bold ${value === true ? 'text-white' : 'text-neutral-600'}`}>Pass</Text>
            </Pressable>
            <Pressable onPress={() => onChange(false)} style={[fieldStyles.toggleBtn, value === false && { backgroundColor: colors.danger[500] }]}>
                <Text className={`font-inter text-sm font-bold ${value === false ? 'text-white' : 'text-neutral-600'}`}>Fail</Text>
            </Pressable>
        </View>
    );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <View style={fieldStyles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => onChange(star)} hitSlop={8}>
                    <Svg width={32} height={32} viewBox="0 0 24 24">
                        <Path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={star <= value ? colors.warning[400] : colors.neutral[200]}
                            stroke={star <= value ? colors.warning[500] : colors.neutral[300]}
                            strokeWidth="1"
                        />
                    </Svg>
                </Pressable>
            ))}
        </View>
    );
}

function DropdownPicker({ options, value, onChange, isDark }: { options: string[]; value: string; onChange: (v: string) => void; isDark: boolean }) {
    const [open, setOpen] = React.useState(false);
    return (
        <View>
            <Pressable
                onPress={() => setOpen(!open)}
                style={[fieldStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
            >
                <Text className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>{value || 'Select...'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            {open ? (
                <View style={[fieldStyles.dropdown, { backgroundColor: isDark ? '#1A1730' : '#fff', borderColor: isDark ? colors.primary[800] : colors.primary[200] }]}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                        {options.map((opt) => (
                            <Pressable key={opt} onPress={() => { onChange(opt); setOpen(false); }} style={[fieldStyles.dropdownItem, opt === value && { backgroundColor: colors.primary[50] }]}>
                                <Text className={`font-inter text-sm ${opt === value ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

function ChecklistFieldRenderer({ field, value, onChange, isDark }: {
    field: ChecklistField; value: FieldValue; onChange: (v: FieldValue) => void; isDark: boolean;
}) {
    switch (field.fieldType) {
        case 'YES_NO':
            return <YesNoToggle value={value as boolean | null} onChange={onChange} />;
        case 'PASS_FAIL':
            return <PassFailToggle value={value as boolean | null} onChange={onChange} />;
        case 'NUMERIC':
            return (
                <TextInput
                    style={[fieldStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                    placeholder="Enter number" placeholderTextColor={colors.neutral[400]}
                    value={value != null ? String(value) : ''} onChangeText={(v) => onChange(v ? Number(v) : null)}
                    keyboardType="numeric"
                />
            );
        case 'TEXT':
            return (
                <TextInput
                    style={[fieldStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                    placeholder="Enter text..." placeholderTextColor={colors.neutral[400]}
                    value={(value as string) ?? ''} onChangeText={onChange} multiline
                />
            );
        case 'RISK_RATING':
            return <StarRating value={(value as number) ?? 0} onChange={onChange} />;
        case 'DROPDOWN':
            return <DropdownPicker options={field.options ?? []} value={(value as string) ?? ''} onChange={onChange} isDark={isDark} />;
        case 'PHOTO':
            return (
                <Pressable style={[fieldStyles.photoBtn, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} onPress={() => onChange('photo_captured')}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" /><Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" /></Svg>
                    <Text className="font-inter text-xs text-neutral-500">{value ? 'Photo captured' : 'Tap to capture photo'}</Text>
                </Pressable>
            );
        case 'SIGNATURE':
            return (
                <View style={[fieldStyles.photoBtn, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                    <Text className="font-inter text-xs text-neutral-400">Signature capture (coming soon)</Text>
                </View>
            );
        case 'BARCODE_SCAN':
            return (
                <Pressable style={[fieldStyles.photoBtn, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} onPress={() => onChange('scanned')}>
                    <Text className="font-inter text-xs text-neutral-500">{value ? `Scanned: ${value}` : 'Tap to scan barcode'}</Text>
                </Pressable>
            );
        case 'DATE_TIME':
            return (
                <TextInput
                    style={[fieldStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                    placeholder="yyyy-mm-dd HH:mm" placeholderTextColor={colors.neutral[400]}
                    value={(value as string) ?? ''} onChangeText={onChange}
                />
            );
        default:
            return (
                <TextInput
                    style={[fieldStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                    placeholder="Enter value..." placeholderTextColor={colors.neutral[400]}
                    value={(value as string) ?? ''} onChangeText={onChange}
                />
            );
    }
}

export function ExecuteChecklistScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

    const { data: response, isLoading, error } = useWorkOrder(workOrderId ?? '');
    const wo: any = (response as any)?.data ?? null;
    const sections: ChecklistSection[] = React.useMemo(() => {
        const snapshot = wo?.checklistSnapshot;
        if (!snapshot) return [];
        // Support both old array format and new { sections: [...] } format
        const raw = Array.isArray(snapshot) ? snapshot : (snapshot?.sections ?? []);
        return Array.isArray(raw) ? raw : [];
    }, [wo]);

    const submitMut = useSubmitChecklist();
    const [values, setValues] = React.useState<Record<string, FieldValue>>({});
    const [activeSectionIdx, setActiveSectionIdx] = React.useState(0);

    const setValue = (fieldId: string, val: FieldValue) => {
        setValues((prev) => ({ ...prev, [fieldId]: val }));
    };

    const activeSection = sections[activeSectionIdx];
    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
    const filledFields = Object.keys(values).filter((k) => values[k] != null && values[k] !== '').length;
    const progress = totalFields > 0 ? filledFields / totalFields : 0;

    const mandatoryFields = sections.flatMap((s) => s.fields.filter((f) => f.mandatory));
    const allMandatoryFilled = mandatoryFields.every((f) => values[f.id] != null && values[f.id] !== '');

    const handleSubmit = () => {
        if (!workOrderId) return;
        const responses = sections.flatMap((section) =>
            section.fields.map((field) => ({
                fieldId: field.id,
                sectionId: section.id,
                value: values[field.id] != null ? String(values[field.id]) : undefined,
                passed: typeof values[field.id] === 'boolean' ? (values[field.id] as boolean) : undefined,
                numericValue: typeof values[field.id] === 'number' ? (values[field.id] as number) : undefined,
            }))
        );
        submitMut.mutate({ id: workOrderId, data: { responses } }, {
            onSuccess: () => { showSuccess('Checklist submitted'); router.back(); },
            onError: () => showErrorMessage('Failed to submit checklist'),
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error || sections.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <HeaderBar onBack={() => router.back()} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState icon="search" title="No checklist" message="This work order has no checklist to execute." />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <HeaderBar onBack={() => router.back()} />

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBg, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100] }]}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text className="font-inter text-[10px] text-neutral-400">{filledFields}/{totalFields} fields</Text>
            </View>

            {/* Section tabs */}
            <View style={styles.sectionTabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
                    {sections.map((section, idx) => (
                        <Pressable key={section.id} onPress={() => setActiveSectionIdx(idx)} style={[styles.sectionTab, idx === activeSectionIdx && styles.sectionTabActive]}>
                            <Text className={`font-inter text-xs font-bold ${idx === activeSectionIdx ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>{section.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Fields */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {activeSection ? activeSection.fields.map((field, idx) => (
                    <Animated.View key={field.id} entering={FadeInUp.duration(250).delay(idx * 30)}>
                        <View style={[styles.fieldCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                {field.label} {field.mandatory ? <Text className="text-danger-500">*</Text> : null}
                            </Text>
                            <Text className="mb-2 font-inter text-[10px] text-neutral-400">{field.fieldType.replace(/_/g, ' ')}</Text>
                            <ChecklistFieldRenderer field={field} value={values[field.id] ?? null} onChange={(v) => setValue(field.id, v)} isDark={isDark} />
                        </View>
                    </Animated.View>
                )) : null}
            </ScrollView>

            {/* Submit */}
            <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 16, backgroundColor: isDark ? '#1A1730' : colors.white, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                <Pressable
                    style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, (!allMandatoryFilled || submitMut.isPending) && { opacity: 0.5 }]}
                    onPress={handleSubmit}
                    disabled={!allMandatoryFilled || submitMut.isPending}
                >
                    {submitMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Submit Checklist</Text>}
                </Pressable>
            </View>
        </View>
    );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <LinearGradient
            colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[headerStyles.gradient, { paddingTop: insets.top + 8 }]}
        >
            <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
                <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Text className="font-inter text-lg font-bold text-white">Execute Checklist</Text>
            <View style={{ width: 44 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10 },
    progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.success[500] },
    sectionTabs: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    sectionTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
    sectionTabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    fieldCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    submitContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    submitBtn: { backgroundColor: colors.primary[600], borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

const headerStyles = StyleSheet.create({
    gradient: { paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

const fieldStyles = StyleSheet.create({
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
    starRow: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    dropdown: { borderRadius: 10, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 11 },
    photoBtn: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
