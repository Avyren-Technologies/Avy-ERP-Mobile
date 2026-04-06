/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

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

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useConvertCandidateToEmployee,
    useCreateCandidateDocument,
    useCreateCandidateEducation,
    useCreateCandidateExperience,
    useDeleteCandidateDocument,
    useDeleteCandidateEducation,
    useDeleteCandidateExperience,
    useUpdateCandidateEducation,
    useUpdateCandidateExperience,
} from '@/features/company-admin/api/use-recruitment-mutations';
import {
    useCandidate,
    useCandidateDocuments,
    useCandidateEducation,
    useCandidateExperience,
    useInterviews,
    useOffers,
} from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
type CandidateSource = 'Portal' | 'Referral' | 'LinkedIn' | 'Agency' | 'Walk-in' | 'Other';
type DetailTab = 'education' | 'experience' | 'documents' | 'interviews' | 'offers' | 'history';

interface EducationItem {
    id: string;
    degree?: string;
    institution?: string;
    fieldOfStudy?: string;
    startYear?: string;
    endYear?: string;
    grade?: string;
}

interface ExperienceItem {
    id: string;
    jobTitle?: string;
    company?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
}

interface DocumentItem {
    id: string;
    title?: string;
    type?: string;
    fileUrl?: string;
}

interface InterviewItem {
    id: string;
    round?: number;
    datetime?: string;
    status?: string;
    panelists?: string[];
    feedbackRating?: number;
    feedbackNotes?: string;
}

interface OfferItem {
    id: string;
    offeredCTC?: number;
    joiningDate?: string;
    status?: string;
    validUntil?: string;
}

interface HistoryItem {
    id: string;
    stage?: string;
    fromStage?: string;
    toStage?: string;
    notes?: string;
    reason?: string;
    createdAt?: string;
}

// ============ CONSTANTS ============

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

const OFFER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[600] },
    SENT: { bg: colors.info[50], text: colors.info[700] },
    ACCEPTED: { bg: colors.success[50], text: colors.success[700] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700] },
    WITHDRAWN: { bg: colors.warning[50], text: colors.warning[700] },
    EXPIRED: { bg: colors.neutral[100], text: colors.neutral[500] },
};

const TABS: { key: DetailTab; label: string }[] = [
    { key: 'education', label: 'Education' },
    { key: 'experience', label: 'Experience' },
    { key: 'documents', label: 'Documents' },
    { key: 'interviews', label: 'Interviews' },
    { key: 'offers', label: 'Offers' },
    { key: 'history', label: 'History' },
];

// ============ SHARED ATOMS ============

function StageBadge({ stage }: { stage: CandidateStage }) {
    const c = STAGE_COLORS[stage] ?? STAGE_COLORS.Applied;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: c.text }}>{stage}</Text>
        </View>
    );
}

function SourceBadge({ source }: { source: CandidateSource }) {
    const c = SOURCE_COLORS[source] ?? SOURCE_COLORS.Other;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: c.text }}>{source}</Text>
        </View>
    );
}

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: max }, (_, i) => (
                <Svg key={i} width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={i < rating ? colors.warning[400] : colors.neutral[200]} stroke="none" />
                </Svg>
            ))}
        </View>
    );
}

