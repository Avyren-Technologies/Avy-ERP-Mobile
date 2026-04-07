/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

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
import {
    useAddProgramCourse,
    useBulkMarkAttendance,
    useCreateTrainer,
    useCreateTrainingCatalogue,
    useCreateTrainingNomination,
    useCreateTrainingProgram,
    useCreateTrainingSession,
    useDeleteTrainer,
    useDeleteTrainingCatalogue,
    useDeleteTrainingProgram,
    useDeleteTrainingSession,
    useEnrollInProgram,
    useRegisterSessionAttendees,
    useRemoveProgramCourse,
    useUpdateTrainer,
    useUpdateTrainingCatalogue,
    useUpdateTrainingNomination,
    useUpdateTrainingProgram,
    useUpdateTrainingSession,
    useUpdateTrainingSessionStatus,
} from '@/features/company-admin/api/use-recruitment-mutations';
import {
    useBudgetUtilization,
    useProgramEnrollments,
    useSessionAttendance,
    useTrainers,
    useTrainingCatalogue,
    useTrainingNominations,
    useTrainingPrograms,
    useTrainingSessions,
} from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type TrainingType = 'Technical' | 'Compliance' | 'Soft Skills' | 'Leadership' | 'Safety' | 'Product' | 'Other';
type TrainingMode = 'Online' | 'Classroom' | 'Blended' | 'Self-paced';
type NominationStatus = 'Nominated' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled';
type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type AttendanceStatus = 'REGISTERED' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type TrainerType = 'INTERNAL' | 'EXTERNAL';
type Tab = 'catalogue' | 'nominations' | 'sessions' | 'trainers' | 'programs';

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

interface SessionItem {
    id: string;
    batchName: string;
    trainingId: string;
    trainingName: string;
    startDateTime: string;
    endDateTime: string;
    venue: string;
    meetingLink: string;
    maxParticipants: number;
    trainerId: string;
    trainerName: string;
    status: SessionStatus;
    attendeeCount: number;
}

interface TrainerItem {
    id: string;
    name: string;
    email: string;
    phone: string;
    type: TrainerType;
    employeeId: string;
    employeeName: string;
    specializations: string[];
    qualifications: string;
    experienceYears: number;
    rating: number;
    sessionCount: number;
}

interface AttendeeItem {
    id: string;
    employeeId: string;
    employeeName: string;
    status: AttendanceStatus;
}

type ProgramCategory = 'CERTIFICATION' | 'SKILL_DEVELOPMENT' | 'COMPLIANCE' | 'ONBOARDING';
type ProgramLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ABANDONED';

interface ProgramItem {
    id: string;
    name: string;
    description: string;
    category: ProgramCategory;
    level: ProgramLevel;
    totalDuration: number;
    isCompulsory: boolean;
    isActive: boolean;
    courseCount: number;
    enrollmentCount: number;
    courses: { id: string; trainingId: string; trainingName: string; sequence: number; isPrerequisite: boolean }[];
    enrollments: { id: string; employeeId: string; employeeName: string; status: EnrollmentStatus; progress: number }[];
}

// ============ CONSTANTS ============

