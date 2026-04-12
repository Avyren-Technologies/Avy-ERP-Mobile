/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { useFileGrievance } from '@/features/company-admin/api/use-ess-mutations';
import { useMyGrievances } from '@/features/company-admin/api/use-ess-queries';
import { useGrievanceCategories } from '@/features/company-admin/api/use-recruitment-queries';
import { useIsDark } from '@/hooks/use-is-dark';

type GrievanceStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed' | 'Escalated';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    Open: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Investigating: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Resolved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Closed: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    Escalated: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Open;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

// ── File Grievance Modal ─────────────────────────────────────────

function FileGrievanceModal({
    visible, onClose, onSave, categoryOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { categoryId: string; description: string; isAnonymous: boolean }) => void;
    categoryOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [categoryId, setCategoryId] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [isAnonymous, setIsAnonymous] = React.useState(false);
    const [categoryPickerVisible, setCategoryPickerVisible] = React.useState(false);
    const [catSearch, setCatSearch] = React.useState('');

    React.useEffect(() => {
        if (visible) { setCategoryId(''); setDescription(''); setIsAnonymous(false); }
    }, [visible]);

    const filteredCategories = React.useMemo(() => {
        if (!catSearch.trim()) return categoryOptions;
        const q = catSearch.toLowerCase();
        return categoryOptions.filter(c => c.label.toLowerCase().includes(q));
    }, [categoryOptions, catSearch]);

    const isValid = categoryId && description.trim().length >= 10;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">File a Grievance</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        {/* Category Picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Category <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable onPress={() => { setCategoryPickerVisible(true); setCatSearch(''); }} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${categoryId ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {categoryOptions.find(c => c.id === categoryId)?.label ?? 'Select category...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={categoryPickerVisible} transparent animationType="slide" onRequestClose={() => setCategoryPickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCategoryPickerVisible(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Category</Text>
                                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={catSearch} onChangeText={setCatSearch} autoCapitalize="none" />
                                        </View>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {filteredCategories.map(opt => (
                                                <Pressable key={opt.id} onPress={() => { setCategoryId(opt.id); setCategoryPickerVisible(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === categoryId ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${opt.id === categoryId ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                                </Pressable>
                                            ))}
                                            {filteredCategories.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No categories found</Text>}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Description */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Description <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, { height: 120 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Describe your grievance in detail (min 10 characters)..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={5}
                                />
                            </View>
                        </View>

                        {/* Anonymous Toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Anonymous</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">File without revealing your identity</Text>
                            </View>
                            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isAnonymous ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSave({ categoryId, description: description.trim(), isAnonymous })}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Filing...' : 'File Grievance'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyGrievancesScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyGrievances();
    const { data: catResponse } = useGrievanceCategories();
    const fileGrievance = useFileGrievance();

    const [formVisible, setFormVisible] = React.useState(false);

    const grievances = (data as any)?.data ?? [];
    const categoryOptions = React.useMemo(() => {
        const raw = (catResponse as any)?.data ?? catResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((c: any) => ({ id: c.id, label: c.name }));
    }, [catResponse]);

    const handleFileGrievance = (formData: { categoryId: string; description: string; isAnonymous: boolean }) => {
        showConfirm({
            title: 'File Grievance',
            message: 'Are you sure you want to file this grievance? This action cannot be undone.',
            confirmText: 'File',
            variant: 'primary',
            onConfirm: () => {
                fileGrievance.mutate(formData, {
                    onSuccess: () => setFormVisible(false),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.catBadge, { backgroundColor: colors.accent[50] }]}>
                            <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.categoryName ?? item.category?.name ?? 'General'}</Text>
                        </View>
                        {(item.anonymous || item.isAnonymous) && (
                            <View style={[styles.catBadge, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100] }]}>
                                <Text style={{ color: colors.neutral[600], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Anonymous</Text>
                            </View>
                        )}
                    </View>
                </View>
                <StatusBadge status={item.status ?? 'Open'} />
            </View>
            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400 mt-2" numberOfLines={3}>{item.description}</Text>
            {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Filed: {item.createdAt}</Text>}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
            <AppTopHeader title="My Grievances" onMenuPress={open} />
            <FlashList
                data={grievances}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No grievances filed</Text></View> : null}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <FileGrievanceModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleFileGrievance}
                categoryOptions={categoryOptions}
                isSaving={fileGrievance.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 14 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