function AvatarCircle({ name, size = 48 }: { name: string; size?: number }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text className="font-inter text-sm font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

// ============ EDUCATION FORM MODAL ============

function EducationFormModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [institution, setInstitution] = React.useState('');
    const [degree, setDegree] = React.useState('');
    const [fieldOfStudy, setFieldOfStudy] = React.useState('');
    const [startYear, setStartYear] = React.useState('');
    const [endYear, setEndYear] = React.useState('');
    const [grade, setGrade] = React.useState('');

    React.useEffect(() => {
        if (visible) { setInstitution(''); setDegree(''); setFieldOfStudy(''); setStartYear(''); setEndYear(''); setGrade(''); }
    }, [visible]);

    const isValid = institution.trim() && degree.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Add Education</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Institution <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. MIT" placeholderTextColor={colors.neutral[400]} value={institution} onChangeText={setInstitution} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Degree <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. B.Tech" placeholderTextColor={colors.neutral[400]} value={degree} onChangeText={setDegree} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Field of Study</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Computer Science" placeholderTextColor={colors.neutral[400]} value={fieldOfStudy} onChangeText={setFieldOfStudy} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Start Year</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="2020" placeholderTextColor={colors.neutral[400]} value={startYear} onChangeText={setStartYear} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">End Year</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="2024" placeholderTextColor={colors.neutral[400]} value={endYear} onChangeText={setEndYear} keyboardType="number-pad" /></View>
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Grade / GPA</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 3.8 / 4.0" placeholderTextColor={colors.neutral[400]} value={grade} onChangeText={setGrade} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ institution: institution.trim(), degree: degree.trim(), fieldOfStudy: fieldOfStudy.trim() || undefined, startYear: startYear ? Number(startYear) : undefined, endYear: endYear ? Number(endYear) : undefined, grade: grade.trim() || undefined })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Adding...' : 'Add'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ EXPERIENCE FORM MODAL ============

function ExperienceFormModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [company, setCompany] = React.useState('');
    const [jobTitle, setJobTitle] = React.useState('');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [description, setDescription] = React.useState('');

    React.useEffect(() => {
        if (visible) { setCompany(''); setJobTitle(''); setStartDate(''); setEndDate(''); setDescription(''); }
    }, [visible]);

    const isValid = company.trim() && jobTitle.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Add Experience</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Company <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Google" placeholderTextColor={colors.neutral[400]} value={company} onChangeText={setCompany} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Job Title <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Software Engineer" placeholderTextColor={colors.neutral[400]} value={jobTitle} onChangeText={setJobTitle} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Start Date</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={startDate} onChangeText={setStartDate} /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">End Date</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={endDate} onChangeText={setEndDate} /></View>
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80, paddingVertical: 10 }]}>
                                <TextInput style={[styles.textInput, { flex: 1, textAlignVertical: 'top' }]} placeholder="Role description..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ company: company.trim(), jobTitle: jobTitle.trim(), startDate: startDate.trim() || undefined, endDate: endDate.trim() || undefined, description: description.trim() || undefined })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Adding...' : 'Add'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DOCUMENT FORM MODAL ============

function DocumentFormModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = React.useState('');
    const [type, setType] = React.useState('');
    const [url, setUrl] = React.useState('');

    React.useEffect(() => {
        if (visible) { setTitle(''); setType(''); setUrl(''); }
    }, [visible]);

    const isValid = title.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Add Document</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Title <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Resume" placeholderTextColor={colors.neutral[400]} value={title} onChangeText={setTitle} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Type</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Resume, Certificate" placeholderTextColor={colors.neutral[400]} value={type} onChangeText={setType} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">URL</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="https://..." placeholderTextColor={colors.neutral[400]} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ title: title.trim(), type: type.trim() || undefined, url: url.trim() || undefined })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Uploading...' : 'Add'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SECTION CARDS ============

function EducationCard({ item, index, onDelete }: { item: EducationItem; index: number; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.degree}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.institution}</Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {item.fieldOfStudy ? <Text className="mt-1 font-inter text-xs text-neutral-500">{item.fieldOfStudy}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    {item.startYear ? <Text className="font-inter text-xs text-neutral-400">{item.startYear} - {item.endYear || 'Present'}</Text> : null}
                    {item.grade ? <Text className="font-inter text-xs text-neutral-400">Grade: {item.grade}</Text> : null}
                </View>
            </View>
        </Animated.View>
    );
}

function ExperienceCard({ item, index, onDelete }: { item: ExperienceItem; index: number; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.jobTitle}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.company}</Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {item.description ? <Text className="mt-1 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.description}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    {item.startDate ? <Text className="font-inter text-xs text-neutral-400">{item.startDate} - {item.endDate || 'Present'}</Text> : null}
                </View>
            </View>
        </Animated.View>
    );
}

