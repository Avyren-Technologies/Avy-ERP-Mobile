/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useMyTraining } from '@/features/company-admin/api/use-ess-queries';

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

export function MyTrainingScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { data, isLoading, refetch } = useMyTraining();
    const trainings = (data as any)?.data ?? [];

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.NOMINATED;
        const typeStyle = TYPE_COLORS[item.type ?? item.trainingType] ?? TYPE_COLORS.ONLINE;

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-900" numberOfLines={2}>
                            {item.courseName ?? item.course?.name ?? item.title ?? 'Untitled'}
                        </Text>
                        {item.trainerName && <Text className="font-inter text-xs text-neutral-500 mt-0.5">Trainer: {item.trainerName}</Text>}
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: statusStyle.text }}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.meta}>
                    <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                        <Text style={{ color: typeStyle.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.type ?? item.trainingType ?? '--'}</Text>
                    </View>
                    {item.startDate && <Text className="font-inter text-[10px] text-neutral-400">Starts: {item.startDate}</Text>}
                    {item.endDate && <Text className="font-inter text-[10px] text-neutral-400">Ends: {item.endDate}</Text>}
                </View>
                {item.description && <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.description}</Text>}
            </Animated.View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={open} />
                    <Text className="font-inter text-lg font-bold text-white ml-3">My Training</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={trainings}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No training nominations yet</Text></View> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
    empty: { alignItems: 'center', paddingTop: 60 },
});
