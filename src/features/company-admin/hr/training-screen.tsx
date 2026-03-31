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
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useTrainingCatalogue, useTrainingNominations } from '@/features/company-admin/api/use-recruitment-queries';
import {
    useCreateTrainingCatalogue,
    useUpdateTrainingCatalogue,
    useDeleteTrainingCatalogue,
    useCreateTrainingNomination,
    useUpdateTrainingNomination,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type TrainingType = 'Technical' | 'Compliance' | 'Soft Skills' | 'Leadership' | 'Safety' | 'Product' | 'Other';
type TrainingMode = 'Online' | 'Classroom' | 'Blended' | 'Self-paced';
type NominationStatus = 'Nominated' | 'Enrolled' | 'Completed' | 'Cancelled';
type Tab = 'catalogue' | 'nominations';

interface CatalogueItem {
    id: string;
    name: string;
    type: TrainingType;
    mode: TrainingMode;
    durationHours: number;
    mandatory: boolean;
    certificationName: string;
    cost: number;
    description: string;
}

interface NominationItem {
    id: string;
    employeeId: string;
    employeeName: string;
    trainingId: string;
    trainingName: string;
    status: NominationStatus;
    completionDate: string;
    score: number;
    certificate: boolean;
    nominatedAt: string;
}

// ============ CONSTANTS ============

const TRAINING_TYPES: TrainingType[] = ['Technical', 'Compliance', 'Soft Skills', 'Leadership', 'Safety', 'Product', 'Other'];
const TRAINING_MODES: TrainingMode[] = ['Online', 'Classroom', 'Blended', 'Self-paced'];

const TYPE_COLORS: Record<TrainingType, { bg: string; text: string }> = {
    Technical: { bg: colors.primary[50], text: colors.primary[700] },
    Compliance: { bg: colors.danger[50], text: colors.danger[700] },
    'Soft Skills': { bg: colors.accent[50], text: colors.accent[700] },
    Leadership: { bg: colors.warning[50], text: colors.warning[700] },
    Safety: { bg: colors.success[50], text: colors.success[700] },
    Product: { bg: colors.info[50], text: colors.info[700] },
    Other: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const MODE_COLORS: Record<TrainingMode, { bg: string; text: string }> = {
    Online: { bg: colors.info[50], text: colors.info[700] },
    Classroom: { bg: colors.warning[50], text: colors.warning[700] },
    Blended: { bg: colors.accent[50], text: colors.accent[700] },
    'Self-paced': { bg: colors.success[50], text: colors.success[700] },
};

const NOM_STATUS_COLORS: Record<NominationStatus, { bg: string; text: string; dot: string }> = {
    Nominated: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Enrolled: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Completed: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

// ============ SHARED ATOMS ============

function TypeBadge({ label, colorMap }: { label: string; colorMap: Record<string, { bg: string; text: string }> }) {
    const c = colorMap[label] ?? { bg: colors.neutral[100], text: colors.neutral[600] };
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{label}</Text>
        </View>
    );
}

function StatusBadge({ status }: { status: NominationStatus }) {
    const s = NOM_STATUS_COLORS[status] ?? NOM_STATUS_COLORS.Nominated;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
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

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredOptions.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            {filteredOptions.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CATALOGUE FORM MODAL ============

function CatalogueFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: CatalogueItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [type, setType] = React.useState<TrainingType>('Technical');
    const [mode, setMode] = React.useState<TrainingMode>('Online');
    const [durationHours, setDurationHours] = React.useState('');
    const [mandatory, setMandatory] = React.useState(false);
    const [certificationName, setCertificationName] = React.useState('');
    const [cost, setCost] = React.useState('');
    const [description, setDescription] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setType(initialData.type); setMode(initialData.mode);
                setDurationHours(String(initialData.durationHours || '')); setMandatory(initialData.mandatory);
                setCertificationName(initialData.certificationName); setCost(String(initialData.cost || ''));
                setDescription(initialData.description);
            } else {
                setName(''); setType('Technical'); setMode('Online'); setDurationHours('');
                setMandatory(false); setCertificationName(''); setCost(''); setDescription('');
            }
        }
    }, [visible, initialData]);

    const isValid = name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Training' : 'New Training'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Training name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Type" options={[...TRAINING_TYPES]} value={type} onSelect={v => setType(v as TrainingType)} />
                        <ChipSelector label="Mode" options={[...TRAINING_MODES]} value={mode} onSelect={v => setMode(v as TrainingMode)} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Duration (hrs)</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={durationHours} onChangeText={setDurationHours} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Cost</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={cost} onChangeText={setCost} keyboardType="number-pad" /></View>
                            </View>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">Mandatory</Text>
                            <Switch value={mandatory} onValueChange={setMandatory} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={mandatory ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Certification Name</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. AWS Solutions Architect" placeholderTextColor={colors.neutral[400]} value={certificationName} onChangeText={setCertificationName} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Training description..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name: name.trim(), type, mode, durationHours: Number(durationHours) || 0, mandatory, certificationName: certificationName.trim(), cost: Number(cost) || 0, description: description.trim() })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ NOMINATION FORM MODAL ============

function NominationFormModal({
    visible, onClose, onSave, employeeOptions, trainingOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    employeeOptions: { id: string; label: string }[];
    trainingOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [trainingId, setTrainingId] = React.useState('');

    React.useEffect(() => {
        if (visible) { setEmployeeId(''); setTrainingId(''); }
    }, [visible]);

    const isValid = employeeId && trainingId;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Nominate for Training</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <Dropdown label="Training" value={trainingId} options={trainingOptions} onSelect={setTrainingId} placeholder="Select training..." required />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ employeeId, employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '', trainingId, trainingName: trainingOptions.find(t => t.id === trainingId)?.label ?? '', status: 'Nominated' })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Nominating...' : 'Nominate'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD COMPONENTS ============

function CatalogueCard({ item, index, onEdit, onDelete }: {
    item: CatalogueItem; index: number; onEdit: () => void; onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                        {item.certificationName ? <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.certificationName}</Text> : null}
                    </View>
                    {item.mandatory && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.danger[50] }]}>
                            <Text style={{ color: colors.danger[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Mandatory</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <TypeBadge label={item.type} colorMap={TYPE_COLORS} />
                    <TypeBadge label={item.mode} colorMap={MODE_COLORS} />
                    {item.durationHours > 0 && (
                        <Text className="font-inter text-xs text-neutral-500">{item.durationHours}h</Text>
                    )}
                    {item.cost > 0 && (
                        <Text className="font-inter text-xs text-neutral-400">{'\u20B9'}{item.cost.toLocaleString('en-IN')}</Text>
                    )}
                </View>
                <View style={styles.cardFooter}>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function NominationCard({ item, index, onComplete, onCancel }: {
    item: NominationItem; index: number; onComplete: () => void; onCancel: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>{item.trainingName}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.completionDate ? <Text className="font-inter text-xs text-neutral-500">Completed: {item.completionDate}</Text> : null}
                    {item.score > 0 && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.success[50] }]}>
                            <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Score: {item.score}%</Text>
                        </View>
                    )}
                    {item.certificate && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.primary[50] }]}>
                            <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Certified</Text>
                        </View>
                    )}
                </View>
                {(item.status === 'Nominated' || item.status === 'Enrolled') && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onComplete} style={styles.approveBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Complete</Text>
                        </Pressable>
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}>
                            <Text className="font-inter text-xs font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function TrainingScreen({ initialTab = 'catalogue' as Tab }: { initialTab?: Tab } = {}) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<Tab>(initialTab);
    const [search, setSearch] = React.useState('');

    // Queries
    const { data: catResponse, isLoading: catLoading, error: catError, refetch: catRefetch, isFetching: catFetching } = useTrainingCatalogue();
    const { data: nomResponse, isLoading: nomLoading, error: nomError, refetch: nomRefetch, isFetching: nomFetching } = useTrainingNominations();
    const { data: empResponse } = useEmployees();

    // Mutations
    const createCat = useCreateTrainingCatalogue();
    const updateCat = useUpdateTrainingCatalogue();
    const deleteCat = useDeleteTrainingCatalogue();
    const createNom = useCreateTrainingNomination();
    const updateNom = useUpdateTrainingNomination();

    // Modals
    const [catFormVisible, setCatFormVisible] = React.useState(false);
    const [editingCat, setEditingCat] = React.useState<CatalogueItem | null>(null);
    const [nomFormVisible, setNomFormVisible] = React.useState(false);

    // Parse data
    const catalogue: CatalogueItem[] = React.useMemo(() => {
        const raw = (catResponse as any)?.data ?? catResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', type: item.type ?? 'Other',
            mode: item.mode ?? 'Online', durationHours: item.durationHours ?? 0,
            mandatory: item.mandatory ?? false, certificationName: item.certificationName ?? '',
            cost: item.cost ?? 0, description: item.description ?? '',
        }));
    }, [catResponse]);

    const nominations: NominationItem[] = React.useMemo(() => {
        const raw = (nomResponse as any)?.data ?? nomResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            trainingId: item.trainingId ?? '', trainingName: item.trainingName ?? '',
            status: item.status ?? 'Nominated', completionDate: item.completionDate ?? '',
            score: item.score ?? 0, certificate: item.certificate ?? false, nominatedAt: item.nominatedAt ?? '',
        }));
    }, [nomResponse]);

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const trainingOptions = React.useMemo(() => catalogue.map(c => ({ id: c.id, label: c.name })), [catalogue]);

    const filteredCatalogue = React.useMemo(() => {
        if (!search.trim()) return catalogue;
        const q = search.toLowerCase();
        return catalogue.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
    }, [catalogue, search]);

    const filteredNominations = React.useMemo(() => {
        if (!search.trim()) return nominations;
        const q = search.toLowerCase();
        return nominations.filter(n => n.employeeName.toLowerCase().includes(q) || n.trainingName.toLowerCase().includes(q));
    }, [nominations, search]);

    // Handlers
    const handleEditCatalogue = (item: CatalogueItem) => { setEditingCat(item); setCatFormVisible(true); };

    const handleDeleteCatalogue = (item: CatalogueItem) => {
        showConfirm({
            title: 'Delete Training',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteCat.mutate(item.id),
        });
    };

    const handleSaveCatalogue = (data: Record<string, unknown>) => {
        if (editingCat) {
            updateCat.mutate({ id: editingCat.id, data }, { onSuccess: () => setCatFormVisible(false) });
        } else {
            createCat.mutate(data, { onSuccess: () => setCatFormVisible(false) });
        }
    };

    const handleCompleteNomination = (item: NominationItem) => {
        showConfirm({
            title: 'Mark Complete',
            message: `Mark ${item.employeeName}'s "${item.trainingName}" training as completed?`,
            confirmText: 'Complete', variant: 'primary',
            onConfirm: () => updateNom.mutate({ id: item.id, data: { status: 'Completed', completionDate: new Date().toISOString().split('T')[0] } }),
        });
    };

    const handleCancelNomination = (item: NominationItem) => {
        showConfirm({
            title: 'Cancel Nomination',
            message: `Cancel ${item.employeeName}'s nomination for "${item.trainingName}"?`,
            confirmText: 'Cancel Nomination', variant: 'warning',
            onConfirm: () => updateNom.mutate({ id: item.id, data: { status: 'Cancelled' } }),
        });
    };

    const handleSaveNomination = (data: Record<string, unknown>) => {
        createNom.mutate(data, { onSuccess: () => setNomFormVisible(false) });
    };

    const isLoading = activeTab === 'catalogue' ? catLoading : nomLoading;
    const isFetching = activeTab === 'catalogue' ? catFetching : nomFetching;
    const activeRefetch = activeTab === 'catalogue' ? catRefetch : nomRefetch;
    const error = activeTab === 'catalogue' ? catError : nomError;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'catalogue', label: 'Catalogue' },
        { key: 'nominations', label: 'Nominations' },
    ];

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Training</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">
                {activeTab === 'catalogue' ? `${catalogue.length} training${catalogue.length !== 1 ? 's' : ''}` : `${nominations.length} nomination${nominations.length !== 1 ? 's' : ''}`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
                {tabs.map(tab => {
                    const active = tab.key === activeTab;
                    return (
                        <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${activeTab}...`} /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => activeRefetch() }} /></View>;
        if (activeTab === 'catalogue') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No training courses" message="Create your first training programme." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No nominations" message="Nominate employees for training." /></View>;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'catalogue') {
            return <CatalogueCard item={item} index={index} onEdit={() => handleEditCatalogue(item)} onDelete={() => handleDeleteCatalogue(item)} />;
        }
        return <NominationCard item={item} index={index} onComplete={() => handleCompleteNomination(item)} onCancel={() => handleCancelNomination(item)} />;
    };

    const activeData = activeTab === 'catalogue' ? filteredCatalogue : filteredNominations;

    const handleFAB = () => {
        if (activeTab === 'catalogue') { setEditingCat(null); setCatFormVisible(true); }
        else { setNomFormVisible(true); }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Training</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={activeData} renderItem={renderItem} keyExtractor={(item: any) => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => activeRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <CatalogueFormModal visible={catFormVisible} onClose={() => setCatFormVisible(false)} onSave={handleSaveCatalogue} initialData={editingCat} isSaving={createCat.isPending || updateCat.isPending} />
            <NominationFormModal visible={nomFormVisible} onClose={() => setNomFormVisible(false)} onSave={handleSaveNomination} employeeOptions={employeeOptions} trainingOptions={trainingOptions} isSaving={createNom.isPending} />
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.success[600] },
    cancelActionBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
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
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 14 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
