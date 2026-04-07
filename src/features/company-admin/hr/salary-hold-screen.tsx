/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCreateSalaryHold, useReleaseSalaryHold } from '@/features/company-admin/api/use-payroll-run-mutations';
import { usePayrollRuns, useSalaryHolds  } from '@/features/company-admin/api/use-payroll-run-queries';

// ============ TYPES ============

type HoldType = 'Full' | 'Partial';

interface SalaryHoldItem {
    id: string;
    employeeId: string;
    employeeName: string;
    payrollRunId: string;
    runMonth: number;
    runYear: number;
    holdType: HoldType;
    reason: string;
    heldComponents: string[];
    released: boolean;
    createdAt: string;
}

// ============ CONSTANTS ============

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SALARY_COMPONENTS = ['Basic', 'HRA', 'Special Allowance', 'Conveyance', 'Medical', 'Bonus', 'Incentive', 'Overtime'];

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ============ ATOMS ============

function HoldTypeBadge({ type }: { type: HoldType }) {
    const scheme = type === 'Full'
        ? { bg: colors.danger[50], text: colors.danger[700] }
        : { bg: colors.warning[50], text: colors.warning[700] };
    return (
        <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
        </View>
    );
}

function ReleasedBadge() {
    return (
        <View style={[styles.statusBadge, { backgroundColor: colors.success[50] }]}>
            <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Released</Text>
        </View>
    );
}

function AvatarCircle({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatar}>
            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

function Dropdown({ label, value, options, onSelect, placeholder, searchable }: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; searchable?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const filtered = searchable && q.trim()
        ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
        : options;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); setQ(''); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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

function MultiChipSelector({ label, options, value, onToggle }: { label: string; options: string[]; value: string[]; onToggle: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = value.includes(opt);
                    return (
                        <Pressable key={opt} onPress={() => onToggle(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ CREATE HOLD MODAL ============

function CreateHoldModal({ visible, onClose, onSave, isSaving, employeeOptions, runOptions }: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    runOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [payrollRunId, setPayrollRunId] = React.useState('');
    const [employeeId, setEmployeeId] = React.useState('');
    const [holdType, setHoldType] = React.useState<string>('Full');
    const [reason, setReason] = React.useState('');
    const [heldComponents, setHeldComponents] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (visible) { setPayrollRunId(''); setEmployeeId(''); setHoldType('Full'); setReason(''); setHeldComponents([]); }
    }, [visible]);

    const toggleComponent = (comp: string) => {
        setHeldComponents(prev => prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]);
    };

    const isValid = payrollRunId && employeeId && reason.trim() && (holdType === 'Full' || heldComponents.length > 0);

    const handleSave = () => {
        if (!isValid) return;
        onSave({ payrollRunId, employeeId, holdType, reason: reason.trim(), heldComponents: holdType === 'Partial' ? heldComponents : [] });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New Salary Hold</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Payroll Run" value={payrollRunId} options={runOptions} onSelect={setPayrollRunId} placeholder="Select run..." />
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." searchable />
                        <ChipSelector label="Hold Type" options={['Full', 'Partial']} value={holdType} onSelect={setHoldType} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for hold..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            </View>
                        </View>
                        {holdType === 'Partial' && (
                            <MultiChipSelector label="Held Components" options={SALARY_COMPONENTS} value={heldComponents} onToggle={toggleComponent} />
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Hold'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ HOLD CARD ============

function HoldCard({ item, index, onRelease }: { item: SalaryHoldItem; index: number; onRelease: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="font-inter text-[10px] text-neutral-500">{MONTH_LABELS[item.runMonth - 1]} {item.runYear}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <HoldTypeBadge type={item.holdType} />
                        {item.released && <ReleasedBadge />}
                    </View>
                </View>
                <Text className="mt-2 font-inter text-xs text-neutral-500">{item.reason}</Text>
                {item.holdType === 'Partial' && item.heldComponents.length > 0 && (
                    <View style={styles.componentRow}>
                        {item.heldComponents.map(comp => (
                            <View key={comp} style={styles.componentChip}>
                                <Text className="font-inter text-[10px] font-semibold text-warning-700">{comp}</Text>
                            </View>
                        ))}
                    </View>
                )}
                {!item.released && (
                    <Pressable onPress={onRelease} style={styles.releaseBtn}>
                        <Text className="font-inter text-xs font-bold text-success-700">Release Hold</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function SalaryHoldScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useSalaryHolds();
    const { data: runResponse } = usePayrollRuns();
    const { data: empResponse } = useEmployees();
    const createMutation = useCreateSalaryHold();
    const releaseMutation = useReleaseSalaryHold();

    const [formVisible, setFormVisible] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const runOptions = React.useMemo(() => {
        const raw = (runResponse as any)?.data ?? runResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${MONTH_LABELS[(item.month ?? 1) - 1]} ${item.year ?? ''}` }));
    }, [runResponse]);

    const items: SalaryHoldItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            payrollRunId: item.payrollRunId ?? '',
            runMonth: item.runMonth ?? item.month ?? 1,
            runYear: item.runYear ?? item.year ?? new Date().getFullYear(),
            holdType: item.holdType ?? 'Full',
            reason: item.reason ?? '',
            heldComponents: Array.isArray(item.heldComponents) ? item.heldComponents : [],
            released: item.released ?? false,
            createdAt: item.createdAt ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i => i.employeeName.toLowerCase().includes(q));
    }, [items, search]);

    const handleRelease = (item: SalaryHoldItem) => {
        showConfirm({
            title: 'Release Hold',
            message: `Release salary hold for ${item.employeeName}?`,
            confirmText: 'Release', variant: 'primary',
            onConfirm: () => { releaseMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: SalaryHoldItem; index: number }) => (
        <HoldCard item={item} index={index} onRelease={() => handleRelease(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Salary Holds</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} hold{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load holds" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No holds match your search." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No salary holds" message="Create a hold to freeze salary disbursement." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Salary Holds" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateHoldModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                isSaving={createMutation.isPending} employeeOptions={employeeOptions} runOptions={runOptions}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    componentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    componentChip: { backgroundColor: colors.warning[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    releaseBtn: {
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100],
        alignItems: 'center', paddingVertical: 8, backgroundColor: colors.success[50], borderRadius: 10,
    },
    // Form
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
