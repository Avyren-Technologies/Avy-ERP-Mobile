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
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useAppraisalCycles,
    useAppraisalEntries,
    useCalibrationData,
} from '@/features/company-admin/api/use-performance-queries';
import {
    useUpdateAppraisalEntry,
    useSubmitManagerReview,
    usePublishAppraisalEntry,
} from '@/features/company-admin/api/use-performance-mutations';

// ============ TYPES ============

type EntryStatus = 'PENDING' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'CALIBRATION' | 'PUBLISHED';

interface AppraisalEntryItem {
    id: string;
    cycleId: string;
    cycleName: string;
    employeeId: string;
    employeeName: string;
    departmentName: string;
    designationName: string;
    selfRating: number;
    managerRating: number;
    finalRating: number;
    ratingLabel: string;
    status: EntryStatus;
    kraScore: number;
    competencyScore: number;
}

interface CalibrationData {
    distribution: { label: string; count: number; percentage: number; target: number }[];
    averageRating: number;
    totalEntries: number;
    completedEntries: number;
}

// ============ CONSTANTS ============

const STATUS_COLORS: Record<EntryStatus, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    SELF_REVIEW: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    MANAGER_REVIEW: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    CALIBRATION: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
    PUBLISHED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
};

const RATING_LABELS: Record<number, { label: string; color: string }> = {
    5: { label: 'Outstanding', color: colors.success[600] },
    4: { label: 'Exceeds', color: colors.primary[600] },
    3: { label: 'Meets', color: colors.info[600] },
    2: { label: 'Below', color: colors.warning[600] },
    1: { label: 'Needs Improvement', color: colors.danger[600] },
};

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: EntryStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
    const label = status.replace(/_/g, ' ');
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{label}</Text>
        </View>
    );
}

function RatingBar({ label, value, maxValue = 5 }: { label: string; value: number; maxValue?: number }) {
    const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
    const barColor = value >= 4 ? colors.success[500] : value >= 3 ? colors.primary[500] : value >= 2 ? colors.warning[500] : colors.danger[500];
    return (
        <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text className="font-inter text-xs text-neutral-600">{label}</Text>
                <Text className="font-inter text-xs font-bold" style={{ color: barColor }}>{value.toFixed(1)}</Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
        </View>
    );
}

function CalibrationBar({ label, count, percentage, target }: { label: string; count: number; percentage: number; target: number }) {
    const barColor = Math.abs(percentage - target) <= 5 ? colors.success[500] : Math.abs(percentage - target) <= 10 ? colors.warning[500] : colors.danger[500];
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text className="font-inter text-xs font-semibold text-primary-950">{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text className="font-inter text-xs text-neutral-500">{count} ({percentage.toFixed(0)}%)</Text>
                    <Text className="font-inter text-[10px] text-neutral-400">Target: {target}%</Text>
                </View>
            </View>
            <View style={styles.calibrationTrack}>
                <View style={[styles.calibrationFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }]} />
                <View style={[styles.calibrationTarget, { left: `${Math.min(target, 100)}%` }]} />
            </View>
        </View>
    );
}

// ============ DETAIL MODAL ============