function DocumentCard({ item, index, onDelete }: { item: DocumentItem; index: number; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.info[50] }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.info[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.info[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.title}</Text>
                            {item.type ? <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.type}</Text> : null}
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

function InterviewCard({ item, index }: { item: InterviewItem; index: number }) {
    const statusColors: Record<string, { bg: string; text: string }> = {
        Scheduled: { bg: colors.info[50], text: colors.info[700] },
        Completed: { bg: colors.success[50], text: colors.success[700] },
        Cancelled: { bg: colors.neutral[100], text: colors.neutral[600] },
        'No Show': { bg: colors.danger[50], text: colors.danger[700] },
    };
    const sc = statusColors[item.status ?? 'Scheduled'] ?? statusColors.Scheduled;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">Round {item.round}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.datetime}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: sc.text }}>{item.status}</Text>
                    </View>
                </View>
                {item.panelists && item.panelists.length > 0 && (
                    <Text className="mt-1 font-inter text-xs text-neutral-500">Panel: {item.panelists.join(', ')}</Text>
                )}
                {item.feedbackRating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Text className="font-inter text-xs text-neutral-400">Rating: {item.feedbackRating}/10</Text>
                        {item.feedbackNotes ? <Text className="font-inter text-xs text-neutral-400" numberOfLines={1}>- {item.feedbackNotes}</Text> : null}
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
}

function OfferCard({ item, index }: { item: OfferItem; index: number }) {
    const sc = OFFER_STATUS_COLORS[item.status ?? 'DRAFT'] ?? OFFER_STATUS_COLORS.DRAFT;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            {'\u20B9'}{(item.offeredCTC ?? 0).toLocaleString('en-IN')} CTC
                        </Text>
                        {item.joiningDate ? <Text className="mt-0.5 font-inter text-xs text-neutral-500">Joining: {item.joiningDate}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: sc.text }}>{item.status}</Text>
                    </View>
                </View>
                {item.validUntil ? <Text className="mt-1 font-inter text-xs text-neutral-400">Valid until: {item.validUntil}</Text> : null}
            </View>
        </Animated.View>
    );
}

