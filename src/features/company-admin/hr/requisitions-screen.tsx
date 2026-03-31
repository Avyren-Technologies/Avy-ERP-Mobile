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

import { useRequisitions, useCandidates, useInterviews } from '@/features/company-admin/api/use-recruitment-queries';
import {
    useCreateRequisition,
    useUpdateRequisition,
    useDeleteRequisition,
    useCreateCandidate,
    useUpdateCandidate,
    useCreateInterview,
} from '@/features/company-admin/api/use-recruitment-mutations';

// ============ TYPES ============

type ReqStatus = 'Draft' | 'Open' | 'Interviewing' | 'Offered' | 'Filled';
type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
type CandidateSource = 'Portal' | 'Referral' | 'LinkedIn' | 'Agency' | 'Walk-in' | 'Other';

interface RequisitionItem {
    id: string;
    title: string;
    department: string;
    openings: number;
    budgetMin: number;
    budgetMax: number;
    status: ReqStatus;
    candidateCount: number;
    createdAt: string;
}

interface CandidateItem {
    id: string;
    requisitionId: string;
    name: string;
    email: string;
    source: CandidateSource;
    stage: CandidateStage;
    rating: number;
    appliedAt: string;
}

interface InterviewItem {
    id: string;
    requisitionId: string;
    candidateId: string;
    candidateName: string;
    round: number;
    datetime: string;
    panelists: string[];
    status: InterviewStatus;
    feedback: string;
}

// ============ CONSTANTS ============

const REQ_STATUS_FILTERS: ('All' | ReqStatus)[] = ['All', 'Draft', 'Open', 'Interviewing', 'Offered', 'Filled'];

const REQ_STATUS_COLORS: Record<ReqStatus, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Open: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Interviewing: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Offered: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Filled: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
};

const STAGE_COLORS: Record<CandidateStage, { bg: string; text: string }> = {
    Applied: { bg: colors.neutral[100], text: colors.neutral[700] },
    Screening: { bg: colors.info[50], text: colors.info[700] },
    Interview: { bg: colors.warning[50], text: colors.warning[700] },
    Offer: { bg: colors.accent[50], text: colors.accent[700] },
    Hired: { bg: colors.success[50], text: colors.success[700] },
    Rejected: { bg: colors.danger[50], text: colors.danger[700] },
};

const SOURCE_COLORS: Record<CandidateSource, { bg: string; text: string }> = {
    Portal: { bg: colors.primary[50], text: colors.primary[700] },
    Referral: { bg: colors.accent[50], text: colors.accent[700] },
    LinkedIn: { bg: colors.info[50], text: colors.info[700] },
    Agency: { bg: colors.warning[50], text: colors.warning[700] },
    'Walk-in': { bg: colors.success[50], text: colors.success[700] },
    Other: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, { bg: string; text: string; dot: string }> = {
    Scheduled: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Completed: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Cancelled: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    'No Show': { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

const CANDIDATE_SOURCES: CandidateSource[] = ['Portal', 'Referral', 'LinkedIn', 'Agency', 'Walk-in', 'Other'];

// ============ SHARED ATOMS ============

function ReqStatusBadge({ status }: { status: ReqStatus }) {
    const s = REQ_STATUS_COLORS[status] ?? REQ_STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function StageBadge({ stage }: { stage: CandidateStage }) {
    const c = STAGE_COLORS[stage] ?? STAGE_COLORS.Applied;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{stage}</Text>
        </View>
    );
}

function SourceBadge({ source }: { source: CandidateSource }) {
    const c = SOURCE_COLORS[source] ?? SOURCE_COLORS.Other;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{source}</Text>
        </View>
    );
}

function IntStatusBadge({ status }: { status: InterviewStatus }) {
    const s = INTERVIEW_STATUS_COLORS[status] ?? INTERVIEW_STATUS_COLORS.Scheduled;
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

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: max }, (_, i) => (
                <Svg key={i} width={12} height={12} viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={i < rating ? colors.warning[400] : colors.neutral[200]} stroke="none" />
                </Svg>
            ))}
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

// ============ SECTION TYPE ============

