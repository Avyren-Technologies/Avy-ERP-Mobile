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

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useFeedback360List,
    useAppraisalCycles,
    useFeedback360Report,
} from '@/features/company-admin/api/use-performance-queries';
import {
    useCreateFeedback360,
    useUpdateFeedback360,
} from '@/features/company-admin/api/use-performance-mutations';

// ============ TYPES ============

// Backend enum: RaterType { SELF, MANAGER, PEER, SUBORDINATE, CROSS_FUNCTION, INTERNAL_CUSTOMER }
type FeedbackType = 'SELF' | 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'CROSS_FUNCTION' | 'INTERNAL_CUSTOMER';
type FeedbackStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

interface FeedbackItem {
    id: string;
    cycleId: string;
    cycleName: string;
    employeeId: string;
    employeeName: string;
    raterName: string;
    raterType: FeedbackType;
    status: FeedbackStatus;
    overallRating: number;
    submittedAt: string;
    comments: string;
}

// ============ CONSTANTS ============

const RATER_TYPE_LABELS: Record<FeedbackType, string> = {
    SELF: 'Self',
    MANAGER: 'Manager',
    PEER: 'Peer',
    SUBORDINATE: 'Direct Report',
    CROSS_FUNCTION: 'Cross Function',
    INTERNAL_CUSTOMER: 'Internal Customer',
};

const FEEDBACK_TYPES: FeedbackType[] = ['SELF', 'MANAGER', 'PEER', 'SUBORDINATE', 'CROSS_FUNCTION', 'INTERNAL_CUSTOMER'];

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string; dot: string }> = {
    Pending: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    'In Progress': { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Completed: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Cancelled: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
};

const TYPE_COLORS: Record<FeedbackType, { bg: string; text: string }> = {
    PEER: { bg: colors.primary[50], text: colors.primary[700] },
    MANAGER: { bg: colors.accent[50], text: colors.accent[700] },
    SUBORDINATE: { bg: colors.info[50], text: colors.info[700] },
    SELF: { bg: colors.success[50], text: colors.success[700] },
    CROSS_FUNCTION: { bg: colors.warning[50], text: colors.warning[700] },
    INTERNAL_CUSTOMER: { bg: colors.neutral[100], text: colors.neutral[700] },
};

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: FeedbackStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function TypeBadge({ type }: { type: FeedbackType }) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.PEER;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{RATER_TYPE_LABELS[type] ?? type}</Text>
        </View>
    );
}

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: max }, (_, i) => (
                <Svg key={i} width={14} height={14} viewBox="0 0 24 24">
                    <Path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z"
                        fill={i < Math.round(rating) ? colors.warning[400] : colors.neutral[200]}
                        stroke="none"
                    />
                </Svg>
            ))}
        </View>
    );
}

// ============ REPORT MODAL ============