function HistoryCard({ item, index }: { item: HistoryItem; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ alignItems: 'center', width: 20 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500], marginTop: 4 }} />
                    <View style={{ width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: 2 }} />
                </View>
                <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.stage ?? item.fromStage} {item.toStage ? `\u2192 ${item.toStage}` : ''}</Text>
                    {item.notes ? <Text className="mt-1 font-inter text-xs text-neutral-500">{item.notes}</Text> : null}
                    {item.reason ? <Text className="mt-1 font-inter text-xs text-neutral-400">Reason: {item.reason}</Text> : null}
                    {item.createdAt ? <Text className="mt-1 font-inter text-xs text-neutral-300">{item.createdAt}</Text> : null}
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CandidateDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ id?: string }>();
    const candidateId = params.id ?? '';
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<DetailTab>('education');
    const [eduFormVisible, setEduFormVisible] = React.useState(false);
    const [expFormVisible, setExpFormVisible] = React.useState(false);
    const [docFormVisible, setDocFormVisible] = React.useState(false);

    // Queries
    const { data: candidateResponse, isLoading: candidateLoading, refetch: candidateRefetch } = useCandidate(candidateId);
    const { data: eduResponse, isLoading: eduLoading, refetch: eduRefetch, isFetching: eduFetching } = useCandidateEducation(candidateId);
    const { data: expResponse, isLoading: expLoading, refetch: expRefetch, isFetching: expFetching } = useCandidateExperience(candidateId);
    const { data: docResponse, isLoading: docLoading, refetch: docRefetch, isFetching: docFetching } = useCandidateDocuments(candidateId);
    const { data: intResponse, isLoading: intLoading, refetch: intRefetch, isFetching: intFetching } = useInterviews(candidateId ? { candidateId } : undefined);
    const { data: offerResponse, isLoading: offerLoading, refetch: offerRefetch, isFetching: offerFetching } = useOffers(candidateId ? { candidateId } as Record<string, unknown> : undefined);

    // Mutations
    const createEdu = useCreateCandidateEducation();
    const deleteEdu = useDeleteCandidateEducation();
    const createExp = useCreateCandidateExperience();
    const deleteExp = useDeleteCandidateExperience();
    const createDoc = useCreateCandidateDocument();
    const deleteDoc = useDeleteCandidateDocument();
    const convertMut = useConvertCandidateToEmployee();

    // Parse data
    const candidate = React.useMemo(() => {
        const raw = candidateResponse?.data ?? candidateResponse;
        if (!raw) return null;
        return {
            id: raw.id ?? '', name: raw.name ?? '', email: raw.email ?? '', phone: raw.phone ?? '',
            source: (raw.source ?? 'Other') as CandidateSource, stage: (raw.stage ?? 'Applied') as CandidateStage,
            rating: raw.rating ?? 0, stageHistory: raw.stageHistory ?? raw.StageHistory ?? [],
        };
    }, [candidateResponse]);

    const education = React.useMemo(() => {
        const raw = eduResponse?.data ?? eduResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [eduResponse]);

    const experience = React.useMemo(() => {
        const raw = expResponse?.data ?? expResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [expResponse]);

    const documents = React.useMemo(() => {
        const raw = docResponse?.data ?? docResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [docResponse]);

    const interviews = React.useMemo(() => {
        const raw = intResponse?.data ?? intResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [intResponse]);

    const offers = React.useMemo(() => {
        const raw = offerResponse?.data ?? offerResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [offerResponse]);

    const stageHistory = React.useMemo(() => {
        return candidate?.stageHistory ?? [];
    }, [candidate]);

    // Handlers
    const handleSaveEducation = (data: Record<string, unknown>) => {
        createEdu.mutate({ candidateId, data }, { onSuccess: () => setEduFormVisible(false) });
    };

    const handleDeleteEducation = (id: string) => {
        showConfirm({
            title: 'Delete Education',
            message: 'Delete this education record?',
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteEdu.mutate(id),
        });
    };

    const handleSaveExperience = (data: Record<string, unknown>) => {
        createExp.mutate({ candidateId, data }, { onSuccess: () => setExpFormVisible(false) });
    };

    const handleDeleteExperience = (id: string) => {
        showConfirm({
            title: 'Delete Experience',
            message: 'Delete this experience record?',
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteExp.mutate(id),
        });
    };

    const handleSaveDocument = (data: Record<string, unknown>) => {
        createDoc.mutate({ candidateId, data }, { onSuccess: () => setDocFormVisible(false) });
    };

    const handleDeleteDocument = (id: string) => {
        showConfirm({
            title: 'Delete Document',
            message: 'Delete this document?',
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteDoc.mutate(id),
        });
    };

    const handleConvertToEmployee = () => {
        showConfirm({
            title: 'Convert to Employee',
            message: `Convert ${candidate?.name} to an employee record? This will create a new employee entry.`,
            confirmText: 'Convert', variant: 'primary',
            onConfirm: () => convertMut.mutate(candidateId),
        });
    };

    // Active data
    const getActiveData = (): any[] => {
        switch (activeTab) {
            case 'education': return education;
            case 'experience': return experience;
            case 'documents': return documents;
            case 'interviews': return interviews;
            case 'offers': return offers;
            case 'history': return stageHistory;
        }
    };

    const getActiveLoading = () => {
        switch (activeTab) {
            case 'education': return eduLoading;
            case 'experience': return expLoading;
            case 'documents': return docLoading;
            case 'interviews': return intLoading;
            case 'offers': return offerLoading;
            case 'history': return candidateLoading;
        }
    };

    const getActiveFetching = () => {
        switch (activeTab) {
            case 'education': return eduFetching;
            case 'experience': return expFetching;
            case 'documents': return docFetching;
            case 'interviews': return intFetching;
            case 'offers': return offerFetching;
            case 'history': return false;
        }
    };

    const getActiveRefetch = () => {
        switch (activeTab) {
            case 'education': return eduRefetch;
            case 'experience': return expRefetch;
            case 'documents': return docRefetch;
            case 'interviews': return intRefetch;
            case 'offers': return offerRefetch;
            case 'history': return candidateRefetch;
        }
    };

    const showFAB = activeTab === 'education' || activeTab === 'experience' || activeTab === 'documents';

    const handleFAB = () => {
        if (activeTab === 'education') setEduFormVisible(true);
        else if (activeTab === 'experience') setExpFormVisible(true);
        else if (activeTab === 'documents') setDocFormVisible(true);
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            {/* Profile Card */}
            {candidate ? (
                <View style={styles.profileCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <AvatarCircle name={candidate.name} size={48} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-base font-bold text-primary-950">{candidate.name}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{candidate.email}</Text>
                            {candidate.phone ? <Text className="mt-0.5 font-inter text-xs text-neutral-400">{candidate.phone}</Text> : null}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <SourceBadge source={candidate.source} />
                        <StageBadge stage={candidate.stage} />
                        <RatingStars rating={candidate.rating} />
                    </View>
                    {candidate.stage === 'Hired' && (
                        <Pressable onPress={handleConvertToEmployee} disabled={convertMut.isPending}
                            style={[styles.convertBtn, convertMut.isPending && { opacity: 0.5 }]}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">{convertMut.isPending ? 'Converting...' : 'Convert to Employee'}</Text>
                        </Pressable>
                    )}
                </View>
            ) : candidateLoading ? (
                <SkeletonCard />
            ) : null}

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
                {TABS.map(tab => {
                    const active = tab.key === activeTab;
                    return (
                        <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (getActiveLoading()) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        const messages: Record<DetailTab, { title: string; msg: string }> = {
            education: { title: 'No education records', msg: 'Add education history for this candidate.' },
            experience: { title: 'No experience records', msg: 'Add work experience for this candidate.' },
            documents: { title: 'No documents', msg: 'Upload documents for this candidate.' },
            interviews: { title: 'No interviews', msg: 'No interviews scheduled for this candidate.' },
            offers: { title: 'No offers', msg: 'No offers made to this candidate yet.' },
            history: { title: 'No stage history', msg: 'No stage transitions recorded.' },
        };
        const m = messages[activeTab];
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title={m.title} message={m.msg} /></View>;
    };

    type CardItem = EducationItem | ExperienceItem | DocumentItem | InterviewItem | OfferItem | HistoryItem;

    const renderItem = ({ item, index }: { item: CardItem; index: number }) => {
        switch (activeTab) {
            case 'education':
                return <EducationCard item={item as EducationItem} index={index} onDelete={() => handleDeleteEducation(item.id)} />;
            case 'experience':
                return <ExperienceCard item={item as ExperienceItem} index={index} onDelete={() => handleDeleteExperience(item.id)} />;
            case 'documents':
                return <DocumentCard item={item as DocumentItem} index={index} onDelete={() => handleDeleteDocument(item.id)} />;
            case 'interviews':
                return <InterviewCard item={item as InterviewItem} index={index} />;
            case 'offers':
                return <OfferCard item={item as OfferItem} index={index} />;
            case 'history':
                return <HistoryCard item={item as HistoryItem} index={index} />;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Candidate Profile" onMenuPress={toggle} />
            <FlatList
                data={getActiveData()} renderItem={renderItem} keyExtractor={(item, idx) => item.id ?? String(idx)}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={getActiveFetching() && !getActiveLoading()} onRefresh={() => getActiveRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            {showFAB && <FAB onPress={handleFAB} />}
            <EducationFormModal visible={eduFormVisible} onClose={() => setEduFormVisible(false)} onSave={handleSaveEducation} isSaving={createEdu.isPending} />
            <ExperienceFormModal visible={expFormVisible} onClose={() => setExpFormVisible(false)} onSave={handleSaveExperience} isSaving={createExp.isPending} />
            <DocumentFormModal visible={docFormVisible} onClose={() => setDocFormVisible(false)} onSave={handleSaveDocument} isSaving={createDoc.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    profileCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    convertBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 12, height: 40, borderRadius: 12, backgroundColor: colors.success[600],
        shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
