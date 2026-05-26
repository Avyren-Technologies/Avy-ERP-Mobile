import * as React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useFileUrl } from '@/hooks/use-file-url';
import {
    getEvidenceDisplayName,
    isImageEvidenceItem,
    isRemoteUrl,
    type WorkOrderEvidenceItem,
} from '@/features/maintenance/work-order-evidence';

export function WorkOrderEvidenceThumb({
    item,
    isDark,
    fmt,
}: {
    item: WorkOrderEvidenceItem;
    isDark: boolean;
    fmt: { dateTime: (iso: string) => string };
}) {
    const storageKey = item.url && !isRemoteUrl(item.url) ? item.url : null;
    const { url: signedUrl, isLoading } = useFileUrl({ key: storageKey });
    const displayUrl = item.url && isRemoteUrl(item.url) ? item.url : signedUrl;
    const isImage = isImageEvidenceItem(item);

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}
        >
            <View style={[styles.thumb, { backgroundColor: isDark ? '#0F0D1A' : colors.neutral[100] }]}>
                {isImage && isLoading ? (
                    <ActivityIndicator color={colors.primary[500]} />
                ) : isImage && displayUrl ? (
                    <Image source={{ uri: displayUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                    <Text className="font-inter text-[10px] text-neutral-400">PDF / file</Text>
                )}
            </View>
            <View style={styles.meta}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={2}>
                    {getEvidenceDisplayName(item)}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400">
                    {item.uploadedAt ? fmt.dateTime(item.uploadedAt) : '-'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 10,
    },
    thumb: {
        width: '100%',
        aspectRatio: 16 / 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    meta: {
        padding: 12,
        gap: 4,
    },
});
