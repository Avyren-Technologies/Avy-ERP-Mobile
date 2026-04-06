/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useMyTraining } from '@/features/company-admin/api/use-ess-queries';
import { useSubmitEssFeedback } from '@/features/company-admin/api/use-recruitment-mutations';
import { useTrainingMaterials } from '@/features/company-admin/api/use-recruitment-queries';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    NOMINATED: { bg: colors.info[50], text: colors.info[700] },
    ENROLLED: { bg: colors.primary[50], text: colors.primary[700] },
    IN_PROGRESS: { bg: colors.warning[50], text: colors.warning[700] },
    COMPLETED: { bg: colors.success[50], text: colors.success[700] },
    CANCELLED: { bg: colors.danger[50], text: colors.danger[700] },
    DROPPED: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    ONLINE: { bg: colors.accent[50], text: colors.accent[700] },
    CLASSROOM: { bg: colors.primary[50], text: colors.primary[700] },
    HYBRID: { bg: colors.info[50], text: colors.info[700] },
    SELF_PACED: { bg: colors.warning[50], text: colors.warning[700] },
};

const MATERIAL_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    DOCUMENT: { bg: colors.primary[50], text: colors.primary[700] },
    VIDEO: { bg: colors.accent[50], text: colors.accent[700] },
    LINK: { bg: colors.info[50], text: colors.info[700] },
    PRESENTATION: { bg: colors.warning[50], text: colors.warning[700] },
    WORKSHEET: { bg: colors.success[50], text: colors.success[700] },
    OTHER: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const RATING_LABELS = [
    'Content Relevance',
    'Trainer Effectiveness',
    'Overall Satisfaction',
    'Knowledge Gain',
    'Practical Applicability',
] as const;

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text className="mb-1 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Pressable key={star} onPress={() => onChange(star)} hitSlop={4}>
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill={star <= value ? colors.warning[400] : colors.neutral[200]}
                                stroke={star <= value ? colors.warning[500] : colors.neutral[300]}
                                strokeWidth="1" />
                        </Svg>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

