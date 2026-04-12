/* eslint-disable better-tailwindcss/no-unknown-classes */
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
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useEssSubmitSelfReview } from '@/features/company-admin/api/use-ess-mutations';
import { useMyAppraisals } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Types ────────────────────────────────────────────────────────

type AppraisalStatus = 'PENDING' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'PUBLISHED';

interface AppraisalGoal {
    id: string;
    title: string;
    weightage?: number;
    selfRating?: number | null;
    managerRating?: number | null;
    finalRating?: number | null;
}

interface AppraisalEntry {
    id: string;
    cycleName?: string;
    cycle?: { name: string; startDate?: string; endDate?: string };
    status: AppraisalStatus;
    selfRating?: number | null;
    managerRating?: number | null;
    finalRating?: number | null;
    selfComments?: string | null;
    managerComments?: string | null;
    goals?: AppraisalGoal[];
}

// ── Status Colors ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500], label: 'Pending' },
    SELF_REVIEW: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500], label: 'Self Review' },
    MANAGER_REVIEW: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500], label: 'Manager Review' },
    PUBLISHED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500], label: 'Published' },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
        </View>
    );
}

// ── Rating Display ───────────────────────────────────────────────

/** API may send ratings as numbers or numeric strings. */
function formatRatingPill(value: unknown): string {
    if (value == null) return '—';
    if (typeof value === 'string' && value.trim() === '') return '—';
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function RatingPill({ label, value }: { label: string; value?: unknown }) {
    return (
        <View style={styles.ratingPill}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{label}</Text>
            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {formatRatingPill(value)}
            </Text>
        </View>
    );
}

// ── Self-Review Modal ────────────────────────────────────────────

function SelfReviewModal({
    visible,
    entry,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    entry: AppraisalEntry | null;
    onClose: () => void;
    onSubmit: (data: { goalRatings: Record<string, number>; overallRating: number; selfComments: string }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [goalRatings, setGoalRatings] = React.useState<Record<string, number>>({});
    const [overallRating, setOverallRating] = React.useState('');
    const [selfComments, setSelfComments] = React.useState('');

    React.useEffect(() => {
        if (visible && entry) {
            setGoalRatings({});
            setOverallRating('');
            setSelfComments('');
        }
    }, [visible, entry]);

    const goals = entry?.goals ?? [];

    const parsedOverall = parseFloat(overallRating);
    const isOverallValid = !isNaN(parsedOverall) && parsedOverall >= 1 && parsedOverall <= 5;
    const allGoalsRated = goals.length === 0 || goals.every((g) => {
        const r = goalRatings[g.id];
        return r != null && r >= 1 && r <= 5;
    });
    const isValid = isOverallValid && allGoalsRated;

    const handleGoalRatingChange = (goalId: string, text: string) => {
        const num = parseFloat(text);
        if (text === '') {
            setGoalRatings((prev) => {
                const next = { ...prev };
                delete next[goalId];
                return next;
            });
        } else if (!isNaN(num)) {
            setGoalRatings((prev) => ({ ...prev, [goalId]: num }));
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Self Review</Text>
                    {entry?.cycle?.name && (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">{entry.cycle.name}</Text>
                    )}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 420 }}
                    >
                        {/* Goal Ratings */}
                        {goals.length > 0 && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                    Goal Ratings (1-5)
                                </Text>
                                {goals.map((goal, idx) => (
                                    <View key={goal.id} style={styles.goalRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={2}>
                                                {idx + 1}. {goal.title}
                                            </Text>
                                            {goal.weightage != null && (
                                                <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">
                                                    Weight: {goal.weightage}%
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.ratingInputWrap}>
                                            <TextInput
                                                style={styles.ratingInput}
                                                placeholder="—"
                                                placeholderTextColor={colors.neutral[400]}
                                                value={goalRatings[goal.id]?.toString() ?? ''}
                                                onChangeText={(t) => handleGoalRatingChange(goal.id, t)}
                                                keyboardType="decimal-pad"
                                                maxLength={3}
                                            />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Overall Rating */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Overall Self Rating (1-5) <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. 4.0"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={overallRating}
                                    onChangeText={setOverallRating}
                                    keyboardType="decimal-pad"
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        {/* Self Comments */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Comments
                            </Text>
                            <View style={[styles.inputWrap, { height: 100 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Share your thoughts on your performance..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={selfComments}
                                    onChangeText={setSelfComments}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                onSubmit({
                                    goalRatings,
                                    overallRating: parsedOverall,
                                    selfComments: selfComments.trim(),
                                })
                            }
                            disabled={!isValid || isSubmitting}
                            style={[styles.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Detail Modal (Read-Only) ─────────────────────────────────────

function DetailModal({
    visible,
    entry,
    onClose,
}: {
    visible: boolean;
    entry: AppraisalEntry | null;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    if (!entry) return null;

    const goals = entry.goals ?? [];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">Appraisal Details</Text>
                        <StatusBadge status={entry.status} />
                    </View>
                    {entry.cycle?.name && (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">{entry.cycle.name}</Text>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                        {/* Ratings Overview */}
                        <View style={styles.ratingsRow}>
                            <RatingPill label="Self" value={entry.selfRating} />
                            <RatingPill label="Manager" value={entry.managerRating} />
                            <RatingPill label="Final" value={entry.finalRating} />
                        </View>

                        {/* Comments */}
                        {entry.selfComments && (
                            <View style={styles.commentBlock}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-1">Self Comments</Text>
                                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400 leading-4">{entry.selfComments}</Text>
                            </View>
                        )}
                        {entry.managerComments && (
                            <View style={styles.commentBlock}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-1">Manager Comments</Text>
                                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400 leading-4">{entry.managerComments}</Text>
                            </View>
                        )}

                        {/* Goals */}
                        {goals.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-2">Goals</Text>
                                {goals.map((goal, idx) => (
                                    <View key={goal.id} style={styles.goalDetailCard}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={2}>
                                            {idx + 1}. {goal.title}
                                        </Text>
                                        <View style={[styles.ratingsRow, { marginTop: 6 }]}>
                                            <RatingPill label="Self" value={goal.selfRating} />
                                            <RatingPill label="Manager" value={goal.managerRating} />
                                            <RatingPill label="Final" value={goal.finalRating} />
                                            {goal.weightage != null && (
                                                <View style={styles.ratingPill}>
                                                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Weight</Text>
                                                    <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{goal.weightage}%</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <Pressable onPress={onClose} style={[styles.saveBtn, { marginTop: 16 }]}>
                        <Text className="font-inter text-sm font-bold text-white">Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyAppraisalScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyAppraisals();
    const submitReview = useEssSubmitSelfReview();

    const [selfReviewEntry, setSelfReviewEntry] = React.useState<AppraisalEntry | null>(null);
    const [detailEntry, setDetailEntry] = React.useState<AppraisalEntry | null>(null);

    const appraisals: AppraisalEntry[] = (data as any)?.data ?? [];

    const handleCardPress = (entry: AppraisalEntry) => {
        if (entry.status === 'PENDING' || entry.status === 'SELF_REVIEW') {
            setSelfReviewEntry(entry);
        } else {
            setDetailEntry(entry);
        }
    };

    const handleSubmitSelfReview = (formData: {
        goalRatings: Record<string, number>;
        overallRating: number;
        selfComments: string;
    }) => {
        if (!selfReviewEntry) return;

        showConfirm({
            title: 'Submit Self Review',
            message: 'Are you sure you want to submit your self-review? You will not be able to edit it after submission.',
            confirmText: 'Submit',
            variant: 'primary',
            onConfirm: () => {
                submitReview.mutate(
                    {
                        id: selfReviewEntry.id,
                        data: {
                            selfRating: formData.overallRating,
                            selfComments: formData.selfComments,
                            goalRatings: formData.goalRatings,
                        },
                    },
                    {
                        onSuccess: () => setSelfReviewEntry(null),
                        onError: (err: any) =>
                            showErrorMessage(
                                err?.response?.data?.message ?? err?.message ?? 'Failed to submit self review',
                            ),
                    },
                );
            },
        });
    };

    const renderItem = ({ item, index }: { item: AppraisalEntry; index: number }) => {
        const cycleName = item.cycleName ?? item.cycle?.name ?? 'Appraisal Cycle';

        return (
            <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
                <Pressable onPress={() => handleCardPress(item)} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100" numberOfLines={2}>
                                {cycleName}
                            </Text>
                            {item.cycle?.startDate && item.cycle?.endDate && (
                                <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">
                                    {item.cycle.startDate} — {item.cycle.endDate}
                                </Text>
                            )}
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    {/* Ratings Row */}
                    <View style={[styles.ratingsRow, { marginTop: 10 }]}>
                        <RatingPill label="Self" value={item.selfRating} />
                        <RatingPill label="Manager" value={item.managerRating} />
                        <RatingPill label="Final" value={item.finalRating} />
                    </View>

                    {/* Hint for actionable entries */}
                    {(item.status === 'PENDING' || item.status === 'SELF_REVIEW') && (
                        <Text className="font-inter text-[10px] text-primary-600 mt-2">
                            Tap to submit your self review
                        </Text>
                    )}
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
            <AppTopHeader title="My Appraisal" onMenuPress={open} />
            <FlashList
                data={appraisals}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="list"
                            title="No Appraisals"
                            message="You don't have any appraisal entries yet."
                        />
                    ) : null
                }
            />

            <SelfReviewModal
                visible={selfReviewEntry !== null}
                entry={selfReviewEntry}
                onClose={() => setSelfReviewEntry(null)}
                onSubmit={handleSubmitSelfReview}
                isSubmitting={submitReview.isPending}
            />

            <DetailModal
                visible={detailEntry !== null}
                entry={detailEntry}
                onClose={() => setDetailEntry(null)}
            />

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    ratingsRow: { flexDirection: 'row', gap: 8 },
    ratingPill: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignItems: 'center',
        gap: 1,
    },
    formSheet: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginBottom: 16,
    },
    fieldWrap: { marginBottom: 14 },
    inputWrap: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        gap: 12,
    },
    ratingInputWrap: {
        width: 56,
        height: 40,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    ratingInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary[950],
        textAlign: 'center',
        width: '100%',
    },
    goalDetailCard: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    commentBlock: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    saveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});
const styles = createStyles(false);
