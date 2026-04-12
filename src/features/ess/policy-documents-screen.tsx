/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    Linking,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { usePolicyDocuments } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Main Screen ──────────────────────────────────────────────────

export function PolicyDocumentsScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();

    const { data, isLoading, refetch } = usePolicyDocuments();

    // essApi.getPolicyDocuments() does client.get() + return r.data (double unwrap)
    // So hook data is already the array. Fall back to envelope unwrap for safety.
    const documents = React.useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        const raw = data as any;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [data]);

    const handleOpenDocument = (url: string) => {
        if (url) {
            Linking.openURL(url).catch(() => { /* ignore */ });
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.typeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.category ?? 'Policy'}</Text>
                        </View>
                    </View>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mt-2">{item.title ?? item.name ?? '--'}</Text>
                    {item.description && <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-1" numberOfLines={2}>{item.description}</Text>}
                </View>
                {item.fileUrl && (
                    <Pressable onPress={() => handleOpenDocument(item.fileUrl)} style={styles.viewBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                )}
            </View>
            {item.effectiveDate && <Text className="font-inter text-[10px] text-neutral-400 mt-2">Effective: {item.effectiveDate}</Text>}
            {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">Published: {item.createdAt}</Text>}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
            <AppTopHeader title="Policy Documents" onMenuPress={open} />
            <FlashList
                data={documents}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No policy documents available</Text></View> : null}
            />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    viewBtn: { padding: 8, borderRadius: 8, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderWidth: 1, borderColor: isDark ? colors.primary[800] : colors.primary[100] },
});
const styles = createStyles(false);
