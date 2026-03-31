/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Linking,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { usePolicyDocuments } from '@/features/company-admin/api/use-ess-queries';

// ── Main Screen ──────────────────────────────────────────────────

export function PolicyDocumentsScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();

    const { data, isLoading, refetch } = usePolicyDocuments();

    const policies = (data as any)?.data ?? [];

    const handleView = (url: string) => {
        if (url) {
            Linking.openURL(url);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950">{item.title ?? 'Untitled Policy'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {item.category ? (
                            <View style={[styles.catBadge, { backgroundColor: colors.accent[50] }]}>
                                <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.category}</Text>
                            </View>
                        ) : null}
                        {item.version ? (
                            <View style={[styles.catBadge, { backgroundColor: colors.info[50] }]}>
                                <Text style={{ color: colors.info[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>v{item.version}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                {(item.fileUrl || item.url) ? (
                    <Pressable onPress={() => handleView(item.fileUrl ?? item.url)} style={styles.viewBtn}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-primary-600 ml-1">View</Text>
                    </Pressable>
                ) : null}
            </View>
            {item.description ? (
                <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={3}>{item.description}</Text>
            ) : null}
            {item.publishedAt ? (
                <Text className="font-inter text-[10px] text-neutral-400 mt-2">Published: {item.publishedAt}</Text>
            ) : item.createdAt ? (
                <Text className="font-inter text-[10px] text-neutral-400 mt-2">Published: {item.createdAt}</Text>
            ) : null}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={open} />
                    <Text className="font-inter text-lg font-bold text-white ml-3">Policy Documents</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={policies}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No policy documents available</Text></View> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    viewBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
    empty: { alignItems: 'center', paddingTop: 60 },
});