type Section = 'requisitions' | 'candidates' | 'interviews';

// ============ NEW REQUISITION MODAL ============

function RequisitionFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: RequisitionItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = React.useState('');
    const [department, setDepartment] = React.useState('');
    const [openings, setOpenings] = React.useState('1');
    const [budgetMin, setBudgetMin] = React.useState('');
    const [budgetMax, setBudgetMax] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setTitle(initialData.title); setDepartment(initialData.department);
                setOpenings(String(initialData.openings)); setBudgetMin(String(initialData.budgetMin || ''));
                setBudgetMax(String(initialData.budgetMax || ''));
            } else {
                setTitle(''); setDepartment(''); setOpenings('1'); setBudgetMin(''); setBudgetMax('');
            }
        }
    }, [visible, initialData]);

    const isValid = title.trim() && department.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Requisition' : 'New Requisition'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Job Title <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Senior React Developer" placeholderTextColor={colors.neutral[400]} value={title} onChangeText={setTitle} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Engineering" placeholderTextColor={colors.neutral[400]} value={department} onChangeText={setDepartment} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">No. of Openings</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={openings} onChangeText={setOpenings} keyboardType="number-pad" /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Budget Min</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={budgetMin} onChangeText={setBudgetMin} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Budget Max</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={budgetMax} onChangeText={setBudgetMax} keyboardType="number-pad" /></View>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ title: title.trim(), department: department.trim(), openings: Number(openings) || 1, budgetMin: Number(budgetMin) || 0, budgetMax: Number(budgetMax) || 0 })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ADD CANDIDATE MODAL ============