function EntryDetailModal({
    visible, onClose, item, onUpdateRating, onPublish, isSaving,
}: {
    visible: boolean; onClose: () => void;
    item: AppraisalEntryItem | null;
    onUpdateRating: (id: string, rating: number) => void;
    onPublish: (id: string) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [managerRating, setManagerRating] = React.useState('');

    React.useEffect(() => {
        if (visible && item) {
            setManagerRating(item.managerRating > 0 ? String(item.managerRating) : '');
        }
    }, [visible, item]);

    if (!item) return null;

    const ratingInfo = RATING_LABELS[Math.round(item.finalRating)] ?? RATING_LABELS[3];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 60 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-1">{item.employeeName}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mb-4">{item.designationName} - {item.departmentName}</Text>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {/* Current Ratings */}
                        <View style={styles.detailCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Rating Summary</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text className="font-inter text-2xl font-bold text-primary-600">{item.selfRating > 0 ? item.selfRating.toFixed(1) : '-'}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500">Self</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text className="font-inter text-2xl font-bold text-accent-600">{item.managerRating > 0 ? item.managerRating.toFixed(1) : '-'}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500">Manager</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text className="font-inter text-2xl font-bold" style={{ color: ratingInfo?.color ?? colors.info[600] }}>{item.finalRating > 0 ? item.finalRating.toFixed(1) : '-'}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500">Final</Text>
                                </View>
                            </View>
                            {item.finalRating > 0 && ratingInfo && (
                                <View style={[styles.ratingLabelBadge, { backgroundColor: ratingInfo.color + '15' }]}>
                                    <Text style={{ color: ratingInfo.color, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' }}>{item.ratingLabel || ratingInfo.label}</Text>
                                </View>
                            )}
                        </View>

                        {/* Score Breakdown */}
                        <View style={styles.detailCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Score Breakdown</Text>
                            <RatingBar label="KRA Score" value={item.kraScore} />
                            <RatingBar label="Competency Score" value={item.competencyScore} />
                        </View>

                        {/* Manager Rating Input */}
                        {(item.status === 'MANAGER_REVIEW' || item.status === 'CALIBRATION') && (
                            <View style={styles.detailCard}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Update Manager Rating</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter rating (1-5)"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={managerRating}
                                        onChangeText={setManagerRating}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <Pressable
                                    onPress={() => {
                                        const r = parseFloat(managerRating);
                                        if (r >= 1 && r <= 5) onUpdateRating(item.id, r);
                                    }}
                                    disabled={isSaving}
                                    style={[styles.actionBtn, isSaving && { opacity: 0.5 }]}
                                >
                                    <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Submit Rating'}</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Publish */}
                        {item.status === 'CALIBRATION' && (
                            <Pressable onPress={() => onPublish(item.id)} disabled={isSaving} style={[styles.publishBtn, isSaving && { opacity: 0.5 }]}>
                                <Text className="font-inter text-sm font-bold text-white">Publish Result</Text>
                            </Pressable>
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

// ============ ENTRY CARD ============

function EntryCard({ item, index, onPress }: { item: AppraisalEntryItem; index: number; onPress: () => void }) {
    const ratingInfo = RATING_LABELS[Math.round(item.finalRating)] ?? null;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.designationName}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 }}>
                    <View style={{ alignItems: 'center' }}>
                        <Text className="font-inter text-lg font-bold text-primary-600">{item.selfRating > 0 ? item.selfRating.toFixed(1) : '-'}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">Self</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text className="font-inter text-lg font-bold text-accent-600">{item.managerRating > 0 ? item.managerRating.toFixed(1) : '-'}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">Manager</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text className="font-inter text-lg font-bold" style={{ color: ratingInfo?.color ?? colors.neutral[400] }}>{item.finalRating > 0 ? item.finalRating.toFixed(1) : '-'}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">Final</Text>
                    </View>
                    {item.finalRating > 0 && ratingInfo && (
                        <View style={[styles.ratingLabelSmall, { backgroundColor: ratingInfo.color + '15' }]}>
                            <Text style={{ color: ratingInfo.color, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.ratingLabel || ratingInfo.label}</Text>
                        </View>
                    )}
                </View>
                {/* Mini progress bars */}
                <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text className="font-inter text-[10px] text-neutral-400" style={{ width: 28 }}>KRA</Text>
                        <View style={[styles.progressTrack, { flex: 1 }]}>
                            <View style={[styles.progressFill, { width: `${(item.kraScore / 5) * 100}%`, backgroundColor: colors.primary[500] }]} />
                        </View>
                        <Text className="font-inter text-[10px] font-semibold text-neutral-600" style={{ width: 24, textAlign: 'right' }}>{item.kraScore.toFixed(1)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text className="font-inter text-[10px] text-neutral-400" style={{ width: 28 }}>Comp</Text>
                        <View style={[styles.progressTrack, { flex: 1 }]}>
                            <View style={[styles.progressFill, { width: `${(item.competencyScore / 5) * 100}%`, backgroundColor: colors.accent[500] }]} />
                        </View>
                        <Text className="font-inter text-[10px] font-semibold text-neutral-600" style={{ width: 24, textAlign: 'right' }}>{item.competencyScore.toFixed(1)}</Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function RatingsScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: cyclesResponse } = useAppraisalCycles();
    const cycleOptions = React.useMemo(() => {
        const raw = (cyclesResponse as any)?.data ?? cyclesResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' }));
    }, [cyclesResponse]);

    const [selectedCycleId, setSelectedCycleId] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [cycleModalVisible, setCycleModalVisible] = React.useState(false);
    const [showCalibration, setShowCalibration] = React.useState(false);
    const [detailItem, setDetailItem] = React.useState<AppraisalEntryItem | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);

    const filterParams = React.useMemo(() => {
        const p: any = {};
        if (selectedCycleId) p.cycleId = selectedCycleId;
        return Object.keys(p).length ? p : undefined;
    }, [selectedCycleId]);

    const { data: response, isLoading, error, refetch, isFetching } = useAppraisalEntries(filterParams);
    const { data: calibrationResponse } = useCalibrationData(selectedCycleId);
    const updateEntryMutation = useUpdateAppraisalEntry();
    const managerReviewMutation = useSubmitManagerReview();
    const publishMutation = usePublishAppraisalEntry();

    const entries: AppraisalEntryItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            cycleId: item.cycleId ?? '',
            cycleName: item.cycleName ?? '',
            employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '',
            departmentName: item.departmentName ?? '',
            designationName: item.designationName ?? '',
            selfRating: item.selfRating ?? 0,
            managerRating: item.managerRating ?? 0,
            finalRating: item.finalRating ?? 0,
            ratingLabel: item.ratingLabel ?? '',
            status: item.status ?? 'PENDING',
            kraScore: item.kraScore ?? 0,
            competencyScore: item.competencyScore ?? 0,
        }));
    }, [response]);

    const calibration: CalibrationData | null = React.useMemo(() => {
        const raw = (calibrationResponse as any)?.data ?? calibrationResponse;
        if (!raw) return null;
        return {
            distribution: raw.distribution ?? [],
            averageRating: raw.averageRating ?? 0,
            totalEntries: raw.totalEntries ?? 0,
            completedEntries: raw.completedEntries ?? 0,
        };
    }, [calibrationResponse]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return entries;
        const q = search.toLowerCase();
        return entries.filter(e => e.employeeName.toLowerCase().includes(q) || e.departmentName.toLowerCase().includes(q));
    }, [entries, search]);

    const selectedCycleName = cycleOptions.find(c => c.id === selectedCycleId)?.name ?? 'All Cycles';

    const handleUpdateRating = (id: string, rating: number) => {
        managerReviewMutation.mutate({ id, data: { managerRating: rating } }, { onSuccess: () => setDetailVisible(false) });
    };

    const handlePublish = (id: string) => {
        showConfirm({
            title: 'Publish Result',
            message: 'Publish this appraisal result? The employee will be notified.',
            confirmText: 'Publish', variant: 'primary',
            onConfirm: () => publishMutation.mutate(id, { onSuccess: () => setDetailVisible(false) }),
        });
    };

    // Summary stats
    const stats = React.useMemo(() => {
        if (entries.length === 0) return null;
        const rated = entries.filter(e => e.finalRating > 0);
        const avg = rated.length > 0 ? rated.reduce((s, e) => s + e.finalRating, 0) / rated.length : 0;
        const completed = entries.filter(e => e.status === 'PUBLISHED').length;
        return { total: entries.length, rated: rated.length, avg, completed };
    }, [entries]);

    const renderItem = ({ item, index }: { item: AppraisalEntryItem; index: number }) => (
        <EntryCard item={item} index={index} onPress={() => { setDetailItem(item); setDetailVisible(true); }} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Ratings & Calibration</Text>

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

            {/* Stats row */}
            {stats && (
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-primary-600">{stats.total}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Total</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-accent-600">{stats.avg.toFixed(1)}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Avg Rating</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text className="font-inter text-lg font-bold text-success-600">{stats.completed}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500">Published</Text>
                    </View>
                </View>
            )}

            {/* Toggle calibration view */}
            {selectedCycleId ? (
                <Pressable onPress={() => setShowCalibration(!showCalibration)} style={[styles.toggleCalBtn, showCalibration && { backgroundColor: colors.primary[600] }]}>
                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M3 3v18h18M7 16l4-4 4 4 6-6" stroke={showCalibration ? colors.white : colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className={`font-inter text-xs font-semibold ${showCalibration ? 'text-white' : 'text-primary-600'}`}>Calibration View</Text>
                </Pressable>
            ) : null}

            {/* Calibration section */}
            {showCalibration && calibration && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.calibrationCard}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Bell Curve Distribution</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View>
                            <Text className="font-inter text-xs text-neutral-500">Average</Text>
                            <Text className="font-inter text-xl font-bold text-primary-600">{calibration.averageRating.toFixed(1)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text className="font-inter text-xs text-neutral-500">Completion</Text>
                            <Text className="font-inter text-xl font-bold text-primary-950">{calibration.completedEntries}/{calibration.totalEntries}</Text>
                        </View>
                    </View>
                    {calibration.distribution.map((d, i) => (
                        <CalibrationBar key={i} label={d.label} count={d.count} percentage={d.percentage} target={d.target} />
                    ))}
                </Animated.View>
            )}

            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search employees..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No entries match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No appraisal entries" message="Select a cycle to see ratings." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">Ratings & Calibration</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <EntryDetailModal
                visible={detailVisible} onClose={() => setDetailVisible(false)} item={detailItem}
                onUpdateRating={handleUpdateRating} onPublish={handlePublish}
                isSaving={managerReviewMutation.isPending || publishMutation.isPending}
            />
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
    progressTrack: { height: 4, backgroundColor: colors.neutral[200], borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    ratingLabelSmall: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
    ratingLabelBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'center' },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.primary[50] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
    },
    pickerSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    toggleCalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200], marginTop: 12 },
    calibrationCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.primary[100] },
    calibrationTrack: { height: 8, backgroundColor: colors.neutral[200], borderRadius: 4, overflow: 'hidden', position: 'relative' },
    calibrationFill: { height: '100%', borderRadius: 4 },
    calibrationTarget: { position: 'absolute', top: -2, width: 2, height: 12, backgroundColor: colors.primary[900], borderRadius: 1 },
    detailCard: { backgroundColor: colors.neutral[50], borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200], marginTop: 16 },
    actionBtn: { height: 46, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', marginTop: 12 },
    publishBtn: { height: 46, borderRadius: 12, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center', marginTop: 4, marginBottom: 12 },
});
