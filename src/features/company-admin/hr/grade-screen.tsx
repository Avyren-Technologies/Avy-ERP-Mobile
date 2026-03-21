/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useGrades } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateGrade,
    useDeleteGrade,
    useUpdateGrade,
} from '@/features/company-admin/api/use-hr-mutations';

// ============ TYPES ============

interface GradeItem {
    id: string;
    code: string;
    name: string;
    ctcMin: number;
    ctcMax: number;
    hraPercentage: number;
    pfTier: string;
    probationMonths: number;
    noticeDays: number;
    status: 'Active' | 'Inactive';
}

const PF_TIERS = ['Applicable', 'Not Applicable', 'Optional'];

// ============ HELPERS ============

function formatCurrency(n: number): string {
    if (!n) return '-';
    if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`;
    return `\u20B9${n}`;
}

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: string }) {
    const isActive = status === 'Active';
    return (
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500'}`}>{status}</Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ FORM MODAL ============

function GradeFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<GradeItem, 'id'>) => void;
    initialData?: GradeItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [code, setCode] = React.useState('');
    const [name, setName] = React.useState('');
    const [ctcMin, setCtcMin] = React.useState('');
    const [ctcMax, setCtcMax] = React.useState('');
    const [hraPercentage, setHraPercentage] = React.useState('');
    const [pfTier, setPfTier] = React.useState('Applicable');
    const [probationMonths, setProbationMonths] = React.useState('');
    const [noticeDays, setNoticeDays] = React.useState('');
    const [status, setStatus] = React.useState<'Active' | 'Inactive'>('Active');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setCode(initialData.code); setName(initialData.name);
                setCtcMin(initialData.ctcMin ? String(initialData.ctcMin) : '');
                setCtcMax(initialData.ctcMax ? String(initialData.ctcMax) : '');
                setHraPercentage(initialData.hraPercentage ? String(initialData.hraPercentage) : '');
                setPfTier(initialData.pfTier || 'Applicable');
                setProbationMonths(initialData.probationMonths ? String(initialData.probationMonths) : '');
                setNoticeDays(initialData.noticeDays ? String(initialData.noticeDays) : '');
                setStatus(initialData.status);
            } else {
                setCode(''); setName(''); setCtcMin(''); setCtcMax('');
                setHraPercentage(''); setPfTier('Applicable');
                setProbationMonths(''); setNoticeDays(''); setStatus('Active');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!code.trim() || !name.trim()) return;
        onSave({
            code: code.trim().toUpperCase(), name: name.trim(),
            ctcMin: parseFloat(ctcMin) || 0, ctcMax: parseFloat(ctcMax) || 0,
            hraPercentage: parseFloat(hraPercentage) || 0, pfTier,
            probationMonths: parseInt(probationMonths, 10) || 0,
            noticeDays: parseInt(noticeDays, 10) || 0, status,
        });
    };

    const isValid = code.trim() && name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Grade' : 'Add Grade'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "G1"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={setCode} autoCapitalize="characters" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Junior Band"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} autoCapitalize="words" /></View>
                        </View>

                        {/* CTC Range */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">CTC Min</Text>
                                <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'\u20B9'}</Text>
                                    <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={ctcMin} onChangeText={setCtcMin} keyboardType="numeric" />
                                </View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">CTC Max</Text>
                                <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'\u20B9'}</Text>
                                    <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={ctcMax} onChangeText={setCtcMax} keyboardType="numeric" />
                                </View>
                            </View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">HRA Percentage</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="e.g. 40" placeholderTextColor={colors.neutral[400]} value={hraPercentage} onChangeText={setHraPercentage} keyboardType="numeric" />
                                <Text className="font-inter text-sm font-bold text-neutral-400 ml-1">%</Text>
                            </View>
                        </View>

                        <ChipSelector label="PF Tier" options={PF_TIERS} value={pfTier} onSelect={setPfTier} />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Probation Months</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 6" placeholderTextColor={colors.neutral[400]} value={probationMonths} onChangeText={setProbationMonths} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Notice Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 30" placeholderTextColor={colors.neutral[400]} value={noticeDays} onChangeText={setNoticeDays} keyboardType="number-pad" /></View>
                            </View>
                        </View>

                        <ChipSelector label="Status" options={['Active', 'Inactive']} value={status} onSelect={v => setStatus(v as 'Active' | 'Inactive')} />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Grade'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ GRADE CARD ============

function GradeCard({ item, index, onEdit, onDelete }: { item: GradeItem; index: number; onEdit: () => void; onDelete: () => void }) {
    const ctcRange = item.ctcMin || item.ctcMax
        ? `${formatCurrency(item.ctcMin)} - ${formatCurrency(item.ctcMax)}`
        : null;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                        </View>
                        {ctcRange && (
                            <Text className="mt-1 font-inter text-xs text-neutral-500">CTC: {ctcRange}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={item.status} />
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    {item.hraPercentage > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">HRA {item.hraPercentage}%</Text></View>
                    )}
                    <View style={[styles.metaChip, {
                        backgroundColor: item.pfTier === 'Applicable' ? colors.success[50] : item.pfTier === 'Optional' ? colors.warning[50] : colors.neutral[100],
                    }]}>
                        <Text className={`font-inter text-[10px] font-bold ${item.pfTier === 'Applicable' ? 'text-success-700' : item.pfTier === 'Optional' ? 'text-warning-700' : 'text-neutral-500'}`}>
                            PF: {item.pfTier}
                        </Text>
                    </View>
                    {item.probationMonths > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{item.probationMonths}mo probation</Text></View>
                    )}
                    {item.noticeDays > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">{item.noticeDays}d notice</Text></View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function GradeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useGrades();
    const createMutation = useCreateGrade();
    const updateMutation = useUpdateGrade();
    const deleteMutation = useDeleteGrade();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<GradeItem | null>(null);
    const [search, setSearch] = React.useState('');

    const grades: GradeItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', code: item.code ?? '', name: item.name ?? '',
            ctcMin: item.ctcMin ?? 0, ctcMax: item.ctcMax ?? 0,
            hraPercentage: item.hraPercent ?? item.hraPercentage ?? 0, pfTier: item.pfTier ?? 'Applicable',
            probationMonths: item.probationMonths ?? 0, noticeDays: item.noticeDays ?? 0,
            status: item.status ?? 'Active',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return grades;
        const q = search.toLowerCase();
        return grades.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
    }, [grades, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: GradeItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: GradeItem) => {
        showConfirm({
            title: 'Delete Grade', message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<GradeItem, 'id'>) => {
        const payload: Record<string, unknown> = {
            ...data,
            // Backend contract uses `hraPercent` in org-structure validators/service.
            hraPercent: data.hraPercentage,
        };
        delete payload['hraPercentage'];

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: payload }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(payload, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: GradeItem; index: number }) => (
        <GradeCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Grades & Bands</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{grades.length} grade{grades.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by code or name..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load grades" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No grades match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No grades yet" message="Add your first grade to define compensation bands." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Grade Management</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <GradeFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