function FeedbackModal({
    visible, onClose, onSubmit, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [ratings, setRatings] = React.useState<Record<string, number>>({});
    const [comments, setComments] = React.useState('');
    const [suggestions, setSuggestions] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setRatings({}); setComments(''); setSuggestions('');
        }
    }, [visible]);

    const setRating = (key: string, val: number) => setRatings(prev => ({ ...prev, [key]: val }));

    const allRated = RATING_LABELS.every(l => (ratings[l] ?? 0) > 0);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 40 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Training Feedback</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {RATING_LABELS.map(label => (
                            <StarRow key={label} label={label} value={ratings[label] ?? 0} onChange={v => setRating(label, v)} />
                        ))}
                        <View style={{ marginBottom: 14 }}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Comments</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Share your thoughts..." placeholderTextColor={colors.neutral[400]} value={comments} onChangeText={setComments} multiline numberOfLines={3} />
                            </View>
                        </View>
                        <View style={{ marginBottom: 14 }}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Improvement Suggestions</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="What could be improved..." placeholderTextColor={colors.neutral[400]} value={suggestions} onChangeText={setSuggestions} multiline numberOfLines={3} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSubmit({
                            contentRelevance: ratings['Content Relevance'] ?? 0,
                            trainerEffectiveness: ratings['Trainer Effectiveness'] ?? 0,
                            overallSatisfaction: ratings['Overall Satisfaction'] ?? 0,
                            knowledgeGain: ratings['Knowledge Gain'] ?? 0,
                            practicalApplicability: ratings['Practical Applicability'] ?? 0,
                            comments: comments.trim() || undefined,
                            improvementSuggestions: suggestions.trim() || undefined,
                        })} disabled={!allRated || isSaving} style={[styles.saveBtn, (!allRated || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function MaterialsSection({ trainingId }: { trainingId: string }) {
    const { data: materialsResponse, isLoading } = useTrainingMaterials(trainingId);
    const materials: any[] = (materialsResponse as any)?.data ?? [];

    if (isLoading) {
        return (
            <View style={{ paddingVertical: 8 }}>
                <Text className="font-inter text-xs text-neutral-400">Loading materials...</Text>
            </View>
        );
    }

    if (materials.length === 0) return null;

    const handleOpen = (url: string) => {
        if (url) Linking.openURL(url).catch(() => {});
    };

    return (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
            <Text className="font-inter text-xs font-bold text-primary-900 mb-2">Materials</Text>
            {materials.map((mat: any) => {
                const typeColor = MATERIAL_TYPE_COLORS[mat.type] ?? MATERIAL_TYPE_COLORS.OTHER;
                return (
                    <View key={mat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                            <Text style={{ color: typeColor.text, fontFamily: 'Inter', fontSize: 9, fontWeight: '700' }}>{mat.type ?? 'OTHER'}</Text>
                        </View>
                        <Text className="font-inter text-xs text-primary-950 flex-1" numberOfLines={1}>{mat.name ?? mat.title ?? 'Untitled'}</Text>
                        {(mat.url || mat.fileUrl) && (
                            <Pressable onPress={() => handleOpen(mat.url || mat.fileUrl)} hitSlop={8}
                                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] }}>
                                <Text className="font-inter text-[10px] font-bold text-primary-600">Open</Text>
                            </Pressable>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

export function MyTrainingScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { data, isLoading, refetch } = useMyTraining();
    const trainings = (data as any)?.data ?? [];
    const submitFeedback = useSubmitEssFeedback();

    const [feedbackNomId, setFeedbackNomId] = React.useState<string | null>(null);
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const handleSubmitFeedback = (feedbackData: Record<string, unknown>) => {
        if (!feedbackNomId) return;
        submitFeedback.mutate({ nominationId: feedbackNomId, data: feedbackData }, {
            onSuccess: () => setFeedbackNomId(null),
        });
    };

    const toggleExpand = (item: any) => {
        const canExpand = item.status === 'COMPLETED' || item.status === 'IN_PROGRESS';
        if (!canExpand) return;
        setExpandedId(prev => prev === item.id ? null : item.id);
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.NOMINATED;
        const typeStyle = TYPE_COLORS[item.type ?? item.trainingType] ?? TYPE_COLORS.ONLINE;
        const isCompleted = item.status === 'COMPLETED';
        const isExpandable = item.status === 'COMPLETED' || item.status === 'IN_PROGRESS';
        const isExpanded = expandedId === item.id;
        const trainingId = item.trainingId ?? item.training?.id ?? '';

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <Pressable onPress={() => toggleExpand(item)} style={[styles.card, isExpanded && { borderColor: colors.primary[200] }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-900" numberOfLines={2}>
                                {item.courseName ?? item.course?.name ?? item.title ?? 'Untitled'}
                            </Text>
                            {item.trainerName && <Text className="font-inter text-xs text-neutral-500 mt-0.5">Trainer: {item.trainerName}</Text>}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                                <Text className="font-inter text-[10px] font-bold" style={{ color: statusStyle.text }}>{item.status}</Text>
                            </View>
                            {isExpandable && (
                                <Svg width={14} height={14} viewBox="0 0 24 24">
                                    <Path d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            )}
                        </View>
                    </View>
                    <View style={styles.meta}>
                        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                            <Text style={{ color: typeStyle.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.type ?? item.trainingType ?? '--'}</Text>
                        </View>
                        {item.startDate && <Text className="font-inter text-[10px] text-neutral-400">Starts: {item.startDate}</Text>}
                        {item.endDate && <Text className="font-inter text-[10px] text-neutral-400">Ends: {item.endDate}</Text>}
                    </View>
                    {item.description && <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={isExpanded ? undefined : 2}>{item.description}</Text>}
                    {isExpanded && trainingId && <MaterialsSection trainingId={trainingId} />}
                    {isCompleted && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                            <Pressable onPress={() => setFeedbackNomId(item.id)} style={styles.feedbackBtn}>
                                <Text className="font-inter text-xs font-bold text-primary-600">Give Feedback</Text>
                            </Pressable>
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <AppTopHeader title="My Training" onMenuPress={open} />
            <FlatList
                data={trainings}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No training nominations yet</Text></View> : null}
            />
            {feedbackNomId && (
                <FeedbackModal visible={!!feedbackNomId} onClose={() => setFeedbackNomId(null)} onSubmit={handleSubmitFeedback} isSaving={submitFeedback.isPending} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
    empty: { alignItems: 'center', paddingTop: 60 },
    feedbackBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
    formSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