function CandidateFormModal({
    visible, onClose, onSave, requisitionId, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    requisitionId: string; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [source, setSource] = React.useState<CandidateSource>('Portal');

    React.useEffect(() => {
        if (visible) { setName(''); setEmail(''); setSource('Portal'); }
    }, [visible]);

    const isValid = name.trim() && email.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Add Candidate</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Full name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Email <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="email@example.com" placeholderTextColor={colors.neutral[400]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /></View>
                        </View>
                        <ChipSelector label="Source" options={[...CANDIDATE_SOURCES]} value={source} onSelect={v => setSource(v as CandidateSource)} />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ requisitionId, name: name.trim(), email: email.trim(), source, stage: 'Applied', rating: 0 })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Adding...' : 'Add Candidate'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SCHEDULE INTERVIEW MODAL ============

function InterviewFormModal({
    visible, onClose, onSave, candidateOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    candidateOptions: { id: string; label: string }[]; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [candidateId, setCandidateId] = React.useState('');
    const [round, setRound] = React.useState('1');
    const [datetime, setDatetime] = React.useState('');
    const [panelists, setPanelists] = React.useState('');

    React.useEffect(() => {
        if (visible) { setCandidateId(''); setRound('1'); setDatetime(''); setPanelists(''); }
    }, [visible]);

    const isValid = candidateId && datetime.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Schedule Interview</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Candidate" value={candidateId} options={candidateOptions} onSelect={setCandidateId} placeholder="Select candidate..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Round</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={round} onChangeText={setRound} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Date & Time <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={colors.neutral[400]} value={datetime} onChangeText={setDatetime} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Panelists</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Comma separated names" placeholderTextColor={colors.neutral[400]} value={panelists} onChangeText={setPanelists} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ candidateId, candidateName: candidateOptions.find(c => c.id === candidateId)?.label ?? '', round: Number(round) || 1, datetime: datetime.trim(), panelists: panelists.split(',').map(p => p.trim()).filter(Boolean), status: 'Scheduled' })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Scheduling...' : 'Schedule'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD COMPONENTS ============

function RequisitionCard({ item, index, onPress, onStatusChange, onDelete }: {
    item: RequisitionItem; index: number; onPress: () => void;
    onStatusChange: (status: ReqStatus) => void; onDelete: () => void;
}) {
    const nextStatus: Partial<Record<ReqStatus, { label: string; next: ReqStatus; color: string }>> = {
        Draft: { label: 'Open Position', next: 'Open', color: colors.success[600] },
        Open: { label: 'Start Interviews', next: 'Interviewing', color: colors.info[600] },
        Interviewing: { label: 'Extend Offer', next: 'Offered', color: colors.warning[600] },
        Offered: { label: 'Mark Filled', next: 'Filled', color: colors.primary[600] },
    };
    const action = nextStatus[item.status];

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.department}</Text>
                    </View>
                    <ReqStatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-xs text-neutral-500">{item.openings} opening{item.openings !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-xs text-neutral-500">{item.candidateCount} candidate{item.candidateCount !== 1 ? 's' : ''}</Text>
                    </View>
                    {(item.budgetMin > 0 || item.budgetMax > 0) && (
                        <Text className="font-inter text-xs text-neutral-400">{'\u20B9'}{item.budgetMin.toLocaleString('en-IN')}-{item.budgetMax.toLocaleString('en-IN')}</Text>
                    )}
                </View>
                <View style={styles.cardFooter}>
                    {action && (
                        <Pressable onPress={() => onStatusChange(action.next)} style={[styles.lifecycleBtn, { backgroundColor: action.color }]}>
                            <Text className="font-inter text-[10px] font-bold text-white">{action.label}</Text>
                        </Pressable>
                    )}
                    {item.status === 'Draft' && (
                        <Pressable onPress={onDelete} hitSlop={8} style={{ marginLeft: 'auto' }}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

function CandidateCard({ item, index, onAdvance, onReject }: {
    item: CandidateItem; index: number;
    onAdvance: () => void; onReject: () => void;
}) {
    const canAdvance = item.stage !== 'Hired' && item.stage !== 'Rejected';
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.name} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>{item.email}</Text>
                        </View>
                    </View>
                    <StageBadge stage={item.stage} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <SourceBadge source={item.source} />
                    <RatingStars rating={item.rating} />
                </View>
                {canAdvance && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onAdvance} style={styles.approveBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M13 17l5-5-5-5M6 17l5-5-5-5" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Advance</Text>
                        </Pressable>
                        <Pressable onPress={onReject} style={styles.rejectActionBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

function InterviewCard({ item, index }: { item: InterviewItem; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.candidateName}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.datetime}</Text>
                    </View>
                    <IntStatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary[50] }]}>
                        <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Round {item.round}</Text>
                    </View>
                    {item.panelists.length > 0 && (
                        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>Panel: {item.panelists.join(', ')}</Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function RequisitionsScreen({ initialSection = 'requisitions' as Section }: { initialSection?: Section } = {}) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeSection, setActiveSection] = React.useState<Section>(initialSection);
    const [selectedReqId, setSelectedReqId] = React.useState<string>('');
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'All' | ReqStatus>('All');

    // Queries
    const { data: reqResponse, isLoading: reqLoading, error: reqError, refetch: reqRefetch, isFetching: reqFetching } = useRequisitions();
    const { data: candResponse, isLoading: candLoading, refetch: candRefetch, isFetching: candFetching } = useCandidates(selectedReqId ? { requisitionId: selectedReqId } as any : undefined);
    const { data: intResponse, isLoading: intLoading, refetch: intRefetch, isFetching: intFetching } = useInterviews(selectedReqId ? { requisitionId: selectedReqId } as any : undefined);

    // Mutations
    const createReq = useCreateRequisition();
    const updateReq = useUpdateRequisition();
    const deleteReq = useDeleteRequisition();
    const createCand = useCreateCandidate();
    const updateCand = useUpdateCandidate();
    const createInt = useCreateInterview();

    // Modals
    const [reqFormVisible, setReqFormVisible] = React.useState(false);
    const [editingReq, setEditingReq] = React.useState<RequisitionItem | null>(null);
    const [candFormVisible, setCandFormVisible] = React.useState(false);
    const [intFormVisible, setIntFormVisible] = React.useState(false);

    // Parse data
    const requisitions: RequisitionItem[] = React.useMemo(() => {
        const raw = (reqResponse as any)?.data ?? reqResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', title: item.title ?? '', department: item.department ?? '',
            openings: item.openings ?? 1, budgetMin: item.budgetMin ?? 0, budgetMax: item.budgetMax ?? 0,
            status: item.status ?? 'Draft', candidateCount: item.candidateCount ?? 0, createdAt: item.createdAt ?? '',
        }));
    }, [reqResponse]);

    const candidates: CandidateItem[] = React.useMemo(() => {
        const raw = (candResponse as any)?.data ?? candResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', requisitionId: item.requisitionId ?? '', name: item.name ?? '',
            email: item.email ?? '', source: item.source ?? 'Other', stage: item.stage ?? 'Applied',
            rating: item.rating ?? 0, appliedAt: item.appliedAt ?? '',
        }));
    }, [candResponse]);

    const interviews: InterviewItem[] = React.useMemo(() => {
        const raw = (intResponse as any)?.data ?? intResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', requisitionId: item.requisitionId ?? '', candidateId: item.candidateId ?? '',
            candidateName: item.candidateName ?? '', round: item.round ?? 1, datetime: item.datetime ?? '',
            panelists: item.panelists ?? [], status: item.status ?? 'Scheduled', feedback: item.feedback ?? '',
        }));
    }, [intResponse]);

    const filteredReqs = React.useMemo(() => {
        let list = requisitions;
        if (statusFilter !== 'All') list = list.filter(r => r.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r => r.title.toLowerCase().includes(q) || r.department.toLowerCase().includes(q));
        }
        return list;
    }, [requisitions, statusFilter, search]);

    const filteredCandidates = React.useMemo(() => {
        if (!search.trim()) return candidates;
        const q = search.toLowerCase();
        return candidates.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }, [candidates, search]);

    const filteredInterviews = React.useMemo(() => {
        if (!search.trim()) return interviews;
        const q = search.toLowerCase();
        return interviews.filter(i => i.candidateName.toLowerCase().includes(q));
    }, [interviews, search]);

    const candidateOptions = React.useMemo(() =>
        candidates.map(c => ({ id: c.id, label: c.name })), [candidates]);

    // Handlers
    const handleSelectReq = (item: RequisitionItem) => {
        setSelectedReqId(item.id);
        setActiveSection('candidates');
    };

    const handleReqStatusChange = (item: RequisitionItem, newStatus: ReqStatus) => {
        showConfirm({
            title: 'Update Status',
            message: `Change "${item.title}" status to ${newStatus}?`,
            confirmText: 'Confirm', variant: 'primary',
            onConfirm: () => updateReq.mutate({ id: item.id, data: { status: newStatus } }),
        });
    };

    const handleDeleteReq = (item: RequisitionItem) => {
        showConfirm({
            title: 'Delete Requisition',
            message: `Delete "${item.title}"? This cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteReq.mutate(item.id),
        });
    };

    const handleSaveReq = (data: Record<string, unknown>) => {
        if (editingReq) {
            updateReq.mutate({ id: editingReq.id, data }, { onSuccess: () => setReqFormVisible(false) });
        } else {
            createReq.mutate(data, { onSuccess: () => setReqFormVisible(false) });
        }
    };

    const handleAdvanceCandidate = (item: CandidateItem) => {
        const nextMap: Record<CandidateStage, CandidateStage> = {
            Applied: 'Screening', Screening: 'Interview', Interview: 'Offer', Offer: 'Hired', Hired: 'Hired', Rejected: 'Rejected',
        };
        const next = nextMap[item.stage];
        showConfirm({
            title: 'Advance Candidate',
            message: `Move ${item.name} to "${next}" stage?`,
            confirmText: 'Advance', variant: 'primary',
            onConfirm: () => updateCand.mutate({ id: item.id, data: { stage: next } }),
        });
    };

    const handleRejectCandidate = (item: CandidateItem) => {
        showConfirm({
            title: 'Reject Candidate',
            message: `Reject ${item.name}?`,
            confirmText: 'Reject', variant: 'danger',
            onConfirm: () => updateCand.mutate({ id: item.id, data: { stage: 'Rejected' } }),
        });
    };

    const handleSaveCandidate = (data: Record<string, unknown>) => {
        createCand.mutate(data, { onSuccess: () => setCandFormVisible(false) });
    };

    const handleSaveInterview = (data: Record<string, unknown>) => {
        createInt.mutate(data, { onSuccess: () => setIntFormVisible(false) });
    };

    const isLoading = activeSection === 'requisitions' ? reqLoading : activeSection === 'candidates' ? candLoading : intLoading;
    const isFetching2 = activeSection === 'requisitions' ? reqFetching : activeSection === 'candidates' ? candFetching : intFetching;
    const activeRefetch = activeSection === 'requisitions' ? reqRefetch : activeSection === 'candidates' ? candRefetch : intRefetch;

    const sectionTabs: { key: Section; label: string }[] = [
        { key: 'requisitions', label: 'Requisitions' },
        { key: 'candidates', label: 'Candidates' },
        { key: 'interviews', label: 'Interviews' },
    ];

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Job Requisitions</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{requisitions.length} requisition{requisitions.length !== 1 ? 's' : ''}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
                {sectionTabs.map(tab => {
                    const active = tab.key === activeSection;
                    return (
                        <Pressable key={tab.key} onPress={() => setActiveSection(tab.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            {selectedReqId && activeSection !== 'requisitions' && (
                <View style={{ marginTop: 8, backgroundColor: colors.primary[50], borderRadius: 10, padding: 8 }}>
                    <Text className="font-inter text-xs text-primary-600">
                        Viewing: {requisitions.find(r => r.id === selectedReqId)?.title ?? 'Selected Requisition'}
                    </Text>
                </View>
            )}
            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${activeSection}...`} /></View>
            {activeSection === 'requisitions' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
                    {REQ_STATUS_FILTERS.map(s => {
                        const active = s === statusFilter;
                        return (
                            <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                                <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{s}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (reqError && activeSection === 'requisitions') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => activeRefetch() }} /></View>;
        const messages: Record<Section, { title: string; msg: string }> = {
            requisitions: { title: 'No requisitions', msg: 'Create your first job requisition.' },
            candidates: { title: 'No candidates', msg: selectedReqId ? 'Add candidates to this requisition.' : 'Select a requisition first.' },
            interviews: { title: 'No interviews', msg: selectedReqId ? 'Schedule interviews for candidates.' : 'Select a requisition first.' },
        };
        const m = messages[activeSection];
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title={m.title} message={m.msg} /></View>;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeSection === 'requisitions') {
            return <RequisitionCard item={item} index={index} onPress={() => handleSelectReq(item)} onStatusChange={s => handleReqStatusChange(item, s)} onDelete={() => handleDeleteReq(item)} />;
        }
        if (activeSection === 'candidates') {
            return <CandidateCard item={item} index={index} onAdvance={() => handleAdvanceCandidate(item)} onReject={() => handleRejectCandidate(item)} />;
        }
        return <InterviewCard item={item} index={index} />;
    };

    const activeData = activeSection === 'requisitions' ? filteredReqs : activeSection === 'candidates' ? filteredCandidates : filteredInterviews;

    const handleFAB = () => {
        if (activeSection === 'requisitions') { setEditingReq(null); setReqFormVisible(true); }
        else if (activeSection === 'candidates') { setCandFormVisible(true); }
        else { setIntFormVisible(true); }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Recruitment</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={activeData} renderItem={renderItem} keyExtractor={(item: any) => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching2 && !isLoading} onRefresh={() => activeRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <RequisitionFormModal visible={reqFormVisible} onClose={() => setReqFormVisible(false)} onSave={handleSaveReq} initialData={editingReq} isSaving={createReq.isPending || updateReq.isPending} />
            <CandidateFormModal visible={candFormVisible} onClose={() => setCandFormVisible(false)} onSave={handleSaveCandidate} requisitionId={selectedReqId} isSaving={createCand.isPending} />
            <InterviewFormModal visible={intFormVisible} onClose={() => setIntFormVisible(false)} onSave={handleSaveInterview} candidateOptions={candidateOptions} isSaving={createInt.isPending} />
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
    lifecycleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.success[600] },
    rejectActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
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