const SESSION_STATUS_COLORS: Record<SessionStatus, { bg: string; text: string; dot: string }> = {
    SCHEDULED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    IN_PROGRESS: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    COMPLETED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string }> = {
    REGISTERED: { bg: colors.info[50], text: colors.info[700] },
    PRESENT: { bg: colors.success[50], text: colors.success[700] },
    ABSENT: { bg: colors.danger[50], text: colors.danger[700] },
    LATE: { bg: colors.warning[50], text: colors.warning[700] },
    EXCUSED: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const TRAINER_TYPE_COLORS: Record<TrainerType, { bg: string; text: string }> = {
    INTERNAL: { bg: colors.primary[50], text: colors.primary[700] },
    EXTERNAL: { bg: colors.accent[50], text: colors.accent[700] },
};

const PROGRAM_CATEGORY_COLORS: Record<ProgramCategory, { bg: string; text: string }> = {
    CERTIFICATION: { bg: colors.accent[50], text: colors.accent[700] },
    SKILL_DEVELOPMENT: { bg: colors.primary[50], text: colors.primary[700] },
    COMPLIANCE: { bg: colors.danger[50], text: colors.danger[700] },
    ONBOARDING: { bg: colors.success[50], text: colors.success[700] },
};

const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, { bg: string; text: string }> = {
    ENROLLED: { bg: colors.info[50], text: colors.info[700] },
    IN_PROGRESS: { bg: colors.warning[50], text: colors.warning[700] },
    COMPLETED: { bg: colors.success[50], text: colors.success[700] },
    FAILED: { bg: colors.danger[50], text: colors.danger[700] },
    ABANDONED: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const PROGRAM_CATEGORIES: ProgramCategory[] = ['CERTIFICATION', 'SKILL_DEVELOPMENT', 'COMPLIANCE', 'ONBOARDING'];
const PROGRAM_LEVELS: ProgramLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

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
    Approved: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    'In Progress': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
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
                        <Text className="font-inter text-xs text-neutral-400">{'₹'}{item.cost.toLocaleString('en-IN')}</Text>
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
                {(item.status === 'Nominated' || item.status === 'Approved' || item.status === 'In Progress') && (
                    <View style={styles.actionRow}>
                        {item.status === 'In Progress' && (
                            <Pressable onPress={onComplete} style={styles.approveBtn}>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                <Text className="font-inter text-xs font-bold text-white">Complete</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={onCancel} style={styles.cancelActionBtn}>
                            <Text className="font-inter text-xs font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ SESSION CARD ============

function SessionStatusBadge({ status }: { status: SessionStatus }) {
    const s = SESSION_STATUS_COLORS[status] ?? SESSION_STATUS_COLORS.SCHEDULED;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status.replace('_', ' ')}</Text>
        </View>
    );
}

function SessionCard({ item, index, onStart, onComplete, onDelete, onAttendance }: {
    item: SessionItem; index: number; onStart: () => void; onComplete: () => void; onDelete: () => void; onAttendance: () => void;
}) {
    const isTerminal = item.status === 'COMPLETED' || item.status === 'CANCELLED';
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.batchName}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>{item.trainingName}</Text>
                    </View>
                    <SessionStatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.startDateTime && <Text className="font-inter text-xs text-neutral-500">From: {item.startDateTime.split('T')[0]}</Text>}
                    {item.endDateTime && <Text className="font-inter text-xs text-neutral-500">To: {item.endDateTime.split('T')[0]}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {item.venue ? <Text className="font-inter text-xs text-neutral-400">{item.venue}</Text> : null}
                    {item.trainerName ? <Text className="font-inter text-xs text-accent-600">Trainer: {item.trainerName}</Text> : null}
                    {item.maxParticipants > 0 && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.primary[50] }]}>
                            <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.attendeeCount}/{item.maxParticipants}</Text>
                        </View>
                    )}
                </View>
                {!isTerminal && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onAttendance} style={[styles.cancelActionBtn, { backgroundColor: colors.info[50] }]}>
                            <Text className="font-inter text-xs font-semibold text-info-700">Attendance</Text>
                        </Pressable>
                        {item.status === 'SCHEDULED' && (
                            <>
                                <Pressable onPress={onStart} style={styles.approveBtn}>
                                    <Text className="font-inter text-xs font-bold text-white">Start</Text>
                                </Pressable>
                                <Pressable onPress={onDelete} hitSlop={8} style={styles.cancelActionBtn}>
                                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                </Pressable>
                            </>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                            <Pressable onPress={onComplete} style={[styles.approveBtn, { backgroundColor: colors.success[600] }]}>
                                <Text className="font-inter text-xs font-bold text-white">Complete</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ TRAINER CARD ============

function StarRating({ rating }: { rating: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(star => (
                <Svg key={star} width={12} height={12} viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={star <= rating ? colors.warning[400] : colors.neutral[200]}
                        stroke={star <= rating ? colors.warning[500] : colors.neutral[300]}
                        strokeWidth="1" />
                </Svg>
            ))}
        </View>
    );
}

function TrainerCard({ item, index, onEdit, onDelete }: {
    item: TrainerItem; index: number; onEdit: () => void; onDelete: () => void;
}) {
    const displayName = item.type === 'INTERNAL' && item.employeeName ? item.employeeName : item.name;
    const tc = TRAINER_TYPE_COLORS[item.type] ?? TRAINER_TYPE_COLORS.EXTERNAL;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={displayName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{displayName}</Text>
                            {item.email ? <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>{item.email}</Text> : null}
                        </View>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                        <Text style={{ color: tc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.type}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.specializations.length > 0 && item.specializations.map((s, i) => (
                        <View key={i} style={[styles.typeBadge, { backgroundColor: colors.accent[50] }]}>
                            <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{s}</Text>
                        </View>
                    ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <StarRating rating={Math.round(item.rating)} />
                    {item.sessionCount > 0 && <Text className="font-inter text-xs text-neutral-500">{item.sessionCount} sessions</Text>}
                    {item.experienceYears > 0 && <Text className="font-inter text-xs text-neutral-400">{item.experienceYears}yr exp</Text>}
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

// ============ SESSION FORM MODAL ============

function SessionFormModal({
    visible, onClose, onSave, trainingOptions, trainerOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    trainingOptions: { id: string; label: string }[];
    trainerOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [trainingId, setTrainingId] = React.useState('');
    const [batchName, setBatchName] = React.useState('');
    const [startDateTime, setStartDateTime] = React.useState('');
    const [endDateTime, setEndDateTime] = React.useState('');
    const [venue, setVenue] = React.useState('');
    const [meetingLink, setMeetingLink] = React.useState('');
    const [maxParticipants, setMaxParticipants] = React.useState('');
    const [trainerId, setTrainerId] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setTrainingId(''); setBatchName(''); setStartDateTime(''); setEndDateTime('');
            setVenue(''); setMeetingLink(''); setMaxParticipants(''); setTrainerId('');
        }
    }, [visible]);

    const isValid = trainingId && batchName.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New Session</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <Dropdown label="Training" value={trainingId} options={trainingOptions} onSelect={setTrainingId} placeholder="Select training..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Batch Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Batch A - Jan 2026" placeholderTextColor={colors.neutral[400]} value={batchName} onChangeText={setBatchName} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Start Date</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={startDateTime} onChangeText={setStartDateTime} /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">End Date</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={endDateTime} onChangeText={setEndDateTime} /></View>
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Venue</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Location or room" placeholderTextColor={colors.neutral[400]} value={venue} onChangeText={setVenue} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Meeting Link</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="https://..." placeholderTextColor={colors.neutral[400]} value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Max Participants</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" /></View>
                        </View>
                        <Dropdown label="Trainer" value={trainerId} options={trainerOptions} onSelect={setTrainerId} placeholder="Select trainer..." />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({
                            trainingId, batchName: batchName.trim(),
                            startDateTime: startDateTime.trim() || undefined, endDateTime: endDateTime.trim() || undefined,
                            venue: venue.trim() || undefined, meetingLink: meetingLink.trim() || undefined,
                            maxParticipants: Number(maxParticipants) || undefined, trainerId: trainerId || undefined,
                        })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ TRAINER FORM MODAL ============

function TrainerFormModal({
    visible, onClose, onSave, employeeOptions, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    employeeOptions: { id: string; label: string }[];
    initialData?: TrainerItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [isInternal, setIsInternal] = React.useState(false);
    const [employeeId, setEmployeeId] = React.useState('');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [specializations, setSpecializations] = React.useState('');
    const [qualifications, setQualifications] = React.useState('');
    const [experienceYears, setExperienceYears] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setIsInternal(initialData.type === 'INTERNAL');
                setEmployeeId(initialData.employeeId ?? '');
                setName(initialData.name ?? '');
                setEmail(initialData.email ?? '');
                setPhone(initialData.phone ?? '');
                setSpecializations((initialData.specializations ?? []).join(', '));
                setQualifications(initialData.qualifications ?? '');
                setExperienceYears(String(initialData.experienceYears || ''));
            } else {
                setIsInternal(false); setEmployeeId(''); setName(''); setEmail('');
                setPhone(''); setSpecializations(''); setQualifications(''); setExperienceYears('');
            }
        }
    }, [visible, initialData]);

    const isValid = isInternal ? !!employeeId : name.trim().length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Trainer' : 'New Trainer'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">Internal Employee</Text>
                            <Switch value={isInternal} onValueChange={setIsInternal} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isInternal ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        {isInternal ? (
                            <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        ) : (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Trainer name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                                </View>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Email</Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="trainer@example.com" placeholderTextColor={colors.neutral[400]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /></View>
                                </View>
                            </>
                        )}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Phone</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Phone number" placeholderTextColor={colors.neutral[400]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Specializations</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. React, Node.js, AWS (comma-separated)" placeholderTextColor={colors.neutral[400]} value={specializations} onChangeText={setSpecializations} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Qualifications</Text>
                            <View style={[styles.inputWrap, { height: 60 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Degrees, certifications..." placeholderTextColor={colors.neutral[400]} value={qualifications} onChangeText={setQualifications} multiline />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Experience (years)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={experienceYears} onChangeText={setExperienceYears} keyboardType="number-pad" /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({
                            type: isInternal ? 'INTERNAL' : 'EXTERNAL',
                            employeeId: isInternal ? employeeId : undefined,
                            name: isInternal ? undefined : name.trim(),
                            email: isInternal ? undefined : email.trim() || undefined,
                            phone: phone.trim() || undefined,
                            specializations: specializations.split(',').map(s => s.trim()).filter(Boolean),
                            qualifications: qualifications.trim() || undefined,
                            experienceYears: Number(experienceYears) || undefined,
                        })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ATTENDANCE MODAL ============

function AttendanceModal({
    visible, onClose, sessionId, employeeOptions, onRegister, onBulkMark, isRegistering, isMarking,
}: {
    visible: boolean; onClose: () => void; sessionId: string;
    employeeOptions: { id: string; label: string }[];
    onRegister: (nominationIds: string[]) => void;
    onBulkMark: (records: { id: string; status: AttendanceStatus }[]) => void;
    isRegistering: boolean; isMarking: boolean;
}) {
    const insets = useSafeAreaInsets();
    const { data: attendanceResp, isLoading: attLoading } = useSessionAttendance(sessionId);
    const attendees: AttendeeItem[] = React.useMemo(() => {
        const raw = (attendanceResp as any)?.data ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((a: any) => ({ id: a.id, employeeId: a.employeeId, employeeName: a.employeeName ?? a.employee?.firstName ?? '', status: a.status ?? 'REGISTERED' }));
    }, [attendanceResp]);

    const [selectedEmpIds, setSelectedEmpIds] = React.useState<string[]>([]);
    const [markStatuses, setMarkStatuses] = React.useState<Record<string, AttendanceStatus>>({});

    React.useEffect(() => {
        if (visible) { setSelectedEmpIds([]); setMarkStatuses({}); }
    }, [visible]);

    const toggleEmp = (id: string) => setSelectedEmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const setAttStatus = (id: string, status: AttendanceStatus) => setMarkStatuses(prev => ({ ...prev, [id]: status }));

    const changedRecords = Object.entries(markStatuses)
        .filter(([id, status]) => attendees.find(a => a.id === id)?.status !== status)
        .map(([id, status]) => ({ id, status }));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Session Attendance</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {attLoading ? (
                            <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>
                        ) : (
                            <>
                                {attendees.length > 0 && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-900 mb-2">Registered ({attendees.length})</Text>
                                        {attendees.map(att => {
                                            const currentStatus = markStatuses[att.id] ?? att.status;
                                            const sc = ATTENDANCE_STATUS_COLORS[currentStatus] ?? ATTENDANCE_STATUS_COLORS.REGISTERED;
                                            return (
                                                <View key={att.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                                    <Text className="font-inter text-sm text-primary-950" style={{ flex: 1 }}>{att.employeeName}</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                                                        {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatus[]).map(st => {
                                                            const stc = ATTENDANCE_STATUS_COLORS[st];
                                                            const active = currentStatus === st;
                                                            return (
                                                                <Pressable key={st} onPress={() => setAttStatus(att.id, st)}
                                                                    style={[styles.chip, { paddingHorizontal: 8, paddingVertical: 4 }, active && { backgroundColor: stc.bg, borderColor: stc.text }]}>
                                                                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: active ? '700' : '500', color: active ? stc.text : colors.neutral[500] }}>{st}</Text>
                                                                </Pressable>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            );
                                        })}
                                        {changedRecords.length > 0 && (
                                            <Pressable onPress={() => onBulkMark(changedRecords)} disabled={isMarking}
                                                style={[styles.saveBtn, { marginTop: 12 }, isMarking && { opacity: 0.5 }]}>
                                                <Text className="font-inter text-sm font-bold text-white">{isMarking ? 'Saving...' : `Save Attendance (${changedRecords.length})`}</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                )}
                                <Text className="font-inter text-sm font-bold text-primary-900 mb-2">Add Attendees</Text>
                                {employeeOptions.filter(e => !attendees.some(a => a.employeeId === e.id)).map(emp => {
                                    const sel = selectedEmpIds.includes(emp.id);
                                    return (
                                        <Pressable key={emp.id} onPress={() => toggleEmp(emp.id)}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: sel ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: sel ? colors.primary[600] : colors.neutral[300], backgroundColor: sel ? colors.primary[600] : colors.white, justifyContent: 'center', alignItems: 'center' }}>
                                                {sel && <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                                            </View>
                                            <Text className="font-inter text-sm text-primary-950">{emp.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text></Pressable>
                        {selectedEmpIds.length > 0 && (
                            <Pressable onPress={() => onRegister(selectedEmpIds)} disabled={isRegistering}
                                style={[styles.saveBtn, isRegistering && { opacity: 0.5 }]}>
                                <Text className="font-inter text-sm font-bold text-white">{isRegistering ? 'Registering...' : `Register (${selectedEmpIds.length})`}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ PROGRAM FORM MODAL ============

function ProgramFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: ProgramItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [category, setCategory] = React.useState<ProgramCategory>('SKILL_DEVELOPMENT');
    const [level, setLevel] = React.useState<ProgramLevel>('Beginner');
    const [totalDuration, setTotalDuration] = React.useState('');
    const [isCompulsory, setIsCompulsory] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setDescription(initialData.description);
                setCategory(initialData.category); setLevel(initialData.level);
                setTotalDuration(String(initialData.totalDuration || ''));
                setIsCompulsory(initialData.isCompulsory);
            } else {
                setName(''); setDescription(''); setCategory('SKILL_DEVELOPMENT');
                setLevel('Beginner'); setTotalDuration(''); setIsCompulsory(false);
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
                        {initialData ? 'Edit Program' : 'New Program'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Program name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Program description..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
                            </View>
                        </View>
                        <ChipSelector label="Category" options={[...PROGRAM_CATEGORIES]} value={category} onSelect={v => setCategory(v as ProgramCategory)} />
                        <ChipSelector label="Level" options={[...PROGRAM_LEVELS]} value={level} onSelect={v => setLevel(v as ProgramLevel)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Total Duration (hrs)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={totalDuration} onChangeText={setTotalDuration} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">Compulsory</Text>
                            <Switch value={isCompulsory} onValueChange={setIsCompulsory} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isCompulsory ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name: name.trim(), description: description.trim(), category, level, totalDuration: Number(totalDuration) || 0, isCompulsory })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ADD COURSE MODAL ============

function AddCourseModal({
    visible, onClose, onSave, trainingOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    trainingOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [trainingId, setTrainingId] = React.useState('');
    const [sequence, setSequence] = React.useState('1');
    const [isPrerequisite, setIsPrerequisite] = React.useState(false);

    React.useEffect(() => {
        if (visible) { setTrainingId(''); setSequence('1'); setIsPrerequisite(false); }
    }, [visible]);

    const isValid = trainingId;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Add Course</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Training" value={trainingId} options={trainingOptions} onSelect={setTrainingId} placeholder="Select training..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Sequence</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={sequence} onChangeText={setSequence} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">Is Prerequisite</Text>
                            <Switch value={isPrerequisite} onValueChange={setIsPrerequisite} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isPrerequisite ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ trainingId, sequence: Number(sequence) || 1, isPrerequisite })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Adding...' : 'Add Course'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ENROLL MODAL ============

function EnrollModal({
    visible, onClose, onEnroll, employeeOptions, isEnrolling,
}: {
    visible: boolean; onClose: () => void;
    onEnroll: (empIds: string[]) => void;
    employeeOptions: { id: string; label: string }[];
    isEnrolling: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [selectedEmpIds, setSelectedEmpIds] = React.useState<string[]>([]);
    const [searchText, setSearchText] = React.useState('');

    React.useEffect(() => {
        if (visible) { setSelectedEmpIds([]); setSearchText(''); }
    }, [visible]);

    const filteredEmps = React.useMemo(() => {
        if (!searchText.trim()) return employeeOptions;
        const q = searchText.toLowerCase();
        return employeeOptions.filter(e => e.label.toLowerCase().includes(q));
    }, [employeeOptions, searchText]);

    const toggleEmp = (empId: string) => {
        setSelectedEmpIds(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '70%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Enroll Employees</Text>
                    <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                        <TextInput style={styles.textInput} placeholder="Search employees..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {filteredEmps.map(emp => {
                            const selected = selectedEmpIds.includes(emp.id);
                            return (
                                <Pressable key={emp.id} onPress={() => toggleEmp(emp.id)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: selected ? colors.primary[600] : colors.neutral[300], backgroundColor: selected ? colors.primary[600] : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                        {selected && <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                                    </View>
                                    <Text className="font-inter text-sm text-primary-950">{emp.label}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text></Pressable>
                        {selectedEmpIds.length > 0 && (
                            <Pressable onPress={() => onEnroll(selectedEmpIds)} disabled={isEnrolling}
                                style={[styles.saveBtn, isEnrolling && { opacity: 0.5 }]}>
                                <Text className="font-inter text-sm font-bold text-white">{isEnrolling ? 'Enrolling...' : `Enroll (${selectedEmpIds.length})`}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ PROGRAM CARD ============

function ProgramCard({ item, index, onEdit, onDelete, onViewDetail }: {
    item: ProgramItem; index: number; onEdit: () => void; onDelete: () => void; onViewDetail: () => void;
}) {
    const catColor = PROGRAM_CATEGORY_COLORS[item.category] ?? PROGRAM_CATEGORY_COLORS.SKILL_DEVELOPMENT;
    const levelColor = item.level === 'Advanced' ? { bg: colors.danger[50], text: colors.danger[700] } : item.level === 'Intermediate' ? { bg: colors.warning[50], text: colors.warning[700] } : { bg: colors.success[50], text: colors.success[700] };

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onViewDetail} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        {!item.isActive && (
                            <View style={[styles.typeBadge, { backgroundColor: colors.neutral[100] }]}>
                                <Text style={{ color: colors.neutral[600], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Inactive</Text>
                            </View>
                        )}
                        {item.isCompulsory && (
                            <View style={[styles.typeBadge, { backgroundColor: colors.danger[50] }]}>
                                <Text style={{ color: colors.danger[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Compulsory</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <TypeBadge label={item.category.replace('_', ' ')} colorMap={{ [item.category.replace('_', ' ')]: catColor }} />
                    <TypeBadge label={item.level} colorMap={{ [item.level]: levelColor }} />
                    <Text className="font-inter text-xs text-neutral-500">{item.courseCount} course{item.courseCount !== 1 ? 's' : ''}</Text>
                    <Text className="font-inter text-xs text-neutral-400">{item.enrollmentCount} enrolled</Text>
                </View>
                {item.description ? <Text className="mt-2 font-inter text-xs text-neutral-600" numberOfLines={2}>{item.description}</Text> : null}
                <View style={styles.cardFooter}>
                    <Pressable onPress={onEdit} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ PROGRAM DETAIL MODAL ============

function ProgramDetailModal({
    visible, onClose, program, trainingOptions, employeeOptions,
    onAddCourse, onRemoveCourse, onEnroll,
    isAddingCourse, isRemovingCourse, isEnrolling,
}: {
    visible: boolean; onClose: () => void; program: ProgramItem | null;
    trainingOptions: { id: string; label: string }[];
    employeeOptions: { id: string; label: string }[];
    onAddCourse: (data: Record<string, unknown>) => void;
    onRemoveCourse: (courseId: string) => void;
    onEnroll: (empIds: string[]) => void;
    isAddingCourse: boolean; isRemovingCourse: boolean; isEnrolling: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [showAddCourse, setShowAddCourse] = React.useState(false);
    const [showEnroll, setShowEnroll] = React.useState(false);

    if (!program) return null;

    const catColor = PROGRAM_CATEGORY_COLORS[program.category] ?? PROGRAM_CATEGORY_COLORS.SKILL_DEVELOPMENT;
    const sortedCourses = [...(program.courses ?? [])].sort((a, b) => a.sequence - b.sequence);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-1">{program.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        <TypeBadge label={program.category.replace('_', ' ')} colorMap={{ [program.category.replace('_', ' ')]: catColor }} />
                        <TypeBadge label={program.level} colorMap={{ [program.level]: { bg: colors.primary[50], text: colors.primary[700] } }} />
                        {program.isCompulsory && <TypeBadge label="Compulsory" colorMap={{ Compulsory: { bg: colors.danger[50], text: colors.danger[700] } }} />}
                        {program.totalDuration > 0 && <Text className="font-inter text-xs text-neutral-500">{program.totalDuration}h total</Text>}
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {/* Courses Section */}
                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text className="font-inter text-base font-bold text-primary-900">Courses ({sortedCourses.length})</Text>
                                <Pressable onPress={() => setShowAddCourse(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] }}>
                                    <Text className="font-inter text-xs font-bold text-primary-600">+ Add Course</Text>
                                </Pressable>
                            </View>
                            {sortedCourses.length === 0 ? (
                                <Text className="font-inter text-sm text-neutral-400 py-4 text-center">No courses added yet</Text>
                            ) : (
                                sortedCourses.map(course => (
                                    <View key={course.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[100], justifyContent: 'center', alignItems: 'center' }}>
                                            <Text className="font-inter text-xs font-bold text-primary-700">{course.sequence}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950">{course.trainingName}</Text>
                                            {course.isPrerequisite && <Text className="font-inter text-[10px] text-warning-600">Prerequisite</Text>}
                                        </View>
                                        <Pressable onPress={() => onRemoveCourse(course.id)} hitSlop={8}>
                                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>
                                        </Pressable>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Enrollments Section */}
                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text className="font-inter text-base font-bold text-primary-900">Enrollments ({program.enrollments?.length ?? 0})</Text>
                                <Pressable onPress={() => setShowEnroll(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.success[50], borderWidth: 1, borderColor: colors.success[200] }}>
                                    <Text className="font-inter text-xs font-bold text-success-600">+ Enroll</Text>
                                </Pressable>
                            </View>
                            {(program.enrollments?.length ?? 0) === 0 ? (
                                <Text className="font-inter text-sm text-neutral-400 py-4 text-center">No enrollments yet</Text>
                            ) : (
                                program.enrollments.map(enrollment => {
                                    const statusColor = ENROLLMENT_STATUS_COLORS[enrollment.status] ?? ENROLLMENT_STATUS_COLORS.ENROLLED;
                                    return (
                                        <View key={enrollment.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text className="font-inter text-sm font-semibold text-primary-950">{enrollment.employeeName}</Text>
                                                <View style={[styles.typeBadge, { backgroundColor: statusColor.bg }]}>
                                                    <Text style={{ color: statusColor.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{enrollment.status}</Text>
                                                </View>
                                            </View>
                                            {enrollment.progress > 0 && (
                                                <View style={{ marginTop: 6 }}>
                                                    <View style={{ height: 6, backgroundColor: colors.neutral[100], borderRadius: 3, overflow: 'hidden' }}>
                                                        <View style={{ height: 6, backgroundColor: enrollment.status === 'COMPLETED' ? colors.success[500] : colors.primary[500], borderRadius: 3, width: `${Math.min(enrollment.progress, 100)}%` }} />
                                                    </View>
                                                    <Text className="font-inter text-[10px] text-neutral-400 mt-1">{enrollment.progress}% complete</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={[styles.cancelBtn, { flex: 0, paddingHorizontal: 24 }]}><Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text></Pressable>
                    </View>
                </View>
            </View>
            <AddCourseModal visible={showAddCourse} onClose={() => setShowAddCourse(false)} onSave={(data) => { onAddCourse(data); setShowAddCourse(false); }} trainingOptions={trainingOptions} isSaving={isAddingCourse} />
            <EnrollModal visible={showEnroll} onClose={() => setShowEnroll(false)} onEnroll={(empIds) => { onEnroll(empIds); setShowEnroll(false); }} employeeOptions={employeeOptions} isEnrolling={isEnrolling} />
        </Modal>
    );
}

// ============ BUDGET INFO SECTION ============

function BudgetInfoSection() {
    const currentYear = new Date().getFullYear().toString();
    const { data: budgetData } = useBudgetUtilization(currentYear);
    const utilization = (budgetData as any)?.data;

    if (!utilization) return null;

    const totalAllocated = utilization.totalAllocated ?? 0;
    const totalUsed = utilization.totalUsed ?? 0;
    const remaining = totalAllocated - totalUsed;
    const pct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(60)} style={{ marginBottom: 16 }}>
            <View style={[styles.card, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]}>
                <Text className="font-inter text-xs font-bold text-primary-900 mb-2">Budget Utilization - FY {utilization.fiscalYear ?? currentYear}</Text>
                <View style={{ height: 8, backgroundColor: colors.neutral[200], borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <View style={{ height: 8, backgroundColor: pct > 90 ? colors.danger[500] : pct > 70 ? colors.warning[500] : colors.primary[500], borderRadius: 4, width: `${Math.min(pct, 100)}%` }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text className="font-inter text-[10px] text-neutral-500">Allocated</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950">{'₹'}{totalAllocated.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text className="font-inter text-[10px] text-neutral-500">Used</Text>
                        <Text className="font-inter text-sm font-bold text-warning-700">{'₹'}{totalUsed.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-[10px] text-neutral-500">Remaining</Text>
                        <Text className="font-inter text-sm font-bold text-success-700">{'₹'}{remaining.toLocaleString('en-IN')}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function TrainingScreen({ initialTab = 'catalogue' as Tab }: { initialTab?: Tab } = {}) {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<Tab>(initialTab);
    const [search, setSearch] = React.useState('');

    // Queries
    const { data: catResponse, isLoading: catLoading, error: catError, refetch: catRefetch, isFetching: catFetching } = useTrainingCatalogue();
    const { data: nomResponse, isLoading: nomLoading, error: nomError, refetch: nomRefetch, isFetching: nomFetching } = useTrainingNominations();
    const { data: sessResponse, isLoading: sessLoading, error: sessError, refetch: sessRefetch, isFetching: sessFetching } = useTrainingSessions();
    const { data: trainersResponse, isLoading: trainersLoading, error: trainersError, refetch: trainersRefetch, isFetching: trainersFetching } = useTrainers();
    const { data: programsResponse, isLoading: progsLoading, error: progsError, refetch: progsRefetch, isFetching: progsFetching } = useTrainingPrograms();
    const { data: empResponse } = useEmployees();

    // Mutations
    const createCat = useCreateTrainingCatalogue();
    const updateCat = useUpdateTrainingCatalogue();
    const deleteCat = useDeleteTrainingCatalogue();
    const createNom = useCreateTrainingNomination();
    const updateNom = useUpdateTrainingNomination();
    const createSess = useCreateTrainingSession();
    const updateSessStatus = useUpdateTrainingSessionStatus();
    const deleteSess = useDeleteTrainingSession();
    const registerAttendees = useRegisterSessionAttendees();
    const bulkMark = useBulkMarkAttendance();
    const createTrainer = useCreateTrainer();
    const updateTrainerMut = useUpdateTrainer();
    const deleteTrainerMut = useDeleteTrainer();
    const createProg = useCreateTrainingProgram();
    const updateProg = useUpdateTrainingProgram();
    const deleteProg = useDeleteTrainingProgram();
    const addCourse = useAddProgramCourse();
    const removeCourse = useRemoveProgramCourse();
    const enrollInProg = useEnrollInProgram();

    // Modals
    const [catFormVisible, setCatFormVisible] = React.useState(false);
    const [editingCat, setEditingCat] = React.useState<CatalogueItem | null>(null);
    const [nomFormVisible, setNomFormVisible] = React.useState(false);
    const [sessFormVisible, setSessFormVisible] = React.useState(false);
    const [trainerFormVisible, setTrainerFormVisible] = React.useState(false);
    const [editingTrainer, setEditingTrainer] = React.useState<TrainerItem | null>(null);
    const [attendanceSessionId, setAttendanceSessionId] = React.useState<string | null>(null);
    const [progFormVisible, setProgFormVisible] = React.useState(false);
    const [editingProg, setEditingProg] = React.useState<ProgramItem | null>(null);
    const [detailProg, setDetailProg] = React.useState<ProgramItem | null>(null);

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

    const sessions: SessionItem[] = React.useMemo(() => {
        const raw = (sessResponse as any)?.data ?? sessResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', batchName: item.batchName ?? '', trainingId: item.trainingId ?? '',
            trainingName: item.trainingName ?? item.training?.name ?? '', startDateTime: item.startDateTime ?? '',
            endDateTime: item.endDateTime ?? '', venue: item.venue ?? '', meetingLink: item.meetingLink ?? '',
            maxParticipants: item.maxParticipants ?? 0, trainerId: item.trainerId ?? '',
            trainerName: item.trainerName ?? item.trainer?.name ?? '', status: item.status ?? 'SCHEDULED',
            attendeeCount: item.attendeeCount ?? item._count?.attendance ?? 0,
        }));
    }, [sessResponse]);

    const trainers: TrainerItem[] = React.useMemo(() => {
        const raw = (trainersResponse as any)?.data ?? trainersResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', email: item.email ?? '', phone: item.phone ?? '',
            type: item.type ?? 'EXTERNAL', employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? item.employee?.firstName ? `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() : '',
            specializations: Array.isArray(item.specializations) ? item.specializations : [],
            qualifications: item.qualifications ?? '', experienceYears: item.experienceYears ?? 0,
            rating: item.rating ?? 0, sessionCount: item.sessionCount ?? item._count?.sessions ?? 0,
        }));
    }, [trainersResponse]);

    const programs: ProgramItem[] = React.useMemo(() => {
        const raw = (programsResponse as any)?.data ?? programsResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', description: item.description ?? '',
            category: item.category ?? 'SKILL_DEVELOPMENT', level: item.level ?? 'Beginner',
            totalDuration: item.totalDuration ?? 0, isCompulsory: item.isCompulsory ?? false,
            isActive: item.isActive ?? true,
            courseCount: item.courseCount ?? item._count?.courses ?? item.courses?.length ?? 0,
            enrollmentCount: item.enrollmentCount ?? item._count?.enrollments ?? item.enrollments?.length ?? 0,
            courses: (item.courses ?? []).map((c: any) => ({
                id: c.id ?? '', trainingId: c.trainingId ?? '', trainingName: c.trainingName ?? c.training?.name ?? '',
                sequence: c.sequence ?? 0, isPrerequisite: c.isPrerequisite ?? false,
            })),
            enrollments: (item.enrollments ?? []).map((e: any) => ({
                id: e.id ?? '', employeeId: e.employeeId ?? '',
                employeeName: e.employeeName ?? (e.employee ? `${e.employee.firstName ?? ''} ${e.employee.lastName ?? ''}`.trim() : ''),
                status: e.status ?? 'ENROLLED', progress: e.progress ?? 0,
            })),
        }));
    }, [programsResponse]);

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const trainingOptions = React.useMemo(() => catalogue.map(c => ({ id: c.id, label: c.name })), [catalogue]);
    const trainerOptions = React.useMemo(() => trainers.map(t => ({ id: t.id, label: t.type === 'INTERNAL' && t.employeeName ? t.employeeName : t.name })), [trainers]);

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

    const filteredSessions = React.useMemo(() => {
        if (!search.trim()) return sessions;
        const q = search.toLowerCase();
        return sessions.filter(s => s.batchName.toLowerCase().includes(q) || s.trainingName.toLowerCase().includes(q));
    }, [sessions, search]);

    const filteredTrainers = React.useMemo(() => {
        if (!search.trim()) return trainers;
        const q = search.toLowerCase();
        return trainers.filter(t => t.name.toLowerCase().includes(q) || t.employeeName.toLowerCase().includes(q) || t.specializations.some(s => s.toLowerCase().includes(q)));
    }, [trainers, search]);

    const filteredPrograms = React.useMemo(() => {
        if (!search.trim()) return programs;
        const q = search.toLowerCase();
        return programs.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.level.toLowerCase().includes(q));
    }, [programs, search]);

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

    // Session handlers
    const handleStartSession = (item: SessionItem) => {
        showConfirm({
            title: 'Start Session', message: `Start "${item.batchName}"?`,
            confirmText: 'Start', variant: 'primary',
            onConfirm: () => updateSessStatus.mutate({ id: item.id, data: { status: 'IN_PROGRESS' } }),
        });
    };

    const handleCompleteSession = (item: SessionItem) => {
        showConfirm({
            title: 'Complete Session', message: `Mark "${item.batchName}" as completed?`,
            confirmText: 'Complete', variant: 'primary',
            onConfirm: () => updateSessStatus.mutate({ id: item.id, data: { status: 'COMPLETED' } }),
        });
    };

    const handleDeleteSession = (item: SessionItem) => {
        showConfirm({
            title: 'Delete Session', message: `Delete "${item.batchName}"? This cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteSess.mutate(item.id),
        });
    };

    const handleSaveSession = (data: Record<string, unknown>) => {
        createSess.mutate(data, { onSuccess: () => setSessFormVisible(false) });
    };

    const handleRegisterAttendees = (empIds: string[]) => {
        if (!attendanceSessionId) return;
        registerAttendees.mutate({ sessionId: attendanceSessionId, data: { employeeIds: empIds } }, {
            onSuccess: () => setAttendanceSessionId(null),
        });
    };

    const handleBulkMark = (records: { id: string; status: string }[]) => {
        if (!attendanceSessionId) return;
        bulkMark.mutate({ sessionId: attendanceSessionId, data: { records } }, {
            onSuccess: () => setAttendanceSessionId(null),
        });
    };

    // Trainer handlers
    const handleEditTrainer = (item: TrainerItem) => { setEditingTrainer(item); setTrainerFormVisible(true); };

    const handleDeleteTrainer = (item: TrainerItem) => {
        showConfirm({
            title: 'Delete Trainer', message: `Delete trainer "${item.type === 'INTERNAL' && item.employeeName ? item.employeeName : item.name}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteTrainerMut.mutate(item.id),
        });
    };

    const handleSaveTrainer = (data: Record<string, unknown>) => {
        if (editingTrainer) {
            updateTrainerMut.mutate({ id: editingTrainer.id, data }, { onSuccess: () => setTrainerFormVisible(false) });
        } else {
            createTrainer.mutate(data, { onSuccess: () => setTrainerFormVisible(false) });
        }
    };

    // Program handlers
    const handleEditProgram = (item: ProgramItem) => { setEditingProg(item); setProgFormVisible(true); };

    const handleDeleteProgram = (item: ProgramItem) => {
        showConfirm({
            title: 'Delete Program',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteProg.mutate(item.id),
        });
    };

    const handleSaveProgram = (data: Record<string, unknown>) => {
        if (editingProg) {
            updateProg.mutate({ id: editingProg.id, data }, { onSuccess: () => setProgFormVisible(false) });
        } else {
            createProg.mutate(data, { onSuccess: () => setProgFormVisible(false) });
        }
    };

    const handleAddCourse = (data: Record<string, unknown>) => {
        if (!detailProg) return;
        addCourse.mutate({ programId: detailProg.id, data });
    };

    const handleRemoveCourse = (courseId: string) => {
        if (!detailProg) return;
        removeCourse.mutate({ programId: detailProg.id, courseId });
    };

    const handleEnrollInProgram = (empIds: string[]) => {
        if (!detailProg) return;
        enrollInProg.mutate({ programId: detailProg.id, data: { employeeIds: empIds } });
    };

    const isLoading = activeTab === 'catalogue' ? catLoading : activeTab === 'nominations' ? nomLoading : activeTab === 'sessions' ? sessLoading : activeTab === 'programs' ? progsLoading : trainersLoading;
    const isFetching = activeTab === 'catalogue' ? catFetching : activeTab === 'nominations' ? nomFetching : activeTab === 'sessions' ? sessFetching : activeTab === 'programs' ? progsFetching : trainersFetching;
    const activeRefetch = activeTab === 'catalogue' ? catRefetch : activeTab === 'nominations' ? nomRefetch : activeTab === 'sessions' ? sessRefetch : activeTab === 'programs' ? progsRefetch : trainersRefetch;
    const error = activeTab === 'catalogue' ? catError : activeTab === 'nominations' ? nomError : activeTab === 'sessions' ? sessError : activeTab === 'programs' ? progsError : trainersError;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'catalogue', label: 'Catalogue' },
        { key: 'nominations', label: 'Nominations' },
        { key: 'sessions', label: 'Sessions' },
        { key: 'trainers', label: 'Trainers' },
        { key: 'programs', label: 'Programs' },
    ];

    const subtitleMap: Record<Tab, string> = {
        catalogue: `${catalogue.length} training${catalogue.length !== 1 ? 's' : ''}`,
        nominations: `${nominations.length} nomination${nominations.length !== 1 ? 's' : ''}`,
        sessions: `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`,
        trainers: `${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}`,
        programs: `${programs.length} program${programs.length !== 1 ? 's' : ''}`,
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Training</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">
                {subtitleMap[activeTab]}
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
            {activeTab === 'programs' && <View style={{ marginTop: 12 }}><BudgetInfoSection /></View>}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => activeRefetch() }} /></View>;
        if (activeTab === 'catalogue') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No training courses" message="Create your first training programme." /></View>;
        if (activeTab === 'nominations') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No nominations" message="Nominate employees for training." /></View>;
        if (activeTab === 'sessions') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No sessions" message="Schedule a training session." /></View>;
        if (activeTab === 'programs') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No programs" message="Create your first training program." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No trainers" message="Add your first trainer." /></View>;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'catalogue') {
            return <CatalogueCard item={item} index={index} onEdit={() => handleEditCatalogue(item)} onDelete={() => handleDeleteCatalogue(item)} />;
        }
        if (activeTab === 'nominations') {
            return <NominationCard item={item} index={index} onComplete={() => handleCompleteNomination(item)} onCancel={() => handleCancelNomination(item)} />;
        }
        if (activeTab === 'sessions') {
            return <SessionCard item={item} index={index} onStart={() => handleStartSession(item)} onComplete={() => handleCompleteSession(item)} onDelete={() => handleDeleteSession(item)} onAttendance={() => setAttendanceSessionId(item.id)} />;
        }
        if (activeTab === 'programs') {
            return <ProgramCard item={item} index={index} onEdit={() => handleEditProgram(item)} onDelete={() => handleDeleteProgram(item)} onViewDetail={() => setDetailProg(item)} />;
        }
        return <TrainerCard item={item} index={index} onEdit={() => handleEditTrainer(item)} onDelete={() => handleDeleteTrainer(item)} />;
    };

    const activeData = activeTab === 'catalogue' ? filteredCatalogue : activeTab === 'nominations' ? filteredNominations : activeTab === 'sessions' ? filteredSessions : activeTab === 'programs' ? filteredPrograms : filteredTrainers;

    const handleFAB = () => {
        if (activeTab === 'catalogue') { setEditingCat(null); setCatFormVisible(true); }
        else if (activeTab === 'nominations') { setNomFormVisible(true); }
        else if (activeTab === 'sessions') { setSessFormVisible(true); }
        else if (activeTab === 'programs') { setEditingProg(null); setProgFormVisible(true); }
        else { setEditingTrainer(null); setTrainerFormVisible(true); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Training" onMenuPress={toggle} />
            <FlashList
                data={activeData} renderItem={renderItem} keyExtractor={(item: any) => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => activeRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <CatalogueFormModal visible={catFormVisible} onClose={() => setCatFormVisible(false)} onSave={handleSaveCatalogue} initialData={editingCat} isSaving={createCat.isPending || updateCat.isPending} />
            <NominationFormModal visible={nomFormVisible} onClose={() => setNomFormVisible(false)} onSave={handleSaveNomination} employeeOptions={employeeOptions} trainingOptions={trainingOptions} isSaving={createNom.isPending} />
            <SessionFormModal visible={sessFormVisible} onClose={() => setSessFormVisible(false)} onSave={handleSaveSession} trainingOptions={trainingOptions} trainerOptions={trainerOptions} isSaving={createSess.isPending} />
            <TrainerFormModal visible={trainerFormVisible} onClose={() => setTrainerFormVisible(false)} onSave={handleSaveTrainer} employeeOptions={employeeOptions} initialData={editingTrainer} isSaving={createTrainer.isPending || updateTrainerMut.isPending} />
            {attendanceSessionId && (
                <AttendanceModal visible={!!attendanceSessionId} onClose={() => setAttendanceSessionId(null)} sessionId={attendanceSessionId} employeeOptions={employeeOptions} onRegister={handleRegisterAttendees} onBulkMark={handleBulkMark} isRegistering={registerAttendees.isPending} isMarking={bulkMark.isPending} />
            )}
            <ProgramFormModal visible={progFormVisible} onClose={() => setProgFormVisible(false)} onSave={handleSaveProgram} initialData={editingProg} isSaving={createProg.isPending || updateProg.isPending} />
            <ProgramDetailModal visible={!!detailProg} onClose={() => setDetailProg(null)} program={detailProg} trainingOptions={trainingOptions} employeeOptions={employeeOptions} onAddCourse={handleAddCourse} onRemoveCourse={handleRemoveCourse} onEnroll={handleEnrollInProgram} isAddingCourse={addCourse.isPending} isRemovingCourse={removeCourse.isPending} isEnrolling={enrollInProg.isPending} />
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