function ReportModal({
    visible, onClose, employeeId, cycleId, employeeName,
}: {
    visible: boolean; onClose: () => void;
    employeeId: string; cycleId: string; employeeName: string;
}) {
    const insets = useSafeAreaInsets();
    const { data: reportResponse, isLoading } = useFeedback360Report(
        visible ? employeeId : '',
        visible ? cycleId : '',
    );

    const report = React.useMemo(() => {
        const raw = (reportResponse as any)?.data ?? reportResponse;
        if (!raw) return null;
        return {
            overallAverage: raw.overallAverage ?? 0,
            totalResponses: raw.totalResponses ?? 0,
            byType: raw.byType ?? [],
            strengths: raw.strengths ?? [],
            improvements: raw.improvements ?? [],
        };
    }, [reportResponse]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 60 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        360 Report - {employeeName}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {isLoading ? (
                            <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>
                        ) : report ? (
                            <>
                                {/* Summary */}
                                <View style={styles.reportCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text className="font-inter text-xs text-neutral-500">Overall Average</Text>
                                            <Text className="font-inter text-2xl font-bold text-primary-600">{report.overallAverage.toFixed(1)}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text className="font-inter text-xs text-neutral-500">Responses</Text>
                                            <Text className="font-inter text-2xl font-bold text-primary-950">{report.totalResponses}</Text>
                                        </View>
                                    </View>
                                    <RatingStars rating={report.overallAverage} />
                                </View>

                                {/* By Type */}
                                {Array.isArray(report.byType) && report.byType.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">By Rater Type</Text>
                                        {report.byType.map((item: any, idx: number) => (
                                            <View key={idx} style={styles.reportRow}>
                                                <Text className="font-inter text-sm text-primary-950" style={{ flex: 1 }}>{RATER_TYPE_LABELS[item.type as FeedbackType] ?? RATER_TYPE_LABELS[item.raterType as FeedbackType] ?? item.type ?? item.raterType}</Text>
                                                <Text className="font-inter text-sm font-bold text-primary-600">{(item.average ?? item.avgRating ?? 0).toFixed(1)}</Text>
                                                <Text className="font-inter text-xs text-neutral-400 ml-2">({item.count ?? 0})</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Strengths */}
                                {Array.isArray(report.strengths) && report.strengths.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-success-600 mb-2">Strengths</Text>
                                        {report.strengths.map((s: string, i: number) => (
                                            <View key={i} style={styles.bulletRow}>
                                                <View style={[styles.bulletDot, { backgroundColor: colors.success[500] }]} />
                                                <Text className="font-inter text-sm text-primary-950" style={{ flex: 1 }}>{s}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Improvements */}
                                {Array.isArray(report.improvements) && report.improvements.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-warning-600 mb-2">Areas for Improvement</Text>
                                        {report.improvements.map((s: string, i: number) => (
                                            <View key={i} style={styles.bulletRow}>
                                                <View style={[styles.bulletDot, { backgroundColor: colors.warning[500] }]} />
                                                <Text className="font-inter text-sm text-primary-950" style={{ flex: 1 }}>{s}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                                <EmptyState icon="inbox" title="No report data" message="No feedback data available for this employee." />
                            </View>
                        )}
                    </ScrollView>
                    <Pressable onPress={onClose} style={styles.cancelBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ FORM MODAL ============

interface FeedbackForm {
    cycleId: string;
    employeeName: string;
    raterName: string;
    raterType: FeedbackType;
    comments: string;
}

const EMPTY_FORM: FeedbackForm = {
    cycleId: '', employeeName: '', raterName: '', raterType: 'PEER', comments: '',
};

function FeedbackFormModal({
    visible, onClose, onSave, isSaving, cycleOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    isSaving: boolean;
    cycleOptions: { id: string; name: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<FeedbackForm>(EMPTY_FORM);
    const [cyclePickerVisible, setCyclePickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) setForm(EMPTY_FORM);
    }, [visible]);

    const update = <K extends keyof FeedbackForm>(key: K, val: FeedbackForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const selectedCycleName = cycleOptions.find(c => c.id === form.cycleId)?.name ?? '';
    const isValid = form.employeeName.trim() && form.raterName.trim() && form.cycleId;

    const handleSave = () => {
        if (!isValid) return;
        onSave({ ...form } as unknown as Record<string, unknown>);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 60 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New 360 Feedback</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {/* Cycle picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Cycle <Text className="text-danger-500">*</Text></Text>
                            <Pressable onPress={() => setCyclePickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${selectedCycleName ? 'font-semibold text-primary-950' : 'text-neutral-400'}`}>{selectedCycleName || 'Select cycle...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={cyclePickerVisible} transparent animationType="slide" onRequestClose={() => setCyclePickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCyclePickerVisible(false)} />
                                    <View style={[styles.pickerSheet, { maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Cycle</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {cycleOptions.map(c => (
                                                <Pressable key={c.id} onPress={() => { update('cycleId', c.id); setCyclePickerVisible(false); }}
                                                    style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: c.id === form.cycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                                    <Text className={`font-inter text-sm ${c.id === form.cycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{c.name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Employee <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Employee name..." placeholderTextColor={colors.neutral[400]} value={form.employeeName} onChangeText={v => update('employeeName', v)} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Rater <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Rater name..." placeholderTextColor={colors.neutral[400]} value={form.raterName} onChangeText={v => update('raterName', v)} /></View>
                        </View>

                        {/* Type chips */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Feedback Type</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {FEEDBACK_TYPES.map(t => {
                                    const sel = t === form.raterType;
                                    return (
                                        <Pressable key={t} onPress={() => update('raterType', t)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{RATER_TYPE_LABELS[t]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Comments</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Additional notes..." placeholderTextColor={colors.neutral[400]} value={form.comments} onChangeText={v => update('comments', v)} multiline />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Create Feedback'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ FEEDBACK CARD ============

function FeedbackCard({ item, index, onViewReport }: {
    item: FeedbackItem; index: number; onViewReport: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onViewReport} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">Rater: {item.raterName}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <TypeBadge type={item.raterType} />
                    {item.cycleName ? (
                        <View style={[styles.badge, { backgroundColor: colors.neutral[100] }]}>
                            <Text style={{ color: colors.neutral[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.cycleName}</Text>
                        </View>
                    ) : null}
                </View>
                {item.overallRating > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <RatingStars rating={item.overallRating} />
                        <Text className="font-inter text-xs font-semibold text-primary-600">{item.overallRating.toFixed(1)}</Text>
                    </View>
                )}
                {item.comments ? (
                    <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.comments}</Text>
                ) : null}
                {item.submittedAt ? (
                    <Text className="mt-1 font-inter text-[10px] text-neutral-400">Submitted: {item.submittedAt}</Text>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function Feedback360Screen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { modalProps: confirmModalProps } = useConfirmModal();

    const { data: cyclesResponse } = useAppraisalCycles();
    const cycleOptions = React.useMemo(() => {
        const raw = (cyclesResponse as any)?.data ?? cyclesResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' }));
    }, [cyclesResponse]);

    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [reportVisible, setReportVisible] = React.useState(false);
    const [reportTarget, setReportTarget] = React.useState({ employeeId: '', cycleId: '', employeeName: '' });
    const [cycleModalVisible, setCycleModalVisible] = React.useState(false);

    const filterParams = React.useMemo(() => {
        const p: any = {};
        if (selectedCycleId) p.cycleId = selectedCycleId;
        return Object.keys(p).length ? p : undefined;
    }, [selectedCycleId]);

    const { data: response, isLoading, error, refetch, isFetching } = useFeedback360List(filterParams);
    const createMutation = useCreateFeedback360();

    const feedbackList: FeedbackItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            cycleId: item.cycleId ?? '',
            cycleName: item.cycleName ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            raterName: item.raterName ?? '',
            raterType: item.raterType ?? 'PEER',
            status: item.status ?? 'Pending',
            overallRating: item.overallRating ?? 0,
            submittedAt: item.submittedAt ?? '',
            comments: item.comments ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return feedbackList;
        const q = search.toLowerCase();
        return feedbackList.filter(f => f.employeeName.toLowerCase().includes(q) || f.raterName.toLowerCase().includes(q));
    }, [feedbackList, search]);

    const selectedCycleName = cycleOptions.find(c => c.id === selectedCycleId)?.name ?? 'All Cycles';

    const handleViewReport = (item: FeedbackItem) => {
        setReportTarget({ employeeId: item.employeeId, cycleId: item.cycleId, employeeName: item.employeeName });
        setReportVisible(true);
    };

    const handleSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: FeedbackItem; index: number }) => (
        <FeedbackCard item={item} index={index} onViewReport={() => handleViewReport(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">360 Feedback</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{feedbackList.length} feedback entr{feedbackList.length !== 1 ? 'ies' : 'y'}</Text>

            {/* Cycle filter */}
            <Pressable onPress={() => setCycleModalVisible(true)} style={styles.dropdownBtn}>
                <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>{selectedCycleName}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={cycleModalVisible} transparent animationType="slide" onRequestClose={() => setCycleModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCycleModalVisible(false)} />
                    <View style={[styles.pickerSheet, { maxHeight: '50%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Select Cycle</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Pressable onPress={() => { setSelectedCycleId(''); setCycleModalVisible(false); }}
                                style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: !selectedCycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                <Text className={`font-inter text-sm ${!selectedCycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>All Cycles</Text>
                            </Pressable>
                            {cycleOptions.map(c => (
                                <Pressable key={c.id} onPress={() => { setSelectedCycleId(c.id); setCycleModalVisible(false); }}
                                    style={{ paddingVertical: 12, paddingHorizontal: 4, backgroundColor: c.id === selectedCycleId ? colors.primary[50] : undefined, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                    <Text className={`font-inter text-sm ${c.id === selectedCycleId ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{c.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search employees or raters..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No feedback matches "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No feedback" message="Create your first 360 feedback request." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">360 Feedback</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <FeedbackFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} isSaving={createMutation.isPending} cycleOptions={cycleOptions} />
            <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} employeeId={reportTarget.employeeId} cycleId={reportTarget.cycleId} employeeName={reportTarget.employeeName} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    gradientHeader: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
    },
    pickerSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200], marginTop: 16 },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    reportCard: { backgroundColor: colors.primary[50], borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.primary[100] },
    reportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
});
