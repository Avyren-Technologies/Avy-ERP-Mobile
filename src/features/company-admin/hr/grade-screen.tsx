/* eslint-disable better-tailwindcss/no-unknown-classes */
/* eslint-disable react-hooks/exhaustive-deps */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateGrade,
    useDeleteGrade,
    useUpdateGrade,
} from '@/features/company-admin/api/use-hr-mutations';
import { useGrades } from '@/features/company-admin/api/use-hr-queries';

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
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
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
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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

// ============ TOAST COMPONENT ============

function StatusToast({ message, visible, type = 'success' }: { readonly message: string; readonly visible: boolean; readonly type?: 'success' | 'error' }) {
    if (!visible) return null;
    const isError = type === 'error';
    const bgColors: [string, string] = isError 
        ? [colors.danger[500], colors.danger[600]] 
        : [colors.success[500], colors.success[600]];

    return (
        <Animated.View
            entering={FadeInUp.springify().damping(15)}
            exiting={FadeInDown}
            style={styles.toastContainer}
        >
            <LinearGradient
                colors={bgColors}
                style={styles.toastGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    {isError ? (
                        <Path d="M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </Svg>
                <Text className="ml-2 font-inter text-sm font-bold text-white">{message}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============ FORM MODAL ============

function GradeFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    readonly visible: boolean; readonly onClose: () => void;
    readonly onSave: (data: Omit<GradeItem, 'id'>) => void;
    readonly initialData?: GradeItem | null; readonly isSaving: boolean;
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
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const resetForm = React.useCallback(() => {
        setCode(''); setName(''); setCtcMin(''); setCtcMax('');
        setHraPercentage(''); setPfTier('Applicable');
        setProbationMonths(''); setNoticeDays(''); setStatus('Active');
    }, []);

    const populateForm = React.useCallback((data: GradeItem) => {
        setCode(data.code); setName(data.name);
        setCtcMin(data.ctcMin ? String(data.ctcMin) : '');
        setCtcMax(data.ctcMax ? String(data.ctcMax) : '');
        setHraPercentage(data.hraPercentage ? String(data.hraPercentage) : '');
        setPfTier(data.pfTier || 'Applicable');
        setProbationMonths(data.probationMonths ? String(data.probationMonths) : '');
        setNoticeDays(data.noticeDays ? String(data.noticeDays) : '');
        setStatus(data.status);
    }, []);

    React.useEffect(() => {
        if (visible) {
            setErrors({});
            if (initialData) {
                populateForm(initialData);
            } else {
                resetForm();
            }
        }
    }, [visible, initialData, populateForm, resetForm]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!code.trim()) newErrors.code = 'Grade Code is required';
        if (!name.trim()) newErrors.name = 'Grade Name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            code: code.trim().toUpperCase(), name: name.trim(),
            ctcMin: Number.parseFloat(ctcMin) || 0, ctcMax: Number.parseFloat(ctcMax) || 0,
            hraPercentage: Number.parseFloat(hraPercentage) || 0, pfTier,
            probationMonths: Number.parseInt(probationMonths, 10) || 0,
            noticeDays: Number.parseInt(noticeDays, 10) || 0, status,
        });
    };

    return (
        <Modal 
            visible={visible} 
            transparent={false} 
            animationType="slide" 
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: colors.white }}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white]}
                    style={StyleSheet.absoluteFill}
                />
                
                {/* Header */}
                <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950">
                            {initialData ? 'Edit Grade' : 'New Grade'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500">
                            Configure compensation band settings
                        </Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        keyboardShouldPersistTaps="handled" 
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}
                    >
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">
                                Grade Code <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                                <TextInput 
                                    style={styles.textInput} 
                                    placeholder='E.G. "G1"' 
                                    placeholderTextColor={colors.neutral[400]} 
                                    value={code} 
                                    onChangeText={(val) => {
                                        setCode(val);
                                        if (errors.code) setErrors(prev => ({ ...prev, code: '' }));
                                    }} 
                                    autoCapitalize="characters" 
                                />
                            </View>
                            {!!errors.code && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>}
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">
                                Grade Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                                <TextInput 
                                    style={styles.textInput} 
                                    placeholder='E.G. "JUNIOR BAND"' 
                                    placeholderTextColor={colors.neutral[400]} 
                                    value={name} 
                                    onChangeText={(val) => {
                                        setName(val);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                    }} 
                                    autoCapitalize="words" 
                                />
                            </View>
                            {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
                        </View>

                        <Text className="mt-2 mb-4 font-inter text-[11px] font-bold text-primary-400 uppercase tracking-widest">Compensation Range</Text>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">CTC Min</Text>
                                <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'₹'}</Text>
                                    <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={ctcMin} onChangeText={setCtcMin} keyboardType="numeric" />
                                </View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">CTC Max</Text>
                                <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'₹'}</Text>
                                    <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={ctcMax} onChangeText={setCtcMax} keyboardType="numeric" />
                                </View>
                            </View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">HRA Percentage</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={hraPercentage} onChangeText={setHraPercentage} keyboardType="numeric" />
                                <Text className="font-inter text-sm font-bold text-neutral-400 ml-1">%</Text>
                            </View>
                        </View>

                        <Text className="mt-2 mb-4 font-inter text-[11px] font-bold text-primary-400 uppercase tracking-widest">Policy Settings</Text>

                        <ChipSelector label="PF Tier" options={PF_TIERS} value={pfTier} onSelect={setPfTier} />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Probation Months</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='E.G. "6"' placeholderTextColor={colors.neutral[400]} value={probationMonths} onChangeText={setProbationMonths} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 uppercase tracking-wider">Notice Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='E.G. "30"' placeholderTextColor={colors.neutral[400]} value={noticeDays} onChangeText={setNoticeDays} keyboardType="number-pad" /></View>
                            </View>
                        </View>

                        <ChipSelector label="Status" options={['Active', 'Inactive']} value={status} onSelect={v => setStatus(v as 'Active' | 'Inactive')} />
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Sticky Footer */}
                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    <Pressable onPress={onClose} style={styles.discardBtn} hitSlop={8}>
                        <Text className="font-inter text-sm font-bold text-neutral-500">DISCARD</Text>
                    </Pressable>
                    <Pressable 
                        onPress={handleSave} 
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            isSaving && { opacity: 0.7 },
                            pressed && { transform: [{ scale: 0.98 }] }
                        ]}
                        disabled={isSaving}
                    >
                        <Text className="font-inter text-sm font-bold text-white uppercase">
                            {isSaving ? 'Processing...' : initialData ? 'Update Grade' : 'Save Grade'}
                        </Text>
                        {!isSaving && (
                            <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginLeft: 8 }}>
                                <Path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ GRADE CARD ============

function GradeCard({ item, index, onEdit, onDelete }: { readonly item: GradeItem; readonly index: number; readonly onEdit: () => void; readonly onDelete: () => void }) {
    const ctcRange = item.ctcMin || item.ctcMax
        ? `${formatCurrency(item.ctcMin)} - ${formatCurrency(item.ctcMax)}`
        : null;

    return (
        <Animated.View entering={FadeInUp.duration(400).delay(index * 50)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                        </View>
                        {ctcRange && (
                            <Text className="mt-1.5 font-inter text-[11px] font-medium text-neutral-400">CTC RANGE: {ctcRange}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <StatusBadge status={item.status} />
                        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteIconBtn}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    {item.hraPercentage > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 font-medium">HRA {item.hraPercentage}%</Text></View>
                    )}
                    <View style={[styles.metaChip, {
                        backgroundColor: item.pfTier === 'Applicable' 
                            ? colors.success[50] 
                            : item.pfTier === 'Optional' 
                                ? colors.warning[50] 
                                : colors.neutral[100],
                    }]}>
                        <Text className={`font-inter text-[10px] font-bold ${
                            item.pfTier === 'Applicable' 
                                ? 'text-success-700' 
                                : item.pfTier === 'Optional' 
                                    ? 'text-warning-700' 
                                    : 'text-neutral-500'
                        }`}>
                            PF: {item.pfTier.toUpperCase()}
                        </Text>
                    </View>
                    {item.probationMonths > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 font-medium">{item.probationMonths}MO PROBATION</Text></View>
                    )}
                    {item.noticeDays > 0 && (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 font-medium">{item.noticeDays}D NOTICE</Text></View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function GradeScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useGrades();
    const createMutation = useCreateGrade();
    const updateMutation = useUpdateGrade();
    const deleteMutation = useDeleteGrade();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<GradeItem | null>(null);
    const [search, setSearch] = React.useState('');
    
    // Toast State
    const [toastVisible, setToastVisible] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
    const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg);
        setToastType(type);
        setToastVisible(true);
        toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
    };

    const grades: GradeItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
            const hPercentage = item.hraPercent ?? item.hraPercentage ?? 0;
            return {
                id: item.id ?? '', 
                code: item.code ?? '', 
                name: item.name ?? '',
                ctcMin: item.ctcMin ?? 0, 
                ctcMax: item.ctcMax ?? 0,
                hraPercentage: hPercentage, 
                pfTier: item.pfTier ?? 'Applicable',
                probationMonths: item.probationMonths ?? 0, 
                noticeDays: item.noticeDays ?? 0,
                status: item.status ?? 'Active',
            };
        });
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
            onConfirm: () => { 
                deleteMutation.mutate(item.id, {
                    onSuccess: () => triggerToast('Grade deleted successfully'),
                    onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to delete grade', 'error')
                }); 
            },
        });
    };

    const handleSave = (data: Omit<GradeItem, 'id'>) => {
        const payload: Record<string, unknown> = {
            ...data,
            hraPercent: data.hraPercentage,
        };
        delete payload.hraPercentage;

        if (editingItem) {
            updateMutation.mutate(
                { id: editingItem.id, data: payload }, 
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Grade updated successfully');
                    },
                    onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to update grade', 'error')
                }
            );
        } else {
            createMutation.mutate(
                payload, 
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Grade created successfully');
                    },
                    onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to create grade', 'error')
                }
            );
        }
    };

    const renderItem = ({ item, index }: { readonly item: GradeItem; readonly index: number }) => (
        <GradeCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search by code or name..." />
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24, paddingHorizontal: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load grades" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No grades match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No grades yet" message="Add your first grade to define compensation bands." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />
            <AppTopHeader title="Grade Management" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            
            <FAB onPress={handleAdd} />
            
            <GradeFormModal 
                visible={formVisible} 
                onClose={() => setFormVisible(false)} 
                onSave={handleSave} 
                initialData={editingItem} 
                isSaving={createMutation.isPending || updateMutation.isPending} 
            />
            
            <StatusToast message={toastMessage} visible={toastVisible} type={toastType} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 24, padding: 20, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[50] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    deleteIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger[50], justifyContent: 'center', alignItems: 'center' },
    
    // Toast Styles
    toastContainer: { position: 'absolute', top: 100, left: 24, right: 24, zIndex: 9999 },
    toastGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    
    // Modal Styles
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    
    modalFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.white },
    discardBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    primaryBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[600], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
